export default function FocusBlockScreen({ onContinue, onBlock }) {
    return (
        <div className="focus-block-overlay">
            <div className="focus-block-content">
                <div className="focus-block-glow"></div>
                <div className="focus-block-icon">
                    <i className="fas fa-hand-paper"></i>
                </div>
                <h2 className="focus-block-title">You might be spending there 💸</h2>
                <p className="focus-block-subtitle">
                    This app is blocked during your focus schedule. Stay focused on what matters!
                </p>
                <div className="focus-block-actions">
                    <button className="focus-block-btn continue" onClick={onContinue}>
                        <i className="fas fa-arrow-right"></i> Continue Anyway
                    </button>
                    <button className="focus-block-btn block" onClick={onBlock}>
                        <i className="fas fa-shield-alt"></i> Block
                    </button>
                </div>
                <div className="focus-block-timer">
                    <i className="fas fa-clock"></i> Focus mode is active
                </div>
            </div>
        </div>
    );
}
