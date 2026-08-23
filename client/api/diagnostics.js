import { supabaseAdmin, missingVars } from './_supabaseClient.js';
import { cashfreeEnv } from './_cashfree.js';
import { isWasenderConfigured, testRecipientJid } from './_wasender.js';
import { isSimulationMode } from './_paymentMode.js';

/**
 * One place to answer "why isn't this working".
 *
 * Every feature here fails silently when an environment variable is missing or
 * wrong, and each failure previously looked like a different bug. Reports
 * presence and capability only — never a key, never a secret.
 */
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const has = (n) => !!String(process.env[n] || '').trim();

    // Read the key's own role claim rather than probing with a write.
    // A write probe cannot tell the difference: an RLS-blocked update returns
    // no error and zero rows, exactly like a query that matched nothing. The
    // Supabase key is a JWT whose payload names its role, which is decisive.
    // Only the role is read — never the signature, never the key itself.
    const keyRole = (() => {
        const raw = String(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '').trim();
        if (!raw) return 'absent';
        try {
            const payload = raw.split('.')[1];
            if (!payload) return 'unrecognised (not a JWT)';
            const json = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
            return json.role || 'unknown';
        } catch {
            return 'undecodable';
        }
    })();

    res.json({
        database: {
            client_initialised: !!supabaseAdmin,
            missing: missingVars,
            key_set_as: has('SUPABASE_SERVICE_ROLE_KEY')
                ? 'SUPABASE_SERVICE_ROLE_KEY'
                : (has('SUPABASE_SERVICE_KEY') ? 'SUPABASE_SERVICE_KEY' : null),
            // Must be 'service_role'. 'anon' reads fine and silently fails
            // every write, which is what broke the WhatsApp broadcast.
            key_role: keyRole,
            can_write: keyRole === 'service_role'
        },
        payments: {
            mode: isSimulationMode() ? 'simulation' : 'gateway',
            cashfree_env: cashfreeEnv(),
            cashfree_credentials: has('CASHFREE_APP_ID') && has('CASHFREE_SECRET_KEY')
        },
        whatsapp: {
            api_key_present: isWasenderConfigured(),
            test_recipient: testRecipientJid(),
            public_app_url: String(process.env.PUBLIC_APP_URL || '').trim() || null
        },
        push: {
            vapid_configured: has('VAPID_PUBLIC_KEY') && has('VAPID_PRIVATE_KEY')
        }
    });
}
