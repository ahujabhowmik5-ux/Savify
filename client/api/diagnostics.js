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

    // The decisive question for the database: can it actually WRITE? An anon
    // key reads fine and is blocked by RLS on write, which is invisible until
    // something silently does nothing.
    let dbWrite = 'unknown';
    if (supabaseAdmin) {
        try {
            const { error } = await supabaseAdmin
                .from('group_carts')
                .update({ whatsapp_notified_at: null })
                .eq('id', '00000000-0000-0000-0000-000000000000')
                .select('id');
            dbWrite = error ? `error: ${error.message}` : 'ok';
        } catch (e) {
            dbWrite = `error: ${e.message}`;
        }
    }

    res.json({
        database: {
            client_initialised: !!supabaseAdmin,
            missing: missingVars,
            service_role_key_present: has('SUPABASE_SERVICE_ROLE_KEY') || has('SUPABASE_SERVICE_KEY'),
            write_check: dbWrite
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
