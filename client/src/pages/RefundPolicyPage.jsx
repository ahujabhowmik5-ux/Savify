import { useEffect } from 'react';

// The canonical refund-policy document is the static page in client/public, so the
// site has exactly one version of this text. This route forwards to it.
export default function RefundPolicyPage() {
    useEffect(() => {
        window.location.replace('/refund-policy.html');
    }, []);

    return (
        <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#D4AF37', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 15 }}>
            Opening&nbsp;<a href="/refund-policy.html" style={{ color: '#D4AF37' }}>/refund-policy.html</a>&nbsp;…
        </div>
    );
}
