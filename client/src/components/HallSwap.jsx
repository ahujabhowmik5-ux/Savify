import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { triggerLightHaptic, triggerMediumHaptic, triggerSuccessHaptic } from '../utils/haptics';
import '../styles/hallSwap.css';

const AVATAR_GRADIENTS = [
    'linear-gradient(135deg, #0A84FF, #409CFF)',
    'linear-gradient(135deg, #BF5AF2, #DA8FFF)',
    'linear-gradient(135deg, #30D158, #34C759)',
    'linear-gradient(135deg, #FF9F0A, #FFB340)',
    'linear-gradient(135deg, #FF375F, #FF6482)'
];

const GIRLS_HALLS = [
    "MT (Mother Teresa Hall)",
    "RLB (Rani Laxmibai Hall)",
    "SN / IG (Sarojini Naidu / Indira Gandhi Hall)",
    "SAM (Sir Ashutosh Mukherjee Hall)",
    "SNVH (Sister Nivedita Hall)"
];

const BOYS_HALLS = [
    "Azad (Azad Hall)",
    "BCR (B C Roy Hall)",
    "BRA (B R Ambedkar Hall)",
    "HBH (Homi Bhabha Hall)",
    "JCB (J C Bose Hall)",
    "LLR (Lala Lajpat Rai Hall)",
    "LBS (Lalbahadur Sastry Hall)",
    "MMM (Madan Mohan Malviya Hall)",
    "MS (Megnad Saha Hall)",
    "Nehru (Nehru Hall)",
    "Patel (Patel Hall)",
    "RK (Radha Krishnan Hall)",
    "RP (Rajendra Prasad Hall)",
    "VS (Vidyasagar Hall)",
    "GH (Gokhale Hall)",
    "VGH (Visveswaraya Guest House)"
];

// All girls hall short names (prefix before the space)
const GIRLS_HALL_SHORTS = GIRLS_HALLS.map(h => h.split(' (')[0].trim());

function getHallShortName(fullName) {
    if (!fullName) return '';
    return fullName.split(' (')[0].trim();
}

function isGirlsHall(hallName) {
    if (!hallName) return false;
    const short = getHallShortName(hallName);
    return GIRLS_HALL_SHORTS.includes(short);
}

function timeAgo(dateStr) {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString();
}

