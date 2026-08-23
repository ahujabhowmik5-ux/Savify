import { cashfreeEnv, cashfreeCredentials, CASHFREE_BASE_URLS } from '../../_cashfree.js';

/**
 * Read-only config check: which Cashfree stack this deployment talks to and
 * whether the credentials are present. Never returns the secret itself.
 * Useful for confirming a live/test mismatch without triggering a payment.
 */
export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const env = cashfreeEnv();
    const { appId, secret } = cashfreeCredentials();

    res.json({
        env,
        base_url: CASHFREE_BASE_URLS[env],
        app_id_present: !!appId,
        app_id_prefix: appId ? appId.slice(0, 4) : null,
        secret_present: !!secret,
        env_var_set: !!String(process.env.CASHFREE_ENV || '').trim()
    });
}
