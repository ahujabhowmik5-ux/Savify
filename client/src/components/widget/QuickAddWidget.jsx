import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import '../../styles/widget.css';

const SAVIFY_LOGO = 'https://i.ibb.co/v441FQJ1/gemini-2-5-flash-image-Refine-this-Savify-S-logo-to-be-flatter-more-geometric-and-ultra-premium.png';

const CATEGORIES = [
    { name: 'Food', icon: 'fa-utensils' },
    { name: 'Transport', icon: 'fa-car' },
    { name: 'Shopping', icon: 'fa-shopping-bag' },
    { name: 'Entertainment', icon: 'fa-film' },
    { name: 'Bills', icon: 'fa-file-invoice' },
    { name: 'Education', icon: 'fa-graduation-cap' },
];

const VISIBLE_COUNT = 3;
const ARC_RADIUS = 95; // px from center of FAB

export default function QuickAddWidget({ user, addExpense, currentBudget, currentSpending, fetchScoreAndRank, fetchHistory, fetchExpenses }) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [amount, setAmount] = useState('');
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [currentAngle, setCurrentAngle] = useState(0);

    // Position state
    const [fabPos, setFabPos] = useState(() => {
        try {
            const saved = localStorage.getItem('savify_widget_pos');
            if (saved) return JSON.parse(saved);
        } catch { /* ignore */ }
        return { x: window.innerWidth - 75, y: window.innerHeight - 120 };
    });

    const isDragging = useRef(false);
    const hasMoved = useRef(false);
    const startPoint = useRef({ x: 0, y: 0 });
    const startPos = useRef({ x: 0, y: 0 });
    const amountInputRef = useRef(null);
    const rafRef = useRef(null);
    const dialInteraction = useRef({ active: false, startTouchAngle: 0, startCurrentAngle: 0 });
    const arcContainerRef = useRef(null);

    const isOnLeft = fabPos.x < window.innerWidth / 2;
    const fabSize = 60;

    // Snap to edge
    const snapToEdge = useCallback((currentPos) => {
        const margin = 10;
        const midX = window.innerWidth / 2;
        const snapX = (currentPos.x + fabSize / 2) < midX
            ? margin
            : window.innerWidth - fabSize - margin;
        const snapY = Math.max(margin, Math.min(window.innerHeight - fabSize - margin, currentPos.y));
        const snapped = { x: snapX, y: snapY };
        setFabPos(snapped);
        localStorage.setItem('savify_widget_pos', JSON.stringify(snapped));
    }, []);

    // Drag handlers with rAF
    useEffect(() => {
        const onMove = (e) => {
            if (!isDragging.current) return;
            e.stopPropagation();
            const clientX = e.clientX ?? e.touches?.[0]?.clientX;
            const clientY = e.clientY ?? e.touches?.[0]?.clientY;
            if (clientX == null) return;
            const dx = clientX - startPoint.current.x;
            const dy = clientY - startPoint.current.y;
            if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
                hasMoved.current = true;
                e.preventDefault?.();
            }
            if (hasMoved.current) {
                if (rafRef.current) cancelAnimationFrame(rafRef.current);
                rafRef.current = requestAnimationFrame(() => {
                    setFabPos({ x: startPos.current.x + dx, y: startPos.current.y + dy });
                });
            }
        };
        const onEnd = (e) => {
            if (!isDragging.current) return;
            e.stopPropagation();
            isDragging.current = false;
            if (hasMoved.current) {
                setFabPos(prev => { snapToEdge(prev); return prev; });
            } else {
                setTimeout(() => setIsOpen(prev => !prev), 50);
            }
            hasMoved.current = false;
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onEnd);
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('touchend', onEnd);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onEnd);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('touchend', onEnd);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [snapToEdge]);

    const handleDown = (e) => {
        e.stopPropagation();
        isDragging.current = true;
        hasMoved.current = false;
        const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
        const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
        startPoint.current = { x: clientX, y: clientY };
        startPos.current = { ...fabPos };
    };

    // Smooth Dial gesture
    const handleArcTouchStart = (e) => {
        e.stopPropagation();
        dialInteraction.current.active = true;
        const cx = fabPos.x + fabSize / 2;
        const cy = fabPos.y + fabSize / 2;
        const tx = e.touches?.[0]?.clientX ?? e.clientX;
        const ty = e.touches?.[0]?.clientY ?? e.clientY;
        dialInteraction.current.startTouchAngle = Math.atan2(ty - cy, tx - cx) * (180 / Math.PI);
        dialInteraction.current.startCurrentAngle = currentAngle;
    };

    const handleArcTouchMove = useCallback((e) => {
        if (!dialInteraction.current.active) return;
        e.stopPropagation();
        e.preventDefault(); // Stop page scrolling
        const cx = fabPos.x + fabSize / 2;
        const cy = fabPos.y + fabSize / 2;
        const tx = e.touches?.[0]?.clientX ?? e.clientX;
        const ty = e.touches?.[0]?.clientY ?? e.clientY;
        const touchAngle = Math.atan2(ty - cy, tx - cx) * (180 / Math.PI);

        let diff = touchAngle - dialInteraction.current.startTouchAngle;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;

        // Dial turns opposite direction if the widget is on the right side due to math handling
        const directionMultiplier = isOnLeft ? 1 : 1;
        const targetAngle = dialInteraction.current.startCurrentAngle + diff * directionMultiplier;

        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
            setCurrentAngle(targetAngle);
        });
    }, [fabPos, isOnLeft]);

    const handleArcTouchEnd = (e) => {
        if (!dialInteraction.current.active) return;
        e.stopPropagation();
        dialInteraction.current.active = false;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        // Snap to nearest 60 degrees for strict alignment
        setCurrentAngle(prev => Math.round(prev / 60) * 60);
    };

    // Attach non-passive touchmove listener to block scrolling
    useEffect(() => {
        const el = arcContainerRef.current;
        if (el) {
            el.addEventListener('touchmove', handleArcTouchMove, { passive: false });
            el.addEventListener('mousemove', handleArcTouchMove, { passive: false });
        }
        return () => {
            if (el) {
                el.removeEventListener('touchmove', handleArcTouchMove);
                el.removeEventListener('mousemove', handleArcTouchMove);
            }
        };
    }, [handleArcTouchMove, isOpen]);

    // Compute positions for continuous semi-circular arc
    const getArcPositions = () => {
        const centerX = fabPos.x + fabSize / 2;
        const centerY = fabPos.y + fabSize / 2;

        const baseStartAngle = isOnLeft ? -60 : 120; // Center of the arc
        const segmentDeg = 360 / CATEGORIES.length; // 60 degrees

        return CATEGORIES.map((cat, i) => {
            let angleDeg = baseStartAngle + currentAngle + (i * segmentDeg);

            let relativeAngle = (currentAngle + (i * segmentDeg)) % 360;
            if (relativeAngle > 180) relativeAngle -= 360;
            if (relativeAngle <= -180) relativeAngle += 360;

            // Item is visible if it's within 90 degrees of the center of the arc
            const isVisible = Math.abs(relativeAngle) < 85;
            const scale = isVisible ? 1 : 0.5;
            const opacity = isVisible ? 1 : 0;
            const pointerEvents = isVisible ? 'auto' : 'none';

            const angleRad = (angleDeg * Math.PI) / 180;
            return {
                cat,
                idx: i,
                x: centerX + ARC_RADIUS * Math.cos(angleRad) - 28,
                y: centerY + ARC_RADIUS * Math.sin(angleRad) - 28,
                scale,
                opacity,
                pointerEvents
            };
        });
    };

    // Navigate spin via arrow buttons (jump 60 deg)
    const spinNext = (e) => {
        e.stopPropagation();
        setCurrentAngle(prev => prev + 60);
    };
    const spinPrev = (e) => {
        e.stopPropagation();
        setCurrentAngle(prev => prev - 60);
    };

    // Category click
    const handleCategoryClick = (cat) => {
        setSelectedCategory(cat);
        setIsOpen(false);
        setCurrentAngle(0);
        setTimeout(() => amountInputRef.current?.focus(), 100);
    };

    // Submit
    const handleSubmit = async () => {
        const val = parseFloat(amount);
        if (!val || val <= 0 || !selectedCategory) return;
        setSaving(true);
        try {
            await addExpense(val, selectedCategory.name, 'Quick Add');
            const newSpending = (currentSpending || 0) + val;
            let score = 1000 - Math.round((newSpending / Math.max(currentBudget || 1, 1)) * 1000);
            score = Math.max(0, Math.min(1000, score));
            await supabase.from('user_applications')
                .update({ current_weekly_spent: newSpending, current_score: score })
                .eq('user_id', user.id);
            setSuccess(true);
            setTimeout(() => {
                setSelectedCategory(null);
                setAmount('');
                setSuccess(false);
                setSaving(false);
                fetchHistory?.();
                fetchExpenses?.();
                fetchScoreAndRank?.();
            }, 800);
            if (typeof window.confetti === 'function') {
                window.confetti({ particleCount: 100, spread: 60, origin: { y: 0.6 }, colors: ['#10B981', '#D4AF37', '#000'] });
            }
        } catch (err) {
            console.error('Quick add error:', err);
            alert('Failed: ' + (err.message || 'Unknown error'));
            setSaving(false);
        }
    };

    const closePopup = () => {
        if (saving) return;
        setSelectedCategory(null);
        setAmount('');
    };

    const arcPositions = isOpen ? getArcPositions() : [];

    // Spin indicator dots
    const dotCount = CATEGORIES.length;

    return (
        <>
            {/* Backdrop */}
            {isOpen && <div className="widget-backdrop" onClick={() => { setIsOpen(false); setCurrentAngle(0); }} />}

            {/* Semi-circular arc buttons */}
            {isOpen && (
                <div
                    ref={arcContainerRef}
                    className="widget-arc-container"
                    style={{ touchAction: 'none' }}
                    onTouchStart={handleArcTouchStart}
                    onTouchEnd={handleArcTouchEnd}
                    onMouseDown={handleArcTouchStart}
                    onMouseUp={handleArcTouchEnd}
                >
                    {arcPositions.map(({ cat, idx, x, y, scale, opacity, pointerEvents }) => (
                        <button
                            key={cat.name}
                            className="widget-arc-btn"
                            style={{
                                position: 'fixed',
                                left: x,
                                top: y,
                                transform: `scale(${scale})`,
                                opacity: opacity,
                                pointerEvents: pointerEvents,
                                transition: dialInteraction.current.active ? 'none' : 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                                zIndex: 100001,
                            }}
                            onClick={(e) => { e.stopPropagation(); handleCategoryClick(cat); }}
                        >
                            <i className={`fas ${cat.icon}`}></i>
                            <span className="widget-arc-label">{cat.name}</span>
                        </button>
                    ))}

                    {/* Spin arrows */}
                    <button
                        className="widget-spin-arrow prev"
                        style={{
                            position: 'fixed',
                            left: isOnLeft ? fabPos.x + fabSize + ARC_RADIUS + 20 : fabPos.x - ARC_RADIUS - 50,
                            top: fabPos.y + fabSize / 2 - 14,
                            zIndex: 100001,
                        }}
                        onClick={spinPrev}
                    >
                        <i className={`fas fa-chevron-${isOnLeft ? 'up' : 'up'}`}></i>
                    </button>
                    <button
                        className="widget-spin-arrow next"
                        style={{
                            position: 'fixed',
                            left: isOnLeft ? fabPos.x + fabSize + ARC_RADIUS + 20 : fabPos.x - ARC_RADIUS - 50,
                            top: fabPos.y + fabSize / 2 + 14,
                            zIndex: 100001,
                        }}
                        onClick={spinNext}
                    >
                        <i className={`fas fa-chevron-${isOnLeft ? 'down' : 'down'}`}></i>
                    </button>

                    {/* Dot indicator */}
                    <div
                        className="widget-arc-dots"
                        style={{
                            position: 'fixed',
                            left: isOnLeft ? fabPos.x + fabSize + ARC_RADIUS + 16 : fabPos.x - ARC_RADIUS - 55,
                            top: fabPos.y + fabSize / 2 + 45,
                            zIndex: 100001,
                        }}
                    >
                        {Array.from({ length: dotCount }).map((_, i) => {
                            // Calculate active state based on current angle
                            let relative = (currentAngle + i * 60) % 360;
                            if (relative < 0) relative += 360;
                            // Active if relative angle is exactly 0, or closest to 0
                            const isActive = relative > 330 || relative < 30;
                            return <span key={i} className={`widget-arc-dot ${isActive ? 'active' : ''}`} />;
                        })}
                    </div>
                </div>
            )}

            {/* Main FAB */}
            <button
                className={`widget-fab ${isOpen ? 'expanded' : ''}`}
                style={{ left: fabPos.x, top: fabPos.y }}
                onMouseDown={handleDown}
                onTouchStart={handleDown}
            >
                <img src={SAVIFY_LOGO} alt="S" className="widget-fab-logo" />
                <span className="widget-fab-glitter"></span>
            </button>

            {/* Amount Popup */}
            {selectedCategory && (
                <div className="widget-popup-overlay" onClick={(e) => e.target === e.currentTarget && closePopup()}>
                    <div className="widget-popup">
                        <div className="widget-popup-header">
                            <h3 className="widget-popup-title">Quick Add</h3>
                            <button className="widget-popup-close" onClick={closePopup}>×</button>
                        </div>
                        <div className="widget-popup-category">
                            <div className="widget-popup-category-icon">
                                <i className={`fas ${selectedCategory.icon}`}></i>
                            </div>
                            <div>
                                <div className="widget-popup-category-name">{selectedCategory.name}</div>
                                <div className="widget-popup-category-sub">Expense Category</div>
                            </div>
                        </div>
                        <div className="widget-popup-input-group">
                            <label className="widget-popup-label">Amount (₹)</label>
                            <input
                                ref={amountInputRef}
                                className="widget-popup-input"
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <button
                            className={`widget-popup-add-btn ${success ? 'success' : ''}`}
                            onClick={handleSubmit}
                            disabled={saving || !amount || parseFloat(amount) <= 0}
                        >
                            {saving ? (success ? '✓ Added!' : 'Saving...') : 'Add Expense'}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
