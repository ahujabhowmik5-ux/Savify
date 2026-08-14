import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import '../styles/login.css';

export default function LoginPage() {
    const { user, signInWithGoogle } = useAuth();
    const navigate = useNavigate();
    const [showLoading, setShowLoading] = useState(false);
    const [showError, setShowError] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [showOverlay, setShowOverlay] = useState(false);

    useEffect(() => {
        if (user) navigate('/dashboard', { replace: true });
    }, [user, navigate]);

    useEffect(() => {
        // Create particles
        const container = document.getElementById('particlesContainer');
        if (!container) return;
        for (let i = 0; i < 30; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            const x = Math.random() * 100, y = Math.random() * 100;
            const size = Math.random() * 3 + 1, opacity = Math.random() * 0.3 + 0.1;
            const duration = Math.random() * 10 + 10, delay = Math.random() * 5;
            particle.style.cssText = `left:${x}%;top:${y}%;width:${size}px;height:${size}px;opacity:${opacity};animation:particleFloat ${duration}s ease-in-out infinite;animation-delay:${delay}s;`;
            particle.style.setProperty('--x1', `${Math.random() * 20 - 10}px`);
            particle.style.setProperty('--y1', `${Math.random() * 20 - 10}px`);
            particle.style.setProperty('--x2', `${Math.random() * 40 - 20}px`);
            particle.style.setProperty('--y2', `${Math.random() * 40 - 20}px`);
            particle.style.setProperty('--opacity', String(opacity));
            container.appendChild(particle);
        }
        // Create meteors
        for (let i = 0; i < 5; i++) {
            const meteor = document.createElement('div');
            meteor.className = 'meteor';
            meteor.style.cssText = `left:${Math.random() * 100}%;top:-100px;animation:meteorShower ${Math.random() * 3 + 2}s linear infinite;animation-delay:${Math.random() * 15}s;`;
            container.appendChild(meteor);
        }
    }, []);

    const handleLogin = async () => {
        try {
            setShowOverlay(true);
            setTimeout(() => {
                setShowLoading(true);
                setShowOverlay(false);
            }, 1500);
            await signInWithGoogle();
        } catch (error) {
            console.error('Login Error:', error);
            setShowLoading(false);
            setShowError(true);
            setErrorMsg('Connection Interrupted: ' + error.message);
        }
    };

    return (
        <div className="login-body">
            {showOverlay && (
                <div id="magicOverlay" className="magic-overlay">
                    <div className="magic-text">Welcome to Savify</div>
                    <div className="magic-subtext">Your financial intelligence journey begins now</div>
                </div>
            )}

            <div className="particles" id="particlesContainer"></div>

            <div className="scroll-container">
                <div className="login-container">
                    <div className="login-card">
                        <div className="card-glow"></div>

                        {!showLoading && !showError && (
                            <div id="loginContent">
                                <a href="/" className="login-logo">
                                    <div className="logo-icon-box">
                                        <img src="https://i.ibb.co/fVyqMkfj/gemini-2-5-flash-image-Refine-this-Savify-S-logo-to-be-flatter-more-geometric-and-ultra-premium.png" alt="Savify Logo" />
                                    </div>
                                    <span>Savify</span>
                                </a>

                                <div className="login-header">
                                    <h1 className="title">Elevate Your Balance</h1>
                                    <p className="subtitle">Sign in to unlock your personalized financial intelligence dashboard</p>
                                </div>

                                <button className="google-btn" onClick={handleLogin}>
                                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="google-logo" />
                                    <span className="btn-text">Continue with Google</span>
                                </button>

                                <div className="features-list">
                                    <div className="feature-item">
                                        <div className="feature-icon-box"><i className="fas fa-chart-line"></i></div>
                                        <span className="feature-text">Intelligent Balance Scoring</span>
                                    </div>
                                    <div className="feature-item">
                                        <div className="feature-icon-box"><i className="fas fa-trophy"></i></div>
                                        <span className="feature-text">Competitive Financial Insights</span>
                                    </div>
                                    <div className="feature-item">
                                        <div className="feature-icon-box"><i className="fas fa-lock"></i></div>
                                        <span className="feature-text">Bank-Level Privacy & Security</span>
                                    </div>
                                </div>

                                <a href="/" className="back-link">
                                    <i className="fas fa-arrow-left"></i> Return to Home
                                </a>
                            </div>
                        )}

                        {showLoading && (
                            <div className="loading-state">
                                <div className="login-spinner">
                                    <div className="spinner-core"></div>
                                </div>
                                <p className="loading-text">Initiating Secure Connection</p>
                                <p className="loading-subtext">This will only take a moment</p>
                            </div>
                        )}

                        {showError && (
                            <div className="error-state">
                                <div className="error-icon"><i className="fas fa-exclamation-triangle"></i></div>
                                <p className="error-text">{errorMsg}</p>
                                <button onClick={() => window.location.reload()} className="retry-btn">Retry Connection</button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="login-footer">
                    <p>© 2026 Savify. All rights reserved.</p>
                    <div className="footer-links">
                        <a href="/privacy-policy" className="footer-link">Privacy Policy</a>
                        <a href="/terms-and-conditions" className="footer-link">Terms of Service</a>
                        <a href="/contact" className="footer-link">Contact Support</a>
                    </div>
                </div>
            </div>
        </div>
    );
}
