export default function TrustLogicModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal trust-logic-modal">
                <div className="trust-logic-header">
                    <h2>
                        <i className="fas fa-chart-line" style={{ marginRight: 10, color: 'var(--color-emerald)' }}></i>
                        Balance Score Logic
                    </h2>
                    <span className="close-modal" onClick={onClose}>&times;</span>
                </div>

                <p className="trust-logic-subtitle">HOW YOUR SCORE IS CALCULATED</p>

                <div className="trust-logic-item">
                    <div className="trust-logic-icon" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                        <i className="fas fa-balance-scale" style={{ color: '#10B981' }}></i>
                    </div>
                    <div>
                        <div className="trust-logic-title">EMA Blending (70/30)</div>
                        <div className="trust-logic-desc">Score = 70% current week performance + 30% previous score. Bad weeks dip it, but recovery is always possible.</div>
                    </div>
                </div>

                <div className="trust-logic-item">
                    <div className="trust-logic-icon" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
                        <i className="fas fa-wallet" style={{ color: '#3B82F6' }}></i>
                    </div>
                    <div>
                        <div className="trust-logic-title">Weekly Spending Ratio</div>
                        <div className="trust-logic-desc">Primary factor. Spending less than your weekly budget = high base score. Over budget = score penalty.</div>
                    </div>
                </div>

                <div className="trust-logic-item">
                    <div className="trust-logic-icon" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
                        <i className="fas fa-fire" style={{ color: '#F59E0B' }}></i>
                    </div>
                    <div>
                        <div className="trust-logic-title">Streak Bonus (+10)</div>
                        <div className="trust-logic-desc">Maintain a 7+ day streak of logging expenses to earn a +10 bonus each cycle.</div>
                    </div>
                </div>

                <div className="trust-logic-item">
                    <div className="trust-logic-icon" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
                        <i className="fas fa-tasks" style={{ color: '#8B5CF6' }}></i>
                    </div>
                    <div>
                        <div className="trust-logic-title">Task Bonus (+10)</div>
                        <div className="trust-logic-desc">Complete daily missions to add up to +10 points per cycle.</div>
                    </div>
                </div>

                <div className="trust-logic-item">
                    <div className="trust-logic-icon" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                        <i className="fas fa-shield-alt" style={{ color: '#EF4444' }}></i>
                    </div>
                    <div>
                        <div className="trust-logic-title">Volatility Cap (±200)</div>
                        <div className="trust-logic-desc">Score can only swing ±200 per action. No single expense can destroy your progress.</div>
                    </div>
                </div>

                <div className="trust-logic-item">
                    <div className="trust-logic-icon" style={{ background: 'rgba(212, 175, 55, 0.1)' }}>
                        <i className="fas fa-gem" style={{ color: '#D4AF37' }}></i>
                    </div>
                    <div>
                        <div className="trust-logic-title">Score Range: 0 – 1000</div>
                        <div className="trust-logic-desc">Bronze (0-249) → Silver (250-499) → Gold (500-899) → Platinum (900-949) → Elite (950-1000)</div>
                    </div>
                </div>

                <button className="sexy-btn" style={{ marginTop: '1.5rem' }} onClick={onClose}>Got it</button>
            </div>
        </div>
    );
}
