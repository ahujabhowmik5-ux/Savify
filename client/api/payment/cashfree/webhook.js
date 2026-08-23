import crypto from 'crypto';
import { supabaseAdmin } from '../../_supabaseClient.js';
import { claimPaidSeat, logActivity } from '../../_poolFulfillment.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const signature = req.headers["x-webhook-signature"];
        const timestamp = req.headers["x-webhook-timestamp"];
        const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

        // Verify signature
        try {
            const generatedSignature = crypto.createHmac('sha256', String(process.env.CASHFREE_SECRET_KEY || '').trim())
                .update(timestamp + rawBody)
                .digest('base64');
            if (generatedSignature !== signature) {
                console.error('Webhook signature mismatch');
            }
        } catch (e) {
            console.error('Signature verification failed:', e);
        }

        const webhookData = req.body;
        const orderData = webhookData?.data?.order;
        const paymentData = webhookData?.data?.payment;

        if (!orderData) {
            return res.status(200).send('OK');
        }

        const orderId = orderData.order_id;
        const orderStatus = orderData.order_status;
        const cfPaymentId = paymentData?.cf_payment_id || null;
        
        let newStatus = 'PENDING';
        if (orderStatus === 'PAID') {
            newStatus = 'SUCCESS';
        } else if (orderStatus === 'FAILED' || orderStatus === 'EXPIRED' || orderStatus === 'TERMINATED') {
            newStatus = 'FAILED';
        }

        const { data: existingTxn, error: fetchError } = await supabaseAdmin
            .from('phonepe_transactions')
            .select('*')
            .eq('merchant_transaction_id', orderId)
            .single();

        if (fetchError || !existingTxn) {
            return res.status(200).send('OK');
        }

        if (existingTxn.status === 'SUCCESS' || newStatus === 'PENDING') {
            // Ignore if already success, or if webhook is just a pending/active notification
            return res.status(200).send('OK');
        }

        await supabaseAdmin
            .from('phonepe_transactions')
            .update({
                status: newStatus,
                phonepe_transaction_id: cfPaymentId ? String(cfPaymentId) : null,
                cashfree_order_id: orderId
            })
            .eq('merchant_transaction_id', orderId);

        if (newStatus === 'SUCCESS') {
            if (existingTxn.context_type === 'cart') {
                const { data: pendingItems } = await supabaseAdmin
                    .from('cart_items')
                    .select('id')
                    .eq('cart_id', existingTxn.context_id)
                    .eq('user_id', existingTxn.user_id)
                    .eq('payment_status', 'pending');

                if (pendingItems && pendingItems.length > 0) {
                    await supabaseAdmin
                        .from('cart_items')
                        .update({ payment_status: 'paid' })
                        .in('id', pendingItems.map(i => i.id));
                }

                await supabaseAdmin.from('cart_payments').insert([{
                    cart_id: existingTxn.context_id,
                    user_id: existingTxn.user_id,
                    amount_paid: existingTxn.amount,
                    commission_fee: 5,
                    payment_status: 'success',
                    paid_at: new Date().toISOString()
                }]);

                await supabaseAdmin.from('global_activities').insert({
                    user_id: existingTxn.user_id,
                    action_type: 'PAYMENT',
                    description: 'Paid split via Cashfree'
                });

                // Check if ALL items in the cart are now paid → mark cart as 'ordered'
                const { data: remainingPending } = await supabaseAdmin
                    .from('cart_items')
                    .select('id')
                    .eq('cart_id', existingTxn.context_id)
                    .eq('payment_status', 'pending');

                if (!remainingPending || remainingPending.length === 0) {
                    await supabaseAdmin
                        .from('group_carts')
                        .update({ status: 'ordered' })
                        .eq('id', existingTxn.context_id)
                        .in('status', ['open', 'checkout_pending']);
                }

            } else if (existingTxn.context_type === 'pool' || existingTxn.context_type === 'subscription') {
                await claimPaidSeat({
                    contextId: existingTxn.context_id,
                    userId: existingTxn.user_id,
                    planName: existingTxn.plan_name
                });
                await logActivity(existingTxn.user_id, 'Paid subscription split via Cashfree');
            }
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).send('Server Error');
    }
}
