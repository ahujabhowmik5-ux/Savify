import { useEffect } from 'react';

// The canonical privacy-policy document is the static page in client/public, so the
// site has exactly one version of this text. This route forwards to it.
export default function PrivacyPolicyPage() {
    useEffect(() => {
        window.location.replace('/privacy-policy.html');
    }, []);

    return (
        <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#D4AF37', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 15 }}>
            Opening&nbsp;<a href="/privacy-policy.html" style={{ color: '#D4AF37' }}>/privacy-policy.html</a>&nbsp;…
        </div>
    );
}
