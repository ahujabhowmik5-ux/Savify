import { useEffect } from 'react';

// The canonical contact document is the static page in client/public, so the
// site has exactly one version of this text. This route forwards to it.
export default function ContactPage() {
    useEffect(() => {
        window.location.replace('/contact.html');
    }, []);

    return (
        <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#D4AF37', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 15 }}>
            Opening&nbsp;<a href="/contact.html" style={{ color: '#D4AF37' }}>/contact.html</a>&nbsp;…
        </div>
    );
}
