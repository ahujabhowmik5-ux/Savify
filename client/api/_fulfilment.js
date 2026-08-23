import { supabaseAdmin } from './_supabaseClient.js';
import { claimPaidSeat, logActivity } from './_poolFulfillment.js';

/**
 * Turn a confirmed payment into the thing the user actually bought.
 *
 * This is the one place fulfilment happens, so the simulated gateway and the
 * real one cannot drift: whatever the simulator exercises is exactly what runs
 * when Cashfree pays out. Idempotent — a webhook and a status poll landing on
 * the same order must not seat anyone twice or double-insert a cart payment.
 */
export async function fulfilTransaction(txn, { source = 'Cashfree' } = {}) {
    if (!txn) return { fulfilled: false, reason: 'no_transaction' };

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

        // Only one cart_payments row per user per cart, however many times
        // confirmation arrives.
        const { data: existing } = await supabaseAdmin
            .from('cart_payments')
            .select('id')
            .eq('cart_id', txn.context_id)
            .eq('user_id', txn.user_id)
            .limit(1);

        if (!existing || existing.length === 0) {
            await supabaseAdmin.from('cart_payments').insert([{
                cart_id: txn.context_id,
                user_id: txn.user_id,
                amount_paid: txn.amount,
                commission_fee: 5,
                payment_status: 'success',
                paid_at: new Date().toISOString()
            }]);
            await logActivity(txn.user_id, `Paid split via ${source}`);
        }

        return { fulfilled: true, kind: 'cart' };
    }

    if (txn.context_type === 'pool' || txn.context_type === 'subscription') {
        const slotId = await claimPaidSeat({
            contextId: txn.context_id,
            userId: txn.user_id,
            planName: txn.plan_name
        });
        if (!slotId) return { fulfilled: false, reason: 'no_slot_resolved' };

        await logActivity(txn.user_id, `Paid subscription split via ${source}`);
        return { fulfilled: true, kind: 'pool', slot_id: slotId };
    }

    return { fulfilled: false, reason: 'unknown_context_type' };
}
