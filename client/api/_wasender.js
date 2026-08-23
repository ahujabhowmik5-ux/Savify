// ══════════════════════════════════════════════════════════════
// WaSenderAPI — WhatsApp group broadcasts
// ══════════════════════════════════════════════════════════════
// Docs: https://wasenderapi.com/api-docs
//   POST {base}/api/send-message   { to: '<jid>@g.us', text: '...' }
//   GET  {base}/api/groups         -> { success, data: [{ jid, name }] }
// Auth is a bearer token on both.
//
// Every helper here is best-effort: a WhatsApp failure must never stop a pool
// from being created.

const DEFAULT_BASE_URL = 'https://www.wasenderapi.com';

// WaSender throttles bursts; a short gap between groups keeps a hall with
// several groups from tripping it.
const SEND_GAP_MS = 1200;

const PLATFORM_LABELS = {
    blinkit: 'Blinkit',
    zepto: 'Zepto',
    swiggy_instamart: 'Swiggy Instamart',
    amazon_fresh: 'Amazon Fresh',
    swiggy_food: 'Swiggy',
    zomato_food: 'Zomato'
};

const PLATFORM_EMOJI = {
    blinkit: '🛒',
    zepto: '⚡',
    swiggy_instamart: '🛍️',
    amazon_fresh: '📦',
    swiggy_food: '🍽️',
    zomato_food: '🍽️'
};

function apiKey() {
    return String(process.env.WASENDER_API_KEY || '').trim();
}

function baseUrl() {
    return String(process.env.WASENDER_API_URL || DEFAULT_BASE_URL).trim().replace(/\/+$/, '');
}

/**
 * Testing override.
 *
 * With WASENDER_TEST_RECIPIENT set, every pool announcement goes to that one
 * number instead of any hall group. It exists so the flow can be exercised end
 * to end without posting into real student groups, and it takes precedence
 * over everything below — if it is set, no group is ever messaged.
 *
 * Accepts a bare number ('919876543210'), which is normalised to a WhatsApp
 * JID. Unset it to resume normal group delivery.
 */
export function testRecipientJid() {
    const raw = String(process.env.WASENDER_TEST_RECIPIENT || '').trim();
    if (!raw) return null;
    if (raw.includes('@')) return raw;
    const digits = raw.replace(/[^0-9]/g, '');
    if (!digits) return null;
    // Assume India when no country code is present.
    const withCc = digits.length === 10 ? `91${digits}` : digits;
    return `${withCc}@s.whatsapp.net`;
}

export function isWasenderConfigured() {
    return !!apiKey();
}

function appUrl() {
    return String(process.env.PUBLIC_APP_URL || 'https://savify.in').trim().replace(/\/+$/, '');
}

