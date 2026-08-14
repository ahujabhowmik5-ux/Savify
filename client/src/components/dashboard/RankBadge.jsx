import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getRank, getNextRank, getRankProgress, getAppOpens, getChosenTopRank, setChosenTopRank, RANKS } from '../../utils/ranks';

export default function RankBadge({ appData, expenses = [] }) {
    const [showPopup, setShowPopup] = useState(false);
    const [showChoice, setShowChoice] = useState(false);

    const appOpens = getAppOpens();
    const expenseCount = expenses.length;
    const chosenTop = getChosenTopRank();
    const rank = getRank(appOpens, expenseCount, chosenTop);
    const progress = getRankProgress(appOpens, expenseCount);
    const firstName = (appData?.full_name?.split(' ')[0] || 'USER').toUpperCase();

    // Check if user just reached alpha level and hasn't chosen yet
    useEffect(() => {
        const alphaRank = RANKS.find(r => r.id === 'alpha');
        if (appOpens >= alphaRank.minOpens && expenseCount >= alphaRank.minExpenses && !chosenTop) {
            setShowChoice(true);
        }
    }, [appOpens, expenseCount, chosenTop]);

    const handleChoice = (choice) => {
        setChosenTopRank(choice);
        setShowChoice(false);
    };

    // Decoration dots based on rank level
    const decorationDots = (level) => {
        if (level <= 1) return null;
        return (
            <span className="rank-decoration-dots">
                {Array.from({ length: Math.min(level, 5) }, (_, i) => (
                    <span key={i} className="rank-dot" style={{ background: rank.color, boxShadow: `0 0 4px ${rank.glow}` }}></span>
                ))}
            </span>
        );
    };

    return (
        <>
            {/* Name + Rank Badge Display */}
            <div className="rank-greeting" onClick={() => setShowPopup(true)}>
                <h1 className="rank-name">{firstName}</h1>
                <div className="rank-badge-row" style={{ borderColor: rank.color }}>
                    <span 
                        className={`rank-symbol rank-symbol-${rank.id} ${rank.effect || ''}`}
                        style={{ color: rank.color, textShadow: `0 0 12px ${rank.glow}` }}
                    >
                        {rank.symbol}
                    </span>
                    <span className="rank-badge-label" style={{ color: rank.color }}>{rank.name}</span>
                    {decorationDots(rank.decoration)}
                </div>
            </div>

            {/* Badge Progress Popup */}
            {showPopup && createPortal(
                <div className="modal-overlay open" onClick={() => setShowPopup(false)}>
                    <div className="rank-popup" onClick={e => e.stopPropagation()}>
                        <button className="milestone-popup-close" onClick={() => setShowPopup(false)}>
                            <i className="fas fa-times"></i>
                        </button>

                        <div className="rank-popup-current">
                            <span 
                                className="rank-popup-symbol"
                                style={{ color: rank.color, textShadow: `0 0 30px ${rank.glow}, 0 0 60px ${rank.glow}` }}
                            >
                                {rank.symbol}
                            </span>
                            <h2 className="rank-popup-title" style={{ color: rank.color }}>{rank.name}</h2>
                            <p className="rank-popup-subtitle">Your current rank (irreversible)</p>
                        </div>

                        <div className="rank-popup-stats">
                            <div className="rank-stat-item">
                                <span className="rank-stat-number">{appOpens}</span>
                                <span className="rank-stat-label">App Opens</span>
                            </div>
                            <div className="rank-stat-divider"></div>
                            <div className="rank-stat-item">
                                <span className="rank-stat-number">{expenseCount}</span>
                                <span className="rank-stat-label">Expenses Added</span>
                            </div>
                        </div>

                        {progress.atTop ? (
                            <div className="rank-popup-top">
                                <h3>You're at the TOP!</h3>
                                <p className="rank-top-msg">
                                    {rank.id === 'sigma'
                                        ? "You don't follow the hierarchy. You ARE the hierarchy. Main character energy."
                                        : "You've conquered every rank. You're literally the final boss."}
                                </p>
                            </div>
                        ) : (
                            <div className="rank-popup-next">
                                <div className="rank-next-header">
                                    <span 
                                        className="rank-next-symbol"
                                        style={{ color: progress.nextRank.color }}
                                    >
                                        {progress.nextRank.symbol}
                                    </span>
                                    <h3>Next: <span className="rank-highlight">{progress.nextRank.name}</span></h3>
                                </div>
                                <div className="rank-next-requirements">
                                    <div className="rank-req-item">
                                        <i className="fas fa-mobile-alt"></i>
                                        <span>Open app <span className="rank-highlight">{progress.opensNeeded}</span> more times</span>
                                    </div>
                                    <div className="rank-req-item">
                                        <i className="fas fa-receipt"></i>
                                        <span>Add <span className="rank-highlight">{progress.expensesNeeded}</span> more expenses</span>
                                    </div>
                                </div>
                                <p className="rank-motivation">Keep grinding, {firstName}!</p>
                            </div>
                        )}

                        {/* All Ranks Preview */}
                        <div className="rank-all-tiers">
                            <h4>All Ranks</h4>
                            <div className="rank-tier-list">
                                {RANKS.map(r => {
                                    const isActive = rank.id === r.id;
                                    const isUnlocked = appOpens >= r.minOpens && expenseCount >= r.minExpenses;
                                    return (
                                        <div key={r.id} className={`rank-tier-item ${isActive ? 'active' : ''} ${isUnlocked ? 'unlocked' : 'locked'}`}>
                                            <span 
                                                className={`rank-tier-symbol ${r.effect || ''}`}
                                                style={{ color: isUnlocked ? r.color : '#444', textShadow: isActive ? `0 0 10px ${r.glow}` : 'none' }}
                                            >
                                                {r.symbol}
                                            </span>
                                            <span className="rank-tier-name">{r.name}</span>
                                            <span className="rank-tier-req">{r.minOpens} opens · {r.minExpenses} exp</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Alpha/Sigma Choice Popup */}
            {showChoice && createPortal(
                <div className="modal-overlay open">
                    <div className="rank-choice-popup">
                        <div className="rank-choice-header">
                            <h2>You've Reached The Top!</h2>
                            <p>Choose your identity, {firstName}</p>
                        </div>

                        <div className="rank-choice-options">
                            <button className="rank-choice-card alpha" onClick={() => handleChoice('alpha')}>
                                <span className="rank-choice-symbol rank-effect-fire" style={{ color: '#FF4500' }}>α</span>
                                <h3>ALPHA</h3>
                                <p>Top of the hierarchy. The leader. Everyone follows you.</p>
                            </button>

                            <div className="rank-choice-vs">OR</div>

                            <button className="rank-choice-card sigma" onClick={() => handleChoice('sigma')}>
                                <span className="rank-choice-symbol rank-effect-fire" style={{ color: '#8B5CF6' }}>σ</span>
                                <h3>SIGMA</h3>
                                <p>Don't fit in the hierarchy. Lone wolf energy.</p>
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
