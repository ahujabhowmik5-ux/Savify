import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { triggerLightHaptic, triggerMediumHaptic, triggerSuccessHaptic } from '../utils/haptics';
import SwipeableCard from './SwipeableCard';
import '../styles/findRoommate.css';

const QUESTIONS = [
    { id: 'sleep', title: 'Sleep Schedule', icon: 'fa-moon', options: [
        { label: 'Before 11 PM', icon: 'fa-sun', sub: 'Early riser energy' },
        { label: 'After 1 AM', icon: 'fa-star', sub: 'Night owl life' },
        { label: 'No fixed time', icon: 'fa-clock', sub: 'Depends on the day' }
    ]},
    { id: 'clean', title: 'Tidiness Level', icon: 'fa-broom', options: [
        { label: 'Always clean', icon: 'fa-sparkles', sub: 'Everything has a place' },
        { label: 'Organized mess', icon: 'fa-box', sub: 'I know where things are' },
        { label: 'Creative chaos', icon: 'fa-asterisk', sub: 'Messy but functional' }
    ]},
    { id: 'social', title: 'Social Comfort', icon: 'fa-users', options: [
        { label: 'My space, my rules', icon: 'fa-user-lock', sub: 'Quiet & private' },
        { label: 'The more the merrier', icon: 'fa-glass-cheers', sub: 'Always welcoming' },
        { label: 'Read the room', icon: 'fa-random', sub: 'Depends on my mood' }
    ]},
    { id: 'music', title: 'Sound Preference', icon: 'fa-music', options: [
        { label: 'Headphones always', icon: 'fa-headphones', sub: 'Personal listening' },
        { label: 'Soft background', icon: 'fa-volume-down', sub: 'Low-volume speaker' },
        { label: 'Full volume', icon: 'fa-volume-up', sub: 'Speaker at max' }
    ]},
    { id: 'study', title: 'Study Style', icon: 'fa-book-reader', options: [
        { label: 'Silent room', icon: 'fa-microphone-slash', sub: 'Need dead silence' },
        { label: 'Library', icon: 'fa-book', sub: 'Outside the room' },
        { label: 'Group study', icon: 'fa-users', sub: 'Better with people' }
    ]},
    { id: 'weekend', title: 'Weekend Vibe', icon: 'fa-couch', options: [
        { label: 'Screen time', icon: 'fa-tv', sub: 'Gaming or binge-watching' },
        { label: 'Going out', icon: 'fa-running', sub: 'Sports or exploring' },
        { label: 'Chill hangout', icon: 'fa-coffee', sub: 'Low-key with friends' }
    ]},
    { id: 'location', type: 'text_inputs', title: 'Where are you from?', icon: 'fa-map-marker-alt', sub: 'To find folks from your region', fields: [
        { key: 'city', placeholder: 'City', icon: 'fa-city' },
        { key: 'state', placeholder: 'State', icon: 'fa-map' }
    ]}
];

