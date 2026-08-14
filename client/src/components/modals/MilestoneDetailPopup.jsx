import { createPortal } from 'react-dom';

export default function MilestoneDetailPopup({ milestone, onClose }) {
    if (!milestone) return null;
    const isAchieved = milestone.achieved;

    return createPortal(
        <div className="milestone-popup-overlay" onClick={onClose}>
            <div className="milestone-popup" onClick={e => e.stopPropagation()}>
                <button className="milestone-popup-close" onClick={onClose}>
                    <i className="fas fa-times"></i>
                </button>

                <div className={`milestone-popup-icon ${isAchieved ? 'achieved' : 'locked'}`}>
                    {isAchieved ? <i className={`${milestone.icon} premium-icon`}></i> : <i className="fas fa-gem" style={{ color: '#555' }}></i>}
                </div>

                <h3 className="milestone-popup-name">
                    {isAchieved ? milestone.name : 'Mysterious!'}
                </h3>

                <p className="milestone-popup-desc">
                    {isAchieved ? milestone.desc : `${milestone.progress}% achieved. Do this to get this.`}
                </p>

                {/* Progress Bar */}
                <div className="milestone-progress-bar-wrapper">
                    <div className="milestone-progress-bar">
                        <div
                            className={`milestone-progress-fill ${isAchieved ? 'complete' : ''}`}
                            style={{ width: `${milestone.progress}%` }}
                        ></div>
                    </div>
                    <span className="milestone-progress-text">{milestone.progress}%</span>
                </div>

                {/* Detail */}
                <div className="milestone-popup-detail">
                    {isAchieved ? (
                        <div className="milestone-achieved-msg">
                            <i className="fas fa-trophy"></i>
                            <span>{milestone.desc} — Completed!</span>
                        </div>
                    ) : (
                        <div className="milestone-locked-msg">
                            <i className="fas fa-info-circle"></i>
                            <span>{milestone.hint || 'Keep using Savify to unlock this.'}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
