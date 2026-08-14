import React, { useState } from 'react';
import { triggerLightHaptic } from '../../utils/haptics';

export default function SubscriptionPoolModal({ platform, poolTypes, getDailySlotForPool, getMembersForSlot, isUserInSlot, onClose, onJoin }) {
    
    // Safety: if critical props are missing, show graceful close
    if (!poolTypes || !getDailySlotForPool || !getMembersForSlot) {
        return (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                <div style={{ textAlign: 'center', maxWidth: 320 }}>
                    <div style={{ fontSize: 48, marginBottom: 20, opacity: 0.4 }}><i className="fas fa-spinner fa-spin"></i></div>
                    <h3 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 8px 0' }}>Loading pools...</h3>
                    <p style={{ fontSize: 14, color: '#888', margin: '0 0 24px 0' }}>Setting up {platform} subscription pools</p>
                    <button onClick={onClose} style={{ padding: '12px 32px', borderRadius: 100, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Go Back</button>
                </div>
            </div>
        );
    }
    
    // Unified configurations for subscription pools
    const config = {
        // ─── Fun & Thrill ───
        'Netflix': {
            logo: '/logos/netflix.png',
            fallbackIcon: 'fa-film',
            accent: '#E50914',
            plans: [
                { name: 'Netflix Standard', description: 'Great video quality in 1080p. Watch on 2 supported devices at a time.', price: '₹499', splitPrice: 250, maxMembers: 2, features: ['1080p Resolution', '2 Screens simultaneously', 'Ad-free experience', 'Download on 2 devices'] },
                { name: 'Netflix Premium', description: 'Best video quality in 4K+HDR. Watch on 4 supported devices at a time.', price: '₹649', splitPrice: 162, maxMembers: 4, features: ['4K (Ultra HD) + HDR', '4 Screens simultaneously', 'Ad-free experience', 'Download on 6 devices', 'Netflix spatial audio'] },
                { name: 'Netflix Mobile', description: 'Good video quality in 480p. Watch on 1 mobile phone or tablet.', price: '₹149', splitPrice: 75, maxMembers: 2, features: ['480p Resolution', '1 Mobile or Tablet', 'Ad-free experience', 'Download on 1 device'] },
                { name: 'Netflix Basic', description: 'Good video quality in 720p. Watch on 1 supported device at a time.', price: '₹199', splitPrice: 100, maxMembers: 2, features: ['720p Resolution', '1 Screen simultaneously', 'Ad-free experience', 'Download on 1 device'] }
            ]
        },
        'Spotify': {
            logo: '/logos/spotify.png',
            fallbackIcon: 'fa-music',
            accent: '#1DB954',
            plans: [
                { name: 'Spotify Standard', description: 'Premium accounts for couples.', price: '₹139/2mo', splitPrice: 70, maxMembers: 2, features: ['Ad-free music listening', 'Download to listen offline', 'Play songs in any order', 'High audio quality'] },
                { name: 'Spotify Platinum', description: 'The ultimate Spotify experience.', price: '₹299/mo', splitPrice: 100, maxMembers: 3, features: ['Lossless audio quality (HiFi)', 'AI DJ tools', 'Ad-free music listening', 'Headphone optimization'] },
                { name: 'Spotify Student', description: 'Special discount for eligible students.', price: '₹69/2mo', splitPrice: 35, maxMembers: 2, features: ['Ad-free music listening', 'Download to listen offline', 'Play songs in any order'] }
            ]
        },
        'Prime Video': {
            logo: '/logos/amazon_prime.png',
            fallbackIcon: 'fa-play-circle',
            accent: '#00A8E1',
            plans: [
                { name: 'Prime Video Monthly', description: 'Enjoy Amazon Prime benefits for one month.', price: '₹299', splitPrice: 60, maxMembers: 5, features: ['Prime Video access', 'Free fast delivery on Amazon', 'Ad-free Amazon Music', 'Watch on 3 devices'] },
                { name: 'Prime Video Quarterly', description: '3 months of Amazon Prime benefits.', price: '₹599', splitPrice: 120, maxMembers: 5, features: ['Prime Video access', 'Free fast delivery on Amazon', 'Ad-free Amazon Music', 'Watch on 3 devices'] },
                { name: 'Prime Video Annual', description: 'Best value! 12 months of Amazon Prime benefits.', price: '₹1,499', splitPrice: 300, maxMembers: 5, features: ['Prime Video access', 'Free fast delivery on Amazon', 'Ad-free Amazon Music', 'Watch on 3 devices'] }
            ]
        },
        'Jio Hotstar': {
            logo: '/logos/jiohotstar.png',
            fallbackIcon: 'fa-tv',
            accent: '#1F3F7A',
            plans: [
                { name: 'Jio Hotstar Mobile 1 Month', description: 'Watch on Mobile, 1 screen.', price: '₹79', splitPrice: 40, maxMembers: 2, features: ['Mobile only', '1 device at a time', 'Live sports & TV'] },
                { name: 'Jio Hotstar Mobile 3 Month', description: 'Watch on Mobile, 1 screen.', price: '₹149', splitPrice: 75, maxMembers: 2, features: ['Mobile only', '1 device at a time', 'Live sports & TV'] },
                { name: 'Jio Hotstar Mobile 1 Year', description: 'Watch on Mobile, 1 screen.', price: '₹499', splitPrice: 250, maxMembers: 2, features: ['Mobile only', '1 device at a time', 'Live sports & TV'] },
                { name: 'Jio Hotstar Super 1 Month', description: 'Watch on TV or Mobile, in 1080p.', price: '₹149', splitPrice: 75, maxMembers: 2, features: ['1080p Full HD', '2 devices at a time', 'Live sports & TV', 'Dolby 5.1 supported'] },
                { name: 'Jio Hotstar Super 3 Month', description: 'Watch on TV or Mobile, in 1080p.', price: '₹349', splitPrice: 175, maxMembers: 2, features: ['1080p Full HD', '2 devices at a time', 'Live sports & TV', 'Dolby 5.1 supported'] },
                { name: 'Jio Hotstar Super 1 Year', description: 'Watch on TV or Mobile, in 1080p.', price: '₹1099', splitPrice: 550, maxMembers: 2, features: ['1080p Full HD', '2 devices at a time', 'Live sports & TV', 'Dolby 5.1 supported'] },
                { name: 'Jio Hotstar Premium 1 Month', description: 'Watch on TV or Mobile, in 4K.', price: '₹299', splitPrice: 75, maxMembers: 4, features: ['4K (Ultra HD)', '4 devices at a time', 'Ad-free movies & shows', 'Dolby 5.1 supported'] },
                { name: 'Jio Hotstar Premium 3 Month', description: 'Watch on TV or Mobile, in 4K.', price: '₹699', splitPrice: 175, maxMembers: 4, features: ['4K (Ultra HD)', '4 devices at a time', 'Ad-free movies & shows', 'Dolby 5.1 supported'] },
                { name: 'Jio Hotstar Premium 1 Year', description: 'Watch on TV or Mobile, in 4K.', price: '₹2199', splitPrice: 550, maxMembers: 4, features: ['4K (Ultra HD)', '4 devices at a time', 'Ad-free movies & shows', 'Dolby 5.1 supported'] }
            ]
        },
        // ─── Food ───
        'Swiggy One': {
            logo: '/logos/swiggy.png',
            fallbackIcon: 'fa-utensils',
            accent: '#FC8019',
            plans: [
                { name: 'Swiggy One Lite', description: 'Free delivery on food orders above ₹149. Basic savings.', price: '₹99/month', splitPrice: 50, maxMembers: 2, features: ['Free delivery on food (₹149+)', 'Free delivery on Instamart (₹199+)', 'No surge fee', 'Priority support'] },
                { name: 'Swiggy One', description: 'Unlimited free delivery + extra discounts on everything.', price: '₹149/month', splitPrice: 50, maxMembers: 3, features: ['Free delivery on all food orders', 'Free delivery on Instamart', 'Extra discounts up to 30%', 'No surge fee', 'Priority customer support'] },
                { name: 'Swiggy One Annual', description: 'Best value — full year of Swiggy One benefits.', price: '₹999/year', splitPrice: 333, maxMembers: 3, features: ['All Swiggy One benefits', '12 months access', 'Save ₹789 vs monthly', 'Free delivery on all orders', 'Extra discounts up to 30%'] }
            ]
        },
        'Zomato Gold': {
            logo: '/logos/zomato.png',
            fallbackIcon: 'fa-hamburger',
            accent: '#E23744',
            plans: [
                { name: 'Zomato Gold Monthly', description: 'Free delivery + extra discounts on food orders.', price: '₹149/month', splitPrice: 75, maxMembers: 2, features: ['Free delivery on all orders', 'Up to 30% extra discount', 'No surge fee', 'Priority delivery'] },
                { name: 'Zomato Gold Quarterly', description: '3 months of Zomato Gold at a great price.', price: '₹299/3months', splitPrice: 100, maxMembers: 3, features: ['Free delivery on all orders', 'Up to 30% extra discount', 'No surge fee', 'VIP customer support', 'Priority delivery'] },
                { name: 'Zomato Gold Annual', description: 'Best value — full year of Zomato Gold.', price: '₹999/year', splitPrice: 250, maxMembers: 4, features: ['All Gold benefits for 12 months', 'Save ₹789 vs monthly', 'Free delivery everywhere', 'Up to 30% extra discount', 'VIP support'] }
            ]
        },
        // ─── Education ───
        'Udemy': {
            logo: '/logos/udemy.png',
            fallbackIcon: 'fa-graduation-cap',
            accent: '#A435F0',
            plans: [
                { name: 'Udemy Personal Plan', description: 'Access top-rated courses with a monthly subscription.', price: '₹850/month', splitPrice: 283, maxMembers: 3, features: ['Access to 12,000+ top courses', 'Practice tests & exercises', 'Q&A with instructors', 'Certificate of completion', 'Mobile & TV access'] },
                { name: 'Udemy Team Plan', description: 'Team learning with advanced admin features.', price: '₹1,067/user/month', splitPrice: 356, maxMembers: 3, features: ['All Personal Plan features', 'Organization analytics', 'Team admin console', 'Custom learning paths', 'SSO integration'] }
            ]
        },
        'Coursera': {
            logo: '/logos/coursera.png',
            fallbackIcon: 'fa-university',
            accent: '#0056D2',
            plans: [
                { name: 'Coursera Plus Monthly', description: 'Unlimited access to 7,000+ courses, projects & certificates.', price: '₹4,167/month', splitPrice: 1389, maxMembers: 3, features: ['7,000+ courses & specializations', 'Unlimited certificates', 'Google, IBM, Meta courses', 'Guided projects', 'Professional certificates'] },
                { name: 'Coursera Plus Annual', description: 'Best value — save big with annual Coursera Plus.', price: '₹29,499/year', splitPrice: 7375, maxMembers: 4, features: ['All monthly features', 'Save ₹20,505 vs monthly', 'University degree courses', 'MasterTrack certificates', 'Offline access'] }
            ]
        },
        // ─── Socials ───
        'YouTube Premium': {
            logo: '/logos/youtube.svg',
            fallbackIcon: 'fa-play',
            accent: '#FF0000',
            plans: [
                { name: 'YouTube Premium Individual', description: 'Ad-free videos, background play & YouTube Music.', price: '₹149/month', splitPrice: 75, maxMembers: 2, features: ['Ad-free videos', 'Background play', 'YouTube Music Premium', 'Download videos', 'Picture-in-picture'] },
                { name: 'YouTube Premium Family', description: 'Share with up to 5 family members (same household).', price: '₹189/month', splitPrice: 38, maxMembers: 5, features: ['All Premium features', 'Up to 5 family members', 'Each gets their own account', 'YouTube Music included', 'YouTube Kids ad-free'] }
            ]
        },
        'LinkedIn Premium': {
            logo: '/logos/linkedin.svg',
            fallbackIcon: 'fa-briefcase',
            accent: '#0A66C2',
            plans: [
                { name: 'LinkedIn Premium Career', description: 'Stand out and get in touch with recruiters.', price: '₹1,555/month', splitPrice: 518, maxMembers: 3, features: ['See who viewed your profile', 'InMail messages', 'Salary insights', 'Top Applicant badge', 'LinkedIn Learning access'] },
                { name: 'LinkedIn Premium Business', description: 'For professionals looking to grow their network.', price: '₹2,100/month', splitPrice: 700, maxMembers: 3, features: ['15 InMail messages/month', 'Unlimited people browsing', 'Business insights', 'LinkedIn Learning full access', 'Company page analytics'] }
            ]
        },
        // ─── Telecom ───
        'Jio': {
            logo: '/logos/jio.png',
            fallbackIcon: 'fa-signal',
            accent: '#0A3F8F',
            plans: [
                { name: 'Jio Postpaid Family ₹399', description: 'Primary + 1 secondary connection with shared data.', price: '₹399/month', splitPrice: 200, maxMembers: 2, features: ['Unlimited calls', '75GB shared data', 'Free Netflix Mobile', 'Free Amazon Prime Lite', 'International roaming packs'] },
                { name: 'Jio Postpaid Family ₹599', description: 'Primary + 2 secondary connections with more data.', price: '₹599/month', splitPrice: 200, maxMembers: 3, features: ['Unlimited calls', '100GB shared data', 'Free Netflix Basic', 'Free Amazon Prime', 'Free Swiggy One', 'International roaming'] },
                { name: 'Jio Postpaid Family ₹999', description: 'Premium family plan with max data & OTT.', price: '₹999/month', splitPrice: 250, maxMembers: 4, features: ['Unlimited calls', '200GB shared data', 'Free Netflix Standard', 'Free Amazon Prime', 'Free Swiggy One', 'Free JioHotstar', 'International roaming'] }
            ]
        },
        'Airtel': {
            logo: '/logos/airtel.png',
            fallbackIcon: 'fa-broadcast-tower',
            accent: '#FF0000',
            plans: [
                { name: 'Airtel Family ₹599', description: 'Share plan with up to 3 connections.', price: '₹599/month', splitPrice: 200, maxMembers: 3, features: ['Unlimited calls', '75GB shared data', 'Free Amazon Prime', 'Free Wynk Music', 'Airtel Xstream'] },
                { name: 'Airtel Family ₹999', description: 'Premium family with 4 connections & top OTT.', price: '₹999/month', splitPrice: 250, maxMembers: 4, features: ['Unlimited calls', '150GB shared data', 'Free Netflix Standard', 'Free Amazon Prime', 'Free Disney+ Hotstar', 'Airtel Xstream Premium'] },
                { name: 'Airtel Family ₹1,599', description: 'The ultimate family plan with everything included.', price: '₹1,599/month', splitPrice: 320, maxMembers: 5, features: ['Unlimited calls', '300GB shared data', 'Free Netflix Premium', 'Free Amazon Prime', 'Free Disney+ Hotstar', 'Free Apple Music', 'International roaming'] }
            ]
        }
    };

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
                            <div style={{ color: '#888', fontSize: '14px', marginTop: '4px' }}>Pay-First Pool. No platform fee.</div>
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
                        const maxMembers = pool?.max_members || plan.maxMembers;
                        const isFull = members.length >= maxMembers;

                        let btnText = `Pay ₹${plan.splitPrice} & Join`;
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
                                        <div style={{ fontSize: '13px', color: '#666', textDecoration: 'line-through', marginBottom: '4px' }}>{plan.price}</div>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                            <span style={{ fontSize: '32px', fontWeight: '700', color: '#fff', letterSpacing: '-1px' }}>₹{plan.splitPrice}</span>
                                            <span style={{ fontSize: '14px', color: '#888', fontWeight: '500' }}>/ split</span>
                                        </div>
                                    </div>

                                    {/* Live Pool Status */}
                                    <div style={{ marginBottom: '16px', background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                                            <span style={{ fontSize: '12px', color: '#888', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{members.length}/{maxMembers} Joined</span>
                                            {isFull && <span style={{ fontSize: '11px', color: '#30D158', fontWeight: '700', background: 'rgba(48,209,88,0.15)', padding: '4px 8px', borderRadius: '4px' }}>Locked</span>}
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
                                    
                                    <div style={{ fontSize: '11px', color: '#AAA', background: 'rgba(255,159,10,0.1)', padding: '8px 12px', borderRadius: '6px', marginBottom: '24px', border: '1px solid rgba(255,159,10,0.2)' }}>
                                        <i className="fas fa-info-circle" style={{ color: '#FF9F0A', marginRight: '6px' }}></i>
                                        Refunds for future joiners will be processed manually.
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
