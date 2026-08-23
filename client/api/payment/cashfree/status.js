import { supabaseAdmin } from '../../_supabaseClient.js';
import { claimPaidSeat, logActivity } from '../../_poolFulfillment.js';
import { cashfreeFetch } from '../../_cashfree.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        // Accept ?orderId=, ?order_id= and a trailing path segment, so the
        // dashboard can never poll a URL shape this function does not answer.
        const pathId = (req.url || '').split('?')[0].split('/').filter(Boolean).pop();
        const orderId = req.query.orderId
            || req.query.order_id
            || (pathId && pathId !== 'status' ? decodeURIComponent(pathId) : null);
        if (!orderId) return res.status(400).json({ error: 'orderId is required' });

        const { data: txn, error } = await supabaseAdmin
            .from('phonepe_transactions')
            .select('status, context_type, context_id, user_id, amount, plan_name')
            .eq('merchant_transaction_id', orderId)
            .single();

        if (error || !txn) return res.status(404).json({ error: 'Transaction not found' });

        if (txn.status === 'SUCCESS') {
            // Self-heal: if the webhook marked this paid but the seat never
            // landed (a lost insert, a pool that rolled over), place it now.
            // claimPaidSeat is idempotent, so repeating this is free.
            if (txn.context_type === 'pool' || txn.context_type === 'subscription') {
                await claimPaidSeat({
                    contextId: txn.context_id,
                    userId: txn.user_id,
                    planName: txn.plan_name
                });
            }
            return res.json({ status: txn.status, context_type: txn.context_type });
        }
        if (txn.status === 'FAILED') {
            return res.json({ status: txn.status, context_type: txn.context_type });
        }

        // Poll Cashfree for real-time status
        try {
            const data = await cashfreeFetch(`/orders/${orderId}`, 'GET');
            const orderStatus = data?.order_status;

            if (orderStatus === 'PAID') {
                await supabaseAdmin
                    .from('phonepe_transactions')
                    .update({ status: 'SUCCESS' })
                    .eq('merchant_transaction_id', orderId);

                // Fulfillment
                if (txn.context_type === 'cart') {
                    const { data: pendingItems } = await supabaseAdmin
                        .from('cart_items')
                        .select('id')
                        .eq('cart_id', txn.context_id)
                        .eq('user_id', txn.user_id)
                        .eq('payment_status', 'pending');

                    if (pendingItems && pendingItems.length > 0) {
                        await supabaseAdmin
                            .from('cart_items')
                            .update({ payment_status: 'paid' })
                            .in('id', pendingItems.map(i => i.id));
                    }

                    const { data: existingPayment } = await supabaseAdmin
                        .from('cart_payments')
                        .select('id')
                        .eq('cart_id', txn.context_id)
                        .eq('user_id', txn.user_id)
                        .limit(1);

                    if (!existingPayment || existingPayment.length === 0) {
                        await supabaseAdmin.from('cart_payments').insert([{
                            cart_id: txn.context_id,
                            user_id: txn.user_id,
                            amount_paid: txn.amount,
                            commission_fee: 5,
                            payment_status: 'success',
                            paid_at: new Date().toISOString()
                        }]);
                        await supabaseAdmin.from('global_activities').insert({
                            user_id: txn.user_id,
                            action_type: 'PAYMENT',
                            description: 'Paid split via Cashfree'
                        });
                    }

                    // Check if ALL items in the cart are now paid → mark cart as 'ordered'
                    const { data: remainingPending } = await supabaseAdmin
                        .from('cart_items')
                        .select('id')
                        .eq('cart_id', txn.context_id)
                        .eq('payment_status', 'pending');

                    if (!remainingPending || remainingPending.length === 0) {
                        await supabaseAdmin
                            .from('group_carts')
                            .update({ status: 'ordered' })
                            .eq('id', txn.context_id)
                            .in('status', ['open', 'checkout_pending']);
                    }
                } else if (txn.context_type === 'pool' || txn.context_type === 'subscription') {
                    await claimPaidSeat({
                        contextId: txn.context_id,
                        userId: txn.user_id,
                        planName: txn.plan_name
                    });
                    await logActivity(txn.user_id, 'Paid subscription split via Cashfree');
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
            console.error('Cashfree status check error:', cfError);
            return res.json({ status: txn.status, context_type: txn.context_type });
        }
    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