export default function FindRoommate({ user, hallId, onBack }) {
    const [profiles, setProfiles] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isOnboarding, setIsOnboarding] = useState(true);
    const [onboardingStep, setOnboardingStep] = useState(0);
    const [myHabits, setMyHabits] = useState({});
    const [showMatches, setShowMatches] = useState(false);
    const [matches, setMatches] = useState([]);
    const [likedYou, setLikedYou] = useState([]);
    const [youLiked, setYouLiked] = useState([]);
    const [matchPopup, setMatchPopup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [matchesTab, setMatchesTab] = useState('matches');

    const [exitAnim, setExitAnim] = useState(null);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { checkOnboarding(); }, [user]);

    // Real-time sync for Tinder-like instant updates
    useEffect(() => {
        if (!user) return;
        
        const channel = supabase
            .channel(`roommate_swipes_${user.id}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'roommate_swipes' },
                () => { fetchAllSwipeData(); }
            )
            .subscribe((status) => {
                console.log('Swipe Realtime Status:', status);
            });

        return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const checkOnboarding = async () => {
        if (!user) return;
        setLoading(true);
        const { data } = await supabase.from('roommate_profiles').select('*').eq('id', user.id).single();
        if (data && data.habits) {
            setIsOnboarding(false);
            setMyHabits(data.habits);
            await fetchProfiles();
            await fetchAllSwipeData();
        } else {
            setIsOnboarding(true);
        }
        setLoading(false);
    };

    const handleOnboardingNext = async () => {
        triggerMediumHaptic();
        if (onboardingStep < QUESTIONS.length - 1) {
            setOnboardingStep(prev => prev + 1);
        } else {
            setLoading(true);
            await supabase.from('roommate_profiles').upsert({ id: user.id, habits: myHabits, is_active: true });
            setIsOnboarding(false);
            await fetchProfiles();
            await fetchAllSwipeData();
            setLoading(false);
        }
    };

    const fetchProfiles = async () => {
        if (!user) return;
        // Get already swiped user IDs
        const { data: swipedData } = await supabase.from('roommate_swipes').select('swiped_id').eq('swiper_id', user.id);
        const swipedIds = swipedData ? swipedData.map(s => s.swiped_id) : [];
        swipedIds.push(user.id);

        // 1. Get current user's hall_id
        const { data: currentUser, error: userErr } = await supabase.from('user_profiles').select('hall_id').eq('id', user.id).single();
        if (userErr || !currentUser?.hall_id) { setProfiles([]); return; }
        const userHallId = currentUser.hall_id;

        // 2. Find all hall IDs that share the same prefix (e.g. LBS)
        const { data: myHall } = await supabase.from('new_halls').select('name').eq('id', userHallId).single();
        let validHallIds = [userHallId];

        if (myHall?.name) {
            // Extract prefix (e.g. "LBS" from "LBS Hall" or "LBS (Lalbahadur Sastry Hall)")
            const prefix = myHall.name.split(' ')[0];
            const { data: similarHalls } = await supabase.from('new_halls').select('id').ilike('name', `${prefix}%`);
            if (similarHalls && similarHalls.length > 0) {
                validHallIds = similarHalls.map(h => h.id);
            }
        }

        // 3. Get ONLY users in these matched halls
        const { data: hallUsers, error: hallErr } = await supabase.from('user_profiles')
            .select('id, full_name, username, mobile_number, hall_id')
            .in('hall_id', validHallIds);

        if (hallErr || !hallUsers) { setProfiles([]); return; }

        const validUsers = hallUsers.filter(u => !swipedIds.includes(u.id));
        if (validUsers.length === 0) { setProfiles([]); return; }

        // Get roommate profiles and native_place separately to avoid join errors
        const validIds = validUsers.map(u => u.id);
        const { data: profData } = await supabase.from('roommate_profiles').select('id, habits').in('id', validIds);
        const { data: appData } = await supabase.from('user_applications').select('user_id, native_place').in('user_id', validIds);
        
        const habitsMap = {};
        if (profData) profData.forEach(p => { habitsMap[p.id] = p.habits; });

        const nativePlaceMap = {};
        if (appData) appData.forEach(a => { nativePlaceMap[a.user_id] = a.native_place; });

        // Combine user data with habits and hometown
        const combined = validUsers.map(u => ({
            id: u.id,
            full_name: u.full_name,
            username: u.username,
            mobile_number: u.mobile_number,
            hometown: nativePlaceMap[u.id] || null,
            habits: habitsMap[u.id] || null
        }));

        setProfiles(combined);
    };

    const fetchAllSwipeData = async () => {
        if (!user) return;
        // My right swipes (I liked them)
        const { data: mySwipes } = await supabase.from('roommate_swipes').select('swiped_id').eq('swiper_id', user.id).eq('is_match', true);
        // People who right-swiped me
        const { data: theirSwipes } = await supabase.from('roommate_swipes').select('swiper_id').eq('swiped_id', user.id).eq('is_match', true);

        const myIds = mySwipes ? mySwipes.map(s => s.swiped_id) : [];
        const theirIds = theirSwipes ? theirSwipes.map(s => s.swiper_id) : [];
        const mutualIds = myIds.filter(id => theirIds.includes(id));
        const likedYouOnly = theirIds.filter(id => !myIds.includes(id));
        const youLikedOnly = myIds.filter(id => !theirIds.includes(id));

        const allIds = [...new Set([...mutualIds, ...likedYouOnly, ...youLikedOnly])];
        if (allIds.length > 0) {
            const { data: users } = await supabase.from('user_profiles').select('id, full_name, mobile_number, username').in('id', allIds);
            if (users) {
                const userMap = {};
                users.forEach(u => { userMap[u.id] = u; });
                setMatches(mutualIds.map(id => userMap[id]).filter(Boolean));
                setLikedYou(likedYouOnly.map(id => userMap[id]).filter(Boolean));
                setYouLiked(youLikedOnly.map(id => userMap[id]).filter(Boolean));
            }
        } else {
            setMatches([]); setLikedYou([]); setYouLiked([]);
        }
    };

    const calculateMatchScore = (otherHabits) => {
        if (!myHabits || !otherHabits) return 0;
        let score = 0;
        const scoreQuestions = QUESTIONS.filter(q => q.type !== 'text_inputs');
        scoreQuestions.forEach(q => { if (myHabits[q.id] === otherHabits[q.id]) score++; });
        return Math.round((score / scoreQuestions.length) * 100);
    };

    const handleSwipe = async (isRight) => {
        if (currentIndex >= profiles.length) return;
        const swipedUser = profiles[currentIndex];
        
        // Immediately update UI
        setCurrentIndex(prev => prev + 1);
        setExitAnim(null);

        if (isRight) triggerMediumHaptic(); else triggerLightHaptic();

        // Perform DB operations in the background without blocking the UI
        supabase.from('roommate_swipes').insert({
            swiper_id: user.id,
            swiped_id: swipedUser.id,
            is_match: isRight
        }).then(async () => {
            if (isRight) {
                const { data: theirSwipe } = await supabase
                    .from('roommate_swipes')
                    .select('is_match')
                    .eq('swiper_id', swipedUser.id)
                    .eq('swiped_id', user.id)
                    .single();

                if (theirSwipe?.is_match) {
                    triggerSuccessHaptic();
                    setMatchPopup(swipedUser);
                }
                fetchAllSwipeData();
            }
        });
    };

    const handleResetSwipes = async () => {
        if (!user) return;
        triggerMediumHaptic();
        setLoading(true);
        await supabase.from('roommate_swipes').delete().eq('swiper_id', user.id);
        setCurrentIndex(0);
        await fetchProfiles();
        await fetchAllSwipeData();
        setLoading(false);
    };

    // ─── ONBOARDING QUIZ ───
    if (isOnboarding) {
        const q = QUESTIONS[onboardingStep];
        return (
            <div className="fr-container">
                <div className="fr-header">
                    <button className="fr-back-btn" onClick={onBack}><i className="fas fa-arrow-left"></i></button>
                    <div style={{ textAlign: 'center' }}>
                        <div className="fr-header-title">Find Your Match</div>
                        <div className="fr-header-subtitle">Quick personality check</div>
                    </div>
                    <div style={{ width: 36 }}></div>
                </div>
                <div className="fr-onboarding">
                    <div className="fr-onboarding-progress">
                        {QUESTIONS.map((_, i) => (
                            <div key={i} className={`fr-onboarding-bar ${i < onboardingStep ? 'completed' : ''} ${i === onboardingStep ? 'active' : ''}`} />
                        ))}
                    </div>
                    <div className="fr-onboarding-content">
                        <div className="fr-onboarding-emoji"><i className={`fas ${q.icon}`}></i></div>
                        <div className="fr-onboarding-step-num">Question {onboardingStep + 1} of {QUESTIONS.length}</div>
                        <div className="fr-onboarding-question">{q.title}</div>
                        <div className="fr-onboarding-desc">{q.sub || q.options?.[0]?.sub}</div>
                        {q.type === 'text_inputs' ? (
                            <div className="fr-options" style={{ padding: '0', gap: '16px', display: 'flex', flexDirection: 'column' }}>
                                {q.fields.map(f => (
                                    <div key={f.key} style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '0 16px' }}>
                                        <i className={`fas ${f.icon}`} style={{ color: 'rgba(255,255,255,0.4)', fontSize: 18, width: 30 }}></i>
                                        <input 
                                            type="text"
                                            placeholder={f.placeholder}
                                            value={myHabits[f.key] || ''}
                                            onChange={e => setMyHabits(prev => ({ ...prev, [f.key]: e.target.value }))}
                                            style={{ flex: 1, padding: '16px 0', background: 'transparent', border: 'none', color: '#fff', fontSize: 16, outline: 'none' }}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="fr-options">
                                {q.options.map((opt, i) => (
                                    <div key={i} className={`fr-option ${myHabits[q.id] === opt.label ? 'selected' : ''}`}
                                        onClick={() => { triggerLightHaptic(); setMyHabits(prev => ({ ...prev, [q.id]: opt.label })); }}>
                                        <div className="fr-option-icon"><i className={`fas ${opt.icon}`}></i></div>
                                        <div className="fr-option-text">
                                            <div className="fr-option-label">{opt.label}</div>
                                            <div className="fr-option-sub">{opt.sub}</div>
                                        </div>
                                        <div className="fr-option-check">
                                            {myHabits[q.id] === opt.label && <i className="fas fa-check"></i>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="fr-nav-buttons">
                        {onboardingStep > 0 && (
                            <button className="fr-nav-btn secondary" onClick={() => { triggerLightHaptic(); setOnboardingStep(p => p - 1); }}>Back</button>
                        )}
                        <button className="fr-nav-btn primary" disabled={q.type === 'text_inputs' ? (!myHabits.city?.trim() || !myHabits.state?.trim()) : !myHabits[q.id]} onClick={handleOnboardingNext}>
                            {onboardingStep === QUESTIONS.length - 1 ? 'Find Matches' : 'Continue'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ─── TINDER CARD SWIPE VIEW ───
    const currentProfile = profiles[currentIndex];
    const matchScore = currentProfile ? calculateMatchScore(currentProfile.habits) : 0;
    const scoreColor = matchScore >= 75 ? '#30D158' : matchScore >= 50 ? '#FF9F0A' : '#FF453A';
    const totalMatchCount = matches.length + likedYou.length;

    const renderUserCard = (userItem, gradient, showActions = false) => (
        <div key={userItem.id} className="fr-match-card">
            <div className="fr-match-avatar" style={{ background: gradient }}>
                {userItem.full_name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="fr-match-info">
                <div className="fr-match-name">{userItem.full_name}</div>
                <div className="fr-match-detail">@{userItem.username || 'user'}</div>
            </div>
            {showActions && userItem.mobile_number && (
                <div className="fr-match-actions">
                    <a href={`tel:${userItem.mobile_number}`} className="fr-match-action-btn call"><i className="fas fa-phone-alt"></i></a>
                    <a href={`https://wa.me/91${userItem.mobile_number}`} target="_blank" rel="noopener noreferrer" className="fr-match-action-btn whatsapp"><i className="fab fa-whatsapp"></i></a>
                </div>
            )}
        </div>
    );

    return (
        <div className="fr-container">
            <div className="fr-header">
                <button className="fr-back-btn" onClick={onBack}><i className="fas fa-arrow-left"></i></button>
                <div style={{ textAlign: 'center' }}>
                    <div className="fr-header-title">Discover</div>
                    <div className="fr-header-subtitle">{hallId || 'Your Hall'}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button className="fr-back-btn" onClick={handleResetSwipes} title="Start Over" style={{ background: 'rgba(255,159,10,0.15)', color: '#FF9F0A', border: '1px solid rgba(255,159,10,0.25)', width: 34, height: 34, fontSize: 12 }}>
                        <i className="fas fa-redo-alt"></i>
                    </button>
                    <button className="fr-matches-btn" onClick={() => setShowMatches(true)}>
                        <i className="fas fa-handshake"></i>
                        {totalMatchCount > 0 && <div className="fr-matches-badge">{totalMatchCount}</div>}
                    </button>
                </div>
            </div>

            <div className="fr-card-area">
                {currentProfile ? (
                    <div className="fr-card-stack">
                        {currentIndex + 2 < profiles.length && <div className="fr-card-shadow fr-card-shadow-2"></div>}
                        {currentIndex + 1 < profiles.length && <div className="fr-card-shadow fr-card-shadow-1"></div>}
                        <SwipeableCard
                            profile={currentProfile}
                            scoreColor={scoreColor}
                            matchScore={matchScore}
                            myHabits={myHabits}
                            onSwipe={handleSwipe}
                            exitAnim={exitAnim}
                            questions={QUESTIONS}
                        />
                    </div>
                ) : (
                    <div className="fr-empty">
                        <div className="fr-empty-icon"><i className="fas fa-check-circle"></i></div>
                        <div className="fr-empty-title">{loading ? 'Loading...' : "You've seen everyone!"}</div>
                        <div className="fr-empty-text">{loading ? 'Finding people near you...' : "You've swiped through all hallmates. Check back later for new people!"}</div>
                        {!loading && (
                            <button onClick={handleResetSwipes} style={{ marginTop: 24, padding: '12px 24px', borderRadius: 100, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'} onMouseOut={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'}>
                                <i className="fas fa-redo-alt" style={{ marginRight: 8 }}></i> Start Over
                            </button>
                        )}
                    </div>
                )}
            </div>

            {currentProfile && (
                <div className="fr-swipe-hint">
                    <span className="pass"><i className="fas fa-arrow-left"></i> Pass</span>
                    <span style={{ opacity: 0.2 }}>|</span>
                    <span className="like">Connect <i className="fas fa-arrow-right"></i></span>
                </div>
            )}

            {/* Match Popup */}
            {matchPopup && (
                <div className="fr-match-overlay" onClick={() => setMatchPopup(null)}>
                    <div className="fr-match-content" onClick={e => e.stopPropagation()}>
                        <div className="fr-match-particles">
                            {[...Array(12)].map((_, i) => <div key={i} className="fr-particle" style={{ '--i': i }}></div>)}
                        </div>
                        <div className="fr-match-hearts">
                            <div className="fr-match-heart-icon left"><i className="fas fa-handshake"></i></div>
                            <div className="fr-match-heart-icon right"><i className="fas fa-sparkles"></i></div>
                        </div>
                        <div className="fr-match-title">Roommate Match!</div>
                        <div className="fr-match-subtitle">You and {matchPopup.full_name || 'someone'} both want to connect</div>
                        <div className="fr-match-avatars">
                            <div className="fr-match-popup-avatar" style={{ background: 'linear-gradient(135deg, #0A84FF, #5E5CE6)' }}>
                                {user?.user_metadata?.full_name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div className="fr-match-popup-avatar" style={{ background: 'linear-gradient(135deg, #FF375F, #FF9F0A)' }}>
                                {matchPopup.full_name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                        </div>
                        <button className="fr-match-cta" onClick={() => { setMatchPopup(null); setShowMatches(true); }}>View Connections</button>
                        <button className="fr-match-dismiss" onClick={() => setMatchPopup(null)}>Keep Swiping</button>
                    </div>
                </div>
            )}

            {/* ═══ MATCHES PANEL (3 Tabs) ═══ */}
            {showMatches && (
                <div className="fr-matches-panel">
                    <div className="fr-matches-header">
                        <button className="fr-back-btn" onClick={() => setShowMatches(false)}><i className="fas fa-arrow-left"></i></button>
                        <div className="fr-matches-title">Connections</div>
                        <div style={{ width: 36 }}></div>
                    </div>
                    <div className="fr-matches-tabs">
                        {[
                            { key: 'matches', label: 'Connections', count: matches.length, icon: 'fa-handshake' },
                            { key: 'liked-you', label: 'Interested', count: likedYou.length, icon: 'fa-user-plus' },
                            { key: 'you-liked', label: 'Requested', count: youLiked.length, icon: 'fa-paper-plane' }
                        ].map(tab => (
                            <button
                                key={tab.key}
                                className={`fr-matches-tab ${matchesTab === tab.key ? 'active' : ''}`}
                                onClick={() => { triggerLightHaptic(); setMatchesTab(tab.key); }}
                            >
                                <i className={`fas ${tab.icon}`}></i>
                                <span>{tab.label}</span>
                                {tab.count > 0 && <span className="fr-tab-count">{tab.count}</span>}
                            </button>
                        ))}
                    </div>
                    <div className="fr-matches-list">
                        {matchesTab === 'matches' && (
                            matches.length > 0 ? matches.map(m => renderUserCard(m, 'linear-gradient(135deg, #FF375F, #FF9F0A)', true))
                            : <div className="fr-empty"><div className="fr-empty-icon"><i className="fas fa-handshake" style={{ color: 'rgba(255,55,95,0.3)' }}></i></div><div className="fr-empty-title">No connections yet</div><div className="fr-empty-text">When you both agree to connect, you'll see them here with contact info!</div></div>
                        )}
                        {matchesTab === 'liked-you' && (
                            likedYou.length > 0 ? likedYou.map(m => renderUserCard(m, 'linear-gradient(135deg, #BF5AF2, #FF375F)', false))
                            : <div className="fr-empty"><div className="fr-empty-icon"><i className="fas fa-user-plus" style={{ color: 'rgba(191,90,242,0.3)' }}></i></div><div className="fr-empty-title">No one yet</div><div className="fr-empty-text">People who want to connect with you will appear here. Keep your profile active!</div></div>
                        )}
                        {matchesTab === 'you-liked' && (
                            youLiked.length > 0 ? youLiked.map(m => renderUserCard(m, 'linear-gradient(135deg, #0A84FF, #30D158)', false))
                            : <div className="fr-empty"><div className="fr-empty-icon"><i className="fas fa-paper-plane" style={{ color: 'rgba(10,132,255,0.3)' }}></i></div><div className="fr-empty-title">No requests sent</div><div className="fr-empty-text">Start connecting with people you'd like as a roommate!</div></div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
