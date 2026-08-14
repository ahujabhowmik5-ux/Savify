import { SavioEmoji } from '../Savio';

export default function StreakRing({ streak = 0 }) {
    const maxStreak = 30; // full ring = 30 days
    const pct = Math.min(streak / maxStreak, 1);
    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (pct * circumference);

    return (
        <div className="streak-ring-card">
            <div className="streak-ring-wrapper">
                <svg className="streak-ring-svg" viewBox="0 0 128 128">
                    <defs>
                        <linearGradient id="streakGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FF6B35" />
                            <stop offset="50%" stopColor="#F7931E" />
                            <stop offset="100%" stopColor="#FFD700" />
                        </linearGradient>
                        <filter id="streakGlow">
                            <feGaussianBlur stdDeviation="3" result="glow" />
                            <feMerge>
                                <feMergeNode in="glow" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>
                    {/* Background ring */}
                    <circle cx="64" cy="64" r={radius} fill="none"
                        stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                    {/* Animated progress ring */}
                    <circle cx="64" cy="64" r={radius} fill="none"
                        stroke="url(#streakGrad)" strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        className="streak-ring-progress"
                        filter={streak > 0 ? "url(#streakGlow)" : undefined}
                        transform="rotate(-90 64 64)"
                    />
                </svg>
                <div className="streak-ring-center">
                    <div className={`streak-flame ${streak > 0 ? 'active' : ''}`}>
                        <SavioEmoji emotion={streak > 7 ? 'celebrating' : 'happy'} size={24} />
                    </div>
                    <div className="streak-ring-number">{streak}</div>
                    <div className="streak-ring-label">day streak</div>
                </div>
            </div>
            <div className="streak-ring-meta">
                <div className="streak-ring-title">
                    <i className="fas fa-fire"></i> Daily Streak
                </div>
                <p className="streak-ring-desc">
                    {streak === 0
                        ? 'Add an expense today to start your streak!'
                        : streak >= 30
                            ? <span>Incredible! 30-day streak achieved! <SavioEmoji emotion="celebrating" size={16} /></span>
                            : `Keep going! ${30 - streak} days to complete the ring.`}
                </p>
            </div>
        </div>
    );
}
