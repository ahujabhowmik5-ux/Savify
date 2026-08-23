import { supabaseAdmin } from '../_supabaseClient.js';
import {
    isWasenderConfigured,
    resolveTargetGroups,
    buildPoolMessage,
    broadcastToGroups
} from '../_wasender.js';

/**
 * Announce a freshly opened pool in the WhatsApp group(s) for the location it
 * was started from.
 * Body: { pool_id, platform, pool_name, hall_id, location_key, creator_id }
 */
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { pool_id, platform, pool_name, hall_id, location_key, creator_id } = req.body || {};

    if (!pool_id || !platform) {
        return res.status(400).json({ success: false, error: 'pool_id and platform are required' });
    }

    // A missing key is a configuration gap, not a user-facing failure — pool
    // creation must never fail because the WhatsApp side is not wired up yet.
    if (!isWasenderConfigured()) {
        return res.json({ success: true, sent: 0, skipped: 'wasender_not_configured' });
    }
    if (!supabaseAdmin) {
        return res.json({ success: true, sent: 0, skipped: 'supabase_unavailable' });
    }

    try {
        const { data: cart, error: cartError } = await supabaseAdmin
            .from('group_carts')
            .select('id, status, hall_id, expires_at, whatsapp_notified_at')
            .eq('id', pool_id)
            .maybeSingle();

        if (cartError) throw cartError;
        if (!cart) return res.status(404).json({ success: false, error: 'Pool not found' });
        if (cart.status !== 'open') return res.json({ success: true, sent: 0, skipped: 'pool_not_open' });
        if (cart.whatsapp_notified_at) return res.json({ success: true, sent: 0, skipped: 'already_notified' });

        const groups = await resolveTargetGroups(supabaseAdmin, {
            hallId: hall_id || cart.hall_id || null,
            locationKey: location_key || null,
            creatorId: creator_id || null
        });

        if (groups.length === 0) {
            return res.json({ success: true, sent: 0, skipped: 'no_groups_mapped' });
        }

        // Claim the broadcast before sending. Two taps landing at the same
        // moment would otherwise both pass the check above and double-post.
        const { data: claimed, error: claimError } = await supabaseAdmin
            .from('group_carts')
            .update({ whatsapp_notified_at: new Date().toISOString() })
            .eq('id', pool_id)
            .is('whatsapp_notified_at', null)
            .select('id');

        if (claimError) throw claimError;
        if (!claimed || claimed.length === 0) {
            // Zero rows here means either a genuine race or a write we were not
            // allowed to make. Re-read before blaming a race: reporting a
            // permissions failure as "already notified" hides the real fault.
            const { data: recheck } = await supabaseAdmin
                .from('group_carts')
                .select('whatsapp_notified_at')
                .eq('id', pool_id)
                .maybeSingle();

            if (recheck && !recheck.whatsapp_notified_at) {
                console.error('Could not claim WhatsApp broadcast — the database key cannot write to group_carts. Set SUPABASE_SERVICE_ROLE_KEY to the service_role key.');
                return res.status(500).json({
                    success: false,
                    error: 'claim_failed_no_write_permission',
                    detail: 'The server could not update group_carts. SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SERVICE_KEY is not a service_role key, so row-level security is blocking the write.'
                });
            }
            return res.json({ success: true, sent: 0, skipped: 'already_notified' });
        }

        const message = buildPoolMessage({
            platform,
            poolName: pool_name,
            label: groups[0].label,
            expiresAt: cart.expires_at
        });

        const result = await broadcastToGroups(supabaseAdmin, groups, message);

        // Nothing landed — release the claim so a retry is not suppressed.
        if (result.sent === 0) {
            await supabaseAdmin
                .from('group_carts')
                .update({ whatsapp_notified_at: null })
                .eq('id', pool_id);
        }

        res.json({ success: true, ...result });
    } catch (err) {
        console.error('WhatsApp pool notification failed:', err);
        res.status(500).json({ success: false, error: err.message });
    }
}
