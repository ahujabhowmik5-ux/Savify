// ══════════════════════════════════════════════════════════════
// Shared Cashfree client for the serverless payment functions
// ══════════════════════════════════════════════════════════════
// Cashfree runs two entirely separate stacks — sandbox (test keys) and
// production (live keys) — and a key only works against its own stack.
// Pointing at production with test keys, or with an account whose live mode
// has not been activated yet, fails EVERY order with
// "transactions are not enabled for your payment gateway account".
// CASHFREE_ENV pins the stack explicitly; with it unset we infer from the key
// prefix, because Cashfree test app IDs are prefixed with TEST.

export const CASHFREE_BASE_URLS = {
    sandbox: 'https://sandbox.cashfree.com/pg',
    production: 'https://api.cashfree.com/pg'
};

const API_VERSION = '2023-08-01';

export function cashfreeEnv() {
    const explicit = String(process.env.CASHFREE_ENV || '').trim().toLowerCase();
    if (['sandbox', 'test', 'testing'].includes(explicit)) return 'sandbox';
    if (['production', 'prod', 'live'].includes(explicit)) return 'production';
    // Cashfree sandbox app IDs look like TEST1234567890abcdef.
    return /^test/i.test(String(process.env.CASHFREE_APP_ID || '').trim()) ? 'sandbox' : 'production';
}

export function cashfreeCredentials() {
    // Env vars pasted into a dashboard routinely carry a trailing newline,
    // which Cashfree reads as part of the secret and rejects.
    return {
        appId: String(process.env.CASHFREE_APP_ID || '').trim(),
        secret: String(process.env.CASHFREE_SECRET_KEY || '').trim()
    };
}

/**
 * What to show the person trying to pay. They cannot act on KYC state or env
 * vars, so tell them the truth in one line and keep the diagnosis for the logs.
 */
export function userFacingCashfreeError(error) {
    const raw = error?.message || error?.error_description || (typeof error === 'string' ? error : '') || '';
    if (/not enabled|not activated|inactive/i.test(raw)) {
        return 'Payments are temporarily unavailable while we sort things out with our payment provider. Your pool seat has not been charged — please try again later.';
    }
    if (/authentic|unauthor|invalid.*(client|credential|key|token)|ip.*(whitelist|allow)/i.test(raw)) {
        return 'We could not reach the payment gateway. Nothing has been charged — please try again in a few minutes.';
    }
    return 'Payment could not be started. Nothing has been charged — please try again.';
}

/**
 * The operator-facing diagnosis: what actually went wrong and what to do about
 * it. Goes to logs and the `detail` field, never to the payer.
 */
export function describeCashfreeError(error, env = cashfreeEnv()) {
    const raw = error?.message
        || error?.error_description
        || (typeof error === 'string' ? error : '')
        || 'Unknown gateway error';

    if (/not enabled|not activated|inactive/i.test(raw)) {
        return env === 'production'
            ? 'Payments are not live on this Cashfree account yet. Complete KYC/activation in the Cashfree dashboard, or set CASHFREE_ENV=sandbox with test keys to run in test mode.'
            : 'This Cashfree sandbox account cannot accept transactions. Check CASHFREE_APP_ID / CASHFREE_SECRET_KEY are the Test-mode keys from Cashfree -> Developers -> API Keys.';
    }
    if (/authentic|unauthor|invalid.*(client|credential|key|token)/i.test(raw)) {
        return `Cashfree rejected the API keys in ${env} mode. Live keys only work with CASHFREE_ENV=production, test keys only with CASHFREE_ENV=sandbox.`;
    }
    if (/ip.*(whitelist|allow)/i.test(raw)) {
        return 'Cashfree blocked this server IP. Add the deployment IP to the allowed list in the Cashfree dashboard, or clear the IP restriction.';
    }
    return `Cashfree: ${raw}`;
}

export async function cashfreeFetch(endpoint, method, body = null) {
    const env = cashfreeEnv();
    const { appId, secret } = cashfreeCredentials();

    const headers = {
        'x-client-id': appId,
        'x-client-secret': secret,
        'x-api-version': API_VERSION,
        'Accept': 'application/json',
    };
    if (body) headers['Content-Type'] = 'application/json';

    const res = await fetch(`${CASHFREE_BASE_URLS[env]}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json();
    if (!res.ok) throw data;
    return data;
}
