import { useState } from 'react';
import { createPortal } from 'react-dom';
import { DIFFICULTY_TIERS } from '../../hooks/useAchievements';

/**
 * Custom SVG Badge — each difficulty tier has unique visual treatment:
 * 1 Common = simple circle, 2 Uncommon = shield, 3 Rare = hexagon,
 * 4 Epic = star burst, 5 Legendary = ornate crown badge
 */
function BadgeSVG({ milestone, size = 56 }) {
    const { tier, achieved, difficulty } = milestone;
    const color = achieved ? tier.color : '#333';
    const opacity = achieved ? 1 : 0.4;
    const glowFilter = achieved ? `drop-shadow(0 0 6px ${tier.glow})` : 'none';

    // Icon character based on category
    const iconMap = {
        score: '★', amount: '₹', count: '#', streak: '⚡',
        social: '♥', explore: '◈', budget: '◆', app: '◉', custom: '✦'
    };
    const icon = iconMap[milestone.category] || '◆';

    return (
        <svg width={size} height={size} viewBox="0 0 60 60" style={{ filter: glowFilter, opacity }}>
            {/* Tier 1: Simple Circle */}
            {difficulty === 1 && (
                <>
                    <circle cx="30" cy="30" r="26" fill="none" stroke={color} strokeWidth="2.5" />
                    <circle cx="30" cy="30" r="22" fill={achieved ? tier.bg : 'rgba(30,30,30,0.5)'} />
                </>
            )}
            {/* Tier 2: Shield Shape */}
            {difficulty === 2 && (
                <>
                    <path d="M30 3 L54 15 L54 35 Q54 50 30 57 Q6 50 6 35 L6 15 Z"
                        fill={achieved ? tier.bg : 'rgba(30,30,30,0.5)'}
                        stroke={color} strokeWidth="2" />
                    <path d="M30 8 L50 18 L50 34 Q50 47 30 53 Q10 47 10 34 L10 18 Z"
                        fill="none" stroke={color} strokeWidth="0.5" opacity="0.4" />
                </>
            )}
            {/* Tier 3: Hexagon */}
            {difficulty === 3 && (
                <>
                    <polygon points="30,2 55,16 55,44 30,58 5,44 5,16"
                        fill={achieved ? tier.bg : 'rgba(30,30,30,0.5)'}
                        stroke={color} strokeWidth="2" />
                    <polygon points="30,8 50,19 50,41 30,52 10,41 10,19"
                        fill="none" stroke={color} strokeWidth="0.5" opacity="0.3" />
                    {/* Inner hex accent */}
                    <polygon points="30,15 42,22 42,38 30,45 18,38 18,22"
                        fill="none" stroke={color} strokeWidth="0.5" opacity="0.2" />
                </>
            )}
            {/* Tier 4: Star Burst / Octagon */}
            {difficulty === 4 && (
                <>
                    <polygon points="30,1 38,11 51,6 48,20 60,27 50,37 55,51 42,47 30,59 18,47 5,51 10,37 0,27 12,20 9,6 22,11"
                        fill={achieved ? tier.bg : 'rgba(30,30,30,0.5)'}
                        stroke={color} strokeWidth="1.5" />
                    <circle cx="30" cy="30" r="16" fill="none" stroke={color} strokeWidth="0.5" opacity="0.3" />
                </>
            )}
            {/* Tier 5: Ornate Crown Badge */}
            {difficulty === 5 && (
                <>
                    {/* Outer ornate shape */}
                    <path d="M30,1 L37,8 L48,4 L46,16 L57,20 L52,30 L57,40 L46,44 L48,56 L37,52 L30,59 L23,52 L12,56 L14,44 L3,40 L8,30 L3,20 L14,16 L12,4 L23,8 Z"
                        fill={achieved ? tier.bg : 'rgba(30,30,30,0.5)'}
                        stroke={color} strokeWidth="1.5" />
                    {/* Inner circle */}
                    <circle cx="30" cy="30" r="15" fill="none" stroke={color} strokeWidth="1" opacity="0.5" />
                    {/* Crown accent at top */}
                    {achieved && (
                        <path d="M22,16 L26,12 L30,16 L34,12 L38,16" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
                    )}
                </>
            )}
            {/* Center icon */}
            <text x="30" y="34" textAnchor="middle" fontSize={difficulty >= 4 ? "14" : "16"} fill={color} fontWeight="bold">
                {icon}
            </text>
        </svg>
    );
}

