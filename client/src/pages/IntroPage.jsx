import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { triggerMediumHaptic } from '../utils/haptics';
import Savio from '../components/Savio';
import Footer from '../components/layout/Footer';
import '../styles/intro.css';

export default function IntroPage() {
    const nav = useNavigate();
    const [isLoaded, setIsLoaded] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [savioState, setSavioState] = useState('proud');

    useEffect(() => {
        const timer = setTimeout(() => setIsLoaded(true), 150);
        return () => clearTimeout(timer);
    }, []);

    const handleEnter = () => {
        triggerMediumHaptic();
        setSavioState('celebrating');
        setIsTransitioning(true);
        setTimeout(() => {
            nav('/onboarding');
        }, 1200);
    };

    return (
        <div className={`bento-root ${isTransitioning ? 'fade-out' : ''}`}>
            {/* Deep Ambient Background */}
            <div className="bento-bg"></div>

            <div className={`bento-container ${isLoaded ? 'is-loaded' : ''}`}>
                
                <header className="bento-header">
                    <div className="bento-logo-mark" style={{ background: 'transparent' }}><img src="/icon-192.png" alt="Savify" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '6px' }} /></div>
                    <span style={{ fontSize: '22px', fontWeight: '800', letterSpacing: '-0.5px', marginLeft: '4px' }}>Savify</span>
                </header>

                <div className="bento-grid">
                    
                    {/* HERO CARD (2x2) */}
                    <div className="bento-card bento-hero">
                        <div className="bento-card-content">
                            <div className="bento-badge">Access Required</div>
                            <h1 className="bento-hero-title">
                                Don't pay<br/>full price.<br/>Split the<br/>bill.
                            </h1>
                            <p className="bento-hero-subtitle">
                                The intelligent commerce network built exclusively for smart buyers.
                            </p>
                            <button 
                                className="bento-cta" 
                                onClick={handleEnter}
                                onMouseEnter={() => setSavioState('shocked')}
                                onMouseLeave={() => setSavioState('proud')}
                            >
                                Enter Network
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                            </button>
                        </div>
                    </div>

                    {/* SAVIO CARD (2x1) */}
                    <div className="bento-card bento-savio">
                        <div className="bento-card-glow"></div>
                        <div className="bento-savio-wrapper" onClick={() => setSavioState(prev => prev === 'proud' ? 'shocked' : prev === 'shocked' ? 'celebrating' : 'proud')} style={{ cursor: 'pointer' }}>
                            <Savio state={savioState} size={140} showBubble={false} />
                        </div>
                        <div className="bento-savio-label">Your AI Copilot</div>
                    </div>

                    {/* BLINKIT CARD (1x1) */}
                    <div className="bento-card bento-small bento-blinkit">
                        <div className="bento-icon-box">
                            <img src="/logos/blinkit.png" alt="Shared Carts" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '12px' }} />
                        </div>
                        <h3>Shared Carts</h3>
                        <p>Pool grocery orders instantly.</p>
                    </div>

                    {/* AI SUB CARD (1x1) */}
                    <div className="bento-card bento-small bento-rides">
                        <div className="bento-icon-box">
                            <img src="/logos/chatgpt.png" alt="AI Subscription" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '12px' }} />
                        </div>
                        <h3>AI Subscription</h3>
                        <p>Use AI at a fraction of price.</p>
                    </div>

                    {/* SUBSCRIPTIONS CARD (2x1) */}
                    <div className="bento-card bento-wide bento-subs">
                        <div className="bento-card-content row-layout">
                            <div className="bento-text-stack">
                                <h3>Subscription Splits</h3>
                                <p>Share Netflix, Spotify, and premium tools. Pay a fraction of the cost, automatically billed via smart contracts.</p>
                            </div>
                            <div className="bento-abstract-visual">
                                {/* Abstract interlocking rings to represent sharing */}
                                <div className="ring ring-1"></div>
                                <div className="ring ring-2"></div>
                            </div>
                        </div>
                    </div>

                    {/* FRICTIONLESS CARD (2x1) */}
                    <div className="bento-card bento-wide bento-frictionless">
                        <div className="bento-card-content">
                            <h3>Zero Friction</h3>
                            <p>Built for the collaborative ecosystem. Everything is handled by automated smart contracts. No math, no chasing friends for cash. Just pure, collaborative commerce.</p>
                        </div>
                    </div>

                </div>
            </div>

            <Footer />
        </div>
    );
}
