import express from 'express';
import crypto from 'crypto';
import { supabaseAdmin, missingVars, initError } from '../supabaseClient.js';

const router = express.Router();

// ══════════════════════════════════════════════════════════════
// Cashfree Configuration
// ══════════════════════════════════════════════════════════════
// Cashfree runs two entirely separate stacks — sandbox (test keys) and
// production (live keys) — and a key only works against its own stack.
// Pointing at production with test keys, or with an account whose live mode
// has not been activated yet, fails EVERY order with
// "transactions are not enabled for your payment gateway account".
// CASHFREE_ENV pins the stack explicitly; with it unset we infer from the
// key prefix, because Cashfree test app IDs are prefixed with TEST.
const CASHFREE_BASE_URLS = {
    sandbox: 'https://sandbox.cashfree.com/pg',
    production: 'https://api.cashfree.com/pg'
};
const API_VERSION = '2023-08-01';

export function cashfreeEnv() {
    const explicit = String(process.env.CASHFREE_ENV || '').trim().toLowerCase();
    if (['sandbox', 'test', 'testing'].includes(explicit)) return 'sandbox';
    if (['production', 'prod', 'live'].includes(explicit)) return 'production';
    // Cashfree sandbox app IDs look like TEST1234567890abcdef.
    return /^test/i.test(String(process.env.CASHFREE_APP_ID || '').trim()) ? 'sandbox' : 'production';
}

/**
 * Turn a raw Cashfree failure into something the user (and we) can act on.
 * The gateway's own wording — "transactions are not enabled for your payment
 * gateway account" — tells a student nothing about what to do next.
 */
export function describeCashfreeError(error, env) {
    const raw = error?.message || error?.error_description || (typeof error === 'string' ? error : '') || 'Unknown gateway error';

    if (/not enabled|not activated|inactive/i.test(raw)) {
        return env === 'production'
            ? 'Payments are not live on this Cashfree account yet. Complete KYC/activation in the Cashfree dashboard, or set CASHFREE_ENV=sandbox with test keys to run in test mode.'
            : 'This Cashfree sandbox account cannot accept transactions. Check CASHFREE_APP_ID / CASHFREE_SECRET_KEY are the Test-mode keys from Cashfree -> Developers -> API Keys.';
    }
    if (/authentic|unauthor|invalid.*(client|credential|key|token)/i.test(raw)) {
        return `Cashfree rejected the API keys in ${env} mode. Live keys only work with CASHFREE_ENV=production, test keys only with CASHFREE_ENV=sandbox.`;
    }
    if (/ip.*(whitelist|allow)/i.test(raw)) {
        return 'Cashfree blocked this server IP. Add the deployment IP to the allowed list in the Cashfree dashboard, or clear the IP restriction.';
    }
    return `Cashfree: ${raw}`;
}

/**
 * Helper to fetch Cashfree API
 */
