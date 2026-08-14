import { useState, useEffect, useMemo } from 'react';
import '../styles/savio.css';

const STATES = [
    'idle', 'waving', 'happy', 'celebrating', 'proud', 'approving', 'cheering', 'dancing', 'winking',
    'explaining', 'thinking', 'curious', 'pointing', 'questioning', 'analyzing', 'studying', 'idea',
    'sleeping', 'neutral', 'waiting',
    'warning', 'sad', 'angry', 'worried', 'shocked', 'disappointed', 'nervous', 'crying',
];

const STATE_MOOD = {
    idle: 'green', waving: 'green', happy: 'green', celebrating: 'green',
    proud: 'green', approving: 'green', cheering: 'green', dancing: 'green', winking: 'green',
    explaining: 'yellow', thinking: 'yellow', curious: 'yellow', pointing: 'yellow',
    questioning: 'yellow', analyzing: 'yellow', studying: 'yellow', idea: 'yellow',
    sleeping: 'yellow', neutral: 'yellow', waiting: 'yellow',
    warning: 'red', sad: 'red', angry: 'red', worried: 'red',
    shocked: 'red', disappointed: 'red', nervous: 'red', crying: 'red',
};

const COLOR_SCHEMES = {
    green: {
        screenTop: '#8B5CF6', screenBot: '#D946EF',
        bodyMetal: '#3a3a4a', bodyDark: '#2a2a3a', bodyLight: '#4a4a5a',
        accent: '#10B981', glow: 'rgba(139, 92, 246, 0.4)',
        limbMetal: '#4a4a5a', limbDark: '#3a3a4a', shoe: '#2a2a3a',
    },
    yellow: {
        screenTop: '#A855F7', screenBot: '#EC4899',
        bodyMetal: '#3a3a4a', bodyDark: '#2a2a3a', bodyLight: '#4a4a5a',
        accent: '#FBBF24', glow: 'rgba(168, 85, 247, 0.4)',
        limbMetal: '#4a4a5a', limbDark: '#3a3a4a', shoe: '#2a2a3a',
    },
    red: {
        screenTop: '#DC2626', screenBot: '#F43F5E',
        bodyMetal: '#3a3a4a', bodyDark: '#2a2a3a', bodyLight: '#4a4a5a',
        accent: '#EF4444', glow: 'rgba(220, 38, 38, 0.4)',
        limbMetal: '#4a4a5a', limbDark: '#3a3a4a', shoe: '#2a2a3a',
    },
};

