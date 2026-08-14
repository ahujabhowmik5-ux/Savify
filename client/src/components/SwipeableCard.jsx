import React, { useState, useRef, useCallback, useEffect } from 'react';

const SwipeableCard = React.memo(({ profile, scoreColor, matchScore, myHabits, onSwipe, exitAnim, questions }) => {
    const cardRef = useRef(null);
    const [swipeState, setSwipeState] = useState({ opacity: 0, dir: null });

    const drag = useRef({ x: 0, y: 0, dragging: false, startX: 0, startY: 0, startTime: 0 });

    useEffect(() => {
        // Instantly reset the card's position when a new profile is passed in
        if (cardRef.current) {
            cardRef.current.style.transition = 'none';
            cardRef.current.style.transform = `translateX(0px) translateY(0px) rotate(0deg)`;
        }
        setSwipeState({ opacity: 0, dir: null });
        drag.current = { x: 0, y: 0, dragging: false, startX: 0, startY: 0, startTime: 0 };
    }, [profile?.id]);

    const handleStart = useCallback((clientX, clientY) => {
        drag.current = { x: 0, y: 0, dragging: true, startX: clientX, startY: clientY, startTime: Date.now() };
        if (cardRef.current) {
            cardRef.current.style.transition = 'none';
        }
    }, []);

    const handleMove = useCallback((clientX, clientY) => {
        if (!drag.current.dragging) return;
        const x = clientX - drag.current.startX;
        const y = (clientY - drag.current.startY) * 0.3;
        drag.current.x = x;
        drag.current.y = y;

        if (cardRef.current) {
            const rotate = x * 0.05;
            cardRef.current.style.transform = `translateX(${x}px) translateY(${y}px) rotate(${rotate}deg)`;
        }

        const opacity = Math.min(Math.abs(x) / 100, 1);
        if (x > 20) setSwipeState({ opacity, dir: 'right' });
        else if (x < -20) setSwipeState({ opacity, dir: 'left' });
        else setSwipeState({ opacity: 0, dir: null });
    }, []);

    const handleEnd = useCallback(() => {
        if (!drag.current.dragging) return;
        drag.current.dragging = false;
        
        const { x, y } = drag.current;
        const timeDelta = Date.now() - drag.current.startTime;
        const velocity = Math.abs(x) / Math.max(timeDelta, 1);
        
        if (x > 100 || (x > 30 && velocity > 0.5)) {
            // Swipe Right
            animateOut(window.innerWidth, y);
            setTimeout(() => onSwipe(true), 250);
        } else if (x < -100 || (x < -30 && velocity > 0.5)) {
            // Swipe Left
            animateOut(-window.innerWidth, y);
            setTimeout(() => onSwipe(false), 250);
        } else {
            // Reset
            if (cardRef.current) {
                cardRef.current.style.transition = 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)';
                cardRef.current.style.transform = `translateX(0px) translateY(0px) rotate(0deg)`;
            }
            setSwipeState({ opacity: 0, dir: null });
        }
    }, [onSwipe]);

    const animateOut = (targetX, currentY) => {
        if (cardRef.current) {
            cardRef.current.style.transition = 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)';
            cardRef.current.style.transform = `translateX(${targetX}px) translateY(${currentY + 50}px) rotate(${targetX > 0 ? 30 : -30}deg)`;
        }
    };

    // Touch events
    const onTouchStart = (e) => handleStart(e.touches[0].clientX, e.touches[0].clientY);
    const onTouchMove = (e) => handleMove(e.touches[0].clientX, e.touches[0].clientY);
    const onTouchEnd = () => handleEnd();
    
    // Mouse events
    const onMouseDown = (e) => {
        handleStart(e.clientX, e.clientY);
        const onMouseMove = (ev) => handleMove(ev.clientX, ev.clientY);
        const onMouseUp = () => {
            handleEnd();
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    return (
        <div
            ref={cardRef}
            className={`fr-card ${exitAnim === 'left' ? 'exit-left' : ''} ${exitAnim === 'right' ? 'exit-right' : ''}`}
            onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onMouseDown={onMouseDown}
            style={{ touchAction: 'none' }}
        >
            <div className="fr-swipe-indicator left" style={{ opacity: swipeState.dir === 'left' ? swipeState.opacity : 0 }}>PASS</div>
            <div className="fr-swipe-indicator right" style={{ opacity: swipeState.dir === 'right' ? swipeState.opacity : 0 }}>CONNECT</div>

            <div className="fr-card-avatar-area">
                <div className="fr-card-avatar-bg" style={{ background: `linear-gradient(135deg, ${scoreColor}, #5E5CE6)` }}></div>
                <div className="fr-card-avatar" style={{ background: `linear-gradient(135deg, ${scoreColor}, #5E5CE6)` }}>
                    {profile.full_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
            </div>

            <div className="fr-card-info">
                <div>
                    <div className="fr-card-name">{profile.full_name || 'Anonymous'}</div>
                    <div className="fr-card-meta">@{profile.username || 'user'} · Looking for a roommate</div>
                    
                    {/* Display City and State from habits if available, else hometown */}
                    {(profile.habits?.city || profile.habits?.state || profile.hometown) && (
                        <div className="fr-card-hometown" style={{ fontSize: '0.85rem', color: 'var(--color-stone, rgba(255,255,255,0.6))', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <i className="fas fa-map-marker-alt" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}></i> 
                            {profile.habits?.city || profile.habits?.state 
                                ? [profile.habits.city, profile.habits.state].filter(Boolean).join(', ') 
                                : profile.hometown}
                        </div>
                    )}
                </div>

                {profile.habits ? (
                    <>
                        <div className="fr-match-bar">
                            <div className="fr-match-percent" style={{ color: scoreColor }}>{matchScore}%</div>
                            <div style={{ flex: 1 }}>
                                <div className="fr-match-label">Compatibility</div>
                                <div className="fr-match-track">
                                    <div className="fr-match-fill" style={{ width: `${matchScore}%`, background: `linear-gradient(90deg, ${scoreColor}, ${scoreColor}88)` }}></div>
                                </div>
                            </div>
                        </div>
                        <div className="fr-traits">
                            {questions.filter(q => q.id !== 'location').map(q => {
                                const val = profile.habits?.[q.id];
                                const opt = q.options?.find(o => o.label === val);
                                if (!val) return null;
                                const isMatch = myHabits[q.id] === val;
                                return (
                                    <div key={q.id} className={`fr-trait ${isMatch ? 'match' : ''}`}>
                                        <span className="fr-trait-icon"><i className={`fas ${opt?.icon || q.icon}`}></i></span>
                                        <span>{val}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                ) : (
                    <div className="fr-no-habits">
                        <i className="fas fa-user-clock"></i>
                        <span>Hasn't filled habits yet</span>
                    </div>
                )}
            </div>
        </div>
    );
});

export default SwipeableCard;
