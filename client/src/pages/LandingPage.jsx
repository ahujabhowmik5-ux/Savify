import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import '../styles/landing.css';

export default function LandingPage() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const [openLegal, setOpenLegal] = useState(null);

    const toggleLegal = (section) => {
        setOpenLegal(openLegal === section ? null : section);
    };

    // Auto-redirect to dashboard if already logged in
    useEffect(() => {
        if (!loading && user) {
            navigate('/dashboard', { replace: true });
        }
    }, [user, loading, navigate]);

    return (
        <div className="landing-wrapper">
            {/* Minimalist Apple-style Header */}
            <header className="landing-header">
                <div className="landing-container header-inner">
                    <Link to="/" className="landing-logo">
                        <img 
                            src="https://i.ibb.co/fVyqMkfj/gemini-2-5-flash-image-Refine-this-Savify-S-logo-to-be-flatter-more-geometric-and-ultra-premium.png"
                            alt="Savify Logo" 
                            className="logo-icon" 
                        />
                        <span className="logo-text">Savify</span>
                    </Link>
                    <nav className="landing-nav">
                        <a href="#philosophy">Philosophy</a>
                        <a href="#features">Features</a>
                        <a href="#tiers">Tiers</a>
                    </nav>
                    <div className="landing-auth">
                        <Link to="/login" className="btn-text">Log in</Link>
                        <Link to="/login" className="btn-pill">Get Started</Link>
                    </div>
                </div>
            </header>

            <main>
                {/* Cinematic Hero Section */}
                <section className="hero-section">
                    <div className="hero-content">
                        <h1 className="hero-title">Allocation. <br/> Over Amount.</h1>
                        <p className="hero-subtitle">
                            Savify evaluates how you allocate money—not how much you spend.<br/>
                            It's not about restriction. It's about intelligence.
                        </p>
                        <div className="hero-actions">
                            <Link to="/login" className="btn-primary-large">
                                Check Your Balance Score
                            </Link>
                            <span className="hero-caption">100% Private. Free forever.</span>
                        </div>
                    </div>
                    {/* Cinematic subtle glow behind hero */}
                    <div className="hero-glow"></div>
                </section>

                {/* The Philosophy Grid */}
                <section id="philosophy" className="philosophy-section">
                    <div className="landing-container">
                        <div className="section-header">
                            <h2>A Different Perspective.</h2>
                            <p>Two people can earn the exact same amount, yet possess completely different financial health.</p>
                        </div>

                        <div className="philosophy-grid">
                            <div className="glass-card">
                                <h3>necessities</h3>
                                <div className="stat">50%</div>
                                <p>Essential living expenses, perfectly balanced.</p>
                            </div>
                            <div className="glass-card">
                                <h3>development</h3>
                                <div className="stat">30%</div>
                                <p>Investing in your future and personal growth.</p>
                            </div>
                            <div className="glass-card">
                                <h3>enjoyment</h3>
                                <div className="stat">20%</div>
                                <p>Because life is meant to be lived, guilt-free.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Split */}
                <section id="features" className="features-section">
                    <div className="landing-container">
                        <div className="feature-split">
                            <div className="feature-text">
                                <h2>Simple Rhythm.</h2>
                                <p>Sign up, track your daily expenses for 7 days, and let Savify's engine analyze your behavioral patterns.</p>
                                <ul className="feature-list">
                                    <li>Intelligent Behavioral Analysis</li>
                                    <li>Private & Secure Tracking</li>
                                    <li>Instant Feedback Loop</li>
                                </ul>
                            </div>
                            <div className="feature-visual">
                                <div className="abstract-ui">
                                    <div className="ui-bar" style={{ width: '80%' }}></div>
                                    <div className="ui-bar" style={{ width: '40%' }}></div>
                                    <div className="ui-bar" style={{ width: '60%' }}></div>
                                    <div className="ui-circle"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Tiers Section */}
                <section id="tiers" className="tiers-section">
                    <div className="landing-container">
                        <div className="section-header">
                            <h2>Recognition, Not Rewards.</h2>
                            <p>As your Balance Score improves, unlock deeper insights.</p>
                        </div>
                        <div className="tiers-grid">
                            <div className="tier-card">
                                <div className="tier-icon">🥉</div>
                                <h4>Bronze</h4>
                                <p>Foundational allocation habits.</p>
                            </div>
                            <div className="tier-card">
                                <div className="tier-icon">🥈</div>
                                <h4>Silver</h4>
                                <p>Developing balance mastery.</p>
                            </div>
                            <div className="tier-card">
                                <div className="tier-icon">🥇</div>
                                <h4>Gold</h4>
                                <p>Exceptional spending intelligence.</p>
                            </div>
                            <div className="tier-card">
                                <div className="tier-icon">💎</div>
                                <h4>Platinum</h4>
                                <p>Master-level financial intelligence.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Final CTA */}
                <section className="cta-section">
                    <div className="landing-container">
                        <div className="cta-box glass-card">
                            <h2>Ready to See Your Balance?</h2>
                            <p>Join thousands of students redefining financial wellness.</p>
                            <Link to="/login" className="btn-primary-large">
                                Get Your Free Score
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Legal Section */}
                <section id="legal" className="legal-section" style={{ padding: '4rem 0' }}>
                    <div className="landing-container">
                        <div className="section-header" style={{ marginBottom: '2rem', textAlign: 'center' }}>
                            <h2>Legal & Policies</h2>
                        </div>
                        <div className="legal-grid" style={{ maxWidth: '800px', margin: '0 auto' }}>
                            {/* Terms & Conditions */}
                            <div className="glass-card" style={{ marginBottom: '1rem', cursor: 'pointer', padding: '1.5rem' }} onClick={() => toggleLegal('terms')}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'white', fontSize: '18px', fontWeight: '700' }}>Terms & Conditions</span>
                                    <span style={{ transform: openLegal === 'terms' ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease', color: 'white' }}>▼</span>
                                </div>
                                <div style={{ 
                                    overflow: 'hidden', 
                                    transition: 'max-height 0.3s ease-in-out, opacity 0.3s ease-in-out, margin-top 0.3s ease-in-out',
                                    maxHeight: openLegal === 'terms' ? '1000px' : '0px',
                                    opacity: openLegal === 'terms' ? 1 : 0,
                                    marginTop: openLegal === 'terms' ? '1rem' : '0',
                                    color: 'rgba(255,255,255,0.7)',
                                    fontSize: '14px',
                                    lineHeight: '1.8'
                                }}>
                                    <ul style={{ paddingLeft: '20px', margin: 0 }}>
                                        <li>Savify is a subscription pool-splitting platform for students</li>
                                        <li>Users pool together to share subscription costs (Netflix, Spotify, etc.)</li>
                                        <li>Platform charges a ₹1-5 service fee per transaction</li>
                                        <li>Users must be 18+ or have parental consent</li>
                                        <li>Users are responsible for their own subscription accounts</li>
                                        <li>Savify does not directly provide any third-party subscriptions</li>
                                        <li>Accounts may be suspended for misuse or fraud</li>
                                        <li>Service availability subject to change</li>
                                    </ul>
                                </div>
                            </div>

                            {/* Privacy Policy */}
                            <div className="glass-card" style={{ marginBottom: '1rem', cursor: 'pointer', padding: '1.5rem' }} onClick={() => toggleLegal('privacy')}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'white', fontSize: '18px', fontWeight: '700' }}>Privacy Policy</span>
                                    <span style={{ transform: openLegal === 'privacy' ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease', color: 'white' }}>▼</span>
                                </div>
                                <div style={{ 
                                    overflow: 'hidden', 
                                    transition: 'max-height 0.3s ease-in-out, opacity 0.3s ease-in-out, margin-top 0.3s ease-in-out',
                                    maxHeight: openLegal === 'privacy' ? '1000px' : '0px',
                                    opacity: openLegal === 'privacy' ? 1 : 0,
                                    marginTop: openLegal === 'privacy' ? '1rem' : '0',
                                    color: 'rgba(255,255,255,0.7)',
                                    fontSize: '14px',
                                    lineHeight: '1.8'
                                }}>
                                    <ul style={{ paddingLeft: '20px', margin: 0 }}>
                                        <li>We collect: email, name, college, hall information, mobile number</li>
                                        <li>Data is stored securely on Supabase (encrypted at rest)</li>
                                        <li>We do NOT sell or share personal data with third parties</li>
                                        <li>Location data is used only for service availability checks</li>
                                        <li>Users can request data deletion by contacting support</li>
                                        <li>Cookies used for session management only</li>
                                        <li>Analytics collected for service improvement</li>
                                    </ul>
                                </div>
                            </div>

                            {/* Refund & Cancellation Policy */}
                            <div className="glass-card" style={{ marginBottom: '1rem', cursor: 'pointer', padding: '1.5rem' }} onClick={() => toggleLegal('refund')}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'white', fontSize: '18px', fontWeight: '700' }}>Refund & Cancellation Policy</span>
                                    <span style={{ transform: openLegal === 'refund' ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease', color: 'white' }}>▼</span>
                                </div>
                                <div style={{ 
                                    overflow: 'hidden', 
                                    transition: 'max-height 0.3s ease-in-out, opacity 0.3s ease-in-out, margin-top 0.3s ease-in-out',
                                    maxHeight: openLegal === 'refund' ? '1000px' : '0px',
                                    opacity: openLegal === 'refund' ? 1 : 0,
                                    marginTop: openLegal === 'refund' ? '1rem' : '0',
                                    color: 'rgba(255,255,255,0.7)',
                                    fontSize: '14px',
                                    lineHeight: '1.8'
                                }}>
                                    <ul style={{ paddingLeft: '20px', margin: 0 }}>
                                        <li>Pool payments are processed once all members join</li>
                                        <li>Full refund if pool doesn't fill within 24 hours</li>
                                        <li>No refund once subscription is activated by the pool admin</li>
                                        <li>Partial refunds may be issued at Savify's discretion</li>
                                        <li>Refund processing time: 5-7 business days</li>
                                        <li>Contact support@savify.in for refund requests</li>
                                        <li>Cancellation of pool membership allowed before payment completion</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="landing-footer">
                <div className="landing-container footer-inner">
                    <div className="footer-brand">
                        <span className="logo-text">Savify</span>
                        <p>Intelligent allocation for balanced living.</p>
                        <p className="copyright">© 2026 Savify. All rights reserved.</p>
                    </div>
                    <div className="footer-links">
                        <Link to="/about">About Us</Link>
                        <Link to="/terms-and-conditions">Terms</Link>
                        <Link to="/privacy-policy">Privacy</Link>
                        <Link to="/refund-policy">Refund Policy</Link>
                        <Link to="/contact">Contact</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}