export default function HallSwap({ user, hallId, hallName, userProfile, onBack }) {
    // selectedDesiredHall is now a hall DISPLAY NAME (string), not a UUID
    const [selectedDesiredHall, setSelectedDesiredHall] = useState('');
    const [swapRequests, setSwapRequests] = useState([]);
    const [myRequest, setMyRequest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Determine if current user is in a girls hall
    const userIsGirls = isGirlsHall(hallName);
    // Static list of halls the user can swap TO (same gender, exclude their own)
    const availableHalls = (userIsGirls ? GIRLS_HALLS : BOYS_HALLS).filter(h => h !== hallName);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch active swap requests
            const { data: requests } = await supabase
                .from('hall_swap_requests')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (requests && requests.length > 0) {
                const userIds = requests.map(r => r.user_id);
                const { data: profiles } = await supabase
                    .from('user_profiles')
                    .select('id, full_name, username, email, mobile_number')
                    .in('id', userIds);

                const hallIds = [...new Set([
                    ...requests.map(r => r.current_hall_id),
                    ...requests.map(r => r.desired_hall_id)
                ])];
                const { data: hallNames } = await supabase
                    .from('new_halls')
                    .select('id, name')
                    .in('id', hallIds);

                const profileMap = {};
                (profiles || []).forEach(p => { profileMap[p.id] = p; });
                const hallMap = {};
                (hallNames || []).forEach(h => { hallMap[h.id] = h.name; });

                const enriched = requests.map(r => ({
                    ...r,
                    profile: profileMap[r.user_id] || {},
                    current_hall_name: hallMap[r.current_hall_id] || 'Unknown Hall',
                    desired_hall_name: hallMap[r.desired_hall_id] || 'Unknown Hall'
                }));

                setSwapRequests(enriched);
                const mine = enriched.find(r => r.user_id === user?.id);
                setMyRequest(mine || null);
            } else {
                setSwapRequests([]);
                setMyRequest(null);
            }
        } catch (err) {
            console.error('Error fetching hall swap data:', err);
        }
        setLoading(false);
    };

    const handlePostSwap = async () => {
        if (!selectedDesiredHall || !userProfile?.hall_id) return;
        triggerMediumHaptic();
        setSubmitting(true);
        try {
            // Resolve the desired hall UUID from its display name
            const shortName = getHallShortName(selectedDesiredHall);
            const { data: hallData } = await supabase
                .from('new_halls')
                .select('id')
                .ilike('name', `${shortName}%`)
                .limit(1)
                .single();

            if (!hallData?.id) {
                console.error('Could not resolve hall ID for:', selectedDesiredHall);
                setSubmitting(false);
                return;
            }

            const { error } = await supabase.from('hall_swap_requests').upsert({
                user_id: user.id,
                current_hall_id: userProfile.hall_id,
                desired_hall_id: hallData.id,
                is_active: true
            }, { onConflict: 'user_id' });

            if (error) {
                console.error('Error posting swap:', error);
            } else {
                triggerSuccessHaptic();
                setSelectedDesiredHall('');
                await fetchData();
            }
        } catch (err) {
            console.error('Error:', err);
        }
        setSubmitting(false);
    };

    const handleCancelSwap = async () => {
        triggerMediumHaptic();
        setSubmitting(true);
        try {
            const { error } = await supabase
                .from('hall_swap_requests')
                .delete()
                .eq('user_id', user.id);

            if (!error) {
                triggerSuccessHaptic();
                await fetchData();
            }
        } catch (err) {
            console.error('Error:', err);
        }
        setSubmitting(false);
    };

    const getMatches = () => {
        if (!myRequest) return [];
        return swapRequests.filter(r =>
            r.user_id !== user.id &&
            r.current_hall_id === myRequest.desired_hall_id &&
            r.desired_hall_id === myRequest.current_hall_id
        );
    };

    const isMatchForMe = (request) => {
        if (!myRequest || request.user_id === user.id) return false;
        return (
            request.current_hall_id === myRequest.desired_hall_id &&
            request.desired_hall_id === myRequest.current_hall_id
        );
    };

    // Filter halls by same gender category for the listing
    const sameGenderRequests = swapRequests.filter(r => {
        const reqIsGirls = isGirlsHall(r.current_hall_name);
        return userIsGirls ? reqIsGirls : !reqIsGirls;
    });

    const matches = getMatches();
    const otherRequests = sameGenderRequests.filter(r => r.user_id !== user?.id);

    if (loading) {
        return (
            <div className="hall-swap-container">
                <div className="hall-swap-loading">
                    <i className="fas fa-spinner fa-spin"></i>
                    Loading Hall Swap...
                </div>
            </div>
        );
    }

    const renderContactActions = (profile) => {
        const waMsg = encodeURIComponent("Hey! I saw on Savify that you want to swap halls. I'm interested — let's discuss?");
        const emailBody = encodeURIComponent("Hi! I found your hall swap request on Savify and I'm interested in swapping. Let's connect and discuss the details!");
        const mobile = profile.mobile_number?.replace(/\D/g, '');

        return (
            <div className="hall-swap-contact-actions">
                {mobile && (
                    <a href={`tel:${mobile}`} className="hall-swap-contact-btn call" onClick={() => triggerMediumHaptic()}>
                        <div className="hall-swap-contact-btn-icon">
                            <i className="fas fa-phone-alt"></i>
                        </div>
                        Call
                    </a>
                )}
                {mobile && (
                    <a href={`https://wa.me/91${mobile}?text=${waMsg}`} target="_blank" rel="noopener noreferrer" className="hall-swap-contact-btn whatsapp" onClick={() => triggerMediumHaptic()}>
                        <div className="hall-swap-contact-btn-icon">
                            <i className="fab fa-whatsapp"></i>
                        </div>
                        WhatsApp
                    </a>
                )}
                {profile.email && (
                    <a href={`mailto:${profile.email}?subject=Hall Swap on Savify&body=${emailBody}`} className="hall-swap-contact-btn email-btn" onClick={() => triggerLightHaptic()}>
                        <div className="hall-swap-contact-btn-icon">
                            <i className="fas fa-envelope"></i>
                        </div>
                        Email
                    </a>
                )}
            </div>
        );
    };

    const renderSwapCard = (request, index, showContact) => {
        const isMatch = isMatchForMe(request);
        const initial = (request.profile?.full_name || request.profile?.username || '?').charAt(0).toUpperCase();
        const colorIdx = index % AVATAR_GRADIENTS.length;

        return (
            <div key={request.id} className={`hall-swap-listing animate-fade-in-up ${isMatch ? 'is-match' : ''}`} style={{ animationDelay: `${index * 0.06}s` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                    <div className="hall-swap-avatar" style={{ background: AVATAR_GRADIENTS[colorIdx], width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#fff', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                        {initial}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {request.profile?.full_name || 'Anonymous'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 12, color: 'var(--drops-blue, #0A84FF)', fontWeight: 600, background: 'rgba(10,132,255,0.1)', padding: '2px 8px', borderRadius: 100 }}>
                                @{request.profile?.username || 'anon'}
                            </span>
                            {isMatch && (
                                <span className="hall-swap-match-badge">
                                    <i className="fas fa-check-circle"></i> Match
                                </span>
                            )}
                        </div>
                    </div>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 500, flexShrink: 0 }}>
                        {timeAgo(request.created_at)}
                    </span>
                </div>

                {/* Swap Direction */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 12, fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)', flexWrap: 'wrap' }}>
                    <span style={{ color: '#fff', fontWeight: 700 }}>{getHallShortName(request.current_hall_name)}</span>
                    <i className="fas fa-arrow-right" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}></i>
                    <span style={{ color: '#fff', fontWeight: 700 }}>{getHallShortName(request.desired_hall_name)}</span>
                </div>

                {(isMatch || showContact) && request.profile && renderContactActions(request.profile)}
            </div>
        );
    };

    return (
        <div className="hall-swap-container">
            {/* Header with Back Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, padding: '0 8px' }}>
                <button 
                    onClick={() => { triggerLightHaptic(); onBack(); }} 
                    style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.6)', fontSize: 14, cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s' }}
                >
                    <i className="fas fa-arrow-left"></i>
                </button>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg, rgba(10,132,255,0.15), rgba(94,92,230,0.15))', border: '1px solid rgba(10,132,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#0A84FF', boxShadow: '0 4px 12px rgba(10,132,255,0.1)' }}>
                    <i className="fas fa-exchange-alt"></i>
                </div>
                <div>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--drops-text-primary, #fff)', letterSpacing: '-0.02em' }}>Hall Swap</h3>
                    <div style={{ fontSize: 13, color: 'var(--drops-text-secondary)', fontWeight: 500, marginTop: 2 }}>
                        {userIsGirls ? "Girls' Halls" : "Boys' Halls"} · Find someone to swap with
                    </div>
                </div>
            </div>

            {/* Post or View My Request */}
            {!myRequest ? (
                <div className="hall-swap-form">
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.9)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="fas fa-plus-circle" style={{ color: '#0A84FF' }}></i>
                        Post Your Swap Request
                    </div>

                    {/* Current Hall → Desired Hall */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                        <div style={{ flex: 1, padding: '14px 16px', borderRadius: 16, background: 'rgba(10,132,255,0.1)', border: '1px solid rgba(10,132,255,0.2)', fontSize: 13, fontWeight: 600, color: '#0A84FF', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {hallName ? getHallShortName(hallName) : 'Your Hall'}
                        </div>
                        <i className="fas fa-arrow-right" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, flexShrink: 0 }}></i>
                        <div style={{ flex: 1 }}>
                            <select
                                className="hall-swap-select"
                                value={selectedDesiredHall}
                                onChange={(e) => { triggerLightHaptic(); setSelectedDesiredHall(e.target.value); }}
                            >
                                <option value="">Select Hall</option>
                                {availableHalls.map(h => (
                                    <option key={h} value={h}>{getHallShortName(h)}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <button
                        className="hall-swap-submit-btn"
                        onClick={handlePostSwap}
                        disabled={!selectedDesiredHall || submitting}
                    >
                        {submitting ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-paper-plane"></i>}
                        {submitting ? 'Posting...' : 'Post Swap Request'}
                    </button>
                </div>
            ) : (
                <div className="hall-swap-form" style={{ borderColor: 'rgba(10,132,255,0.15)' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
                        Your Active Request
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <div style={{ padding: '12px 20px', borderRadius: 100, background: 'rgba(10,132,255,0.1)', border: '1px solid rgba(10,132,255,0.2)', fontSize: 14, fontWeight: 700, color: '#0A84FF' }}>
                            {getHallShortName(myRequest.current_hall_name)}
                        </div>
                        <i className="fas fa-arrow-right" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 16 }}></i>
                        <div style={{ padding: '12px 20px', borderRadius: 100, background: 'rgba(48,209,88,0.1)', border: '1px solid rgba(48,209,88,0.2)', fontSize: 14, fontWeight: 700, color: '#30D158' }}>
                            {getHallShortName(myRequest.desired_hall_name)}
                        </div>
                    </div>

                    <button
                        className="hall-swap-cancel-btn"
                        onClick={handleCancelSwap}
                        disabled={submitting}
                    >
                        {submitting ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-times"></i>}
                        Cancel Request
                    </button>
                </div>
            )}

            {/* Matches */}
            {matches.length > 0 && (
                <div className="hall-swap-matches-section">
                    <div className="hall-swap-matches-inner">
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#30D158', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
                            🎉 {matches.length === 1 ? 'You have a match!' : `You have ${matches.length} matches!`}
                        </div>
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 500, marginBottom: 20 }}>
                            These people want the exact reverse swap — connect with them!
                        </div>
                        {matches.map((match, i) => renderSwapCard(match, i, true))}
                    </div>
                </div>
            )}

            {/* All Same-Gender Requests */}
            {otherRequests.length > 0 ? (
                <>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.9)', margin: '0 8px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                        {userIsGirls ? "Girls' Swap Requests" : "Boys' Swap Requests"}
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.06)', padding: '2px 10px', borderRadius: 100 }}>
                            {otherRequests.length}
                        </span>
                    </div>
                    <div style={{ padding: '0 8px' }}>
                        {otherRequests.map((req, i) => renderSwapCard(req, i, false))}
                    </div>
                </>
            ) : !myRequest ? (
                <div className="hall-swap-empty">
                    <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>
                        <i className="fas fa-exchange-alt"></i>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--drops-text-secondary)', marginBottom: 6 }}>No swap requests yet</div>
                    <div style={{ fontSize: 14, color: 'var(--drops-text-tertiary)' }}>Be the first to post a hall swap request!</div>
                </div>
            ) : otherRequests.length === 0 && matches.length === 0 && (
                <div className="hall-swap-empty">
                    <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>
                        <i className="fas fa-hourglass-half"></i>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--drops-text-secondary)', marginBottom: 6 }}>Waiting for matches</div>
                    <div style={{ fontSize: 14, color: 'var(--drops-text-tertiary)' }}>Your request is live! We'll connect you when someone wants the reverse swap.</div>
                </div>
            )}

            {sameGenderRequests.length > 0 && (
                <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: 'var(--drops-text-tertiary)', fontWeight: 600 }}>
                    {sameGenderRequests.length} active {userIsGirls ? "girls'" : "boys'"} swap {sameGenderRequests.length === 1 ? 'request' : 'requests'}
                </div>
            )}
        </div>
    );
}
