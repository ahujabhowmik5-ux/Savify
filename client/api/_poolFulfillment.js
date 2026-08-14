import { supabaseAdmin } from './_supabaseClient.js';

/**
 * Shared pool-seat logic for the Cashfree handlers.
 *
 * The webhook and the status poll can both be the first to confirm a payment,
 * so the seat claim has to be idempotent and safe to run twice.
 */

/** Find (or open) the live slot for a subscription plan. */
export async function resolveRunningSlotForPlan(planName) {
    if (!planName) return null;
    try {
        const { data: pt } = await supabaseAdmin
            .from('pool_types')
            .select('id')
            .eq('name', planName)
            .maybeSingle();
        if (!pt) return null;

        const { data: running } = await supabaseAdmin
            .from('pool_slots')
            .select('id')
            .eq('pool_type_id', pt.id)
            .eq('status', 'running')
            .order('created_at', { ascending: false })
            .limit(1);
        if (running && running.length > 0) return running[0].id;

        // slot_start / slot_end are NOT NULL.
        const { data: created, error } = await supabaseAdmin
            .from('pool_slots')
            .insert({
                pool_type_id: pt.id,
                status: 'running',
                slot_date: new Date().toISOString().split('T')[0],
                slot_start: 'All Day',
                slot_end: 'All Day'
            })
            .select('id')
            .single();
        if (error) {
            console.error('Failed to open pool slot:', error);
            return null;
        }
        return created?.id || null;
    } catch (e) {
        console.error('resolveRunningSlotForPlan failed:', e);
        return null;
    }
}

/** Is this slot id usable — i.e. a real slot that is still running? */
async function slotIsRunning(slotId) {
    if (!slotId || slotId === 'sub_pool' || slotId === 'headcount') return false;
    const { data } = await supabaseAdmin
        .from('pool_slots')
        .select('id, status')
        .eq('id', slotId)
        .maybeSingle();
    return !!data && data.status === 'running';
}

/**
 * Give a paying user their seat. Marks payment_status 'paid' so the plate counts
 * it; a DB trigger closes the pool and opens a fresh one at capacity.
 *
 * Returns the slot id the seat landed in, or null if it could not be placed.
 */
export async function claimPaidSeat({ contextId, userId, planName }) {
    try {
        let slotId = contextId;

        // The pool may have filled and rolled over between checkout and
        // confirmation — never seat a payer into a closed pool.
        if (!(await slotIsRunning(slotId))) {
            slotId = await resolveRunningSlotForPlan(planName);
            if (!slotId) {
                console.error('Could not place paid seat', { contextId, planName, userId });
                return null;
            }
        }

        const { data: profile } = await supabaseAdmin
            .from('user_profiles')
            .select('full_name')
            .eq('id', userId)
            .maybeSingle();

        const paidPatch = { payment_status: 'paid', paid_at: new Date().toISOString() };

        const { data: existing } = await supabaseAdmin
            .from('pool_members')
            .select('id, payment_status')
            .eq('pool_slot_id', slotId)
            .eq('user_id', userId)
            .limit(1);

        if (existing && existing.length > 0) {
            if (existing[0].payment_status !== 'paid') {
                await supabaseAdmin.from('pool_members').update(paidPatch).eq('id', existing[0].id);
            }
            return slotId;
        }

        const { error } = await supabaseAdmin.from('pool_members').insert([{
            pool_slot_id: slotId,
            user_id: userId,
            display_name: profile?.full_name || 'Anonymous',
            ...paidPatch
        }]);
        if (error) {
            // A concurrent webhook/status race can lose the unique(slot,user)
            // insert; that is fine, the other one seated them.
            console.error('Failed to insert pool member:', error);
        }
        return slotId;
    } catch (e) {
        console.error('claimPaidSeat failed:', e);
        return null;
    }
}

/** Best-effort activity log — never let this break fulfilment. */
export async function logActivity(userId, description) {
    try {
        await supabaseAdmin.from('global_activities').insert({
            user_id: userId,
            action_type: 'PAYMENT',
            description
        });
    } catch (e) {
        console.error('Activity log failed (non-fatal):', e);
    }
}
