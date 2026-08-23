import { cashfreeFetch, cashfreeEnv, cashfreeCredentials, CASHFREE_BASE_URLS, describeCashfreeError } from '../../_cashfree.js';

/**
 * Answers one question: does Cashfree accept an order from this deployment's
 * credentials, or is it refusing at the account level?
 *
 * It calls the real create-order API with the real keys and hands back exactly
 * what Cashfree said — no secrets, no database writes, no fulfilment.
 *
 * The probe order id is deterministic per hour, so hammering this endpoint
 * cannot spray junk orders across the merchant account: the second call in an
 * hour collides with the first and Cashfree rejects the duplicate. A probe
 * order is never paid and simply expires.
 */
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const env = cashfreeEnv();
    const { appId, secret } = cashfreeCredentials();

    const config = {
        env,
        base_url: CASHFREE_BASE_URLS[env],
        app_id_present: !!appId,
        app_id_prefix: appId ? appId.slice(0, 4) : null,
        secret_present: !!secret,
        env_var_set: !!String(process.env.CASHFREE_ENV || '').trim()
    };

    if (!appId || !secret) {
        return res.status(500).json({
            verdict: 'CREDENTIALS_MISSING',
            meaning: `CASHFREE_APP_ID / CASHFREE_SECRET_KEY are not set for ${env} mode in this deployment.`,
            config
        });
    }

    const hourStamp = new Date().toISOString().slice(0, 13).replace(/[-T]/g, '');
    const probeOrderId = `savify_selftest_${hourStamp}`;

    try {
        const data = await cashfreeFetch('/orders', 'POST', {
            order_amount: 1,
            order_currency: 'INR',
            order_id: probeOrderId,
            customer_details: {
                customer_id: 'savify_selftest',
                customer_phone: '9999999999',
                customer_email: 'selftest@savify.in',
                customer_name: 'Savify Selftest'
            },
            order_note: 'Savify connectivity self-test — never paid'
        });

        return res.json({
            verdict: 'GATEWAY_OK',
            meaning: 'Cashfree accepted an order. The account is live and the keys are valid — any payment failure is in the app, not the gateway.',
            got_payment_session: !!data?.payment_session_id,
            probe_order_id: probeOrderId,
            config
        });
    } catch (error) {
        const raw = error?.message || String(error);

        // A duplicate means an earlier probe this hour already succeeded, which
        // is itself proof the account takes orders.
        if (/already exists|duplicate/i.test(raw)) {
            return res.json({
                verdict: 'GATEWAY_OK',
                meaning: 'Cashfree reports this probe order already exists, so an earlier probe was accepted. The account is live and the keys are valid.',
                probe_order_id: probeOrderId,
                config
            });
        }

        const accountInactive = /not enabled|not activated|inactive/i.test(raw);

        return res.status(200).json({
            verdict: accountInactive ? 'ACCOUNT_NOT_ACTIVATED' : 'GATEWAY_REJECTED',
            meaning: accountInactive
                ? 'Cashfree is refusing at the account level. The keys and endpoint are fine; the merchant account is not activated to accept transactions. Only completing activation in the Cashfree dashboard fixes this.'
                : describeCashfreeError(error, env),
            cashfree_raw_message: raw,
            cashfree_code: error?.code || error?.type || null,
            probe_order_id: probeOrderId,
            config
        });
    }
}
