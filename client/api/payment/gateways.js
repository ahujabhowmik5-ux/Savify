/**
 * Which payment gateways this deployment still has credentials for.
 *
 * Cashfree is currently refusing transactions at the account level, so the
 * question "what else could we switch to today" is worth answering without
 * guessing. Reports presence only — never a key, never a prefix long enough to
 * be useful to anyone.
 */
export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const has = (name) => !!String(process.env[name] || '').trim();

    res.json({
        cashfree: {
            app_id: has('CASHFREE_APP_ID'),
            secret: has('CASHFREE_SECRET_KEY'),
            env_pinned: has('CASHFREE_ENV')
        },
        phonepe: {
            merchant_id: has('PHONEPE_MERCHANT_ID'),
            salt_key: has('PHONEPE_SALT_KEY'),
            salt_index: has('PHONEPE_SALT_INDEX')
        },
        razorpay: {
            key_id: has('RAZORPAY_KEY_ID'),
            key_secret: has('RAZORPAY_KEY_SECRET')
        },
        stripe: {
            secret_key: has('STRIPE_SECRET_KEY')
        }
    });
}
