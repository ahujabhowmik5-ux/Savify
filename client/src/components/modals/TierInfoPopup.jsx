import { useState } from 'react';
import { createPortal } from 'react-dom';

const TIERS = [
    {
        name: 'Bronze',
        cls: 'bronze',
        icon: 'fa-medal',
        scoreRange: '0 – 249',
        description: 'Starting tier. Track expenses daily to climb up!',
    },
    {
        name: 'Silver',
        cls: 'silver',
        icon: 'fa-medal',
        scoreRange: '250 – 499',
        description: 'You\'re getting the hang of it! Keep your spending under budget.',
    },
    {
        name: 'Gold',
        cls: 'gold',
        icon: 'fa-crown',
        scoreRange: '500 – 899',
        description: 'Impressive discipline. You\'re in the top tier of savers!',
    },
    {
        name: 'Platinum',
        cls: 'platinum',
        icon: 'fa-gem',
        scoreRange: '900 – 949',
        description: 'Outstanding saver. Only the most disciplined reach this level.',
    },
    {
        name: 'Elite',
        cls: 'elite',
        icon: 'fa-fire',
        scoreRange: '950 – 1000',
        description: 'The pinnacle. Near-perfect budget mastery. Extremely rare.',
    },
];

export default function TierInfoPopup({ isOpen, onClose, currentTier }) {
    if (!isOpen) return null;

    return createPortal(
        <div className="tier-info-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="tier-info-popup">
                <button className="leaderboard-close" onClick={onClose}>&times;</button>
                <h2 className="tier-info-title">
                    <i className="fas fa-trophy" style={{ marginRight: 8 }}></i>
                    Tier System
                </h2>
                <div className="tier-info-list">
                    {TIERS.map((tier) => (
                        <div key={tier.name} className={`tier-info-item ${tier.cls} ${currentTier?.toLowerCase() === tier.name.toLowerCase() ? 'current' : ''}`}>
                            <div className={`tier-info-badge ${tier.cls}`}>
                                <i className={`fas ${tier.icon}`}></i>
                            </div>
                            <div className="tier-info-text">
                                <h4>
                                    {tier.name}
                                    {currentTier?.toLowerCase() === tier.name.toLowerCase() && (
                                        <span style={{ marginLeft: 8, fontSize: '0.6rem', background: '#10B981', color: '#fff', padding: '2px 6px', borderRadius: 999 }}>CURRENT</span>
                                    )}
                                </h4>
                                <p>Score: {tier.scoreRange}</p>
                                <p style={{ marginTop: 2, opacity: 0.8 }}>{tier.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>,
        document.body
    );
}
