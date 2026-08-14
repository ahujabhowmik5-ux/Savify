import { useState } from 'react';
import Savio from '../Savio';

export default function PoolDetailSheet({ drop, onClose }) {
    const [paymentState, setPaymentState] = useState('idle'); // idle | paying | paid
    if (!drop) return null;

    const handlePay = () => {
        setPaymentState('paying');
        setTimeout(() => setPaymentState('paid'), 2000);
    };

    const yourShare = drop.yourShare || Math.round(drop.progressCurrent / Math.max(1, (drop.members?.length || 1) + 1));

    return (
        <>
            <div className="drops-sheet-overlay" onClick={onClose} />
            <div className="drops-sheet">
                <div className="drops-sheet-handle" />
                <div className="drops-sheet-content">

                    {paymentState === 'paid' ? (
                        /* ─── Ticket / Fulfillment State ─── */
                        <>
                            <div className="drops-ticket">
                                <div className="drops-ticket-status">✅ Payment Secured</div>
                                <div className="drops-ticket-countdown">
                                    {drop.eta || '~25 min'}
                                </div>
                                <div className="drops-ticket-countdown-label">
                                    Estimated delivery time
                                </div>
                                <div className="drops-ticket-qr">
                                    <div style={{ textAlign: 'center' }}>
                                        <i className="fas fa-qrcode" style={{ fontSize: 64, color: '#000', opacity: 0.2 }}></i>
                                        <div style={{ marginTop: 4 }}>SCAN TO CLAIM</div>
                                    </div>
                                </div>
                                <div className="drops-ticket-id">
                                    #{String(Date.now()).slice(-6)}
                                </div>
                                <div className="drops-ticket-location">
                                    <i className="fas fa-map-marker-alt"></i>
                                    {drop.pickupLocation || 'LBS Main Gate'}
                                </div>
                            </div>

                            <div className="drops-savio-helper">
                                <Savio state="happy" size={48} showBubble={false} />
                                <div className="savio-message">
                                    Your order is locked in! Head to <strong>{drop.pickupLocation || 'LBS Main Gate'}</strong> when it arrives. Show your ticket to collect your items.
                                </div>
                            </div>

                            <button className="drops-pay-btn" onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', boxShadow: 'none' }}>
                                Done
                            </button>
                        </>
                    ) : (
                        /* ─── Pool Detail & Payment State ─── */
                        <>
                            <div className="drops-sheet-title">{drop.title}</div>
                            <div className="drops-sheet-subtitle">{drop.subtitle}</div>

                            {/* Escrow Trust Badge */}
                            <div className="drops-escrow-badge">
                                <div className="drops-escrow-icon">
                                    <i className="fas fa-shield-alt"></i>
                                </div>
                                <div className="drops-escrow-text">
                                    Savify Escrow Protected
                                    <span>Money held securely. Fully refunded if the drop is cancelled.</span>
                                </div>
                            </div>

                            {/* Savio Helper */}
                            <div className="drops-savio-helper">
                                <Savio state="explaining" size={44} showBubble={false} />
                                <div className="savio-message">
                                    {drop.members?.length || 0} people are already in this drop. Add your items and lock in your spot!
                                </div>
                            </div>

                            {/* Items */}
                            {drop.items && drop.items.length > 0 && (
                                <div className="drops-item-list">
                                    {drop.items.map((item, i) => (
                                        <div className="drops-item" key={i}>
                                            <div className="drops-item-left">
                                                <span className="drops-item-emoji">{item.emoji || '📦'}</span>
                                                <div>
                                                    <div className="drops-item-name">{item.name}</div>
                                                    <div className="drops-item-qty">{item.qty || 'x1'}</div>
                                                </div>
                                            </div>
                                            <div className="drops-item-price">₹{item.price}</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Pay Button */}
                            <button
                                className="drops-pay-btn"
                                onClick={handlePay}
                                disabled={paymentState === 'paying'}
                            >
                                {paymentState === 'paying' ? (
                                    <>
                                        <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></div>
                                        Securing your spot...
                                    </>
                                ) : (
                                    <>
                                        Pay Your Share · <span className="pay-amount">₹{yourShare}</span>
                                    </>
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
