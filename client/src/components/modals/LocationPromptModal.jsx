import React from 'react';

export default function LocationPromptModal({ onAllow, onSkip }) {
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div className="animate-fade-in-up" style={{ width: '100%', maxWidth: 400, background: 'var(--drops-bg)', borderRadius: 32, padding: 32, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', textAlign: 'center' }}>
                <div style={{ width: 80, height: 80, borderRadius: 24, background: 'rgba(94, 92, 230, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                    <i className="fas fa-map-marker-alt" style={{ fontSize: 32, color: 'var(--drops-accent)' }}></i>
                </div>
                
                <h2 style={{ fontSize: 24, fontWeight: 800, color: 'white', marginBottom: 12 }}>Find Nearby Pools</h2>
                <p style={{ fontSize: 15, color: 'var(--drops-text-secondary)', lineHeight: 1.5, marginBottom: 32 }}>
                    We need your location to match you with Quick Commerce pools (Blinkit, Zepto) running near your location.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <button 
                        onClick={onAllow}
                        style={{ width: '100%', padding: '16px', borderRadius: 16, border: 'none', background: 'var(--drops-accent)', color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 15px rgba(94, 92, 230, 0.3)' }}
                    >
                        Allow Location Access
                    </button>
                    <button 
                        onClick={onSkip}
                        style={{ width: '100%', padding: '16px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'var(--drops-text-secondary)', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
                    >
                        Skip for now
                    </button>
                </div>
            </div>
        </div>
    );
}