async function wasenderFetch(path, { method = 'GET', body = null } = {}) {
    const headers = {
        Authorization: `Bearer ${apiKey()}`,
        Accept: 'application/json'
    };
    if (body) headers['Content-Type'] = 'application/json';

    const res = await fetch(`${baseUrl()}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });

    const text = await res.text();
    let data;
    try {
        data = text ? JSON.parse(text) : {};
    } catch {
        throw new Error(`WaSender returned non-JSON (${res.status}): ${text.slice(0, 160)}`);
    }
    if (!res.ok) {
        throw new Error(data?.message || `WaSender request failed (${res.status})`);
    }
    return data;
}

/** Every WhatsApp group the connected session is in. */
export async function listWasenderGroups() {
    const data = await wasenderFetch('/api/groups');
    const rows = Array.isArray(data?.data) ? data.data : [];
    return rows.map(g => ({ jid: g.jid, name: g.name }));
}

/** Post one text message to one group JID. */
export async function sendGroupMessage(jid, text) {
    return wasenderFetch('/api/send-message', {
        method: 'POST',
        body: { to: jid, text }
    });
}

/**
 * Which groups should hear about this pool.
 * Hall match first; miscellaneous locations fall through to the groups flagged
 * is_fallback, so an off-campus pool still reaches someone.
 */
export async function resolveTargetGroups(supabase, { hallId, locationKey, creatorId }) {
    const activeRows = (rows) => (rows || []).filter(r => r.is_active && r.group_jid);

    // Testing beats every routing rule below — never fan out to real groups
    // while a test recipient is configured.
    const testJid = testRecipientJid();
    if (testJid) {
        return [{ id: null, label: 'Test recipient', group_jid: testJid, is_active: true, send_count: 0, isTest: true }];
    }

    if (hallId) {
        const { data } = await supabase
            .from('whatsapp_pool_groups')
            .select('id, label, group_jid, is_active, send_count')
            .eq('hall_id', hallId);
        const rows = activeRows(data);
        if (rows.length) return rows;
    }

    // The pool row carries no hall — fall back to the creator's profile hall
    // before giving up on a hall match entirely.
    if (!hallId && creatorId) {
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('hall_id')
            .eq('id', creatorId)
            .maybeSingle();
        if (profile?.hall_id) {
            const { data } = await supabase
                .from('whatsapp_pool_groups')
                .select('id, label, group_jid, is_active, send_count')
                .eq('hall_id', profile.hall_id);
            const rows = activeRows(data);
            if (rows.length) return rows;
        }
    }

    if (locationKey) {
        // Profile halls are stored as 'LBS (Lalbahadur Sastry Hall)'; the short
        // code in front is what the mapping table keys on.
        const shortCode = String(locationKey).trim().split(/[\s(]/)[0];
        const { data } = await supabase
            .from('whatsapp_pool_groups')
            .select('id, label, group_jid, is_active, send_count')
            .ilike('location_key', shortCode);
        const rows = activeRows(data);
        if (rows.length) return rows;
    }

    const { data: fallback } = await supabase
        .from('whatsapp_pool_groups')
        .select('id, label, group_jid, is_active, send_count')
        .eq('is_fallback', true);
    return activeRows(fallback);
}

/** The message that lands in the hall group. */
export function buildPoolMessage({ platform, poolName, label, expiresAt }) {
    const brand = PLATFORM_LABELS[platform] || poolName || 'Quick commerce';
    const emoji = PLATFORM_EMOJI[platform] || '🛒';
    const place = label || 'your hall';

    const minutesLeft = expiresAt
        ? Math.max(1, Math.round((new Date(expiresAt) - Date.now()) / 60000))
        : 15;

    return [
        `${emoji} *${brand} pool just opened — ${place}*`,
        '',
        `Someone in ${place} started a shared ${brand} cart on Savify.`,
        'Add your items and the delivery fee gets split across everyone in the pool — cross the free-delivery limit together and it drops to ₹0.',
        '',
        `⏱️ *${minutesLeft} min* to join (plus 10 minutes of extra time after that)`,
        `👉 ${appUrl()}/dashboard`,
        '',
        '_Sent by Savify_'
    ].join('\n');
}

/**
 * Send to each group in turn, spaced out, recording what landed.
 * One group failing never stops the rest.
 */
export async function broadcastToGroups(supabase, groups, message) {
    const results = [];
    let sent = 0;

    for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        try {
            await sendGroupMessage(group.group_jid, message);
            sent++;
            results.push({ jid: group.group_jid, ok: true });

            if (group.id) {
                await supabase
                    .from('whatsapp_pool_groups')
                    .update({ last_sent_at: new Date().toISOString(), send_count: (group.send_count || 0) + 1 })
                    .eq('id', group.id);
            }
        } catch (err) {
            console.error(`WaSender send failed for ${group.group_jid}:`, err.message);
            results.push({ jid: group.group_jid, ok: false, error: err.message });
        }

        if (i < groups.length - 1) {
            await new Promise(resolve => setTimeout(resolve, SEND_GAP_MS));
        }
    }

    return { sent, attempted: groups.length, results };
}
