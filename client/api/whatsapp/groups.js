import { supabaseAdmin } from '../_supabaseClient.js';
import { isWasenderConfigured, listWasenderGroups } from '../_wasender.js';

/**
 * The WhatsApp groups the connected WaSender session belongs to, each tagged
 * with the location it is already mapped to. Use this to collect the JIDs for
 * supabase_whatsapp_pool_groups.sql.
 */
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    if (!isWasenderConfigured()) {
        return res.status(500).json({ success: false, error: 'WASENDER_API_KEY is not set' });
    }

    try {
        const groups = await listWasenderGroups();

        let mapped = [];
        if (supabaseAdmin) {
            const { data } = await supabaseAdmin
                .from('whatsapp_pool_groups')
                .select('location_key, label, group_jid, is_active');
            mapped = data || [];
        }

        const byJid = new Map(mapped.filter(m => m.group_jid).map(m => [m.group_jid, m]));

        res.json({
            success: true,
            groups: groups.map(g => ({
                jid: g.jid,
                name: g.name,
                mapped_to: byJid.get(g.jid)?.location_key || null,
                is_active: byJid.get(g.jid)?.is_active || false
            })),
            unmapped_locations: mapped.filter(m => !m.group_jid).map(m => m.location_key)
        });
    } catch (err) {
        console.error('Failed to list WhatsApp groups:', err);
        res.status(500).json({ success: false, error: err.message });
    }
}