async function cashfreeFetch(endpoint, method, body = null) {
    const env = cashfreeEnv();
    const headers = {
        // Env vars pasted into a dashboard routinely carry a trailing newline,
        // which Cashfree reads as part of the secret and rejects.
        'x-client-id': String(process.env.CASHFREE_APP_ID || '').trim(),
        'x-client-secret': String(process.env.CASHFREE_SECRET_KEY || '').trim(),
        'x-api-version': API_VERSION,
        'Accept': 'application/json',
    };
    if (body) {
        headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${CASHFREE_BASE_URLS[env]}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json();
    if (!res.ok) {
        throw data;
    }
    return data;
}

/**
 * CREATE ORDER
 * Frontend calls this to get a payment_session_id for Cashfree checkout
 */
router.post('/cashfree/create-order', async (req, res) => {
    try {
        const { amount, user_id, context_type, context_id, plan_name, customer_phone, customer_email, customer_name, return_url } = req.body;

        if (!amount || !user_id || !context_type || !context_id) {
            return res.status(400).json({ error: 'Missing required fields: amount, user_id, context_type, context_id' });
        }

        if (!customer_phone) {
            return res.status(400).json({ error: 'Phone number is required for payment' });
        }

        if (!supabaseAdmin) {
            if (missingVars.length > 0) {
                return res.status(500).json({ error: `Server misconfiguration: Missing environment variables: ${missingVars.join(', ')}` });
            } else {
                return res.status(500).json({ error: `Database failed to initialize: ${initError || 'Unknown error'}. Check your SUPABASE_URL formatting.` });
            }
        }

        if (!String(process.env.CASHFREE_APP_ID || '').trim() || !String(process.env.CASHFREE_SECRET_KEY || '').trim()) {
            return res.status(500).json({ error: `Cashfree credentials not configured for ${cashfreeEnv()} mode. Set CASHFREE_APP_ID and CASHFREE_SECRET_KEY (and CASHFREE_ENV).` });
        }

        // Generate unique order ID
        const orderId = `order_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

        let actualContextId = context_id;

        // Smart slot resolution/creation for subscriptions.
        // Also re-resolves a slot the client had cached but that has since been
        // completed — otherwise the seat would land in a closed pool.
        if (context_type === 'subscription' || context_type === 'pool') {
            const isPlaceholder = actualContextId === 'sub_pool' || actualContextId === 'headcount';
            let staleSlot = false;

            if (!isPlaceholder) {
                const { data: slotRow } = await supabaseAdmin.from('pool_slots')
                    .select('id, status')
                    .eq('id', actualContextId)
                    .maybeSingle();
                staleSlot = !slotRow || slotRow.status !== 'running';
            }

            if (isPlaceholder || staleSlot) {
                const resolvedSlotId = plan_name ? await resolveRunningSlotForPlan(plan_name) : null;
                if (!resolvedSlotId) {
                    return res.status(400).json({ error: 'Could not resolve a live pool for this plan. Please refresh and try again.' });
                }
                actualContextId = resolvedSlotId;
            }
        }

        // 1. Save pending transaction to DB
        const { error: dbError } = await supabaseAdmin
            .from('phonepe_transactions')
            .insert([{
                user_id,
                amount,
                merchant_transaction_id: orderId,
                cashfree_order_id: orderId,
                context_type,
                context_id: actualContextId,
                plan_name: plan_name || null,
                status: 'PENDING'
            }]);

        if (dbError) {
            console.error('DB Error saving transaction:', dbError);
            return res.status(500).json({ error: 'Failed to initialize transaction record' });
        }

        // 2. Build Cashfree Create Order request
        const orderRequest = {
            order_amount: parseFloat(amount),
            order_currency: "INR",
            order_id: orderId,
            customer_details: {
                customer_id: user_id.substring(0, 50), // Cashfree limits customer_id length
                customer_phone: String(customer_phone).replace(/[^0-9]/g, '').slice(-10), // Ensure 10-digit
                customer_email: customer_email || `user_${user_id.substring(0, 8)}@savify.in`,
                customer_name: customer_name || 'Savify User'
            },
            order_meta: {
                return_url: return_url || `${req.headers.origin || 'https://savify.in'}/dashboard?payment_status=check&orderId=${orderId}`,
                notify_url: `${req.headers.origin || 'https://savify.in'}/api/payment/cashfree/webhook`
            },
            order_note: "Payment for Savify"
        };

        // 3. Call Cashfree API using fetch
        const data = await cashfreeFetch('/orders', 'POST', orderRequest);

        if (data && data.payment_session_id) {
            return res.json({
                payment_session_id: data.payment_session_id,
                order_id: orderId,
                cf_order_id: data.cf_order_id,
                // The browser SDK must open the same stack the session was
                // minted on — a sandbox session in production mode just fails.
                cashfree_env: cashfreeEnv()
            });
        } else {
            console.error('Cashfree Error Response:', data);
            return res.status(400).json({ error: 'Cashfree API Error: Missing payment_session_id' });
        }

    } catch (error) {
        const env = cashfreeEnv();
        console.error(`Cashfree create order error (${env}):`, error);
        res.status(500).json({ error: describeCashfreeError(error, env), cashfree_env: env });
    }
});

/**
 * CONFIG CHECK
 * Read-only: which Cashfree stack this deployment talks to and whether the
 * credentials are present. Never returns the secret itself.
 */
router.get('/cashfree/config', (req, res) => {
    const env = cashfreeEnv();
    const appId = String(process.env.CASHFREE_APP_ID || '').trim();
    res.json({
        env,
        base_url: CASHFREE_BASE_URLS[env],
        app_id_present: !!appId,
        app_id_prefix: appId ? appId.slice(0, 4) : null,
        secret_present: !!String(process.env.CASHFREE_SECRET_KEY || '').trim(),
        env_var_set: !!String(process.env.CASHFREE_ENV || '').trim()
    });
});

/**
 * WEBHOOK
 * Cashfree calls this server-to-server when payment status changes
 */
router.post('/cashfree/webhook', async (req, res) => {
    try {
        const signature = req.headers["x-webhook-signature"];
        const timestamp = req.headers["x-webhook-timestamp"];
        const rawBody = req.rawBody || JSON.stringify(req.body);

        // 1. Verify webhook signature
        try {
            const generatedSignature = crypto.createHmac('sha256', String(process.env.CASHFREE_SECRET_KEY || '').trim())
                .update(timestamp + rawBody)
                .digest('base64');
                
            if (generatedSignature !== signature) {
                console.error('Cashfree webhook signature mismatch');
            }
        } catch (verifyError) {
            console.error('Cashfree webhook signature verification failed:', verifyError);
        }

        // 2. Extract order info from webhook payload
        const webhookData = req.body;
        const orderData = webhookData?.data?.order;
        const paymentData = webhookData?.data?.payment;

        if (!orderData) {
            console.error('Webhook: No order data in payload');
            return res.status(200).send('OK');
        }

        const orderId = orderData.order_id;
        const orderStatus = orderData.order_status; // PAID, ACTIVE, EXPIRED, etc.
        const cfPaymentId = paymentData?.cf_payment_id || null;

        const isSuccess = orderStatus === 'PAID';
        const newStatus = isSuccess ? 'SUCCESS' : 'FAILED';

        // 3. Fetch existing transaction
        const { data: existingTxn, error: fetchError } = await supabaseAdmin
            .from('phonepe_transactions')
            .select('*')
            .eq('merchant_transaction_id', orderId)
            .single();

        if (fetchError || !existingTxn) {
            console.error('Transaction not found for webhook:', orderId);
            return res.status(200).send('OK');
        }

        if (existingTxn.status === 'SUCCESS') {
            return res.status(200).send('OK');
        }

        // 4. Update transaction record
        const { error: updateError } = await supabaseAdmin
            .from('phonepe_transactions')
            .update({
                status: newStatus,
                phonepe_transaction_id: cfPaymentId ? String(cfPaymentId) : null,
                cashfree_order_id: orderId
            })
            .eq('merchant_transaction_id', orderId);

        if (updateError) {
            console.error('Failed to update transaction:', updateError);
            return res.status(200).send('OK');
        }

        // 5. Fulfillment Logic (If Success)
        if (isSuccess) {
            if (existingTxn.context_type === 'cart') {
                const { data: pendingItems } = await supabaseAdmin
                    .from('cart_items')
                    .select('id')
                    .eq('cart_id', existingTxn.context_id)
                    .eq('user_id', existingTxn.user_id)
                    .eq('payment_status', 'pending');

                if (pendingItems && pendingItems.length > 0) {
                    const pendingIds = pendingItems.map(i => i.id);
                    await supabaseAdmin
                        .from('cart_items')
                        .update({ payment_status: 'paid' })
                        .in('id', pendingIds);
                }

                await supabaseAdmin
                    .from('cart_payments')
                    .insert([{
                        cart_id: existingTxn.context_id,
                        user_id: existingTxn.user_id,
                        amount_paid: existingTxn.amount,
                        commission_fee: 5,
                        payment_status: 'success',
                        paid_at: new Date().toISOString()
                    }]);

                await supabaseAdmin.from('drops_activity_logs').insert({
                    user_id: existingTxn.user_id,
                    action_type: 'PAYMENT',
                    description: 'Paid split via Cashfree'
                });

            } else if (existingTxn.context_type === 'pool' || existingTxn.context_type === 'subscription') {
                const { data: profile } = await supabaseAdmin.from('user_profiles').select('full_name').eq('id', existingTxn.user_id).single();

                await resolveAndJoinPoolSlot(
                    existingTxn.context_id,
                    existingTxn.user_id,
                    profile?.full_name,
                    existingTxn.plan_name
                );

                await supabaseAdmin.from('drops_activity_logs').insert({
                    user_id: existingTxn.user_id,
                    action_type: 'PAYMENT',
                    description: 'Paid subscription split via Cashfree'
                });
            }
        }

        res.status(200).send('OK');

    } catch (error) {
        console.error('Cashfree webhook error:', error);
        res.status(500).send('Server Error');
    }
});

/**
 * STATUS CHECK
 * Frontend calls this after redirecting back to check the real status
 */
const cashfreeStatusHandler = async (req, res) => {
    try {
        // The dashboard polls with ?orderId=..., older clients use the path param.
        const orderId = req.params.orderId || req.query.orderId || req.query.order_id;
        if (!orderId) {
            return res.status(400).json({ error: 'orderId is required' });
        }

        // 1. Check DB first
        const { data: txn, error } = await supabaseAdmin
            .from('phonepe_transactions')
            .select('status, context_type, context_id, user_id, amount, plan_name')
            .eq('merchant_transaction_id', orderId)
            .single();

        if (error || !txn) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        if (txn.status === 'SUCCESS' || txn.status === 'FAILED') {
            return res.json({ status: txn.status, context_type: txn.context_type });
        }

        // 2. If still PENDING, check with Cashfree API for real-time status
        try {
            const data = await cashfreeFetch(`/orders/${orderId}`, 'GET');
            const orderStatus = data?.order_status;

            if (orderStatus === 'PAID') {
                await supabaseAdmin
                    .from('phonepe_transactions')
                    .update({ status: 'SUCCESS' })
                    .eq('merchant_transaction_id', orderId);

                if (txn.context_type === 'cart') {
                    const { data: pendingItems } = await supabaseAdmin
                        .from('cart_items')
                        .select('id')
                        .eq('cart_id', txn.context_id)
                        .eq('user_id', txn.user_id)
                        .eq('payment_status', 'pending');

                    if (pendingItems && pendingItems.length > 0) {
                        const pendingIds = pendingItems.map(i => i.id);
                        await supabaseAdmin
                            .from('cart_items')
                            .update({ payment_status: 'paid' })
                            .in('id', pendingIds);
                    }

                    const { data: existingPayment } = await supabaseAdmin
                        .from('cart_payments')
                        .select('id')
                        .eq('cart_id', txn.context_id)
                        .eq('user_id', txn.user_id)
                        .limit(1);

                    if (!existingPayment || existingPayment.length === 0) {
                        await supabaseAdmin
                            .from('cart_payments')
                            .insert([{
                                cart_id: txn.context_id,
                                user_id: txn.user_id,
                                amount_paid: txn.amount,
                                commission_fee: 5,
                                payment_status: 'success',
                                paid_at: new Date().toISOString()
                            }]);

                        await supabaseAdmin.from('drops_activity_logs').insert({
                            user_id: txn.user_id,
                            action_type: 'PAYMENT',
                            description: 'Paid split via Cashfree'
                        });
                    }
                } else if (txn.context_type === 'pool' || txn.context_type === 'subscription') {
                    const { data: profile } = await supabaseAdmin.from('user_profiles').select('full_name').eq('id', txn.user_id).single();
                    await resolveAndJoinPoolSlot(txn.context_id, txn.user_id, profile?.full_name, txn.plan_name);
                }

                return res.json({ status: 'SUCCESS', context_type: txn.context_type });
            } else if (orderStatus === 'EXPIRED' || orderStatus === 'TERMINATED') {
                await supabaseAdmin
                    .from('phonepe_transactions')
                    .update({ status: 'FAILED' })
                    .eq('merchant_transaction_id', orderId);
                return res.json({ status: 'FAILED', context_type: txn.context_type });
            } else {
                return res.json({ status: 'PENDING', context_type: txn.context_type });
            }
        } catch (cfError) {
            console.error('Cashfree status check API error:', cfError);
            return res.json({ status: txn.status });
        }
    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

router.get('/cashfree/status', cashfreeStatusHandler);
router.get('/cashfree/status/:orderId', cashfreeStatusHandler);

export default router;

/**
 * Find (or open) the live slot for a subscription plan.
 * Returns the slot UUID, or null if the plan has no pool type.
 */
async function resolveRunningSlotForPlan(planName) {
    try {
        const { data: ptData } = await supabaseAdmin
            .from('pool_types')
            .select('id')
            .eq('name', planName)
            .maybeSingle();
        if (!ptData) return null;

        const { data: existingSlot } = await supabaseAdmin.from('pool_slots')
            .select('id')
            .eq('pool_type_id', ptData.id)
            .eq('status', 'running')
            .order('created_at', { ascending: false })
            .limit(1);

        if (existingSlot && existingSlot.length > 0) return existingSlot[0].id;

        const { data: newSlot, error: newSlotErr } = await supabaseAdmin.from('pool_slots')
            .insert({
                pool_type_id: ptData.id,
                status: 'running',
                slot_date: new Date().toISOString().split('T')[0],
                slot_start: 'All Day',
                slot_end: 'All Day'
            })
            .select('id')
            .single();
        if (newSlotErr) {
            console.error('Failed to auto-create slot:', newSlotErr);
            return null;
        }
        return newSlot?.id || null;
    } catch (e) {
        console.error('Error resolving running slot for plan:', e);
        return null;
    }
}

/**
 * Claim a paid seat in a pool slot.
 * This is the ONLY place a subscription seat becomes visible on the plate —
 * the client no longer pre-joins, so an abandoned checkout never holds a seat.
 * A DB trigger closes the pool and opens a fresh empty one once the paid seats
 * reach the pool type's max_members.
 */
async function resolveAndJoinPoolSlot(contextId, userId, displayName, planName) {
    try {
        let targetSlotId = contextId;
        let usable = false;

        if (targetSlotId && targetSlotId !== 'sub_pool' && targetSlotId !== 'headcount') {
            const { data: slotRow } = await supabaseAdmin
                .from('pool_slots')
                .select('id, status')
                .eq('id', targetSlotId)
                .maybeSingle();
            // The pool may have filled up between checkout and confirmation —
            // seating a paying user into a closed pool would lose their seat.
            usable = !!slotRow && slotRow.status === 'running';
        }

        if (!usable) {
            targetSlotId = planName ? await resolveRunningSlotForPlan(planName) : null;
            if (!targetSlotId) {
                console.error('Cannot resolve pool slot for payment', { contextId, planName, userId });
                return;
            }
        }

        const paidPatch = {
            payment_status: 'paid',
            paid_at: new Date().toISOString()
        };

        const { data: existingMember } = await supabaseAdmin
            .from('pool_members')
            .select('id, payment_status')
            .eq('pool_slot_id', targetSlotId)
            .eq('user_id', userId)
            .limit(1);

        if (existingMember && existingMember.length > 0) {
            if (existingMember[0].payment_status !== 'paid') {
                await supabaseAdmin.from('pool_members')
                    .update(paidPatch)
                    .eq('id', existingMember[0].id);
            }
            return;
        }

        const { error: insertErr } = await supabaseAdmin.from('pool_members').insert([{
            pool_slot_id: targetSlotId,
            user_id: userId,
            display_name: displayName || 'Anonymous',
            ...paidPatch
        }]);
        if (insertErr) console.error('Failed to claim pool seat:', insertErr);
    } catch (e) {
        console.error('Error resolving/joining pool slot:', e);
    }
}
