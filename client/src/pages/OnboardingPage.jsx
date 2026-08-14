import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../hooks/useOnboarding';
import { supabase } from '../config/supabase';
import Savio from '../components/Savio';
import FullScreenSavio from '../components/FullScreenSavio';
import { triggerLightHaptic, triggerMediumHaptic, triggerSuccessHaptic, triggerErrorHaptic } from '../utils/haptics';
import '../styles/drops.css';

export default function OnboardingPage() {
    const nav = useNavigate();
    const { loading, error, signInWithGoogle, checkUsernameUnique, completeProfile } = useOnboarding();
    
    const [step, setStep] = useState(1); // 1: Google Login, 2: Gates, 3: Profile
    const [authLoading, setAuthLoading] = useState(true);
    const [userId, setUserId] = useState(null);
    const [localError, setLocalError] = useState(null);

    const [fsSavio, setFsSavio] = useState({ isVisible: false, state: '', message: '' });

    const triggerFullScreenReaction = (state, message) => {
        setFsSavio({ isVisible: true, state, message });
        setTimeout(() => setFsSavio({ isVisible: false, state: '', message: '' }), 3000);
    };

    // Step 2: Gates
    const [selectedCollege, setSelectedCollege] = useState('');
    const [customCollege, setCustomCollege] = useState('');
    const [selectedHall, setSelectedHall] = useState('');
    const [customHall, setCustomHall] = useState('');

    const IIT_KGP_HALLS = {
        girls: [
            "MT (Mother Teresa Hall)",
            "RLB (Rani Laxmibai Hall)",
            "SN / IG (Sarojini Naidu / Indira Gandhi Hall)",
            "SAM (Sir Ashutosh Mukherjee Hall)",
            "SNVH (Sister Nivedita Hall)"
        ],
        boys: [
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
            "GH (Gokhale Hall)"
        ]
    };

    // Step 3: Profile
    const [fullName, setFullName] = useState('');
    const [mobile, setMobile] = useState('');
    const [username, setUsername] = useState('');
    const [usernameError, setUsernameError] = useState('');
    const [activeInput, setActiveInput] = useState(null);

    // Check Auth state on load (for OAuth redirect)
    useEffect(() => {
        let isMounted = true;
        
        const checkAuth = async () => {
            try {
                setAuthLoading(true);
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                
                if (sessionError) throw sessionError;
                
                if (session && isMounted) {
                    const uid = session.user.id;
                    setUserId(uid);
                    
                    const { data: profile, error: profileError } = await supabase.from('user_profiles').select('id').eq('id', uid).single();
                    
                    if (profileError && profileError.code !== 'PGRST116') {
                        console.error('Profile fetch error:', profileError);
                    }
                    
                    if (profile) {
                        nav('/dashboard');
                    } else {
                        setStep(2);
                    }
                }
            } catch (err) {
                console.error("Auth check failed:", err);
            } finally {
                if (isMounted) {
                    setAuthLoading(false);
                }
            }
        };
        
        checkAuth();

        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
                setUserId(session.user.id);
                const { data: profile } = await supabase.from('user_profiles').select('id').eq('id', session.user.id).single();
                if (profile) {
                    nav('/dashboard');
                } else {
                    setStep(2);
                }
            }
        });

        return () => {
            isMounted = false;
            if (authListener?.subscription) {
                authListener.subscription.unsubscribe();
            }
        };
    }, [nav]);

    // Handlers — mobile touch fix: debounce guard to prevent double-fires
    const loginInProgressRef = useRef(false);
    const handleGoogleLogin = async (e) => {
        if (e) e.preventDefault();
        if (loginInProgressRef.current || loading) return;
        loginInProgressRef.current = true;
        triggerLightHaptic();
        try {
            await signInWithGoogle();
        } finally {
            // Reset after a short delay to allow redirect
            setTimeout(() => { loginInProgressRef.current = false; }, 2000);
        }
    };

    const handleGatesNext = () => {
        if (!selectedCollege || !selectedHall) return;
        triggerMediumHaptic();
        setStep(3);
    };

    const handleFinish = async () => {
        if (!fullName || !mobile || !username) return;
        triggerMediumHaptic();
        setLocalError(null);

        const isUnique = await checkUsernameUnique(username);
        if (!isUnique) {
            triggerErrorHaptic();
            setUsernameError('Username is already taken');
            return;
        }
        setUsernameError('');

        const finalCollege = selectedCollege;
        const finalHall = selectedHall;

        const profileData = {
            fullName, 
            mobile, 
            username,
            collegeId: null,
            customCollege: finalCollege,
            hallId: null,
            customHall: finalHall
        };

        const success = await completeProfile(userId, profileData);
        if (success) {
            triggerSuccessHaptic();
            triggerFullScreenReaction('celebrating', 'Profile Complete');
            setTimeout(() => {
                nav('/dashboard');
            }, 3000);
        } else {
            triggerErrorHaptic();
            setLocalError('Failed to complete profile. Try again.');
        }
    };

    // Determine Savio state for step 3
    let step3SavioState = 'neutral';
    if (usernameError) step3SavioState = 'worried';
    else if (activeInput === 'username') step3SavioState = 'thinking';
    else if (activeInput) step3SavioState = 'curious';
    else if (fullName && mobile && username) step3SavioState = 'approving';

    if (authLoading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0c0c0f' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 24, background: 'radial-gradient(circle at center, #1a1a24 0%, #0c0c0f 100%)', color: '#fff' }}>
            
            {fsSavio.isVisible && (
                <FullScreenSavio state={fsSavio.state} message={fsSavio.message} />
            )}

            <div className="animate-fade-in-up" style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 10, background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}>
                
                {/* Minimal Top Bar Progress */}
                <div style={{ height: 4, background: step === 1 ? '#4a4a5a' : step === 2 ? '#888891' : '#ffffff', position: 'absolute', top: 0, left: 0, width: `${(step / 3) * 100}%`, transition: 'width 0.5s ease, background 0.5s ease' }} />

                <div style={{ padding: '40px 32px' }}>
                    {(error || localError) && <div style={{ color: '#ff453a', fontSize: 13, marginBottom: 24, textAlign: 'center', background: 'rgba(255,69,58,0.1)', padding: '12px', borderRadius: '12px', fontWeight: 500 }}>{error || localError}</div>}

                    {step === 1 && (
                        <div className="animate-fade-in" style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
                                <Savio state="waving" size={100} showBubble={false} style={{ margin: '0 auto 16px' }} />
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '6px 16px', borderRadius: 100, fontSize: 12, fontWeight: 600, color: '#aaa', letterSpacing: '1px', textTransform: 'uppercase' }}>Authentication</div>
                            </div>
                            
                            <h2 style={{ fontSize: 28, marginBottom: 12, fontWeight: 700, letterSpacing: '-0.5px' }}>Access Savify</h2>
                            <p style={{ marginBottom: 40, fontSize: 15, lineHeight: 1.6, color: '#888' }}>Sign in with your university credentials to unlock the private commerce network.</p>
                            
                            <button type="button" onClick={handleGoogleLogin} onPointerDown={(e) => { if (e.pointerType === 'touch') { e.preventDefault(); handleGoogleLogin(e); } }} disabled={loading} style={{ width: '100%', background: '#ffffff', color: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '18px', borderRadius: 12, fontSize: 16, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', border: 'none', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', minHeight: '56px', userSelect: 'none', position: 'relative', zIndex: 10 }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                </svg>
                                {loading ? 'Connecting...' : 'Continue with Google'}
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="animate-fade-in-up">
                            <div style={{ textAlign: 'center', marginBottom: 32 }}>
                                <Savio state="explaining" size={90} showBubble={false} style={{ margin: '0 auto 16px' }} />
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '6px 16px', borderRadius: 100, fontSize: 12, fontWeight: 600, color: '#aaa', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 16 }}>Location Data</div>
                                <h2 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px' }}>The Gates</h2>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 40 }}>
                                <div>
                                    <label style={{ fontSize: 13, fontWeight: 600, color: '#aaa', marginBottom: 8, display: 'block' }}>University</label>
                                    <div 
                                        style={{ width: '100%', padding: 18, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: 15 }}
                                        onClick={() => { setSelectedCollege('IIT Kharagpur'); triggerLightHaptic(); }}
                                    >
                                        IIT Kharagpur
                                    </div>
                                </div>

                                <div className="animate-fade-in-up">
                                    <label style={{ fontSize: 13, fontWeight: 600, color: '#aaa', marginBottom: 16, display: 'block' }}>Select Hall of Residence</label>
                                    
                                    {/* Girls Halls Section */}
                                    <div style={{ marginBottom: 24 }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: '#FF375F', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <i className="fas fa-venus"></i> Girls' Halls
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
                                            {IIT_KGP_HALLS.girls.map((hallName, idx) => (
                                                <div 
                                                    key={`g-${idx}`}
                                                    onClick={() => { setSelectedHall(hallName); setSelectedCollege('IIT Kharagpur'); triggerLightHaptic(); }}
                                                    style={{ 
                                                        padding: '12px 8px', 
                                                        borderRadius: 14, 
                                                        background: selectedHall === hallName ? 'linear-gradient(135deg, rgba(255,55,95,0.15), rgba(255,100,130,0.15))' : 'rgba(255,255,255,0.03)', 
                                                        border: selectedHall === hallName ? '1px solid rgba(255,55,95,0.4)' : '1px solid rgba(255,255,255,0.06)',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        textAlign: 'center',
                                                        gap: '4px',
                                                        boxShadow: selectedHall === hallName ? '0 4px 12px rgba(255,55,95,0.15)' : 'none',
                                                        transform: selectedHall === hallName ? 'scale(1.02)' : 'scale(1)'
                                                    }}
                                                >
                                                    <div style={{ fontSize: 14, fontWeight: 800, color: selectedHall === hallName ? '#fff' : 'rgba(255,255,255,0.8)' }}>
                                                        {hallName.split(' (')[0]}
                                                    </div>
                                                    <div style={{ fontSize: 10, fontWeight: 500, color: selectedHall === hallName ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.4)', lineHeight: 1.3 }}>
                                                        {hallName.includes('(') ? hallName.split('(')[1].replace(')', '') : ''}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Boys Halls Section */}
                                    <div>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: '#0A84FF', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <i className="fas fa-mars"></i> Boys' Halls
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
                                            {IIT_KGP_HALLS.boys.map((hallName, idx) => (
                                                <div 
                                                    key={`b-${idx}`}
                                                    onClick={() => { setSelectedHall(hallName); setSelectedCollege('IIT Kharagpur'); triggerLightHaptic(); }}
                                                    style={{ 
                                                        padding: '12px 8px', 
                                                        borderRadius: 14, 
                                                        background: selectedHall === hallName ? 'linear-gradient(135deg, rgba(10,132,255,0.15), rgba(94,92,230,0.15))' : 'rgba(255,255,255,0.03)', 
                                                        border: selectedHall === hallName ? '1px solid rgba(10,132,255,0.4)' : '1px solid rgba(255,255,255,0.06)',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        textAlign: 'center',
                                                        gap: '4px',
                                                        boxShadow: selectedHall === hallName ? '0 4px 12px rgba(10,132,255,0.15)' : 'none',
                                                        transform: selectedHall === hallName ? 'scale(1.02)' : 'scale(1)'
                                                    }}
                                                >
                                                    <div style={{ fontSize: 14, fontWeight: 800, color: selectedHall === hallName ? '#fff' : 'rgba(255,255,255,0.8)' }}>
                                                        {hallName.split(' (')[0]}
                                                    </div>
                                                    <div style={{ fontSize: 10, fontWeight: 500, color: selectedHall === hallName ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.4)', lineHeight: 1.3 }}>
                                                        {hallName.includes('(') ? hallName.split('(')[1].replace(')', '') : ''}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={handleGatesNext} 
                                disabled={!selectedHall} 
                                style={{ 
                                    width: '100%', 
                                    background: '#ffffff', 
                                    color: '#000000', 
                                    padding: '18px', 
                                    borderRadius: 12, 
                                    fontSize: 16, 
                                    fontWeight: 600, 
                                    border: 'none', 
                                    cursor: !selectedHall ? 'not-allowed' : 'pointer', 
                                    opacity: !selectedHall ? 0.5 : 1 
                                }}>
                                Continue
                            </button>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="animate-fade-in-up">
                            <div style={{ textAlign: 'center', marginBottom: 32 }}>
                                <Savio state={step3SavioState} size={90} showBubble={false} style={{ margin: '0 auto 16px' }} />
                                <div style={{ background: usernameError ? 'rgba(255,69,58,0.1)' : 'rgba(255,255,255,0.05)', color: usernameError ? '#ff453a' : '#aaa', padding: '6px 16px', borderRadius: 100, fontSize: 12, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 16 }}>
                                    {usernameError ? "Username taken" : "Profile Setup"}
                                </div>
                                <h2 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px' }}>Identity</h2>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 40 }}>
                                <input 
                                    type="text" 
                                    placeholder="Full Name" 
                                    value={fullName} 
                                    onChange={(e) => setFullName(e.target.value)} 
                                    onFocus={() => setActiveInput('fullname')}
                                    onBlur={() => setActiveInput(null)}
                                    style={{ padding: 18, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: 15, outline: 'none', transition: 'border 0.2s' }} 
                                />
                                <div>
                                    <input 
                                        type="text" 
                                        placeholder="Username (e.g. rahul_99)" 
                                        value={username} 
                                        onChange={(e) => { setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')); setUsernameError(''); }} 
                                        onFocus={() => setActiveInput('username')}
                                        onBlur={() => setActiveInput(null)}
                                        style={{ width: '100%', padding: 18, borderRadius: 12, border: `1px solid ${usernameError ? '#ff453a' : 'rgba(255,255,255,0.1)'}`, background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: 15, outline: 'none', transition: 'border 0.2s' }} 
                                    />
                                </div>
                                <input 
                                    type="tel" 
                                    placeholder="Mobile Number" 
                                    value={mobile} 
                                    onChange={(e) => setMobile(e.target.value)} 
                                    onFocus={() => setActiveInput('mobile')}
                                    onBlur={() => setActiveInput(null)}
                                    style={{ padding: 18, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: 15, outline: 'none', transition: 'border 0.2s' }} 
                                />
                            </div>

                            <button onClick={handleFinish} disabled={loading || !fullName || !mobile || !username} style={{ width: '100%', background: usernameError ? '#ff453a' : '#ffffff', color: usernameError ? '#fff' : '#000', padding: '18px', borderRadius: 12, fontSize: 16, fontWeight: 600, border: 'none', cursor: (loading || !fullName || !mobile || !username) ? 'not-allowed' : 'pointer', opacity: (loading || !fullName || !mobile || !username) ? 0.5 : 1 }}>
                                {loading ? 'Finalizing...' : 'Enter the Network'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