function RoboEyes({ state }) {
    switch (state) {
        case 'waiting':
            return (
                <>
                    <style>{`
                        @keyframes spin-clock { 100% { transform: rotate(360deg); } }
                    `}</style>
                    <circle cx="35" cy="28" r="6" fill="none" stroke="white" strokeWidth="1.5" opacity="0.9" />
                    <line x1="35" y1="28" x2="35" y2="24" stroke="white" strokeWidth="1.5" strokeLinecap="round" style={{ transformOrigin: '35px 28px', animation: 'spin-clock 1s linear infinite' }} />
                    <line x1="35" y1="28" x2="38" y2="28" stroke="white" strokeWidth="1.5" strokeLinecap="round" style={{ transformOrigin: '35px 28px', animation: 'spin-clock 12s linear infinite' }} />

                    <circle cx="57" cy="28" r="6" fill="none" stroke="white" strokeWidth="1.5" opacity="0.9" />
                    <line x1="57" y1="28" x2="57" y2="24" stroke="white" strokeWidth="1.5" strokeLinecap="round" style={{ transformOrigin: '57px 28px', animation: 'spin-clock 1s linear infinite' }} />
                    <line x1="57" y1="28" x2="60" y2="28" stroke="white" strokeWidth="1.5" strokeLinecap="round" style={{ transformOrigin: '57px 28px', animation: 'spin-clock 12s linear infinite' }} />
                </>
            );
        case 'winking':
            return (
                <>
                    {/* Left eye: open */}
                    <circle cx="35" cy="28" r="3.5" fill="white" opacity="0.95" className="sv4-pupil-idle" />
                    {/* Right eye: closed (happy arc = wink) */}
                    <path d="M 52 28 Q 57 23 62 28" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.95" />
                </>
            );
        case 'happy': case 'celebrating': case 'cheering': case 'dancing': case 'proud': case 'approving':
            return (
                <>
                    <path d="M 30 28 Q 35 23 40 28" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.95" />
                    <path d="M 52 28 Q 57 23 62 28" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.95" />
                </>
            );
        case 'sleeping':
            return (
                <>
                    <line x1="30" y1="28" x2="40" y2="28" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
                    <line x1="52" y1="28" x2="62" y2="28" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
                </>
            );
        case 'sad': case 'disappointed': case 'crying':
            return (
                <>
                    <path d="M 30 27 Q 35 31 40 27" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
                    <path d="M 52 27 Q 57 31 62 27" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
                    {state === 'crying' && (
                        <>
                            <rect x="34" y="30" width="2" height="4" fill="rgba(96,165,250,0.8)" className="sv4-tear" />
                            <rect x="56" y="30" width="2" height="4" fill="rgba(96,165,250,0.8)" className="sv4-tear" style={{ animationDelay: '0.5s' }} />
                        </>
                    )}
                </>
            );
        case 'angry':
            return (
                <>
                    <line x1="28" y1="24" x2="40" y2="27" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
                    <line x1="64" y1="24" x2="52" y2="27" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
                    <rect x="32" y="28" width="5" height="5" rx="1" fill="white" opacity="0.95" />
                    <rect x="55" y="28" width="5" height="5" rx="1" fill="white" opacity="0.95" />
                </>
            );
        case 'shocked':
            return (
                <>
                    <circle cx="35" cy="28" r="5" fill="white" opacity="0.95" className="sv4-pupil-shock" />
                    <circle cx="57" cy="28" r="5" fill="white" opacity="0.95" className="sv4-pupil-shock" />
                </>
            );
        case 'thinking': case 'analyzing': case 'studying':
            return (
                <>
                    <circle cx="35" cy="28" r="3.5" fill="white" opacity="0.9" className="sv4-pupil-think" />
                    <line x1="52" y1="28" x2="62" y2="28" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
                </>
            );
        case 'worried': case 'nervous': case 'warning':
            return (
                <>
                    <circle cx="35" cy="28" r="3" fill="white" opacity="0.85" />
                    <circle cx="57" cy="28" r="3" fill="white" opacity="0.85" />
                    <line x1="30" y1="23" x2="40" y2="25" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
                    <line x1="62" y1="23" x2="52" y2="25" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
                </>
            );
        default:
            return (
                <>
                    <circle cx="35" cy="28" r="3.5" fill="white" opacity="0.95" className="sv4-pupil-idle" />
                    <circle cx="57" cy="28" r="3.5" fill="white" opacity="0.95" className="sv4-pupil-idle" />
                </>
            );
    }
}

function RoboMouth({ state }) {
    switch (state) {
        case 'winking':
            return <path d="M 36 35 Q 46 43 56 35" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.9" />;
        case 'happy': case 'celebrating': case 'cheering': case 'dancing': case 'proud': case 'approving':
            return <path d="M 37 35 Q 46 42 55 35" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.9" />;
        case 'sad': case 'disappointed': case 'crying':
            return <path d="M 38 38 Q 46 34 54 38" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.85" />;
        case 'angry':
            return <path d="M 36 37 L 40 35 L 46 38 L 52 35 L 56 37" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.9" />;
        case 'shocked':
            return <ellipse cx="46" cy="37" rx="4" ry="5" fill="none" stroke="white" strokeWidth="2" opacity="0.9" />;
        case 'thinking': case 'analyzing': case 'studying': case 'neutral':
            return <line x1="40" y1="36" x2="52" y2="36" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.7" />;
        case 'sleeping':
            return <path d="M 42 36 Q 46 38 50 36" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />;
        case 'worried': case 'nervous': case 'warning':
            return <path d="M 40 36 Q 46 38 52 36" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />;
        default:
            return <path d="M 39 35 Q 46 40 53 35" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.9" />;
    }
}

