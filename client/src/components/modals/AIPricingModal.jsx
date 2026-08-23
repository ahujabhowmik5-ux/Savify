import React, { useState } from 'react';
import { triggerLightHaptic } from '../../utils/haptics';
import { AI_PLATFORM_CONFIG } from '../../config/poolPlans';

export default function AIPricingModal({ platform, poolTypes, getDailySlotForPool, getMembersForSlot, isUserInSlot, onClose, onJoin }) {
    
    // Unified configurations for the premium clean look
    const config = AI_PLATFORM_CONFIG;

    const platformConfig = config[platform];
    const [imgError, setImgError] = useState(false);
    
    if (!platformConfig) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 0', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
            
            <div style={{ width: '100%', maxWidth: '1200px', display: 'flex', flexDirection: 'column', position: 'relative', margin: 'auto' }}>
                
                {/* Header */}
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button 
                            onClick={() => { triggerLightHaptic(); onClose(); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '14px', fontWeight: '600', padding: '10px 18px', borderRadius: '100px', cursor: 'pointer', backdropFilter: 'blur(10px)' }}
                        >
                            <i className="fas fa-arrow-left" style={{ fontSize: '13px' }}></i> Back
                        </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '48px', height: '48px', background: 'white', borderRadius: '12px', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                            {imgError ? (
                                <i className={`fas ${platformConfig.fallbackIcon}`} style={{ fontSize: '24px', color: platformConfig.accent }}></i>
                            ) : (
                                <img 
                                    src={platformConfig.logo} 
                                    alt={platform} 
                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                                    onError={() => setImgError(true)}
                                />
                            )}
                        </div>
                        <div>
                            <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>{platform} Pools</h2>
                            <div style={{ color: '#888', fontSize: '14px', marginTop: '4px' }}>Choose a plan. No platform fee.</div>
                        </div>
                    </div>
                </div>

                {/* Horizontal Scrollable Plans for Mobile */}
                <div style={{ display: 'flex', gap: '20px', padding: '0 20px 40px', overflowX: 'auto', scrollSnapType: 'x mandatory', width: '100%' }}>
                    {platformConfig.plans.map((plan, idx) => {
                        const pool = poolTypes?.find(p => p.name === plan.name);
                        const dailySlot = pool ? getDailySlotForPool(pool.id) : null;
                        const isLive = dailySlot?.status !== 'completed';
                        // Seats only count once payment lands, so a live pool that
                        // just rolled over correctly reads 0/N again.
                        const members = (dailySlot && isLive) ? getMembersForSlot(dailySlot.id) : [];
                        const userIn = (dailySlot && isLive) ? isUserInSlot(dailySlot.id) : false;
                        const maxMembers = pool?.max_members || 3;
                        const isFull = members.length >= maxMembers;

                        let btnText = `Join & Pay ₹${plan.splitPrice}`;
                        let btnDisabled = false;
                        let btnOpacity = 1;
                        let btnBg = '#fff';
                        let btnColor = '#000';

                        if (userIn) {
                            btnText = 'Paid & Waiting';
                            btnDisabled = true;
                            btnBg = 'rgba(48,209,88,0.15)';
                            btnColor = '#30D158';
                        } else if (isFull) {
                            btnText = 'Pool Full / Locked';
                            btnDisabled = true;
                            btnOpacity = 0.5;
                            btnBg = 'rgba(255,255,255,0.1)';
                            btnColor = '#888';
                        }

                        return (
                            <div key={idx} style={{ 
                                flex: '0 0 320px', 
                                scrollSnapAlign: 'center', 
                                background: `radial-gradient(120% 100% at 50% 0%, ${platformConfig.accent}15 0%, #111 50%)`, 
                                border: '1px solid rgba(255,255,255,0.1)', 
                                borderRadius: '24px', 
                                display: 'flex', 
                                flexDirection: 'column', 
                                position: 'relative', 
                                overflow: 'hidden',
                                boxShadow: '0 16px 32px rgba(0,0,0,0.4)'
                            }}>
                                {/* Top Accent Line */}
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: platformConfig.accent }}></div>
                                
                                <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                                    <h3 style={{ fontSize: '24px', fontWeight: '800', color: '#fff', margin: '0 0 12px 0', letterSpacing: '-0.5px' }}>{plan.name}</h3>
                                    <div style={{ fontSize: '14px', color: '#999', marginBottom: '24px', minHeight: '40px', lineHeight: 1.5 }}>{plan.description}</div>
                                    
                                    <div style={{ marginBottom: '24px' }}>
                                        <div style={{ fontSize: '13px', color: '#666', textDecoration: 'line-through', marginBottom: '4px' }}>{plan.price}/month</div>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                            <span style={{ fontSize: '32px', fontWeight: '700', color: '#fff', letterSpacing: '-1px' }}>₹{plan.splitPrice}</span>
                                            <span style={{ fontSize: '14px', color: '#888', fontWeight: '500' }}>/ month</span>
                                        </div>
                                    </div>

                                    {/* Live Pool Status */}
                                    <div style={{ marginBottom: '24px', background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                                            <span style={{ fontSize: '12px', color: '#888', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{members.length}/{maxMembers} Joined</span>
                                            {isFull && <span style={{ fontSize: '11px', color: '#30D158', fontWeight: '700', background: 'rgba(48,209,88,0.15)', padding: '4px 8px', borderRadius: '4px' }}>Locked</span>}
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            {[...Array(maxMembers)].map((_, i) => {
                                                const m = members[i];
                                                if (m) {
                                                    return (
                                                        <div key={i} style={{ width: '32px', height: '32px', borderRadius: '50%', background: platformConfig.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '13px', fontWeight: '700' }} title={m.display_name}>
                                                            {m.display_name?.charAt(0) || '?'}
                                                        </div>
                                                    );
                                                }
                                                return (
                                                    <div key={i} style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)' }}>
                                                        <i className="fas fa-user" style={{ fontSize: '11px' }}></i>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div style={{ marginTop: 'auto' }}>
                                        <button 
                                            onClick={() => {
                                                if (btnDisabled) return;
                                                triggerLightHaptic();
                                                onJoin(plan.name, plan.splitPrice, dailySlot?.id);
                                            }}
                                            disabled={btnDisabled}
                                            style={{ width: '100%', padding: '14px', borderRadius: '8px', border: 'none', background: btnBg, color: btnColor, fontSize: '15px', fontWeight: '700', cursor: btnDisabled ? 'not-allowed' : 'pointer', opacity: btnOpacity, transition: 'all 0.2s' }}
                                        >
                                            {btnText}
                                        </button>
                                    </div>

                                    <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            {plan.features.map((feature, fIdx) => (
                                                <li key={fIdx} style={{ fontSize: '13px', color: '#AAA', display: 'flex', alignItems: 'flex-start', gap: '10px', lineHeight: 1.4 }}>
                                                    <i className="fas fa-check" style={{ color: platformConfig.accent, marginTop: '3px', fontSize: '12px' }}></i>
                                                    {feature}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            
            <style>{`
                /* Hide scrollbar for the horizontal scrolling container */
                div::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </div>
    );
}
