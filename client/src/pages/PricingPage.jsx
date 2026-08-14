import '../styles/landing.css';

export default function PricingPage() {
    return (
        <div className="landing-body">
            <nav className="landing-navbar">
                <div className="landing-container">
                    <div className="landing-nav-inner">
                        <a href="/" className="landing-logo">
                            <img src="https://i.ibb.co/v441FQJ1/gemini-2-5-flash-image-Refine-this-Savify-S-logo-to-be-flatter-more-geometric-and-ultra-premium.png" alt="Savify" style={{ height: 32 }} />
                            Savify
                        </a>
                        <div className="landing-nav-links">
                            <a href="/features">Features</a>
                            <a href="/pricing">Pricing</a>
                            <a href="/about">About</a>
                            <a href="/login" className="landing-cta-btn">Get Started</a>
                        </div>
                    </div>
                </div>
            </nav>

            <section style={{ textAlign: 'center', padding: '6rem 0 4rem' }}>
                <div className="landing-container">
                    <h1 style={{ fontFamily: 'var(--font-secondary)', fontSize: '3.5rem', marginBottom: '1rem', color: '#0A0A0A' }}>
                        Invest in <span className="gradient-text">Yourself</span>
                    </h1>
                    <p style={{ color: '#718096', fontSize: '1.2rem' }}>Discipline is the only asset that pays dividends forever.</p>
                </div>
            </section>

            <div className="landing-container" style={{ maxWidth: 900 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem', marginBottom: '5rem' }}>
                    <div style={{ background: 'white', borderRadius: 24, padding: '4rem 3rem', boxShadow: '0 10px 30px rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.02)', transition: 'all 0.4s', textAlign: 'center' }}>
                        <h3 style={{ fontFamily: 'var(--font-secondary)' }}>Savify Lite</h3>
                        <p style={{ color: '#718096' }}>The essentials for mindful spending.</p>
                        <div style={{ fontSize: '3.5rem', fontWeight: 800, fontFamily: 'var(--font-secondary)', margin: '1.5rem 0', color: '#0A0A0A' }}>$0<span style={{ fontSize: '1.2rem', color: '#718096', fontWeight: 400 }}>/forever</span></div>
                        <ul style={{ listStyle: 'none', margin: '2rem 0', textAlign: 'left', padding: 0 }}>
                            <li style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 12, color: '#718096' }}><i className="fas fa-check" style={{ color: '#10B981' }}></i> Basic Balance Score</li>
                            <li style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 12, color: '#718096' }}><i className="fas fa-check" style={{ color: '#10B981' }}></i> Manual Habit Logging</li>
                            <li style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 12, color: '#718096' }}><i className="fas fa-check" style={{ color: '#10B981' }}></i> Community Challenges</li>
                        </ul>
                        <a href="/login" style={{ display: 'block', width: '100%', padding: '1.2rem', borderRadius: 50, textDecoration: 'none', fontWeight: 700, textAlign: 'center', background: '#FAFAF9', color: '#0A0A0A', border: '1px solid rgba(0,0,0,0.05)' }}>Get Started</a>
                    </div>

                    <div style={{ background: 'white', borderRadius: 24, padding: '4rem 3rem', boxShadow: '0 10px 30px rgba(0,0,0,0.03)', border: '2px solid #C5A059', transform: 'scale(1.02)', textAlign: 'center', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: -15, left: '50%', transform: 'translateX(-50%)', background: '#C5A059', color: 'white', padding: '6px 20px', borderRadius: 50, fontSize: '0.8rem', fontWeight: 700, letterSpacing: 1 }}>MOST DISCIPLINED</div>
                        <h3 style={{ fontFamily: 'var(--font-secondary)' }}>Savify Pro</h3>
                        <p style={{ color: '#718096' }}>Master your behavior with AI.</p>
                        <div style={{ fontSize: '3.5rem', fontWeight: 800, fontFamily: 'var(--font-secondary)', margin: '1.5rem 0', color: '#0A0A0A' }}>$4.99<span style={{ fontSize: '1.2rem', color: '#718096', fontWeight: 400 }}>/month</span></div>
                        <ul style={{ listStyle: 'none', margin: '2rem 0', textAlign: 'left', padding: 0 }}>
                            <li style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 12, color: '#718096' }}><i className="fas fa-check" style={{ color: '#10B981' }}></i> Predictive AI Habit Insights</li>
                            <li style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 12, color: '#718096' }}><i className="fas fa-check" style={{ color: '#10B981' }}></i> Unlimited Compete Entry</li>
                            <li style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 12, color: '#718096' }}><i className="fas fa-check" style={{ color: '#10B981' }}></i> Verified Status Certificates</li>
                            <li style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 12, color: '#718096' }}><i className="fas fa-check" style={{ color: '#10B981' }}></i> Advanced Necessity Analytics</li>
                        </ul>
                        <a href="/login" style={{ display: 'block', width: '100%', padding: '1.2rem', borderRadius: 50, textDecoration: 'none', fontWeight: 700, textAlign: 'center', background: '#10B981', color: 'white', boxShadow: '0 5px 15px rgba(0, 155, 119, 0.3)' }}>Upgrade to Pro</a>
                    </div>
                </div>
            </div>

            <footer className="landing-footer">
                <div className="landing-container">
                    <div className="footer-grid">
                        <div className="footer-col"><h4>Company</h4><a href="/about">About</a><a href="#">Careers</a></div>
                        <div className="footer-col"><h4>Legal</h4><a href="/privacy-policy">Privacy</a><a href="/terms-and-conditions">Terms</a></div>
                        <div className="footer-col"><h4>Social</h4><a href="#">Twitter</a><a href="#">Instagram</a></div>
                    </div>
                    <p style={{ textAlign: 'center', marginTop: '3rem', color: '#718096', fontSize: '0.9rem' }}>© 2026 Savify Inc. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
