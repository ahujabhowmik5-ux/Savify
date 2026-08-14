// Global legal footer. Rendered on the home page and the dashboard so the
// mandatory policy pages are reachable from anywhere on the site — payment
// gateway QC checks for exactly this.
//
// The links point at the static pages in client/public, so they resolve whether
// or not the SPA has booted.
const LEGAL_LINKS = [
    { href: '/terms-and-conditions.html', label: 'Terms & Conditions' },
    { href: '/privacy-policy.html', label: 'Privacy Policy' },
    { href: '/refund-policy.html', label: 'Refund Policy' },
    { href: '/contact.html', label: 'Contact Us' }
];

export default function Footer() {
    const linkStyle = {
        color: '#D4AF37',
        textDecoration: 'none',
        fontSize: 14,
        fontWeight: 600,
        whiteSpace: 'nowrap'
    };

    return (
        <footer
            style={{
                borderTop: '1px solid rgba(212, 175, 55, 0.2)',
                background: '#0c0c0c',
                padding: '40px 24px 32px',
                marginTop: 48,
                color: '#999',
                fontFamily: 'Inter, system-ui, sans-serif'
            }}
        >
            <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

                {/* Business identity */}
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#D4AF37', letterSpacing: '-0.5px' }}>Savify</div>
                    <div style={{ fontSize: 14, color: '#bbb', marginTop: 6 }}>
                        Savify is a trade name of Bhowmik Ahuja
                    </div>
                </div>

                {/* Legal pages */}
                <nav
                    style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '12px 28px',
                        justifyContent: 'center',
                        paddingTop: 20,
                        borderTop: '1px solid rgba(255,255,255,0.06)'
                    }}
                >
                    {LEGAL_LINKS.map(l => (
                        <a key={l.href} href={l.href} style={linkStyle}>{l.label}</a>
                    ))}
                </nav>

                {/* Contact */}
                <div
                    style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '10px 32px',
                        justifyContent: 'center',
                        paddingTop: 20,
                        borderTop: '1px solid rgba(255,255,255,0.06)'
                    }}
                >
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#777', fontWeight: 700 }}>Email</div>
                        <a href="mailto:savifyhq@gmail.com" style={{ ...linkStyle, fontSize: 15 }}>savifyhq@gmail.com</a>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#777', fontWeight: 700 }}>Phone &amp; WhatsApp</div>
                        <a href="tel:+918517801653" style={{ ...linkStyle, fontSize: 15 }}>+91 8517801653</a>
                    </div>
                </div>

                <div style={{ textAlign: 'center', fontSize: 13, color: '#777', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    © 2026 Savify. All rights reserved.
                </div>
            </div>
        </footer>
    );
}
