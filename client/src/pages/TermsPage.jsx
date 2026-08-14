import { useEffect } from 'react';

// The canonical terms-and-conditions document is the static page in client/public, so the
// site has exactly one version of this text. This route forwards to it.
export default function TermsPage() {
    useEffect(() => {
        window.location.replace('/terms-and-conditions.html');
    }, []);

    return (
        <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#D4AF37', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 15 }}>
            Opening&nbsp;<a href="/terms-and-conditions.html" style={{ color: '#D4AF37' }}>/terms-and-conditions.html</a>&nbsp;…
        </div>
    );
}
