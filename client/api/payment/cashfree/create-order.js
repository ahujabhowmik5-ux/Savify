import crypto from 'crypto';
import { supabaseAdmin, missingVars, initError } from '../../_supabaseClient.js';
import { resolveRunningSlotForPlan } from '../../_poolFulfillment.js';
import { cashfreeFetch, cashfreeEnv, cashfreeCredentials, describeCashfreeError, userFacingCashfreeError } from '../../_cashfree.js';
import { isSimulationMode } from '../../_paymentMode.js';

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

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
                return res.status(500).json({ error: `Server misconfiguration: Missing env vars: ${missingVars.join(', ')}` });
            }
            return res.status(500).json({ error: `Database init failed: ${initError || 'Unknown'}` });
        }

        const simulating = isSimulationMode();

        const { appId, secret } = cashfreeCredentials();
        if (!simulating && (!appId || !secret)) {
            return res.status(500).json({ error: `Cashfree credentials not configured for ${cashfreeEnv()} mode. Set CASHFREE_APP_ID and CASHFREE_SECRET_KEY (and CASHFREE_ENV).` });
        }

        // Simulated orders carry their own prefix so they are impossible to
        // confuse with real ones in the ledger, and so the settle endpoint can
        // refuse anything that is not one.
        const orderId = simulating
            ? `sim_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
            : `order_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

        // Pin the order to a real, live pool slot BEFORE taking any money. The
        // client's cached slot can be stale (the pool may have filled and rolled
        // over), and a 'sub_pool' placeholder used to mean the payment went
        // through with nowhere to put the seat.
        let actualContextId = context_id;
        if (context_type === 'subscription' || context_type === 'pool') {
            const placeholder = actualContextId === 'sub_pool' || actualContextId === 'headcount';
            let stale = false;
            if (!placeholder) {
                const { data: slot } = await supabaseAdmin
                    .from('pool_slots')
                    .select('id, status')
                    .eq('id', actualContextId)
                    .maybeSingle();
                stale = !slot || slot.status !== 'running';
            }
            if (placeholder || stale) {
                const resolved = await resolveRunningSlotForPlan(plan_name);
                if (!resolved) {
                    return res.status(400).json({ error: 'Could not find a live pool for this plan. Please refresh and try again.' });
                }
                actualContextId = resolved;
            }
        }

        // Save pending transaction
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
            console.error('DB Error:', dbError);
            return res.status(500).json({ error: `DB Error: ${dbError.message || dbError.code || JSON.stringify(dbError)}` });
        }

        if (simulating) {
            return res.json({
                simulated: true,
                order_id: orderId,
                amount: parseFloat(amount),
                context_type
            });
        }

        // Create Cashfree order
        const origin = req.headers.origin || req.headers.referer?.replace(/\/+$/, '') || 'https://savify.in';
        const orderRequest = {
            order_amount: parseFloat(amount),
            order_currency: "INR",
            order_id: orderId,
            customer_details: {
                customer_id: user_id.substring(0, 50),
                customer_phone: String(customer_phone).replace(/[^0-9]/g, '').slice(-10),
                customer_email: customer_email || `user_${user_id.substring(0, 8)}@savify.in`,
                customer_name: customer_name || 'Savify User'
            },
            order_meta: {
                return_url: return_url || `${origin}/dashboard?payment_status=check&order_id={order_id}`,
                notify_url: `${origin}/api/payment/cashfree/webhook`
            },
            order_note: "Payment for Savify"
        };

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
            console.error('Cashfree Error:', data);
            return res.status(400).json({ error: 'Cashfree API Error: Missing payment_session_id' });
        }
    } catch (error) {
        const env = cashfreeEnv();
        console.error(`Cashfree create order error (${env}):`, error);
        // `error` is what the payer sees; `detail` is for whoever is on call.
        res.status(500).json({
            error: userFacingCashfreeError(error),
            detail: describeCashfreeError(error, env),
            cashfree_env: env
        });
    }
}