function RoboAccessories({ state }) {
    if (state === 'questioning') {
        return <text x="70" y="16" fontSize="14" fill="white" fontWeight="900" className="sv4-float">?</text>;
    }
    if (state === 'idea') {
        return (
            <g className="sv4-float">
                <circle cx="72" cy="12" r="6" fill="rgba(217,70,239,0.3)" stroke="#D946EF" strokeWidth="1.5" />
                <line x1="72" y1="6" x2="72" y2="2" stroke="#D946EF" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="67" y1="8" x2="64" y2="5" stroke="#D946EF" strokeWidth="1" strokeLinecap="round" />
                <line x1="77" y1="8" x2="80" y2="5" stroke="#D946EF" strokeWidth="1" strokeLinecap="round" />
            </g>
        );
    }
    if (state === 'warning') {
        return (
            <g className="sv4-float">
                <polygon points="72,4 66,16 78,16" fill="rgba(239,68,68,0.2)" stroke="#EF4444" strokeWidth="1.5" strokeLinejoin="round" />
                <text x="72" y="14" textAnchor="middle" fill="#EF4444" fontSize="8" fontWeight="900">!</text>
            </g>
        );
    }
    if (state === 'angry') {
        return (
            <>
                <g className="sv4-steam">
                    <path d="M 25 14 Q 22 8 25 2" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
                </g>
                <g className="sv4-steam" style={{ animationDelay: '0.3s' }}>
                    <path d="M 67 14 Q 70 8 67 2" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
                </g>
            </>
        );
    }
    return null;
}

function getBodyClass(state) {
    switch (state) {
        case 'waving': case 'cheering': case 'winking': return 'sv4-wave';
        case 'celebrating': case 'dancing': return 'sv4-dance';
        case 'thinking': case 'analyzing': case 'studying': return 'sv4-think';
        case 'pointing': return 'sv4-point';
        case 'explaining': case 'idea': return 'sv4-explain';
        case 'sleeping': return 'sv4-sleep';
        case 'shocked': return 'sv4-shock';
        case 'sad': case 'crying': case 'disappointed': return 'sv4-sad';
        case 'nervous': case 'worried': return 'sv4-nervous';
        case 'angry': return 'sv4-angry';
        default: return 'sv4-idle';
    }
}

