import React, { useEffect, useState } from 'react';
import Savio from './Savio';

export default function FullScreenSavio({ isVisible, state, message, onDismiss, dismissLabel, subMessage }) {
    const [render, setRender] = useState(isVisible);

    useEffect(() => {
        if (isVisible) setRender(true);
    }, [isVisible]);

    const onAnimationEnd = () => {
        if (!isVisible) setRender(false);
    };

    if (!render) return null;

    let bgStyle = 'rgba(0,0,0,0.8)';
    let messageColor = 'white';

    if (state === 'celebrating' || state === 'happy' || state === 'proud') {
        bgStyle = 'radial-gradient(circle, rgba(16,185,129,0.2) 0%, rgba(0,0,0,0.9) 100%)';
        messageColor = '#30D158';
    } else if (state === 'sad' || state === 'crying' || state === 'angry') {
        bgStyle = 'radial-gradient(circle, rgba(255,69,58,0.15) 0%, rgba(0,0,0,0.95) 100%)';
        messageColor = '#FF453A';
    } else if (state === 'thinking' || state === 'worried' || state === 'waiting') {
        bgStyle = 'radial-gradient(circle, rgba(255,159,10,0.15) 0%, rgba(0,0,0,0.9) 100%)';
        messageColor = '#FF9F0A'; // Golden orange for waiting
    }

    return (
        <div 
            style={{
                position: 'fixed',
                inset: 0,
                background: bgStyle,
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                animation: isVisible ? 'fadeInScale 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'fadeOutScale 0.3s ease-in forwards'
            }}
            onAnimationEnd={onAnimationEnd}
        >
            <style>{`
                @keyframes fadeInScale {
                    from { opacity: 0; transform: scale(0.9); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes fadeOutScale {
                    from { opacity: 1; transform: scale(1); }
                    to { opacity: 0; transform: scale(1.05); }
                }
            `}</style>
            
            {state === 'celebrating' && (
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
                    {[...Array(30)].map((_, i) => (
                        <div key={i} style={{
                            position: 'absolute',
                            width: Math.random() * 8 + 4,
                            height: Math.random() * 8 + 4,
                            background: ['#30D158', '#0A84FF', '#FFD60A', '#BF5AF2'][Math.floor(Math.random() * 4)],
                            left: `${Math.random() * 100}%`,
                            top: `-10px`,
                            borderRadius: '50%',
                            animation: `confettiFall ${Math.random() * 2 + 1.5}s linear forwards`,
                            animationDelay: `${Math.random() * 0.5}s`
                        }} />
                    ))}
                    <style>{`
                        @keyframes confettiFall {
                            to { transform: translateY(100vh) rotate(720deg); opacity: 0; }
                        }
                    `}</style>
                </div>
            )}

            <Savio state={state} size={150} showBubble={false} />
            <h2 style={{ 
                marginTop: 40, 
                fontSize: 28, 
                fontWeight: 800, 
                color: messageColor, 
                textAlign: 'center',
                padding: '0 20px',
                textShadow: `0 0 20px ${messageColor}88`,
                whiteSpace: 'pre-wrap'
            }}>
                {message}
            </h2>

            {subMessage && (
                <p style={{ marginTop: 12, fontSize: 15, color: 'rgba(255,255,255,0.65)', textAlign: 'center', padding: '0 32px', maxWidth: 420, lineHeight: 1.5 }}>
                    {subMessage}
                </p>
            )}

            {/* An escape hatch, so a slow or abandoned flow never traps the user. */}
            {onDismiss && (
                <button
                    onClick={onDismiss}
                    style={{
                        marginTop: 32,
                        padding: '14px 32px',
                        borderRadius: 100,
                        border: '1px solid rgba(255,255,255,0.2)',
                        background: 'rgba(255,255,255,0.08)',
                        backdropFilter: 'blur(10px)',
                        color: '#fff',
                        fontSize: 15,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10
                    }}
                >
                    {dismissLabel || 'Continue to dashboard'} <i className="fas fa-arrow-right" style={{ fontSize: 13 }}></i>
                </button>
            )}
        </div>
    );
}