function BadgeDetailPopup({ milestone, onClose }) {
    if (!milestone) return null;
    const { tier, achieved, progress, name, desc, hint, difficulty, current, threshold, category } = milestone;
    const tierInfo = DIFFICULTY_TIERS[difficulty] || DIFFICULTY_TIERS[1];

    return createPortal(
        <div className="modal-overlay open" onClick={onClose}>
            <div className="badge-detail-popup" onClick={e => e.stopPropagation()} style={{ borderColor: tierInfo.border }}>
                <button className="milestone-popup-close" onClick={onClose}>
                    <i className="fas fa-times"></i>
                </button>

                <div className="badge-detail-top">
                    <BadgeSVG milestone={milestone} size={80} />
                    <h3 style={{ color: achieved ? tierInfo.color : '#666' }}>{name}</h3>
                    <span className="badge-tier-label" style={{ color: tierInfo.color, borderColor: tierInfo.border }}>
                        {tierInfo.name}
                    </span>
                </div>

                <p className="badge-detail-desc">{achieved ? desc : hint}</p>

                <div className="badge-progress-section">
                    <div className="badge-progress-bar-bg">
                        <div
                            className="badge-progress-bar-fill"
                            style={{
                                width: `${progress}%`,
                                background: achieved
                                    ? `linear-gradient(90deg, ${tierInfo.color}, ${tierInfo.color}dd)`
                                    : 'rgba(255,255,255,0.1)'
                            }}
                        />
                    </div>
                    <span className="badge-progress-text">
                        {current} / {threshold} ({progress}%)
                    </span>
                </div>

                {achieved && (
                    <div className="badge-achieved-banner">
                        <i className="fas fa-check-circle"></i> Achievement Unlocked
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}

export default function MilestonesSection({ achieved = [], locked = [] }) {
    const [selectedMilestone, setSelectedMilestone] = useState(null);
    const sortedLocked = [...locked].sort((a, b) => b.progress - a.progress);

    return (
        <div className="milestones-card">
            <div className="milestones-header">
                <h2 className="milestones-title">
                    <i className="fas fa-award" style={{ color: '#D4AF37' }}></i> Badges
                </h2>
                <span className="milestones-count">{achieved.length}/{achieved.length + locked.length}</span>
            </div>

            <div className="milestones-list" style={{ display: 'flex', overflowX: 'auto', gap: '0.6rem', padding: '0.75rem 0.25rem', scrollbarWidth: 'none' }}>
                {achieved.map(m => (
                    <div key={m.id} className="badge-item achieved" onClick={() => setSelectedMilestone(m)}>
                        <BadgeSVG milestone={m} size={52} />
                        <span className="badge-name" style={{ color: m.tier.color }}>{m.name}</span>
                    </div>
                ))}

                {sortedLocked.map(m => (
                    <div key={m.id} className="badge-item locked" onClick={() => setSelectedMilestone(m)}>
                        <BadgeSVG milestone={m} size={52} />
                        <span className="badge-progress-mini">{m.progress}%</span>
                    </div>
                ))}

                {achieved.length === 0 && locked.length === 0 && (
                    <div style={{ color: 'var(--color-stone)', fontSize: '0.8rem', padding: '0.5rem' }}>No badges yet</div>
                )}
            </div>

            {selectedMilestone && (
                <BadgeDetailPopup milestone={selectedMilestone} onClose={() => setSelectedMilestone(null)} />
            )}
        </div>
    );
}
