import { useState, useEffect } from 'react';

function formatTimeLeft(endTime) {
    const now = Date.now();
    const diff = new Date(endTime).getTime() - now;
    if (diff <= 0) return 'Closed';
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) return `${hrs}h ${mins % 60}m left`;
    return `${mins}m left`;
}

const TYPE_CONFIG = {
    grocery: { icon: '🛒', iconClass: 'blinkit', progressColor: 'orange' },
    cab: { icon: '🚕', iconClass: 'cab', progressColor: 'blue' },
    subscription: { icon: '🎵', iconClass: 'subscription', progressColor: 'purple' },
    food: { icon: '🍕', iconClass: 'food', progressColor: 'green' },
};

export default function DropCard({ drop, onTap }) {
    const [timeLeft, setTimeLeft] = useState(formatTimeLeft(drop.closesAt));
    const config = TYPE_CONFIG[drop.type] || TYPE_CONFIG.grocery;
    const progressPct = drop.progressMax > 0
        ? Math.min(100, Math.round((drop.progressCurrent / drop.progressMax) * 100))
        : 0;

    useEffect(() => {
        const interval = setInterval(() => {
            setTimeLeft(formatTimeLeft(drop.closesAt));
        }, 30000);
        return () => clearInterval(interval);
    }, [drop.closesAt]);

    const getBadge = () => {
        if (drop.slotsLeft === 0) return { text: 'Full', cls: 'full' };
        if (timeLeft === 'Closed') return { text: 'Closed', cls: 'full' };
        const diff = new Date(drop.closesAt).getTime() - Date.now();
        if (diff < 15 * 60 * 1000) return { text: 'Closing Soon', cls: 'closing' };
        return { text: 'Live', cls: 'live' };
    };
    const badge = getBadge();

    const avatarColors = ['#0A84FF', '#BF5AF2', '#FF375F', '#30D158', '#FF9F0A'];

    return (
        <div className="drops-card" onClick={() => onTap?.(drop)} role="button" tabIndex={0}>
            <div className="drops-card-header">
                <div className={`drops-card-icon ${config.iconClass}`}>
                    {config.icon}
                </div>
                <div className="drops-card-info">
                    <div className="drops-card-title">{drop.title}</div>
                    <div className="drops-card-subtitle">{drop.subtitle}</div>
                </div>
                <div className={`drops-card-badge ${badge.cls}`}>{badge.text}</div>
            </div>

            {drop.progressMax > 0 && (
                <div className="drops-progress">
                    <div className="drops-progress-header">
                        <span className="drops-progress-label">{drop.progressLabel || 'Progress'}</span>
                        <span className="drops-progress-value">
                            {drop.progressPrefix || ''}
                            {drop.progressCurrent.toLocaleString()}/{drop.progressMax.toLocaleString()}
                        </span>
                    </div>
                    <div className="drops-progress-track">
                        <div
                            className={`drops-progress-fill ${config.progressColor}`}
                            style={{ width: `${progressPct}%` }}
                        />
                    </div>
                </div>
            )}

            <div className="drops-card-footer">
                {timeLeft !== 'Closed' ? (
                    <div className="drops-timer">
                        <span className="drops-timer-icon">⏱</span>
                        {timeLeft}
                    </div>
                ) : (
                    <div className="drops-timer" style={{ color: 'var(--drops-red)' }}>Ended</div>
                )}

                <div className="drops-slots">
                    {drop.members && drop.members.length > 0 && (
                        <div className="drops-slot-avatars">
                            {drop.members.slice(0, 3).map((m, i) => (
                                <div
                                    key={i}
                                    className="drops-slot-avatar"
                                    style={{ background: avatarColors[i % avatarColors.length] }}
                                >
                                    {m.charAt(0)}
                                </div>
                            ))}
                        </div>
                    )}
                    {drop.slotsLeft > 0 ? (
                        <span className="drops-slot-text">{drop.slotsLeft} slot{drop.slotsLeft !== 1 ? 's' : ''} left</span>
                    ) : (
                        <span className="drops-slot-text" style={{ color: 'var(--drops-red)' }}>Full</span>
                    )}
                </div>
            </div>
        </div>
    );
}