export default function Savio({
    state = 'idle',
    size = 64,
    message = '',
    onDismiss,
    showBubble = true,
    className = '',
    style = {},
    mood: forceMood,
}) {
    const [currentState, setCurrentState] = useState(state);
    useEffect(() => { setCurrentState(state); }, [state]);

    const mood = forceMood || STATE_MOOD[currentState] || 'green';
    const c = COLOR_SCHEMES[mood];
    const bodyClass = getBodyClass(currentState);
    const uid = useMemo(() => Math.random().toString(36).substr(2, 6), []);

    return (
        <div className={`savio-container ${className}`} style={{ ...style, '--savio-size': `${size}px` }}>
            <div className={`savio-character ${bodyClass}`}>
                <svg viewBox="0 0 92 90" width={size} height={size} xmlns="http://www.w3.org/2000/svg" className="savio-svg">
                    <defs>
                        <filter id={`shd4_${uid}`} x="-15%" y="-15%" width="130%" height="140%">
                            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor={c.glow} floodOpacity="0.6" />
                        </filter>
                        <linearGradient id={`screen_${uid}`} x1="0" y1="0" x2="0.3" y2="1">
                            <stop offset="0%" stopColor={c.screenTop} />
                            <stop offset="100%" stopColor={c.screenBot} />
                        </linearGradient>
                        <linearGradient id={`body_${uid}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={c.bodyLight} />
                            <stop offset="100%" stopColor={c.bodyDark} />
                        </linearGradient>
                    </defs>

                    <g filter={`url(#shd4_${uid})`}>
                        {/* Legs */}
                        <rect x="37" y="72" width="5" height="9" rx="2" fill={c.limbMetal} />
                        <rect x="50" y="72" width="5" height="9" rx="2" fill={c.limbMetal} />
                        <ellipse cx="39.5" cy="81" rx="4" ry="2" fill={c.shoe} />
                        <ellipse cx="52.5" cy="81" rx="4" ry="2" fill={c.shoe} />

                        {/* Arms */}
                        <g className={currentState === 'waving' || currentState === 'cheering' ? 'sv4-arm-wave-l' : currentState === 'celebrating' || currentState === 'dancing' ? 'sv4-arm-celebrate-l' : 'sv4-arm-idle-l'} style={{ transformOrigin: '26px 58px' }}>
                            <path d="M 26 55 Q 18 60 15 66" stroke={c.limbDark} strokeWidth="6" strokeLinecap="round" fill="none" />
                            <path d="M 26 55 Q 18 60 15 66" stroke={c.limbMetal} strokeWidth="4.5" strokeLinecap="round" fill="none" />
                            <circle cx="14" cy="67" r="3.5" fill={c.limbMetal} stroke={c.limbDark} strokeWidth="0.7" />
                        </g>
                        <g className={currentState === 'waving' || currentState === 'cheering' ? 'sv4-arm-wave-r' : currentState === 'celebrating' || currentState === 'dancing' ? 'sv4-arm-celebrate-r' : currentState === 'pointing' || currentState === 'idea' ? 'sv4-arm-point-r' : 'sv4-arm-idle-r'} style={{ transformOrigin: '66px 58px' }}>
                            <path d="M 66 55 Q 74 60 77 66" stroke={c.limbDark} strokeWidth="6" strokeLinecap="round" fill="none" />
                            <path d="M 66 55 Q 74 60 77 66" stroke={c.limbMetal} strokeWidth="4.5" strokeLinecap="round" fill="none" />
                            <circle cx="78" cy="67" r="3.5" fill={c.limbMetal} stroke={c.limbDark} strokeWidth="0.7" />
                        </g>

                        {/* Body — metallic trapezoid torso */}
                        <path d="M 32 48 L 28 72 L 64 72 L 60 48 Z" fill={`url(#body_${uid})`} stroke={c.bodyDark} strokeWidth="0.8" rx="4" />
                        <ellipse cx="46" cy="60" rx="8" ry="6" fill="rgba(139,92,246,0.08)" />
                        <circle cx="46" cy="60" r="4" fill="none" stroke="rgba(139,92,246,0.2)" strokeWidth="0.8" />
                        <text x="46" y="62.5" textAnchor="middle" fill="rgba(139,92,246,0.4)" fontSize="6" fontWeight="900">S</text>

                        {/* Neck */}
                        <rect x="42" y="43" width="8" height="6" rx="2" fill={c.bodyMetal} />

                        {/* Head — TV screen rounded rectangle */}
                        <rect x="22" y="10" width="48" height="35" rx="6" ry="6" fill={c.bodyDark} stroke={c.bodyMetal} strokeWidth="1.5" />
                        <rect x="25" y="13" width="42" height="29" rx="4" ry="4" fill={`url(#screen_${uid})`} className="savio-screen" />

                        {/* Scanline overlay */}
                        <rect x="25" y="13" width="42" height="29" rx="4" ry="4" fill="url(#scanlines)" opacity="0.08" className="savio-scanlines" />

                        {/* Screen glow highlight */}
                        <rect x="27" y="15" width="18" height="6" rx="3" fill="white" opacity="0.08" />

                        {/* Antenna */}
                        <line x1="46" y1="10" x2="46" y2="4" stroke={c.bodyMetal} strokeWidth="2" strokeLinecap="round" />
                        <circle cx="46" cy="3" r="2" fill="#D946EF" className="savio-antenna-glow" />

                        {/* Eyes */}
                        <RoboEyes state={currentState} />

                        {/* Mouth */}
                        <RoboMouth state={currentState} />

                        {/* Accessories */}
                        <RoboAccessories state={currentState} />
                    </g>
                </svg>

                {(currentState === 'celebrating' || currentState === 'dancing') && (
                    <div className="savio-particles">
                        <span className="savio-particle">✦</span>
                        <span className="savio-particle">★</span>
                        <span className="savio-particle">✦</span>
                        <span className="savio-particle">●</span>
                        <span className="savio-particle">✧</span>
                    </div>
                )}

                {currentState === 'sleeping' && (
                    <div className="savio-zzz">
                        <span>z</span><span>Z</span><span>Z</span>
                    </div>
                )}
            </div>

            {message && showBubble && (
                <div className="savio-bubble">
                    <p className="savio-bubble-text">{message}</p>
                    {onDismiss && (
                        <button className="savio-bubble-dismiss" onClick={onDismiss}>
                            <i className="fas fa-times"></i>
                        </button>
                    )}
                    <div className="savio-bubble-tail"></div>
                </div>
            )}
        </div>
    );
}

export function SavioEmoji({ emotion = 'happy', size = 20 }) {
    const mood = STATE_MOOD[emotion] || 'green';
    const c = COLOR_SCHEMES[mood];
    const uid = useMemo(() => Math.random().toString(36).substr(2, 4), []);

    let eyes;
    switch (emotion) {
        case 'winking':
            eyes = (
                <>
                    <circle cx="15" cy="18" r="2.5" fill="white" opacity="0.95" />
                    <path d="M 26 18 Q 30 14 34 18" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                </>
            );
            break;
        case 'happy': case 'celebrating': case 'cheering': case 'proud': case 'approving': case 'dancing':
            eyes = (
                <>
                    <path d="M 11 18 Q 15 14 19 18" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M 26 18 Q 30 14 34 18" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                </>
            );
            break;
        case 'sleeping':
            eyes = (
                <>
                    <line x1="12" y1="18" x2="18" y2="18" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
                    <line x1="27" y1="18" x2="33" y2="18" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
                </>
            );
            break;
        case 'shocked':
            eyes = (
                <>
                    <circle cx="15" cy="18" r="3" fill="white" opacity="0.95" />
                    <circle cx="30" cy="18" r="3" fill="white" opacity="0.95" />
                </>
            );
            break;
        case 'angry':
            eyes = (
                <>
                    <rect x="13" y="17" width="4" height="4" rx="1" fill="white" opacity="0.95" />
                    <rect x="28" y="17" width="4" height="4" rx="1" fill="white" opacity="0.95" />
                    <line x1="11" y1="15" x2="19" y2="17" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="34" y1="15" x2="26" y2="17" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                </>
            );
            break;
        case 'sad': case 'crying': case 'disappointed':
            eyes = (
                <>
                    <path d="M 12 18 Q 15 21 18 18" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M 27 18 Q 30 21 33 18" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                </>
            );
            break;
        case 'worried': case 'nervous': case 'warning':
            eyes = (
                <>
                    <circle cx="15" cy="18" r="2" fill="white" opacity="0.8" />
                    <circle cx="30" cy="18" r="2" fill="white" opacity="0.8" />
                </>
            );
            break;
        default:
            eyes = (
                <>
                    <circle cx="15" cy="18" r="2.5" fill="white" opacity="0.95" />
                    <circle cx="30" cy="18" r="2.5" fill="white" opacity="0.95" />
                </>
            );
    }

    const miniMouth = getMiniMouth(emotion);

    return (
        <svg width={size} height={size} viewBox="0 0 45 45" className="savio-emoji" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
            <defs>
                <linearGradient id={`emg4_${uid}`} x1="0" y1="0" x2="0.3" y2="1">
                    <stop offset="0%" stopColor={c.screenTop} />
                    <stop offset="100%" stopColor={c.screenBot} />
                </linearGradient>
            </defs>
            <rect x="4" y="4" width="37" height="37" rx="8" fill={c.bodyDark} />
            <rect x="6" y="6" width="33" height="33" rx="6" fill={`url(#emg4_${uid})`} />
            {eyes}
            {miniMouth}
        </svg>
    );
}

function getMiniMouth(emotion) {
    switch (emotion) {
        case 'winking':
            return <path d="M 15 27 Q 22.5 34 30 27" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" />;
        case 'happy': case 'celebrating': case 'cheering': case 'approving': case 'dancing':
            return <path d="M 16 27 Q 22.5 33 29 27" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" />;
        case 'sad': case 'disappointed': case 'crying':
            return <path d="M 17 30 Q 22.5 26 28 30" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" />;
        case 'thinking': case 'analyzing': case 'neutral': case 'studying':
            return <line x1="18" y1="29" x2="27" y2="29" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />;
        case 'shocked':
            return <ellipse cx="22.5" cy="30" rx="3" ry="4" fill="none" stroke="white" strokeWidth="1.5" />;
        case 'angry':
            return <path d="M 17 29 L 20 27 L 25 30 L 28 28" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" />;
        case 'worried': case 'nervous': case 'warning':
            return <path d="M 19 28 Q 22.5 30 26 28" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />;
        default:
            return <path d="M 17 27 Q 22.5 32 28 27" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" />;
    }
}

export { STATES, STATE_MOOD, COLOR_SCHEMES };
