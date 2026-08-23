import { useState, useEffect, useRef, Component } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { supabase } from '../config/supabase';
import { useAuth } from '../hooks/useAuth';
import { usePools } from '../hooks/usePools';
import Savio from '../components/Savio';
import CreateDropSheet from '../components/drops/CreateDropSheet';
import SharedCartStore from '../components/commerce/SharedCartStore';
import FullScreenSavio from '../components/FullScreenSavio';
import { triggerLightHaptic, triggerMediumHaptic, triggerSuccessHaptic } from '../utils/haptics';
import '../styles/drops.css';
import AIPricingModal from '../components/modals/AIPricingModal';
import SubscriptionPoolModal from '../components/modals/SubscriptionPoolModal';
import { aiPlanNames, subPlanNames } from '../config/poolPlans';
import MockPaymentUI from '../components/commerce/MockPaymentUI';
import ThemeToggle from '../components/ThemeToggle';
import LocationPromptModal from '../components/modals/LocationPromptModal';
import Footer from '../components/layout/Footer';
// import FindRoommate from '../components/FindRoommate'; // COMMENTED OUT
// import HallSwap from '../components/HallSwap'; // COMMENTED OUT

// ─── Error Boundary to prevent black screens from component crashes ───
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(err, info) {
        console.error('Tab ErrorBoundary caught:', err, info);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', textAlign: 'center', gap: 16 }}>
                    <div style={{ fontSize: 48, opacity: 0.4 }}><i className="fas fa-exclamation-circle"></i></div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>Something went wrong</div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Pull down to refresh or tap below</div>
                    <button
                        onClick={() => { this.setState({ hasError: false, error: null }); }}
                        style={{ padding: '12px 28px', borderRadius: 100, background: 'rgba(10,132,255,0.15)', border: '1px solid rgba(10,132,255,0.3)', color: 'var(--drops-blue)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                    >
                        Try Again
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

const CATEGORIES = [
    {
        id: 'quick_commerce',
        name: 'Quick Commerce',
        subtitle: 'Groceries & Essentials',
        glow: 'rgba(255,159,10,0.3)',
        border: 'rgba(255,159,10,0.15)',
        logos: ['/logos/blinkit.png', '/logos/zepto.png', '/logos/swiggy_instamart.png', '/logos/amazon_now.png']
    },
    {
        id: 'fun_and_thrill',
        name: 'Fun & Thrill',
        subtitle: 'Entertainment & Streaming',
        glow: 'rgba(255,55,95,0.3)',
        border: 'rgba(255,55,95,0.15)',
        logos: ['/logos/netflix.png', '/logos/spotify.png', '/logos/amazon_prime.png', '/logos/jiohotstar.png']
    },
    {
        id: 'ai',
        name: 'AI Subscriptions',
        subtitle: 'Pro Tools & Models',
        glow: 'rgba(191,90,242,0.3)',
        border: 'rgba(191,90,242,0.15)',
        logos: ['/logos/chatgpt.png', '/logos/claude.png', '/logos/gemini.png']
    },
    {
        id: 'food',
        name: 'Food',
        subtitle: 'Order Together & Save',
        glow: 'rgba(252,128,25,0.3)',
        border: 'rgba(252,128,25,0.15)',
        logos: ['/logos/swiggy.png', '/logos/zomato.png']
    },
    {
        id: 'education',
        name: 'Education & Courses',
        subtitle: 'Learn Together, Pay Less',
        glow: 'rgba(52,199,89,0.3)',
        border: 'rgba(52,199,89,0.15)',
        logos: ['/logos/udemy.png', '/logos/coursera.png']
    },
    {
        id: 'socials',
        name: 'Socials',
        subtitle: 'Premium Social Platforms',
        glow: 'rgba(10,102,194,0.3)',
        border: 'rgba(10,102,194,0.15)',
        logos: ['/logos/linkedin.svg', '/logos/youtube.svg']
    },
    {
        id: 'telecom',
        name: 'Telecom',
        subtitle: 'Recharge & Data Plans',
        glow: 'rgba(0,122,255,0.3)',
        border: 'rgba(0,122,255,0.15)',
        logos: ['/logos/jio.png', '/logos/airtel.png']
    }
];

// Which 4-hour slot is active right now?
function getCurrentSlotLabel() {
    const h = new Date().getHours();
    if (h < 4) return '12:00 AM';
    if (h < 8) return '4:00 AM';
    if (h < 12) return '8:00 AM';
    if (h < 16) return '12:00 PM';
    if (h < 20) return '4:00 PM';
    return '8:00 PM';
}

function formatTimeLeft(isoString) {
    const ms = new Date(isoString) - new Date();
    if (ms <= 0) return 'Closed';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    if (h > 0) return `${h}h ${m}m left`;
    return `${m}m left`;
}

const POOL_COLORS = {
    '🛒': { bg: 'linear-gradient(135deg, rgba(255,159,10,0.3), rgba(255,159,10,0.05))', accent: 'var(--drops-orange)', bar: 'orange' },
    '🚕': { bg: 'linear-gradient(135deg, rgba(10,132,255,0.3), rgba(10,132,255,0.05))', accent: 'var(--drops-blue)', bar: 'blue' },
    '🎵': { bg: 'linear-gradient(135deg, rgba(191,90,242,0.3), rgba(191,90,242,0.05))', accent: 'var(--drops-purple)', bar: 'purple' },
    '🎬': { bg: 'linear-gradient(135deg, rgba(255,55,95,0.3), rgba(255,55,95,0.05))', accent: 'var(--drops-pink)', bar: 'green' },
    '🔥': { bg: 'linear-gradient(135deg, rgba(255,69,58,0.3), rgba(255,69,58,0.05))', accent: 'var(--drops-red)', bar: 'red' },
    '🍕': { bg: 'linear-gradient(135deg, rgba(255,159,10,0.3), rgba(255,159,10,0.05))', accent: 'var(--drops-orange)', bar: 'orange' },
    '⚽': { bg: 'linear-gradient(135deg, rgba(48,209,88,0.3), rgba(48,209,88,0.05))', accent: 'var(--drops-green)', bar: 'green' },
    '🍔': { bg: 'linear-gradient(135deg, rgba(255,159,10,0.3), rgba(255,159,10,0.05))', accent: 'var(--drops-orange)', bar: 'orange' },
    '📚': { bg: 'linear-gradient(135deg, rgba(10,132,255,0.3), rgba(10,132,255,0.05))', accent: 'var(--drops-blue)', bar: 'blue' }
};

const POOL_LOGO_MAP = {
    'blinkit': '/logos/blinkit.png',
    'zepto': '/logos/zepto.png',
    'instamart': '/logos/swiggy_instamart.png',
    'amazon now': '/logos/amazon_now.png',
    'netflix': '/logos/netflix.png',
    'spotify': '/logos/spotify.png',
    'prime': '/logos/amazon_prime.png',
    'hotstar': '/logos/jiohotstar.png',
    'jiohotstar': '/logos/jiohotstar.png',
    'jio': '/logos/jio.png',
    'airtel': '/logos/airtel.png',
    'udemy': '/logos/udemy.png',
    'coursera': '/logos/coursera.png',
    'linkedin': '/logos/linkedin.svg',
    'youtube': '/logos/youtube.svg',
    'swiggy': '/logos/swiggy.png',
    'zomato': '/logos/zomato.png',
    'chatgpt': '/logos/chatgpt.png',
    'claude': '/logos/claude.png',
    'gemini': '/logos/gemini.png',
    'google ai': '/logos/gemini.png',
    'cab': '/logos/group_rides.png',
    'uber': '/logos/group_rides.png'
};

function getPoolLogo(poolName) {
    const name = poolName.toLowerCase();
    for (const [key, logo] of Object.entries(POOL_LOGO_MAP)) {
        if (name.includes(key)) return logo;
    }
    return null;
}

export default function DashboardPage() {
    const { user, signOut } = useAuth();
    const [userLocation, setUserLocation] = useState(null);
    const [showLocationPrompt, setShowLocationPrompt] = useState(false);
    const { 
        poolTypes, slots, loading, joinSlot, leaveSlot, getMembersForSlot, isUserInSlot,
        getDailySlotForPool, cartContributors,
        customPools, createCustomPool, joinCustomPool, leaveCustomPool, endCustomPool, getMembersForCustomPool, isUserInCustomPool,
        activities, refetch: refetchPools
    } = usePools(user?.id, userLocation);

    // The Cashfree redirect handler runs once on mount, so it reads the latest
    // refetch through a ref instead of capturing a stale closure.
    const refetchPoolsRef = useRef(refetchPools);
    refetchPoolsRef.current = refetchPools;

    // Lets anything (the overlay button, a tab change) abandon payment polling.
    const paymentPollCancelRef = useRef(null);
    // When the gateway hand-off began, so returning from it can clear the spinner.
    const paymentStartedAtRef = useRef(0);

    const [expandedPool, setExpandedPool] = useState(null);
    const [myOrders, setMyOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [expandedOrderId, setExpandedOrderId] = useState(null);
    const [joining, setJoining] = useState(null);
    const [showCreateSheet, setShowCreateSheet] = useState(false);
    const [creating, setCreating] = useState(false);
    const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('savify_activeTab') || 'pools');
    const [searchQuery, setSearchQuery] = useState('');
    const [poolFilter, setPoolFilter] = useState('live');
    const [showAllCustomPools, setShowAllCustomPools] = useState(false);
    const [leavingPoolConfirm, setLeavingPoolConfirm] = useState(null);
    const [endingPoolConfirm, setEndingPoolConfirm] = useState(null);
    const [showProfile, setShowProfile] = useState(false);
    const [showStore, setShowStore] = useState(() => sessionStorage.getItem('savify_showStore') || false);
    const [activeCategory, setActiveCategory] = useState(() => sessionStorage.getItem('savify_activeCategory') || null);
    const [showAIPricing, setShowAIPricing] = useState(null);
    const [showSubPricing, setShowSubPricing] = useState(null);

    // Payment States
    const [showPaymentSim, setShowPaymentSim] = useState(null); // { planName, splitPrice, slotId, platformFee: 0 }
    const [paymentProcessing, setPaymentProcessing] = useState(false);
    const [simulatedPayment, setSimulatedPayment] = useState(null);
    const [paymentPhone, setPaymentPhone] = useState('');

    // Keep state persisted in sessionStorage across hard refreshes
    useEffect(() => {
        sessionStorage.setItem('savify_activeTab', activeTab);
    }, [activeTab]);


    // Force scroll to top on refresh so the header is always visible
    useEffect(() => {
        if ('scrollRestoration' in window.history) {
            window.history.scrollRestoration = 'manual';
        }
        const resetScroll = () => {
            window.scrollTo(0, 0);
            document.body.scrollTop = 0;
            document.documentElement.scrollTop = 0;
            const app = document.querySelector('.drops-app');
            if (app) app.scrollTop = 0;
        };
        
        resetScroll();
        // Browser might try to restore scroll after paint, override it:
        const t1 = setTimeout(resetScroll, 10);
        const t2 = setTimeout(resetScroll, 100);
        
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, []);

    // Fetch user orders when tab is active
    useEffect(() => {
        if (activeTab === 'orders' && user?.id) {
            setLoadingOrders(true);
            const fetchOrders = async () => {
                // Get all cart items for this user
                const { data: myItems } = await supabase.from('cart_items').select('cart_id, quantity, price_at_time, product:products(name, image_url)').eq('user_id', user.id);
                
                let orderMap = {};
                if (myItems && myItems.length > 0) {
                    const cartIds = [...new Set(myItems.map(i => i.cart_id))];
                    const { data: myCarts } = await supabase.from('group_carts')
                        .select('id, pool_name, platform, status, created_at, total_amount, delivery_fee, platform_fee')
                        .in('id', cartIds)
                        .order('created_at', { ascending: false });

                    // Fetch actual payment records for this user
                    const { data: myPayments } = await supabase.from('cart_payments')
                        .select('cart_id, amount_paid, payment_status')
                        .eq('user_id', user.id)
                        .in('cart_id', cartIds);
                        
                    if (myCarts) {
                        myCarts.forEach(cart => {
                            const cartItems = myItems.filter(i => i.cart_id === cart.id);
                            const goodsTotal = cartItems.reduce((sum, item) => sum + (item.price_at_time * item.quantity), 0);
                            // Get all items in this cart (for proportion calc)
                            const poolTotal = cart.total_amount || goodsTotal;
                            const myProportion = poolTotal > 0 ? (goodsTotal / poolTotal) : 1;
                            const deliveryShare = Math.ceil((cart.delivery_fee || 25) * myProportion);
                            const platformShare = Math.ceil((cart.platform_fee || 5) * myProportion);
                            const savifyFee = 1;
                        const cartPayments = myPayments?.filter(p => p.cart_id === cart.id && p.payment_status === 'success') || [];
                        const isPaid = cartPayments.length > 0;
                        const totalPaidAmount = isPaid ? cartPayments.reduce((sum, p) => sum + p.amount_paid, 0) : null;
                        
                        let displayStatus = cart.status;
                        if (!isPaid && (displayStatus === 'ordered' || displayStatus === 'checkout_pending' || displayStatus === 'open')) {
                            displayStatus = 'verifying_payment';
                        }

                        orderMap[cart.id] = { 
                            ...cart, 
                            myItems: cartItems, 
                            goodsTotal, 
                            deliveryShare, 
                            platformShare, 
                            savifyFee, 
                            myTotal: totalPaidAmount || (goodsTotal + deliveryShare + platformShare + savifyFee),
                            status: displayStatus,
                            isPaid: isPaid
                        };
                        });
                    }
                }
                
                // Also get carts created by user that might be empty or they didn't buy anything
                const { data: createdCarts } = await supabase.from('group_carts')
                    .select('id, pool_name, platform, status, created_at, total_amount, delivery_fee, platform_fee')
                    .eq('creator_id', user.id)
                    .order('created_at', { ascending: false });
                    
                if (createdCarts) {
                    createdCarts.forEach(cart => {
                        if (!orderMap[cart.id]) {
                            orderMap[cart.id] = { ...cart, myItems: [], goodsTotal: 0, deliveryShare: 0, platformShare: 0, savifyFee: 0, myTotal: 0 };
                        }
                    });
                }
                
                // Fetch Subscription Pools
                const { data: mySubscriptions } = await supabase.from('pool_members')
                    .select('id, joined_at, status, payment_status, pool_slot:pool_slots(id, status, type:pool_types(name, split_price))')
                    .eq('user_id', user.id);

                // What the user was actually charged, per pool slot. This is the
                // source of truth for the amount — pool_types.split_price is only
                // a fallback, and was 0 for most platforms.
                const paidBySlot = {};
                if (mySubscriptions && mySubscriptions.length > 0) {
                    const slotIds = mySubscriptions.map(s => s.pool_slot?.id).filter(Boolean);
                    if (slotIds.length > 0) {
                        const { data: myTxns } = await supabase.from('phonepe_transactions')
                            .select('context_id, amount, created_at')
                            .eq('user_id', user.id)
                            .eq('status', 'SUCCESS')
                            .in('context_id', slotIds);
                        (myTxns || []).forEach(t => { paidBySlot[t.context_id] = t.amount; });
                    }
                }

                if (mySubscriptions) {
                    mySubscriptions.forEach(sub => {
                        if (!sub.pool_slot || !sub.pool_slot.type) return;

                        const splitPrice = paidBySlot[sub.pool_slot.id] ?? (sub.pool_slot.type.split_price || 0);
                        const platformFee = 0;

                        const fakeItem = {
                            product: { name: `${sub.pool_slot.type.name} Subscription`, image_url: '' },
                            quantity: 1,
                            price_at_time: splitPrice
                        };

                        // 'done' means credentials were sent — that is the only
                        // completed state. Everything else is still in progress.
                        const isPaid = (sub.payment_status || 'paid') === 'paid';
                        const displayStatus = sub.status === 'done' ? 'done' : 'verifying_payment';

                        orderMap[`sub_${sub.id}`] = {
                            id: `sub_${sub.id}`,
                            pool_name: sub.pool_slot.type.name,
                            created_at: sub.joined_at,
                            myItems: [fakeItem],
                            goodsTotal: splitPrice,
                            deliveryShare: 0,
                            platformShare: platformFee,
                            savifyFee: 0,
                            myTotal: splitPrice + platformFee,
                            status: displayStatus,
                            isPaid
                        };
                    });
                }

                // Fetch Custom Pools
                const { data: myCustomPools } = await supabase.from('custom_pool_members')
                    .select('id, joined_at, pool:custom_pools(id, title, status)')
                    .eq('user_id', user.id);
                    
                if (myCustomPools) {
                    myCustomPools.forEach(cPool => {
                        if (!cPool.pool) return;
                        
                        let displayStatus = cPool.pool.status;
                        if (displayStatus === 'active' || displayStatus === 'open') displayStatus = 'verifying_payment'; // Show as In Progress

                        orderMap[`cp_${cPool.id}`] = {
                            id: `cp_${cPool.id}`,
                            pool_name: cPool.pool.title,
                            created_at: cPool.joined_at,
                            myItems: [],
                            goodsTotal: 0,
                            deliveryShare: 0,
                            platformShare: 0,
                            savifyFee: 0,
                            myTotal: 0,
                            status: displayStatus,
                            isPaid: true
                        };
                    });
                }
                
                setMyOrders(Object.values(orderMap).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
                setLoadingOrders(false);
            };
            fetchOrders();
        }
    }, [activeTab, user?.id]);

    useEffect(() => {
        if (showStore) sessionStorage.setItem('savify_showStore', showStore);
        else sessionStorage.removeItem('savify_showStore');
    }, [showStore]);

    useEffect(() => {
        if (activeCategory) sessionStorage.setItem('savify_activeCategory', activeCategory);
        else sessionStorage.removeItem('savify_activeCategory');
    }, [activeCategory]);



    // Handle browser back button — navigate within app instead of leaving
    useEffect(() => {
        const handlePopState = (e) => {
            if (showSubPricing) {
                e.preventDefault();
                setShowSubPricing(null);
                window.history.pushState({ savify: true }, '');
            } else if (showAIPricing) {
                e.preventDefault();
                setShowAIPricing(null);
                window.history.pushState({ savify: true }, '');
            } else if (showStore) {
                e.preventDefault();
                setShowStore(null);
                window.history.pushState({ savify: true }, '');
            } else if (showAllCustomPools) {
                e.preventDefault();
                setShowAllCustomPools(false);
                window.history.pushState({ savify: true }, '');
            } else if (showProfile) {
                e.preventDefault();
                setShowProfile(false);
                window.history.pushState({ savify: true }, '');
            } else if (activeCategory) {
                e.preventDefault();
                setActiveCategory(null);
                window.history.pushState({ savify: true }, '');
            } else {
                // Push state back so we don't leave the site
                window.history.pushState({ savify: true }, '');
            }
        };

        window.history.pushState({ savify: true }, '');
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [activeCategory, showAIPricing, showSubPricing, showStore, showAllCustomPools, showProfile]);

    const [savioState, setSavioState] = useState('waving');
    const [savioMessage, setSavioMessage] = useState('Tap any pool to see time slots. Join the current slot to hop in!');

    const [fsSavio, setFsSavio] = useState({ isVisible: false, state: '', message: '' });

    const [userProfile, setUserProfile] = useState(null);
    // COMMENTED OUT: Hallmate/Roommate states
    // const [hallmates, setHallmates] = useState([]);
    // const [hallmateSearchQuery, setHallmateSearchQuery] = useState('');
    const [hallName, setHallName] = useState('');
    // const [showRoommatePopup, setShowRoommatePopup] = useState(false);
    // const [selectedHallmate, setSelectedHallmate] = useState(null);
    // const [hallmateTab, setHallmateTab] = useState('list');
    // const [hallmatesLoading, setHallmatesLoading] = useState(true);

    const handleAllowLocation = () => {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                    setShowLocationPrompt(false);
                },
                (error) => {
                    console.warn('Geolocation permission denied or error:', error.message);
                    setShowLocationPrompt(false);
                    // Could optionally show a toast here that location was denied
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            setShowLocationPrompt(false);
        }
    };

    const { subscribe: subscribeNotifications } = useNotifications(user?.id, userLocation);

    useEffect(() => {
        if (user?.id && userLocation) {
            subscribeNotifications();
        }
    }, [user?.id, userLocation]);

    // Handle Location Prompt Logic
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const paymentStatus = urlParams.get('payment_status');
        
        if (paymentStatus === 'check') {
            // Wait for payment to verify, don't ask for location
            setShowLocationPrompt(false);
            return;
        }

        if (activeTab === 'pools' && !userLocation && sessionStorage.getItem('savify_location_skipped') !== 'true') {
            setShowLocationPrompt(true);
        } else {
            setShowLocationPrompt(false);
        }
    }, [activeTab, userLocation]);

    // Returning from the payment gateway without finishing used to leave the
    // summary card spinning on "Initiating Payment..." forever. iOS Safari
    // restores the page from the back-forward cache with React state intact, so
    // paymentProcessing came back still true and nothing ever cleared it.
    useEffect(() => {
        const clearStuckSpinner = () => {
            // Ignore the brief window between tapping Pay and the redirect —
            // a quick app-switch there should not cancel a live hand-off.
            if (Date.now() - paymentStartedAtRef.current < 2500) return;
            setPaymentProcessing(false);
        };

        // Restored from bfcache (iOS Safari back button).
        const onPageShow = (e) => { if (e.persisted) clearStuckSpinner(); };
        // Came back to the tab after the gateway redirect.
        const onVisibility = () => { if (document.visibilityState === 'visible') clearStuckSpinner(); };

        window.addEventListener('pageshow', onPageShow);
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            window.removeEventListener('pageshow', onPageShow);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, []);

    // Last-resort watchdog: a successful hand-off navigates away, so if we are
    // still sitting here spinning after 30s the redirect silently failed.
    useEffect(() => {
        if (!paymentProcessing) return;
        const t = setTimeout(() => setPaymentProcessing(false), 30000);
        return () => clearTimeout(t);
    }, [paymentProcessing]);

    // Cashfree Redirect Handler
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const paymentStatus = urlParams.get('payment_status');
        // Cashfree may use order_id (underscore) in redirect
        const orderId = urlParams.get('orderId') || urlParams.get('order_id') || urlParams.get('txnId');

        if (paymentStatus === 'check' && orderId) {
            // Skip if orderId is the placeholder (old cached version)
            if (orderId === 'ORDER_ID_PLACEHOLDER') {
                alert('Payment was processed but status check failed due to old cached code. Please clear cache and refresh. Your payment is safe - check Cashfree dashboard.');
                window.history.replaceState({}, document.title, window.location.pathname);
                return;
            }
            
            // Drop the query string straight away so a refresh (or the back
            // button) can never drop the user back into verification.
            window.history.replaceState({}, document.title, window.location.pathname);

            let attempts = 0;
            const maxAttempts = 20;
            let cancelled = false;
            let timer = null;

            // Leaving verification is always allowed — the webhook confirms the
            // payment server-to-server whether or not this tab is watching.
            const dismiss = () => {
                cancelled = true;
                if (timer) clearTimeout(timer);
                setFsSavio({ isVisible: false, state: '', message: '' });
                refetchPoolsRef.current?.();
            };
            paymentPollCancelRef.current = dismiss;

            const waiting = (message, subMessage) => {
                setFsSavio({
                    isVisible: true, state: 'thinking', message, subMessage,
                    onDismiss: dismiss, dismissLabel: 'Continue to dashboard'
                });
            };

            const finish = (state, message, holdMs) => {
                if (cancelled) return;
                cancelled = true;
                paymentPollCancelRef.current = null;
                setFsSavio({ isVisible: true, state, message });
                setTimeout(() => setFsSavio({ isVisible: false, state: '', message: '' }), holdMs);
            };

            waiting('Verifying payment...', 'This usually takes a few seconds.');

            const retryOrGiveUp = () => {
                if (cancelled) return;
                if (attempts < maxAttempts) {
                    attempts++;
                    // After ~8s it is likely an abandoned or slow-settling payment.
                    // Say so, and make leaving the obvious next step.
                    if (attempts === 4) {
                        waiting('Still verifying...',
                            "Taking longer than usual. You don't have to wait here — if the payment went through it will appear in your Orders automatically.");
                    }
                    timer = setTimeout(pollStatus, 2000);
                    return;
                }
                // The webhook confirms server-to-server regardless of this poll,
                // so never tell the user their money vanished.
                finish('thinking',
                    "We couldn't confirm your payment just yet.\n\nIf it was debited it will be credited to your pool shortly — check the Orders tab in a minute.",
                    7000);
            };

            const pollStatus = () => {
                if (cancelled) return;
                // Must stay a query param: the deployed function lives at
                // /api/payment/cashfree/status and a path segment would miss it
                // and fall through to the SPA, returning HTML.
                fetch(`/api/payment/cashfree/status?orderId=${encodeURIComponent(orderId)}`, {
                    headers: { 'Accept': 'application/json' }
                })
                    .then(async r => {
                        const text = await r.text();
                        try {
                            return JSON.parse(text);
                        } catch {
                            // Usually a transient rewrite/cold-start hiccup serving
                            // index.html. Retry rather than showing raw markup.
                            console.warn(`Payment status: non-JSON response (${r.status})`, text.slice(0, 200));
                            return null;
                        }
                    })
                    .then(data => {
                        if (cancelled) return;
                        if (!data) return retryOrGiveUp();

                        if (data.status === 'SUCCESS') {
                            const isSubscription = data.context_type && data.context_type !== 'cart' && data.context_type !== 'quick_commerce';
                            finish('celebrating',
                                isSubscription
                                    ? 'Payment Successful! 🎉\n\nYou will be contacted on WhatsApp for your ID and password shortly.'
                                    : 'Payment Successful! 🎉',
                                isSubscription ? 6000 : 3000);
                            // Pull the freshly claimed seat (and any pool rollover)
                            // so the plates show the new count right away.
                            refetchPoolsRef.current?.();
                            setShowStore(null);
                            setActiveTab('orders');
                        } else if (data.status === 'FAILED') {
                            finish('sad', 'Payment failed or was cancelled.\n\nNothing was charged — you can try again.', 5000);
                        } else {
                            // PENDING, a 404 while the row is still being written,
                            // or any transient error: keep polling.
                            retryOrGiveUp();
                        }
                    })
                    .catch(err => {
                        console.warn('Payment status check failed:', err);
                        retryOrGiveUp();
                    });
            };

            pollStatus();

            return () => {
                cancelled = true;
                if (timer) clearTimeout(timer);
                paymentPollCancelRef.current = null;
            };
        }
    }, []);

    useEffect(() => {
        if (user?.id) {
            supabase.from('user_profiles').select('hall_id, full_name, username, email, mobile_number').eq('id', user.id).single().then(({ data }) => {
                if (data) {
                    setUserProfile(data);
                    if (data.mobile_number) setPaymentPhone(data.mobile_number);
                }
            });
        }
    }, [user]);

    // COMMENTED OUT: Roommate popup
    // useEffect(() => {
    //     if (userProfile?.hall_id && !localStorage.getItem('savify_roommate_popup_shown')) {
    //         const timer = setTimeout(() => {
    //             setShowRoommatePopup(true);
    //             localStorage.setItem('savify_roommate_popup_shown', 'true');
    //         }, 1500);
    //         return () => clearTimeout(timer);
    //     }
    // }, [userProfile]);

    // Fetch hall name only (hallmates fetch commented out)
    useEffect(() => {
        if (!userProfile?.hall_id) return;
        const fetchHallName = async () => {
            try {
                const { data: myHall } = await supabase.from('new_halls').select('name').eq('id', userProfile.hall_id).single();
                if (myHall) setHallName(myHall.name);
            } catch (err) {
                console.error('Error fetching hall name:', err);
            }
        };
        fetchHallName();
    }, [userProfile, user]);

    const userInitial = userProfile?.full_name?.charAt(0)?.toUpperCase()
        || user?.user_metadata?.full_name?.charAt(0)?.toUpperCase()
        || user?.email?.charAt(0)?.toUpperCase() || '?';
    const userName = userProfile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Anonymous';
    const currentSlot = getCurrentSlotLabel();
    // A brand card must count exactly the pools its modal will open.
    // Matching pool types by substring counted plans the modal never lists —
    // the legacy 'Netflix Pool' alongside 'Netflix Standard', or 'Jio Hotstar'
    // seats showing up on the 'Jio' telecom card — so a card could advertise
    // five people while the plans behind it held two.
    const countPoolingForPlans = (planNames) => {
        if (!planNames || planNames.length === 0) return 0;
        const wanted = new Set(planNames);
        return (poolTypes || []).reduce((sum, p) => {
            if (!p?.name || !wanted.has(p.name)) return sum;
            const slot = getDailySlotForPool(p.id);
            return slot ? sum + getMembersForSlot(slot.id).length : sum;
        }, 0);
    };

    const effectiveHallId = userProfile?.hall_id || user?.user_metadata?.hall_id;

    const triggerFullScreenReaction = (state, message) => {
        setFsSavio({ isVisible: true, state, message });
        setTimeout(() => setFsSavio({ isVisible: false, state: '', message: '' }), 1500);
    };

    // Quick Commerce & Food Notifications (All Platforms)
    // Real-time listener: update Orders tab when admin marks order as 'done'
    useEffect(() => {
        if (!user) return;
        const orderChannel = supabase.channel(`order_status_${user.id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'group_carts' }, (payload) => {
                if (payload.new?.status === 'done' || payload.new?.status === 'ordered') {
                    // Refresh orders if user is on orders tab (or has orders loaded)
                    setMyOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, status: payload.new.status } : o));
                }
            })
            .subscribe();
        return () => { supabase.removeChannel(orderChannel); };
    }, [user]);

    useEffect(() => {
        if (!user) return;
        
        const channel = supabase.channel(`qc_alerts_${user.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'group_carts' }, (payload) => {
                const cart = payload.new || payload.old;
                if (!cart) return;
                
                const platformNames = {
                    blinkit: 'Blinkit', zepto: 'Zepto', swiggy_instamart: 'Swiggy Instamart',
                    amazon_fresh: 'Amazon Fresh', swiggy_food: 'Swiggy', zomato_food: 'Zomato'
                };
                const platformName = platformNames[cart.platform] || cart.pool_name;
                const isFood = cart.platform?.includes('food');
                const emoji = isFood ? '🍔' : '🛒';
                
                if (payload.eventType === 'INSERT' && cart.creator_id !== user.id && cart.status === 'open') {
                    triggerFullScreenReaction('happy', `Someone near you started a ${platformName} pool! ${emoji}`);
                } else if (payload.eventType === 'UPDATE' && payload.new.status === 'checkout_pending' && payload.old.status === 'open') {
                    triggerFullScreenReaction('celebrating', `A ${platformName} pool is complete! Pay your split to finish. 💸`);
                }
            })
            .subscribe();
            
        return () => { supabase.removeChannel(channel); };
    }, [user]);


    const handleJoinFixed = async (slotId) => {
        triggerMediumHaptic();
        setJoining(slotId);
        const res = await joinSlot(slotId, userName);
        setJoining(null);
        if (res && res.error) {
            alert('Error: ' + res.error);
        } else if (res && res.success) {
            triggerSuccessHaptic();
        }
    };

    // Maps a pool type name onto the SubscriptionPoolModal platform that sells it,
    // so a paid pool card opens checkout instead of a free join.
    const getSubPlatformForPool = (poolName) => {
        const n = (poolName || '').toLowerCase();
        if (n.includes('hotstar')) return 'Jio Hotstar';       // before the plain 'jio' check
        if (n.includes('netflix')) return 'Netflix';
        if (n.includes('spotify')) return 'Spotify';
        if (n.includes('prime video')) return 'Prime Video';
        if (n.includes('swiggy')) return 'Swiggy One';
        if (n.includes('zomato')) return 'Zomato Gold';
        if (n.includes('udemy')) return 'Udemy';
        if (n.includes('coursera')) return 'Coursera';
        if (n.includes('youtube')) return 'YouTube Premium';
        if (n.includes('linkedin')) return 'LinkedIn Premium';
        if (n.includes('airtel')) return 'Airtel';
        if (n.includes('jio')) return 'Jio';
        return null;
    };

    // Find the live pool slot a plan should be paid into. The cached slot can be
    // stale (the pool may have filled up and rolled over), so we always confirm
    // against a 'running' slot and open a fresh one if none is live.
    const resolveLiveSlotForPlan = async (planName, cachedSlotId) => {
        if (cachedSlotId) {
            const { data: cached } = await supabase.from('pool_slots')
                .select('id, status').eq('id', cachedSlotId).maybeSingle();
            if (cached?.status === 'running') return cached.id;
        }

        let ptId = poolTypes?.find(p => p.name === planName)?.id;
        if (!ptId) {
            const { data: ptData } = await supabase.from('pool_types').select('id').eq('name', planName).maybeSingle();
            if (ptData) ptId = ptData.id;
        }
        if (!ptId) return null;

        const { data: sData } = await supabase.from('pool_slots')
            .select('id')
            .eq('pool_type_id', ptId)
            .eq('status', 'running')
            .order('created_at', { ascending: false })
            .limit(1);
        if (sData && sData.length > 0) return sData[0].id;

        // pool_slots is read-only under RLS, so opening a fresh pool has to go
        // through the security-definer RPC. If it is unavailable the server
        // resolves the slot from plan_name when the order is created.
        const { data: rpcSlotId, error: rpcErr } = await supabase.rpc('ensure_running_slot_for_pool', { p_pool_type_id: ptId });
        if (rpcErr) console.error('ensure_running_slot_for_pool failed:', rpcErr);
        return rpcSlotId || null;
    };

    // Real payment handler — initiates Cashfree gateway for subscription pools
    const handleRealPayment = async () => {
        if (!showPaymentSim || !user?.id) return;
        if (!paymentPhone || paymentPhone.length !== 10) {
            alert('Please enter a valid 10-digit phone number.');
            return;
        }
        setPaymentProcessing(true);
        paymentStartedAtRef.current = Date.now();
        triggerMediumHaptic();
        
        const totalAmount = showPaymentSim.splitPrice + (showPaymentSim.platformFee || 0);
        
        try {
            const redirectBase = window.location.origin;
            const res = await fetch(`${redirectBase}/api/payment/cashfree/create-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: totalAmount,
                    user_id: user.id,
                    context_type: 'subscription',
                    context_id: showPaymentSim.slotId || 'sub_pool',
                    plan_name: showPaymentSim.planName || '',
                    customer_phone: paymentPhone,
                    customer_email: user.email || '',
                    customer_name: userProfile?.full_name || user?.user_metadata?.full_name || 'Savify User'
                })
            });
            const text = await res.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch {
                // Markup instead of JSON means the request never reached the
                // payment function. Say so plainly instead of dumping HTML.
                console.error(`Payment API returned non-JSON (${res.status}):`, text.slice(0, 200));
                setPaymentProcessing(false);
                setShowPaymentSim(null);
                alert('The payment service is not responding correctly. Please try again in a moment.');
                return;
            }

            // Simulation mode: no gateway, settle through the in-app prompt.
            if (data.simulated) {
                setPaymentProcessing(false);
                setSimulatedPayment({ orderId: data.order_id, amount: data.amount ?? totalAmount });
                return;
            }

            if (data.payment_session_id) {
                // The seat is claimed server-side once Cashfree confirms the
                // payment — joining here would let an abandoned checkout hold a
                // seat and keep the plate looking full.
                // Trigger Cashfree checkout
                // Open the SDK on the same stack the session was minted on;
                // a sandbox session in production mode is rejected outright.
                const cashfree = window.Cashfree({ mode: data.cashfree_env === 'sandbox' ? 'sandbox' : 'production' });
                const checkoutResult = await cashfree.checkout({
                    paymentSessionId: data.payment_session_id,
                    redirectTarget: "_self"
                });
                // If we reach here, redirect was cancelled
                if (checkoutResult && checkoutResult.error) {
                    setPaymentProcessing(false);
                    setShowPaymentSim(null);
                    alert('❌ Payment cancelled: ' + (checkoutResult.error.message || 'Please try again.'));
                }
            } else {
                setPaymentProcessing(false);
                setShowPaymentSim(null);
                alert(data.error || 'Payment could not be started. Nothing has been charged — please try again.');
            }
        } catch (err) {
            setPaymentProcessing(false);
            setShowPaymentSim(null);
            alert('❌ Payment failed: ' + (err.message || 'Network error. Please try again.'));
        }
    };

    const handleLeaveFixed = async (slotId) => {
        triggerMediumHaptic();
        setJoining(slotId);
        triggerFullScreenReaction('sad', 'Aw, seeing you go...');
        await leaveSlot(slotId);
        setJoining(null);
    };

    const handleJoinCustom = async (poolId) => {
        triggerMediumHaptic();
        setJoining(poolId);
        triggerFullScreenReaction('thinking', 'Joining custom drop...');
        await joinCustomPool(poolId, user.id);
        setJoining(null);
        triggerFullScreenReaction('celebrating', 'You joined! Let’s go! ⚡');
        triggerSuccessHaptic();
    };

    const handleLeaveCustom = async (poolId) => {
        triggerMediumHaptic();
        const pool = customPools.find(p => p.id === poolId);
        if (pool && pool.creator_id === user?.id) {
            setLeavingPoolConfirm(pool);
            triggerFullScreenReaction('worried', 'Wait!');
            return;
        }

        setJoining(poolId);
        triggerFullScreenReaction('sad', 'Leaving drop...');
        await leaveCustomPool(poolId, user.id);
        setJoining(null);
    };

    const confirmLeaveCustom = async () => {
        if (!leavingPoolConfirm) return;
        triggerMediumHaptic();
        const poolId = leavingPoolConfirm.id;
        setLeavingPoolConfirm(null);
        setJoining(poolId);
        triggerFullScreenReaction('sad', 'Pool deleted for everyone...');
        await leaveCustomPool(poolId, user.id);
        setJoining(null);
    };

    const handleEndCustom = (poolId) => {
        triggerMediumHaptic();
        const pool = customPools.find(p => p.id === poolId);
        setEndingPoolConfirm(pool);
        triggerFullScreenReaction('thinking', 'Ready to wrap things up?');
    };

    const confirmEndCustom = async () => {
        if (!endingPoolConfirm) return;
        triggerMediumHaptic();
        const poolId = endingPoolConfirm.id;
        setEndingPoolConfirm(null);
        setJoining(poolId);
        triggerFullScreenReaction('celebrating', 'Drop ended successfully! 🎉');
        await endCustomPool(poolId);
        setJoining(null);
    };

    const handleCreatePool = async (poolData) => {
        setCreating(true);
        await createCustomPool(poolData, user.id);
        setCreating(false);
        setShowCreateSheet(false);
        triggerFullScreenReaction('celebrating', 'Drop created successfully! 🚀');
        triggerSuccessHaptic();
    };

    const getPlatformKey = (poolName) => {
        const name = poolName.toLowerCase();
        if (name.includes('blinkit')) return 'blinkit';
        if (name.includes('zepto')) return 'zepto';
        if (name.includes('instamart')) return 'swiggy_instamart';
        if (name.includes('amazon')) return 'amazon_fresh';
        if (name.includes('zomato')) return 'zomato_food';
        if (name.includes('swiggy') && !name.includes('instamart')) return 'swiggy_food';
        return null;
    };

    const handleTabChange = (tab) => {
        triggerLightHaptic();
        setActiveTab(tab);
        setSavioState('thinking');
        if (tab === 'orders') {
            setSavioMessage('Let me check your recent orders...');
            setTimeout(() => { setSavioState('analyzing'); setSavioMessage('Here are your orders!'); }, 600);
        } else if (tab === 'notifications') {
            setSavioMessage('Checking your notifications...');
            setTimeout(() => { setSavioState('waving'); setSavioMessage('Here are your latest updates!'); }, 600);
        } else {
            setSavioMessage('Looking for active drops nearby...');
            setTimeout(() => { setSavioState('waving'); setSavioMessage('Tap any pool to see time slots. Join the current slot to hop in!'); }, 600);
        }
    };

    return (
        <div className="drops-app">
            <div className="drops-ambient" />
            <div className="drops-container">

                <div className="drops-header" style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '20px 24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h1 className="drops-header-title" style={{ margin: 0, fontSize: 32, letterSpacing: '-0.5px' }}>
                            {activeTab === 'pools' ? 'Live Pools' : activeTab === 'notifications' ? 'Notifications' : 'Orders'}
                        </h1>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <ThemeToggle compact />
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--drops-text-secondary)', textAlign: 'right', letterSpacing: '0.2px' }}>
                                {hallName || 'Your Hall'}
                            </div>
                            <div className="drops-avatar" onClick={() => { triggerLightHaptic(); setShowProfile(true); }} title="My Profile" style={{ width: 36, height: 36, flexShrink: 0, fontSize: 16 }}>
                                {userInitial}
                            </div>
                        </div>
                    </div>
                    
                    {/* Minimalist Savio Pill */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--drops-surface)', padding: '10px 14px', borderRadius: 16, border: '1px solid var(--drops-surface)' }}>
                        <div style={{ flexShrink: 0 }}>
                            <Savio state={savioState} size={28} showBubble={false} />
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>
                            {savioMessage}
                        </div>
                    </div>
                </div>

                {/* ─── Profile Overlay ─── */}
                {showProfile && (
                    <div style={{ position: 'fixed', inset: 0, background: 'var(--drops-bg)', zIndex: 999, overflowY: 'auto', paddingBottom: 120 }}>
                        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--drops-surface-hover)', background: 'rgba(10,10,12,0.9)', backdropFilter: 'blur(20px)', position: 'sticky', top: 0, zIndex: 10 }}>
                            <button onClick={() => { triggerLightHaptic(); setShowProfile(false); }} style={{ background: 'var(--drops-surface-hover)', border: '1px solid var(--drops-border)', color: 'var(--drops-border)', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14 }}>
                                <i className="fas fa-arrow-left"></i>
                            </button>
                            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--drops-text-primary)' }}>Profile</div>
                            <div style={{ width: 36 }}></div>
                        </div>
                        <div style={{ padding: '32px 24px 24px', textAlign: 'center' }}>
                            <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'linear-gradient(135deg, var(--drops-blue), var(--drops-purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38, fontWeight: 800, color: 'var(--drops-text-primary)', margin: '0 auto 16px', boxShadow: '0 12px 40px rgba(10,132,255,0.25)', border: '3px solid var(--drops-border-light)' }}>
                                {userInitial}
                            </div>
                            <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6, letterSpacing: '-0.03em' }}>{userName}</h2>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(10,132,255,0.1)', color: 'var(--drops-blue)', padding: '5px 14px', borderRadius: 100, fontSize: 13, fontWeight: 700, border: '1px solid rgba(10,132,255,0.2)' }}>
                                @{userProfile?.username || 'user'}
                            </div>
                        </div>
                        <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                            {[
                                { icon: 'fa-envelope', label: 'Email', value: user?.email || '—', color: 'var(--drops-blue)' },
                                { icon: 'fa-phone-alt', label: 'Mobile', value: userProfile?.mobile_number || '—', color: 'var(--drops-green)' },
                                { icon: 'fa-building', label: 'Hall', value: hallName || '—', color: 'var(--drops-purple)' },
                                { icon: 'fa-calendar-alt', label: 'Member Since', value: user?.created_at ? new Date(user.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : '—', color: 'var(--drops-orange)' }
                            ].map((item, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', background: 'var(--drops-surface)', borderRadius: 18, border: '1px solid var(--drops-surface)' }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 12, background: `${item.color}15`, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, border: `1px solid ${item.color}25` }}>
                                        <i className={`fas ${item.icon}`}></i>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{item.label}</div>
                                        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--drops-text-primary)' }}>{item.value}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div style={{ padding: '0 24px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
                            {[
                                { label: 'Pools Joined', value: activities?.filter(a => a.action_type === 'JOIN_POOL' && a.user_id === user?.id).length || 0, color: 'var(--drops-green)' },
                                { label: 'Drops Created', value: activities?.filter(a => a.action_type === 'CREATE_POOL' && a.user_id === user?.id).length || 0, color: 'var(--drops-purple)' },
                                { label: 'Activity', value: activities?.filter(a => a.user_id === user?.id).length || 0, color: 'var(--drops-blue)' }
                            ].map((stat, i) => (
                                <div key={i} style={{ textAlign: 'center', padding: '20px 8px', background: 'var(--drops-surface)', borderRadius: 18, border: '1px solid var(--drops-surface)' }}>
                                    <div style={{ fontSize: 28, fontWeight: 900, color: stat.color, letterSpacing: '-0.03em', marginBottom: 4 }}>{stat.value}</div>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{stat.label}</div>
                                </div>
                            ))}
                        </div>
                        <div style={{ padding: '0 24px' }}>
                            <button onClick={() => { triggerMediumHaptic(); signOut(); }} style={{ width: '100%', padding: 16, borderRadius: 16, border: '1px solid rgba(255,69,58,0.2)', background: 'rgba(255,69,58,0.08)', color: 'var(--drops-red)', fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                <i className="fas fa-sign-out-alt"></i> Sign Out
                            </button>
                        </div>
                    </div>
                )}



                {/* ─── Search Bar removed for fun_and_thrill ─── */}

                {/* ─── Loading — only show for pools tabs, NOT hallmates/activity ─── */}
                {loading && activeTab === 'pools' && (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--drops-text-secondary)' }}>
                        <i className="fas fa-spinner fa-spin" style={{ fontSize: 24, marginBottom: 12, display: 'block' }}></i>
                        Loading pools...
                    </div>
                )}

                {/* ─── Notifications Tab — All pool activity ─── */}
                {activeTab === 'notifications' && (() => {
                    const nearbyActivities = (activities || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                    
                    return (
                    <div className="animate-fade-in-up" style={{ padding: '0 0 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '10px 14px', background: 'rgba(48,209,88,0.06)', borderRadius: 14, border: '1px solid rgba(48,209,88,0.15)' }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--drops-green)', boxShadow: '0 0 8px rgba(48,209,88,0.5)', animation: 'badgePulse 2s ease-in-out infinite' }}></div>
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--drops-green)' }}>
                                Showing top 100 recent activities
                            </span>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--drops-text-tertiary)', marginBottom: 16, marginLeft: 4 }}>
                            <i className="fas fa-bell" style={{ marginRight: 8 }}></i> Recent Notifications
                        </div>
                        {nearbyActivities.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {nearbyActivities.slice(0, 100).map((act, i) => {
                                    const iconMap = { 'JOIN_POOL': { icon: 'fa-user-plus', color: 'var(--drops-green)', bg: 'rgba(48,209,88,0.12)' }, 'LEAVE_POOL': { icon: 'fa-user-minus', color: 'var(--drops-red)', bg: 'rgba(255,69,58,0.12)' }, 'CREATE_POOL': { icon: 'fa-plus-circle', color: 'var(--drops-purple)', bg: 'rgba(191,90,242,0.12)' }, 'END_POOL': { icon: 'fa-check-circle', color: 'var(--drops-blue)', bg: 'rgba(10,132,255,0.12)' }, 'PAYMENT': { icon: 'fa-credit-card', color: 'var(--drops-green)', bg: 'rgba(48,209,88,0.12)' } };
                                    const style = iconMap[act.action_type] || { icon: 'fa-info-circle', color: 'var(--drops-orange)', bg: 'rgba(255,159,10,0.12)' };
                                    const isOwn = act.user_id === user?.id;
                                    const actorName = isOwn ? 'You' : (act.user?.full_name || act.user?.username || 'Someone nearby');
                                    const timeAgo = (() => { const d = new Date(act.created_at); const diff = Date.now() - d.getTime(); if (diff < 60000) return 'Just now'; if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`; if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`; return `${Math.floor(diff/86400000)}d ago`; })();
                                    return (
                                        <div key={act.id || i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', background: isOwn ? 'rgba(48,209,88,0.04)' : 'var(--drops-surface)', borderRadius: 18, border: `1px solid ${isOwn ? 'rgba(48,209,88,0.1)' : 'var(--drops-surface)'}` }}>
                                            <div style={{ width: 40, height: 40, borderRadius: 12, background: style.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <i className={`fas ${style.icon}`} style={{ color: style.color, fontSize: 16 }}></i>
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--drops-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    <span style={{ color: isOwn ? 'var(--drops-green)' : 'var(--drops-text-primary)' }}>{actorName}</span>{' '}
                                                    <span style={{ fontWeight: 400, color: 'var(--drops-text-secondary)' }}>{act.description ? act.description.replace(/^You\s+/i, '') : act.action_type}</span>
                                                </div>
                                                <div style={{ fontSize: 12, color: 'var(--drops-text-tertiary)', marginTop: 2 }}>{timeAgo}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: 60, color: 'var(--drops-text-tertiary)' }}>
                                <i className="fas fa-bell-slash" style={{ fontSize: 40, marginBottom: 16, display: 'block', opacity: 0.4 }}></i>
                                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>No activity yet</div>
                                <div style={{ fontSize: 13 }}>Be the first to start a pool!</div>
                            </div>
                        )}
                    </div>
                    );
                })()}

                {/* COMMENTED OUT: Hallmates Tab */}
                {/* {activeTab === 'hallmates' ... } */}
                {/* COMMENTED OUT: Old Hallmates tab code (FindRoommate, HallSwap, Hallmates List)
                {activeTab === 'hallmates' && hallmateTab === 'roommate' && user && (
                    <FindRoommate ... />
                )}
                {activeTab === 'hallmates' && hallmateTab === 'swap' && user && (
                    <HallSwap ... />
                )}
                {activeTab === 'hallmates' && hallmateTab === 'list' && (
                    ... hallmates list UI ...
                )}
                */}

                {/* ─── Orders Tab ─── */}
                {activeTab === 'orders' && (
                    <div style={{ marginTop: 24, paddingBottom: 40 }}>
                        {loadingOrders ? (
                            <div style={{ textAlign: 'center', padding: 40, color: 'var(--drops-text-secondary)' }}>
                                <i className="fas fa-spinner fa-spin" style={{ fontSize: 24, marginBottom: 12, display: 'block' }}></i>
                                Fetching your orders...
                            </div>
                        ) : myOrders.length === 0 ? (
                            <div className="drops-empty animate-fade-in-up">
                                <i className="fas fa-box-open" style={{ fontSize: 48, color: 'var(--drops-text-tertiary)', marginBottom: 16 }}></i>
                                <h3 className="drops-empty-title">No Orders Yet</h3>
                                <p className="drops-empty-text">Join a pool or start one to see your orders here.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {myOrders.map((order, i) => {
                                    const isDelivered = order.status === 'done';
                                    const isCancelled = order.status === 'cancelled';
                                    const isExpanded = expandedOrderId === order.id;
                                    
                                    let statusColor, statusBg, statusIcon, statusText;
                                    if (isDelivered) {
                                        statusColor = 'var(--drops-green)'; statusBg = 'rgba(48,209,88,0.12)'; statusIcon = 'fa-check-circle'; statusText = 'Completed';
                                    } else if (isCancelled) {
                                        statusColor = 'var(--drops-red)'; statusBg = 'rgba(255,69,58,0.12)'; statusIcon = 'fa-times-circle'; statusText = 'Cancelled';
                                    } else {
                                        // Both 'verifying_payment' and 'ordered' will just show as 'In Progress'
                                        statusColor = 'var(--drops-orange)'; statusBg = 'rgba(255,159,10,0.12)'; statusIcon = 'fa-clock'; statusText = 'In Progress';
                                    }

                                    return (
                                        <div key={order.id} className="drops-card animate-fade-in-up" style={{ animationDelay: `${i * 0.05}s`, marginBottom: 0, cursor: 'pointer', transition: 'all 0.2s ease', border: isDelivered ? '1px solid rgba(48,209,88,0.2)' : '1px solid var(--drops-surface)' }} onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}>
                                            {/* Compact Header — always visible */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1, minWidth: 0 }}>
                                                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--drops-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        {getPoolLogo(order.pool_name) ? (
                                                            <img src={getPoolLogo(order.pool_name)} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 12 }} />
                                                        ) : (
                                                            <i className="fas fa-shopping-bag" style={{ fontSize: 18, color: 'var(--drops-text-secondary)' }}></i>
                                                        )}
                                                    </div>
                                                    <div style={{ minWidth: 0 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--drops-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{order.pool_name}</h3>
                                                        </div>
                                                        <div style={{ fontSize: 12, color: 'var(--drops-text-secondary)', marginTop: 2, display: 'flex', gap: 8, alignItems: 'center' }}>
                                                            {new Date(order.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                                                            <span style={{ opacity: 0.4 }}>•</span>
                                                            {order.myItems.length} {order.myItems.length === 1 ? 'item' : 'items'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                                                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--drops-text-primary)' }}>₹{order.myTotal}</div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: statusBg, color: statusColor, padding: '3px 8px', borderRadius: 100, fontSize: 10, fontWeight: 700 }}>
                                                        <i className={`fas ${statusIcon}`} style={{ fontSize: 8 }}></i>
                                                        {statusText}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Expanded Details — click to reveal */}
                                            {isExpanded && order.myItems.length > 0 && (
                                                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--drops-surface-hover)' }} onClick={(e) => e.stopPropagation()}>
                                                    {/* Item list */}
                                                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--drops-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Items Ordered</div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                        {order.myItems.map((item, idx) => (
                                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                                                    <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--drops-surface)', overflow: 'hidden', flexShrink: 0 }}>
                                                                        {item.product?.image_url ? (
                                                                            <img src={item.product.image_url} alt={item.product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                        ) : (
                                                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--drops-text-tertiary)' }}><i className="fas fa-box"></i></div>
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{item.product?.name || 'Unknown Item'}</div>
                                                                        <div style={{ fontSize: 11, color: 'var(--drops-text-secondary)' }}>Qty: {item.quantity} × ₹{item.price_at_time}</div>
                                                                    </div>
                                                                </div>
                                                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--drops-text-primary)' }}>
                                                                    ₹{item.price_at_time * item.quantity}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Bill Breakdown */}
                                                    <div style={{ marginTop: 16, background: 'var(--drops-surface)', border: '1px solid var(--drops-surface-hover)', borderRadius: 14, padding: 14 }}>
                                                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--drops-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Bill Breakdown</div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--drops-text-secondary)' }}>
                                                                <span>Items Total</span>
                                                                <span style={{ color: 'var(--drops-text-primary)', fontWeight: 600 }}>₹{order.goodsTotal}</span>
                                                            </div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--drops-text-secondary)' }}>
                                                                <span>Delivery Fee (your share)</span>
                                                                <span style={{ color: 'var(--drops-text-primary)', fontWeight: 600 }}>₹{order.deliveryShare}</span>
                                                            </div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--drops-text-secondary)' }}>
                                                                <span>Platform Fee (your share)</span>
                                                                <span style={{ color: 'var(--drops-text-primary)', fontWeight: 600 }}>₹{order.platformShare}</span>
                                                            </div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--drops-text-secondary)' }}>
                                                                <span>Savify Service Fee</span>
                                                                <span style={{ color: 'var(--drops-text-primary)', fontWeight: 600 }}>₹{order.savifyFee}</span>
                                                            </div>
                                                            <div style={{ borderTop: '1px solid var(--drops-border)', paddingTop: 10, marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--drops-text-primary)' }}>Total Paid</span>
                                                                <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--drops-green)' }}>₹{order.myTotal}</span>
                                                            </div>
                                                        </div>
                                                        {(!isDelivered && !isCancelled) && (
                                                            <div style={{ marginTop: 16, padding: 12, background: 'var(--drops-surface)', borderRadius: 10, display: 'flex', alignItems: 'flex-start', gap: 10, border: '1px solid rgba(48,209,88,0.2)' }}>
                                                                <i className="fab fa-whatsapp" style={{ color: 'var(--drops-green)', fontSize: 16, marginTop: 2 }}></i>
                                                                <div style={{ fontSize: 12, color: 'var(--drops-text-primary)', lineHeight: 1.4 }}>
                                                                    {(order.id.startsWith('sub_') || order.id.startsWith('cp_')) ? (
                                                                        <>
                                                                            <strong>Order placed successfully.</strong><br/>
                                                                            <span style={{ color: 'var(--drops-text-secondary)' }}>Credentials will be shared on WhatsApp shortly.</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <strong>Order in progress.</strong><br/>
                                                                            <span style={{ color: 'var(--drops-text-secondary)' }}>Status would be provided on WhatsApp.</span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {isExpanded && order.myItems.length === 0 && (
                                                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--drops-surface-hover)', textAlign: 'center', color: 'var(--drops-text-tertiary)', fontSize: 13, fontStyle: 'italic' }}>
                                                    Order placed successfully.
                                                </div>
                                            )}

                                            {/* Expand hint */}
                                            <div style={{ textAlign: 'center', marginTop: 10, fontSize: 10, color: 'var(--drops-text-tertiary)', letterSpacing: '0.05em' }}>
                                                <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`} style={{ fontSize: 10 }}></i>
                                                {' '}{isExpanded ? 'Tap to collapse' : 'Tap for bill details'}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ─── Pools & My Pools Tabs ─── */}
                {(activeTab === 'pools' ) && (
                    <>
                        {/* ─── Category Selection (Only in Pools Tab) ─── */}
                        {activeTab === 'pools' && !activeCategory && (
                            <div className="drops-category-grid">
                                {CATEGORIES.map((category, catIndex) => {
                                    const logoCount = category.logos.length;
                                    const isSingleLogo = logoCount === 1;
                                    const logoSize = logoCount >= 4 ? '44px' : logoCount >= 2 ? '52px' : '80px';
                                    const ACTIVE_POOLS = ['quick_commerce', 'fun_and_thrill', 'ai', 'food', 'education', 'socials', 'telecom'];
                                    const isActive = ACTIVE_POOLS.includes(category.id);
                                    return (
                                        <div 
                                            key={category.id} 
                                            className="drops-card drops-category-card animate-fade-in-up" 
                                            onClick={() => { 
                                                triggerLightHaptic(); 
                                                if (isActive) {
                                                    setActiveCategory(category.id); 
                                                } else {
                                                    triggerFullScreenReaction('thinking', `${category.name} is coming soon!`);
                                                }
                                            }}
                                            style={{ 
                                                cursor: isActive ? 'pointer' : 'default', 
                                                position: 'relative',
                                                overflow: 'hidden',
                                                padding: '32px 24px', 
                                                marginBottom: 0,
                                                background: isActive ? 'var(--drops-surface)' : 'var(--drops-surface)',
                                                border: `1px solid ${isActive ? category.border : 'var(--drops-surface)'}`,
                                                borderRadius: '24px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '32px',
                                                boxShadow: isActive ? `0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 var(--drops-surface-elevated)` : '0 4px 16px rgba(0,0,0,0.2)',
                                                animationDelay: `${catIndex * 0.08}s`,
                                                opacity: isActive ? 1 : 0.45,
                                                filter: isActive ? 'none' : 'grayscale(100%)',
                                                pointerEvents: 'auto'
                                            }}
                                        >
                                            {/* Glow Orb */}
                                            {isActive && <div style={{ position: 'absolute', width: '250px', height: '250px', background: category.glow, filter: 'blur(80px)', top: '-100px', right: '-100px', zIndex: 0, pointerEvents: 'none' }}></div>}
                                            
                                            {/* Coming Soon Badge */}
                                            {!isActive && (
                                                <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 2, background: 'var(--drops-border)', border: '1px solid var(--drops-border-light)', backdropFilter: 'blur(10px)', padding: '6px 14px', borderRadius: '100px', fontSize: '11px', fontWeight: '700', color: 'var(--drops-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                                    Coming Soon
                                                </div>
                                            )}
                                            
                                            <div style={{ display: 'flex', gap: logoCount >= 4 ? '8px' : '12px', zIndex: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                                                {category.logos.map((logo, i) => (
                                                    <div key={i} style={{ width: logoSize, height: logoSize, borderRadius: logoCount >= 4 ? '12px' : isSingleLogo ? '20px' : '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.3s ease' }}>
                                                        <img src={logo} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: logoCount >= 4 ? '8px' : isSingleLogo ? '12px' : '8px' }} />
                                                    </div>
                                                ))}
                                            </div>
                                            
                                            <div style={{ zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                                <div>
                                                    <h3 style={{ margin: '0 0 6px 0', fontSize: '24px', fontWeight: '800', color: isActive ? 'var(--drops-text-primary)' : 'rgba(255,255,255,0.7)', letterSpacing: '-0.5px' }}>{category.name}</h3>
                                                    <p style={{ margin: 0, fontSize: '14px', color: 'var(--drops-text-secondary)', fontWeight: '500' }}>{category.subtitle}</p>
                                                </div>
                                                {isActive && (
                                                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--drops-surface-elevated)', border: '1px solid var(--sv-border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--drops-text-primary)', backdropFilter: 'blur(10px)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                                                        <i className="fas fa-arrow-right"></i>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* ─── Back Button for Categories ─── */}
                        {activeTab === 'pools' && activeCategory && (
                            <button 
                                onClick={() => { triggerLightHaptic(); setActiveCategory(null); }}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--drops-border)', border: '1px solid var(--drops-border-light)', color: 'var(--drops-text-primary)', fontSize: '14px', fontWeight: '600', cursor: 'pointer', marginBottom: '20px', padding: '10px 18px', borderRadius: '100px', backdropFilter: 'blur(10px)', transition: 'all 0.2s ease' }}
                            >
                                <i className="fas fa-arrow-left" style={{ fontSize: '13px' }}></i> Back to Categories
                            </button>
                        )}

                        {/* Custom Drops section — COMMENTED OUT per user request */}
                        {false && (!loading && customPools.length > 0 && ((activeTab === 'pools' && activeCategory === 'fun_and_thrill') )) && (
                            <div style={{ marginBottom: 32 }}>
                                {activeTab === 'pools' && (
                                    <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--drops-text-tertiary)', marginBottom: 12, marginLeft: 4 }}>
                                        ⚡ Custom Drops
                                    </div>
                                )}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {(() => {
                                        const filtered = customPools.filter(pool => {
                                            if (searchQuery) {
                                                const query = searchQuery.toLowerCase();
                                                const matchesSearch = pool.title?.toLowerCase().includes(query) || pool.description?.toLowerCase().includes(query);
                                                if (!matchesSearch) return false;
                                            }
                                            const isCompleted = pool.status === 'completed';
                                            if (poolFilter === 'live' && isCompleted) return false;
                                            if (poolFilter === 'ended' && !isCompleted) return false;

                                            if (activeTab === 'pools') return true;
                                            return isUserInCustomPool(pool.id, user?.id) || pool.creator_id === user?.id;
                                        }).sort((a, b) => {
                                            if (true) return 0;
                                            const aDone = a.status === 'completed';
                                            const bDone = b.status === 'completed';
                                            if (aDone === bDone) return 0;
                                            return aDone ? 1 : -1;
                                        });

                                        const renderCustomPoolCard = (pool, index) => {
                                            const colors = POOL_COLORS[pool.emoji] || POOL_COLORS['🔥'];
                                            const members = getMembersForCustomPool(pool.id);
                                            const userIn = isUserInCustomPool(pool.id, user?.id);
                                            const isJoining = joining === pool.id;
                                            const timeLeft = formatTimeLeft(pool.closes_at);
                                            const isClosed = timeLeft === 'Closed';
                                            const isCreator = pool.creator_id === user?.id;

                                            return (
                                                <div key={pool.id} className="drops-card animate-fade-in-up" style={{ animationDelay: `${index * 0.05}s`, marginBottom: 0, border: isClosed || pool.status === 'completed' ? '1px solid var(--drops-red)' : undefined }}>
                                                    <div className="drops-card-header">
                                                        <div className="drops-card-icon" style={{ background: getPoolLogo(pool.name) ? 'transparent' : colors.bg, padding: getPoolLogo(pool.name) ? '0' : undefined }}>{getPoolLogo(pool.name) ? <img src={getPoolLogo(pool.name)} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '10px' }} /> : pool.emoji}</div>
                                                        <div className="drops-card-info">
                                                            <div className="drops-card-title">
                                                                {pool.title}
                                                                {pool.status === 'completed' && <span style={{ marginLeft: 8, fontSize: 10, padding: '2px 8px', background: 'rgba(48,209,88,0.2)', color: 'var(--drops-green)', borderRadius: 100 }}>Ended</span>}
                                                            </div>
                                                            {pool.description && <div className="drops-card-subtitle">{pool.description}</div>}
                                                            <div style={{ fontSize: 11, color: 'var(--drops-text-secondary)', marginTop: 4 }}>
                                                                Created by @{pool.creator?.username || 'someone'}
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                                                            <div style={{ fontSize: 12, fontWeight: 600, color: isClosed || pool.status === 'completed' ? 'var(--drops-red)' : colors.accent }}>{timeLeft}</div>
                                                            <div style={{ display: 'flex', gap: 6 }}>
                                                                {isCreator && pool.status !== 'completed' && (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleEndCustom(pool.id); }}
                                                                        disabled={isJoining}
                                                                        style={{ padding: '6px 14px', borderRadius: 100, border: 'none', fontSize: 12, fontWeight: 700, cursor: isJoining ? 'wait' : 'pointer', background: 'rgba(255,159,10,0.15)', color: 'var(--drops-orange)' }}
                                                                    >
                                                                        End Drop
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={(e) => { 
                                                                        e.stopPropagation(); 
                                                                        if (userIn) {
                                                                            handleLeaveCustom(pool.id);
                                                                        } else {
                                                                            handleJoinCustom(pool.id);
                                                                        }
                                                                    }}
                                                                    disabled={isJoining || isClosed || (pool.status === 'completed' && !userIn)}
                                                                    style={{ padding: '6px 14px', borderRadius: 100, border: 'none', fontSize: 12, fontWeight: 700, cursor: isJoining ? 'wait' : (isClosed || (pool.status === 'completed' && !userIn)) ? 'not-allowed' : 'pointer', background: userIn ? 'rgba(255,69,58,0.15)' : `${colors.accent}22`, color: userIn ? 'var(--drops-red)' : colors.accent, opacity: isClosed || (pool.status === 'completed' && !userIn) ? 0.5 : 1 }}
                                                                >
                                                                    {isJoining ? '...' : (isClosed || pool.status === 'completed') ? (userIn ? 'Leave' : 'Ended') : (userIn ? 'Leave' : 'Join')}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {members.length > 0 && (
                                                        <div style={{ padding: '0 16px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <div className="drops-slot-avatars">
                                                                {members.slice(0, 5).map((m, i) => (
                                                                    <div key={m.id} className="drops-slot-avatar" style={{ background: ['var(--drops-blue)','var(--drops-purple)','var(--drops-pink)','var(--drops-green)','var(--drops-orange)'][i % 5] }}>
                                                                        {m.user?.full_name?.charAt(0) || '?'}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <div style={{ fontSize: 12, color: 'var(--drops-text-secondary)' }}>{members.length} people joined</div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        };

                                        return (
                                            <>
                                                {filtered.slice(0, 2).map((pool, index) => renderCustomPoolCard(pool, index))}
                                                {filtered.length > 2 && (
                                                    <button onClick={() => { triggerLightHaptic(); setShowAllCustomPools(true); }} style={{ width: '100%', padding: '12px', background: 'var(--drops-surface)', color: 'var(--drops-blue)', border: '1px solid var(--drops-border)', borderRadius: 100, fontSize: 13, fontWeight: 700, cursor: 'pointer', marginTop: 8 }}>
                                                        View all Custom Drops
                                                    </button>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        )}

                        {/* ─── AI Software Cards ─── */}
                        {!loading && activeTab === 'pools' && activeCategory === 'ai' && (
                            <div style={{ display: 'grid', gap: '20px' }}>
                                {[
                                    { id: 'ChatGPT', name: 'ChatGPT', subtitle: 'Leading intelligence', logo: '/logos/chatgpt.png', color: '#10A37F' },
                                    { id: 'Claude', name: 'Claude', subtitle: 'Advanced reasoning', logo: '/logos/claude.png', color: '#D97757' },
                                    { id: 'Gemini', name: 'Gemini', subtitle: 'Google Ecosystem', logo: '/logos/gemini.png', color: '#4B90FF' }
                                ].map(software => {
                                    const totalMembers = countPoolingForPlans(aiPlanNames(software.id));
                                    return (
                                        <div 
                                            key={software.id} 
                                            className="drops-card animate-fade-in-up" 
                                            onClick={() => { triggerLightHaptic(); setShowAIPricing({ platform: software.id }); }} 
                                            style={{ 
                                                cursor: 'pointer', 
                                                position: 'relative',
                                                overflow: 'hidden',
                                                padding: '32px 24px', 
                                                marginBottom: 0,
                                                background: 'var(--drops-surface)',
                                                border: `1px solid ${software.color}33`,
                                                borderRadius: '24px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '32px',
                                                boxShadow: `0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 var(--drops-surface-elevated)`
                                            }}
                                        >
                                            <div style={{ position: 'absolute', width: '250px', height: '250px', background: software.color, filter: 'blur(80px)', top: '-100px', right: '-100px', zIndex: 0, opacity: 0.2, pointerEvents: 'none' }}></div>
                                            
                                            <div style={{ zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div style={{ width: '64px', height: '64px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <img src={software.logo} alt={software.name} style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '12px' }} />
                                                </div>
                                                <div style={{ background: `${software.color}22`, color: software.color, padding: '6px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: '700', border: `1px solid ${software.color}44` }}>
                                                    {totalMembers} pooling now
                                                </div>
                                            </div>
                                            
                                            <div style={{ zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                                <div>
                                                    <h3 style={{ margin: '0 0 6px 0', fontSize: '24px', fontWeight: '800', color: 'var(--drops-text-primary)', letterSpacing: '-0.5px' }}>{software.name}</h3>
                                                    <p style={{ margin: 0, fontSize: '14px', color: 'var(--drops-text-secondary)', fontWeight: '500' }}>{software.subtitle}</p>
                                                </div>
                                                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--drops-surface-elevated)', border: '1px solid var(--sv-border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--drops-text-primary)', backdropFilter: 'blur(10px)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                                                    <i className="fas fa-arrow-right"></i>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* ─── Fun & Thrill Service Cards ─── */}
                        {!loading && activeTab === 'pools' && activeCategory === 'fun_and_thrill' && (
                            <div style={{ display: 'grid', gap: '20px', marginBottom: 24 }}>
                                {[
                                    { id: 'Netflix', name: 'Netflix', subtitle: 'Movies, Series & Originals', logo: '/logos/netflix.png', color: '#E50914' },
                                    { id: 'Spotify', name: 'Spotify', subtitle: 'Music, Podcasts & More', logo: '/logos/spotify.png', color: '#1DB954' },
                                    { id: 'Prime Video', name: 'Prime Video', subtitle: 'Movies, Delivery & More', logo: '/logos/amazon_prime.png', color: '#00A8E1' },
                                    { id: 'Jio Hotstar', name: 'Jio Hotstar', subtitle: 'Sports, TV & Entertainment', logo: '/logos/jiohotstar.png', color: '#1F3F7A' }
                                ].map((service, sIdx) => {
                                    const totalMembers = countPoolingForPlans(subPlanNames(service.id));
                                    return (
                                        <div 
                                            key={service.id} 
                                            className="drops-card animate-fade-in-up" 
                                            onClick={() => { triggerLightHaptic(); setShowSubPricing({ platform: service.id }); }} 
                                            style={{ 
                                                cursor: 'pointer', 
                                                position: 'relative',
                                                overflow: 'hidden',
                                                padding: '32px 24px', 
                                                marginBottom: 0,
                                                background: 'var(--drops-surface)',
                                                border: `1px solid ${service.color}33`,
                                                borderRadius: '24px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '32px',
                                                boxShadow: `0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 var(--drops-surface-elevated)`,
                                                animationDelay: `${sIdx * 0.08}s`
                                            }}
                                        >
                                            <div style={{ position: 'absolute', width: '250px', height: '250px', background: service.color, filter: 'blur(80px)', top: '-100px', right: '-100px', zIndex: 0, opacity: 0.2, pointerEvents: 'none' }}></div>
                                            
                                            <div style={{ zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div style={{ width: '64px', height: '64px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <img src={service.logo} alt={service.name} style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '12px' }} />
                                                </div>
                                                <div style={{ background: `${service.color}22`, color: service.color, padding: '6px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: '700', border: `1px solid ${service.color}44` }}>
                                                    {totalMembers > 0 ? `${totalMembers} pooling` : 'Open'}
                                                </div>
                                            </div>
                                            
                                            <div style={{ zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                                <div>
                                                    <h3 style={{ margin: '0 0 6px 0', fontSize: '24px', fontWeight: '800', color: 'var(--drops-text-primary)', letterSpacing: '-0.5px' }}>{service.name}</h3>
                                                    <p style={{ margin: 0, fontSize: '14px', color: 'var(--drops-text-secondary)', fontWeight: '500' }}>{service.subtitle}</p>
                                                </div>
                                                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--drops-surface-elevated)', border: '1px solid var(--sv-border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--drops-text-primary)', backdropFilter: 'blur(10px)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                                                    <i className="fas fa-arrow-right"></i>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* ─── Food Service Cards ─── */}
                        {!loading && activeTab === 'pools' && activeCategory === 'food' && (
                            <div style={{ display: 'grid', gap: '20px', marginBottom: 24 }}>
                                {[
                                    { id: 'Swiggy One', name: 'Swiggy One', subtitle: 'Free Delivery & Extra Discounts', logo: '/logos/swiggy.png', color: '#FC8019' },
                                    { id: 'Zomato Gold', name: 'Zomato Gold', subtitle: 'Free Delivery & Pro Benefits', logo: '/logos/zomato.png', color: '#E23744' }
                                ].map((service, sIdx) => {
                                    const totalMembers = countPoolingForPlans(subPlanNames(service.id));
                                    return (
                                        <div key={service.id} className="drops-card animate-fade-in-up" onClick={() => { triggerLightHaptic(); setShowSubPricing({ platform: service.id }); }} style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden', padding: '32px 24px', marginBottom: 0, background: 'var(--drops-surface)', border: `1px solid ${service.color}33`, borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '32px', boxShadow: `0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 var(--drops-surface-elevated)`, animationDelay: `${sIdx * 0.08}s` }}>
                                            <div style={{ position: 'absolute', width: '250px', height: '250px', background: service.color, filter: 'blur(80px)', top: '-100px', right: '-100px', zIndex: 0, opacity: 0.2, pointerEvents: 'none' }}></div>
                                            <div style={{ zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div style={{ width: '64px', height: '64px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><img src={service.logo} alt={service.name} style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '12px' }} /></div>
                                                <div style={{ background: `${service.color}22`, color: service.color, padding: '6px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: '700', border: `1px solid ${service.color}44` }}>{totalMembers > 0 ? `${totalMembers} pooling` : 'Open'}</div>
                                            </div>
                                            <div style={{ zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                                <div><h3 style={{ margin: '0 0 6px 0', fontSize: '24px', fontWeight: '800', color: 'var(--drops-text-primary)', letterSpacing: '-0.5px' }}>{service.name}</h3><p style={{ margin: 0, fontSize: '14px', color: 'var(--drops-text-secondary)', fontWeight: '500' }}>{service.subtitle}</p></div>
                                                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--drops-surface-elevated)', border: '1px solid var(--sv-border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--drops-text-primary)', backdropFilter: 'blur(10px)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}><i className="fas fa-arrow-right"></i></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* ─── Education Service Cards ─── */}
                        {!loading && activeTab === 'pools' && activeCategory === 'education' && (
                            <div style={{ display: 'grid', gap: '20px', marginBottom: 24 }}>
                                {[
                                    { id: 'Udemy', name: 'Udemy', subtitle: 'Courses & Certifications', logo: '/logos/udemy.png', color: '#A435F0' },
                                    { id: 'Coursera', name: 'Coursera', subtitle: 'University-Level Learning', logo: '/logos/coursera.png', color: '#0056D2' }
                                ].map((service, sIdx) => {
                                    const totalMembers = countPoolingForPlans(subPlanNames(service.id));
                                    return (
                                        <div key={service.id} className="drops-card animate-fade-in-up" onClick={() => { triggerLightHaptic(); setShowSubPricing({ platform: service.id }); }} style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden', padding: '32px 24px', marginBottom: 0, background: 'var(--drops-surface)', border: `1px solid ${service.color}33`, borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '32px', boxShadow: `0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 var(--drops-surface-elevated)`, animationDelay: `${sIdx * 0.08}s` }}>
                                            <div style={{ position: 'absolute', width: '250px', height: '250px', background: service.color, filter: 'blur(80px)', top: '-100px', right: '-100px', zIndex: 0, opacity: 0.2, pointerEvents: 'none' }}></div>
                                            <div style={{ zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div style={{ width: '64px', height: '64px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><img src={service.logo} alt={service.name} style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '12px' }} /></div>
                                                <div style={{ background: `${service.color}22`, color: service.color, padding: '6px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: '700', border: `1px solid ${service.color}44` }}>{totalMembers > 0 ? `${totalMembers} pooling` : 'Open'}</div>
                                            </div>
                                            <div style={{ zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                                <div><h3 style={{ margin: '0 0 6px 0', fontSize: '24px', fontWeight: '800', color: 'var(--drops-text-primary)', letterSpacing: '-0.5px' }}>{service.name}</h3><p style={{ margin: 0, fontSize: '14px', color: 'var(--drops-text-secondary)', fontWeight: '500' }}>{service.subtitle}</p></div>
                                                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--drops-surface-elevated)', border: '1px solid var(--sv-border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--drops-text-primary)', backdropFilter: 'blur(10px)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}><i className="fas fa-arrow-right"></i></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* ─── Socials Service Cards ─── */}
                        {!loading && activeTab === 'pools' && activeCategory === 'socials' && (
                            <div style={{ display: 'grid', gap: '20px', marginBottom: 24 }}>
                                {[
                                    { id: 'YouTube Premium', name: 'YouTube Premium', subtitle: 'Ad-Free Videos & Music', logo: '/logos/youtube.svg', color: '#FF0000' },
                                    { id: 'LinkedIn Premium', name: 'LinkedIn Premium', subtitle: 'Career & Networking Tools', logo: '/logos/linkedin.svg', color: '#0A66C2' }
                                ].map((service, sIdx) => {
                                    const totalMembers = countPoolingForPlans(subPlanNames(service.id));
                                    return (
                                        <div key={service.id} className="drops-card animate-fade-in-up" onClick={() => { triggerLightHaptic(); setShowSubPricing({ platform: service.id }); }} style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden', padding: '32px 24px', marginBottom: 0, background: 'var(--drops-surface)', border: `1px solid ${service.color}33`, borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '32px', boxShadow: `0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 var(--drops-surface-elevated)`, animationDelay: `${sIdx * 0.08}s` }}>
                                            <div style={{ position: 'absolute', width: '250px', height: '250px', background: service.color, filter: 'blur(80px)', top: '-100px', right: '-100px', zIndex: 0, opacity: 0.2, pointerEvents: 'none' }}></div>
                                            <div style={{ zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div style={{ width: '64px', height: '64px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><img src={service.logo} alt={service.name} style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '12px' }} /></div>
                                                <div style={{ background: `${service.color}22`, color: service.color, padding: '6px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: '700', border: `1px solid ${service.color}44` }}>{totalMembers > 0 ? `${totalMembers} pooling` : 'Open'}</div>
                                            </div>
                                            <div style={{ zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                                <div><h3 style={{ margin: '0 0 6px 0', fontSize: '24px', fontWeight: '800', color: 'var(--drops-text-primary)', letterSpacing: '-0.5px' }}>{service.name}</h3><p style={{ margin: 0, fontSize: '14px', color: 'var(--drops-text-secondary)', fontWeight: '500' }}>{service.subtitle}</p></div>
                                                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--drops-surface-elevated)', border: '1px solid var(--sv-border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--drops-text-primary)', backdropFilter: 'blur(10px)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}><i className="fas fa-arrow-right"></i></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* ─── Telecom Service Cards ─── */}
                        {!loading && activeTab === 'pools' && activeCategory === 'telecom' && (
                            <div style={{ display: 'grid', gap: '20px', marginBottom: 24 }}>
                                {[
                                    { id: 'Jio', name: 'Jio', subtitle: 'Postpaid & Family Plans', logo: '/logos/jio.png', color: '#0A3F8F' },
                                    { id: 'Airtel', name: 'Airtel', subtitle: 'Family & Data Plans', logo: '/logos/airtel.png', color: '#FF0000' }
                                ].map((service, sIdx) => {
                                    const totalMembers = countPoolingForPlans(subPlanNames(service.id));
                                    return (
                                        <div key={service.id} className="drops-card animate-fade-in-up" onClick={() => { triggerLightHaptic(); setShowSubPricing({ platform: service.id }); }} style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden', padding: '32px 24px', marginBottom: 0, background: 'var(--drops-surface)', border: `1px solid ${service.color}33`, borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '32px', boxShadow: `0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 var(--drops-surface-elevated)`, animationDelay: `${sIdx * 0.08}s` }}>
                                            <div style={{ position: 'absolute', width: '250px', height: '250px', background: service.color, filter: 'blur(80px)', top: '-100px', right: '-100px', zIndex: 0, opacity: 0.2, pointerEvents: 'none' }}></div>
                                            <div style={{ zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div style={{ width: '64px', height: '64px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><img src={service.logo} alt={service.name} style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '12px' }} /></div>
                                                <div style={{ background: `${service.color}22`, color: service.color, padding: '6px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: '700', border: `1px solid ${service.color}44` }}>{totalMembers > 0 ? `${totalMembers} pooling` : 'Open'}</div>
                                            </div>
                                            <div style={{ zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                                <div><h3 style={{ margin: '0 0 6px 0', fontSize: '24px', fontWeight: '800', color: 'var(--drops-text-primary)', letterSpacing: '-0.5px' }}>{service.name}</h3><p style={{ margin: 0, fontSize: '14px', color: 'var(--drops-text-secondary)', fontWeight: '500' }}>{service.subtitle}</p></div>
                                                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--drops-surface-elevated)', border: '1px solid var(--sv-border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--drops-text-primary)', backdropFilter: 'blur(10px)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}><i className="fas fa-arrow-right"></i></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* ─── Pool Type Cards (Fixed) ─── */}
                        {!loading && poolTypes.length > 0 && (
                            <div>
                                {poolTypes.filter(pool => {
                                    if (activeTab === 'pools' && activeCategory) {
                                        const name = pool.name.toLowerCase();
                                        if (activeCategory === 'quick_commerce') {
                                            if (!(name.includes('blinkit') || name.includes('zepto') || name.includes('instamart') || (name.includes('amazon') && !name.includes('prime')) || name.includes('grocery') || name.includes('cart'))) return false;
                                        } else if (activeCategory === 'fun_and_thrill') {
                                            return false; // Handled above by premium Bento cards
                                        } else if (activeCategory === 'telecom') {
                                            return false; // Handled above by premium Bento cards
                                        } else if (activeCategory === 'education') {
                                            return false; // Handled above by premium Bento cards
                                        } else if (activeCategory === 'socials') {
                                            return false; // Handled above by premium Bento cards
                                        } else if (activeCategory === 'food') {
                                            return false; // Handled above by premium Bento cards
                                        } else if (activeCategory === 'ai') {
                                            return false; // Handled above by premium Bento cards
                                        }
                                    } else if (activeTab === 'pools' && !activeCategory) {
                                        return false; // Don't show pools if in category view
                                    }

                                    if (searchQuery) {
                                        const query = searchQuery.toLowerCase();
                                        if (!(pool.name?.toLowerCase().includes(query) || pool.description?.toLowerCase().includes(query))) {
                                            return false;
                                        }
                                    }
                                    const isCompleted = (() => {
                                        if (pool.pool_mode === 'headcount') {
                                            return getDailySlotForPool(pool.id)?.status === 'completed';
                                        } else {
                                            const joinedSlots = slots.filter(s => s.pool_type_id === pool.id && s.slot_start !== 'All Day' && isUserInSlot(s.id));
                                            return joinedSlots.length > 0 && joinedSlots.every(s => s.status === 'completed');
                                        }
                                    })();
                                    if (poolFilter === 'live' && isCompleted) return false;
                                    if (poolFilter === 'ended' && !isCompleted) return false;

                                    return true;
                                }).sort((a, b) => {
                                    if (true) return 0;
                                    const getStatus = (p) => {
                                        if (p.pool_mode === 'headcount') {
                                            return getDailySlotForPool(p.id)?.status === 'completed';
                                        } else {
                                            const joinedSlots = slots.filter(s => s.pool_type_id === p.id && s.slot_start !== 'All Day' && isUserInSlot(s.id));
                                            return joinedSlots.length > 0 && joinedSlots.every(s => s.status === 'completed');
                                        }
                                    };
                                    const aDone = getStatus(a);
                                    const bDone = getStatus(b);
                                    if (aDone === bDone) return 0;
                                    return aDone ? 1 : -1;
                                }).map((pool, index) => {
                                    const colors = POOL_COLORS[pool.emoji] || POOL_COLORS['🛒'];
                                    const poolMode = pool.pool_mode || 'timeslot';
                                    const maxMembers = pool.max_members;

                                    // ═══════════════════════════════════════
                                    // HEADCOUNT POOLS (Netflix, Spotify, Cab)
                                    // ═══════════════════════════════════════
                                    if (poolMode === 'headcount') {
                                        const dailySlot = getDailySlotForPool(pool.id);
                                        if (!dailySlot) return null;

                                        const slotMembers = getMembersForSlot(dailySlot.id);
                                        const memberCount = slotMembers.length;
                                        const isFull = maxMembers && memberCount >= maxMembers;
                                        const userIn = isUserInSlot(dailySlot.id);
                                        const isJoiningThis = joining === dailySlot.id;
                                        const progressPercent = maxMembers ? Math.min((memberCount / maxMembers) * 100, 100) : 0;

                                        // Show all pools in their categories (removed My Pools joined-only filter)

                                        const isNetflix = pool.name.toLowerCase().includes('netflix');
                                        const isSpotify = pool.name.toLowerCase().includes('spotify');
                                        const isAI = pool.name.toLowerCase().includes('chatgpt') || pool.name.toLowerCase().includes('claude') || pool.name.toLowerCase().includes('gemini');
                                        
                                        let baseShare = 0;
                                        if (pool.name.toLowerCase().includes('netflix')) baseShare = 162;
                                        else if (pool.name.toLowerCase().includes('spotify')) baseShare = 30;
                                        else if (pool.name.toLowerCase().includes('prime')) baseShare = 35;
                                        else if (pool.name.toLowerCase().includes('hotstar')) baseShare = 20;
                                        else if (pool.name.toLowerCase().includes('jio')) baseShare = 100;
                                        else if (pool.name.toLowerCase().includes('airtel')) baseShare = 250;
                                        else if (pool.name.toLowerCase().includes('udemy')) baseShare = 125;
                                        else if (pool.name.toLowerCase().includes('coursera')) baseShare = 1000;
                                        else if (pool.name.toLowerCase().includes('linkedin')) baseShare = 300;
                                        else if (pool.name.toLowerCase().includes('youtube')) baseShare = 32;
                                        else if (pool.name.toLowerCase().includes('cab') || pool.name.toLowerCase().includes('uber')) baseShare = 150;
                                        
                                        const requiresPayment = baseShare > 0 && !isAI;
                                        const paymentAmount = baseShare + 5; // adding 5 INR platform fee

                                        // Join / Leave Button logic:
                                        let btnText = 'Join';
                                        let themeClass = '';
                                        if (pool.name.toLowerCase().includes('netflix') || pool.name.toLowerCase().includes('prime') || pool.name.toLowerCase().includes('hotstar')) themeClass = 'theme-netflix';
                                        else if (pool.name.toLowerCase().includes('spotify') || pool.name.toLowerCase().includes('jio') || pool.name.toLowerCase().includes('airtel') || pool.name.toLowerCase().includes('udemy') || pool.name.toLowerCase().includes('coursera') || pool.name.toLowerCase().includes('linkedin') || pool.name.toLowerCase().includes('youtube')) themeClass = 'theme-spotify';
                                        else if (pool.name.toLowerCase().includes('cab') || pool.name.toLowerCase().includes('uber')) themeClass = 'theme-cab';

                                        let btnAction = () => {
                                            triggerMediumHaptic();
                                            if (isAI) {
                                                let platform = 'ChatGPT';
                                                if (pool.name.toLowerCase().includes('claude')) platform = 'Claude';
                                                if (pool.name.toLowerCase().includes('gemini')) platform = 'Gemini';
                                                setShowAIPricing({ platform, slotId: dailySlot.id });
                                            } else if (requiresPayment) {
                                                // Paid pools must go through checkout — joining straight from the
                                                // card would take a seat without any money changing hands.
                                                const platform = getSubPlatformForPool(pool.name);
                                                if (platform) {
                                                    setShowSubPricing({ platform });
                                                } else {
                                                    alert('This pool is not open for joining right now.');
                                                }
                                            } else {
                                                handleJoinFixed(dailySlot.id);
                                            }
                                        };
                                        let btnDisabled = isJoiningThis || (isFull && !userIn);
                                        let btnBg = `${colors.accent}22`;
                                        let btnColor = colors.accent;
                                        let btnOpacity = (isFull && !userIn) ? 0.5 : 1;

                                        if (userIn) {
                                            if (requiresPayment) {
                                                btnText = 'Paid & Waiting';
                                                btnAction = () => {};
                                                btnDisabled = true;
                                                btnBg = 'rgba(48,209,88,0.15)'; // Greenish
                                                btnColor = 'var(--drops-green)';
                                                btnOpacity = 1;
                                            } else {
                                                btnText = 'Leave';
                                                btnAction = () => handleLeaveFixed(dailySlot.id);
                                                btnBg = 'rgba(255,69,58,0.15)';
                                                btnColor = 'var(--drops-red)';
                                            }
                                        } else if (isFull) {
                                            btnText = 'Full';
                                            btnAction = () => {};
                                            btnBg = 'var(--drops-surface)';
                                            btnColor = 'var(--drops-text-tertiary)';
                                        }
                                        if (isJoiningThis) btnText = '...';

                                        return (
                                            <div key={pool.id} className="animate-fade-in-up" style={{ marginBottom: 14, animationDelay: `${index * 0.05}s` }}>
                                                <div className={`drops-card ${themeClass}`} style={{ marginBottom: 0, cursor: 'default' }}>
                                                    <div className="drops-card-header" style={{ marginBottom: 0 }}>
                                                        <div className="drops-card-icon" style={{ background: getPoolLogo(pool.name) ? 'transparent' : colors.bg, padding: getPoolLogo(pool.name) ? '0' : undefined }}>{getPoolLogo(pool.name) ? <img src={getPoolLogo(pool.name)} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '10px' }} /> : pool.emoji}</div>
                                                        <div className="drops-card-info">
                                                            <div className="drops-card-title">
                                                                {pool.name}
                                                                {dailySlot.status === 'completed' && <span style={{ marginLeft: 8, fontSize: 10, padding: '2px 8px', background: 'rgba(48,209,88,0.2)', color: 'var(--drops-green)', borderRadius: 100 }}>Completed</span>}
                                                            </div>
                                                            <div className="drops-card-subtitle">{pool.description}</div>
                                                        </div>
                                                        {isFull && (
                                                            <span style={{ padding: '4px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700, background: 'rgba(48,209,88,0.15)', color: 'var(--drops-green)', whiteSpace: 'nowrap' }}>
                                                                Full!
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Progress Bar */}
                                                    <div style={{ marginTop: 16 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--drops-text-secondary)' }}>
                                                                {memberCount}/{maxMembers} joined
                                                            </span>
                                                            {isFull && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--drops-green)' }}>Ready to go!</span>}
                                                        </div>
                                                        <div style={{ height: 8, background: 'var(--drops-border)', borderRadius: 100, overflow: 'hidden' }}>
                                                            <div style={{
                                                                height: '100%', width: `${progressPercent}%`,
                                                                background: isFull ? 'var(--drops-green)' : `linear-gradient(90deg, ${colors.accent}, ${colors.accent}99)`,
                                                                transition: 'width 0.5s ease', borderRadius: 100
                                                            }} />
                                                        </div>
                                                    </div>

                                                    {/* Members Avatars */}
                                                    {memberCount > 0 && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                                                            <div className="drops-slot-avatars">
                                                                {slotMembers.slice(0, 6).map((m, i) => (
                                                                    <div key={m.id} className="drops-slot-avatar" style={{ background: ['var(--drops-blue)','var(--drops-purple)','var(--drops-pink)','var(--drops-green)','var(--drops-orange)','var(--drops-teal)'][i % 6] }}>
                                                                        {m.display_name?.charAt(0) || '?'}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Join / Leave Button */}
                                                    <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
                                                        {requiresPayment && !userIn && !isFull && (
                                                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--drops-text-secondary)' }}>
                                                                Base ₹{baseShare} + ₹5 Fee
                                                            </div>
                                                        )}
                                                        <button
                                                            onClick={btnAction}
                                                            disabled={btnDisabled}
                                                            style={{
                                                                padding: '10px 24px', borderRadius: 100, border: 'none', fontSize: 14, fontWeight: 700,
                                                                cursor: btnDisabled ? 'not-allowed' : 'pointer',
                                                                background: btnBg,
                                                                color: btnColor,
                                                                opacity: btnOpacity
                                                            }}
                                                        >
                                                            {btnText}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }

                                    // ═══════════════════════════════════════
                                    // TIMESLOT POOLS (Blinkit)
                                    // ═══════════════════════════════════════
                                    const poolSlots = slots.filter(s => s.pool_type_id === pool.id && s.slot_start !== 'All Day');
                                    const slotsUserJoined = poolSlots.filter(s => isUserInSlot(s.id));
                                    // Show all timeslot pools (removed My Pools joined-only filter)

                                    const isExpanded = expandedPool === pool.id;
                                    
                                    let displaySlots = false ? slotsUserJoined : poolSlots;
                                    if (false) {
                                        displaySlots = displaySlots.sort((a, b) => {
                                            const aDone = a.status === 'completed';
                                            const bDone = b.status === 'completed';
                                            if (aDone === bDone) return 0;
                                            return aDone ? 1 : -1;
                                        });
                                    }

                                    let themeClass = '';
                                    if (pool.name.toLowerCase().includes('blinkit') || pool.name.toLowerCase().includes('grocery') || pool.name.toLowerCase().includes('zepto') || pool.name.toLowerCase().includes('instamart') || pool.name.toLowerCase().includes('amazon') || pool.name.toLowerCase().includes('swiggy') || pool.name.toLowerCase().includes('zomato') || pool.name.toLowerCase().includes('food')) {
                                        themeClass = 'theme-blinkit';
                                    }

                                    // Quick Commerce Location Filtering


                                    return (
                                        <div key={pool.id} className="animate-fade-in-up" style={{ marginBottom: 14, animationDelay: `${index * 0.05}s` }}>
                                            <div
                                                className={`drops-card ${themeClass}`}
                                                onClick={() => { 
                                                    triggerLightHaptic(); 
                                                    const platformKey = getPlatformKey(pool.name);
                                                    if (activeCategory === 'food') {
                                                        triggerFullScreenReaction('thinking', 'Food Pools are coming soon! 🍔');
                                                        return;
                                                    }
                                                    if (activeCategory === 'quick_commerce' && platformKey) {
                                                        setShowStore({ slot: 'Proximity', poolName: pool.name, poolEmoji: pool.emoji, platform: platformKey });
                                                    } else {
                                                        setExpandedPool(isExpanded ? null : pool.id); 
                                                    }
                                                }}
                                                style={{ 
                                                    marginBottom: 0, 
                                                    borderBottom: isExpanded ? 'none' : undefined, 
                                                    borderRadius: isExpanded ? '20px 20px 0 0' : undefined
                                                }}
                                            >
                                                <div className="drops-card-header" style={{ marginBottom: 0 }}>
                                                    <div className="drops-card-icon" style={{ background: getPoolLogo(pool.name) ? 'transparent' : colors.bg, padding: getPoolLogo(pool.name) ? '0' : undefined }}>{getPoolLogo(pool.name) ? <img src={getPoolLogo(pool.name)} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '10px' }} /> : pool.emoji}</div>
                                                    <div className="drops-card-info">
                                                        <div className="drops-card-title">
                                                            {pool.name}
                                                        </div>
                                                        <div className="drops-card-subtitle">{pool.description}</div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                                        {(() => {
                                                            const pName = pool.name.toLowerCase();
                                                            const isQC = pName.includes('blinkit') || pName.includes('zepto') || pName.includes('instamart') || (pName.includes('amazon') && !pName.includes('prime'));
                                                            const isFood = (pName.includes('swiggy') && !pName.includes('instamart')) || pName.includes('zomato') || pName.includes('food');
                                                            
                                                            if (isQC && (activeCategory === 'quick_commerce')) {
                                                                return (
                                                                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--drops-blue)', color: 'var(--drops-text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
                                                                        <i className="fas fa-shopping-cart"></i>
                                                                    </div>
                                                                );
                                                            }
                                                            if (isFood && (activeCategory === 'food')) {
                                                                return (
                                                                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#FF6B00', color: 'var(--drops-text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
                                                                        <i className="fas fa-utensils"></i>
                                                                    </div>
                                                                );
                                                            }
                                                            // Default: chevron dropdown
                                                            return <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`} style={{ color: 'var(--drops-text-tertiary)', fontSize: 14 }} />;
                                                        })()}
                                                    </div>
                                                </div>
                                            </div>

                                            {isExpanded && (
                                                <div style={{ background: 'var(--drops-surface)', border: '1px solid var(--drops-border)', borderTop: 'none', borderRadius: '0 0 20px 20px', padding: '4px 16px 16px' }}>
                                                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--drops-text-tertiary)', padding: '12px 0 8px' }}>
                                                        {false ? 'Your Time Slots' : "Today's Time Slots"}
                                                    </div>
                                                    {displaySlots.map(slot => {
                                                        const slotMembers = getMembersForSlot(slot.id);
                                                        const isCurrent = slot.slot_start === currentSlot;
                                                        const isJoiningSlot = joining === slot.id;
                                                        
                                                        // For timeslot pools, count unique cart contributors from usePools
                                                        const slotKey = `${slot.slot_start} - ${slot.slot_end}`;
                                                        const contributors = cartContributors[slotKey] || [];
                                                        const count = contributors.length;

                                                        return (
                                                            <div key={slot.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: isCurrent ? 'var(--drops-surface-hover)' : 'transparent', borderRadius: 12, marginBottom: 4, border: isCurrent ? `1px solid ${colors.accent}33` : '1px solid transparent' }}>
                                                                <div style={{ minWidth: 100 }}>
                                                                    <div style={{ fontSize: 14, fontWeight: 600, color: isCurrent ? colors.accent : 'var(--drops-text-primary)' }}>
                                                                        {slot.slot_start} – {slot.slot_end}
                                                                    </div>
                                                                    {isCurrent && slot.status !== 'completed' && <div style={{ fontSize: 10, fontWeight: 700, color: colors.accent, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>● Active Now</div>}
                                                                    {slot.status === 'completed' && <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--drops-green)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>✔ Completed</div>}
                                                                </div>
                                                                
                                                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                                                    {count > 0 ? (
                                                                        <span style={{ fontSize: 12, color: colors.accent, fontWeight: 700 }}>{count} joined</span>
                                                                    ) : <span style={{ fontSize: 12, color: 'var(--drops-text-tertiary)' }}>No one yet</span>}
                                                                </div>
                                                                
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); triggerLightHaptic(); setShowStore({ slot: `${slot.slot_start} - ${slot.slot_end}`, poolName: pool.name, poolEmoji: pool.emoji }); }}
                                                                    style={{ padding: '8px 18px', borderRadius: 100, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', background: `${colors.accent}22`, color: colors.accent }}
                                                                >
                                                                    View Cart
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ─── FAB removed ─── */}

            {/* ─── Bottom Nav ─── */}
            <nav className="drops-bottom-nav">
                <div className={`drops-nav-item ${activeTab === 'pools' ? 'active' : ''}`} onClick={() => handleTabChange('pools')}>
                    <div className="drops-nav-icon">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
                            <path d="M12 8v4l2 2"/>
                        </svg>
                    </div>
                    <span>Pools</span>
                </div>
                <div className={`drops-nav-item ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => handleTabChange('notifications')}>
                    <div className="drops-nav-icon">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                        </svg>
                    </div>
                    <span>Notifications</span>
                </div>
                <div className={`drops-nav-item ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => handleTabChange('orders')}>
                    <div className="drops-nav-icon">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                            <line x1="7" y1="7" x2="7.01" y2="7"></line>
                        </svg>
                    </div>
                    <span>Orders</span>
                </div>
            </nav>

            {showCreateSheet && (
                <CreateDropSheet 
                    onClose={() => setShowCreateSheet(false)} 
                    onSubmit={handleCreatePool}
                    loading={creating}
                />
            )}

            {/* View All Custom Pools Overlay */}
            {showAllCustomPools && (
                <div style={{ position: 'fixed', inset: 0, background: 'var(--drops-bg)', zIndex: 600, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '20px 20px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--drops-border)', position: 'sticky', top: 0, background: 'rgba(18,18,18,0.8)', backdropFilter: 'blur(20px)', zIndex: 10 }}>
                        <h2 style={{ fontSize: 20, fontWeight: 800 }}>All Custom Drops</h2>
                        <button onClick={() => setShowAllCustomPools(false)} style={{ background: 'transparent', border: 'none', color: 'var(--drops-blue)', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
                            Close
                        </button>
                    </div>
                    <div style={{ padding: '20px' }}>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: 24 }}>
                            <i className="fas fa-search" style={{ position: 'absolute', left: 16, color: 'var(--drops-text-tertiary)', fontSize: 16 }}></i>
                            <input
                                type="text"
                                placeholder="Search all custom drops..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    width: '100%', background: 'var(--drops-surface)', border: '1px solid var(--drops-border)',
                                    padding: '16px 16px 16px 44px', borderRadius: '100px', color: 'var(--drops-text-primary)', fontSize: 15, fontWeight: 600, outline: 'none'
                                }}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {customPools.filter(pool => {
                                if (searchQuery) {
                                    const q = searchQuery.toLowerCase();
                                    return pool.title?.toLowerCase().includes(q) || pool.description?.toLowerCase().includes(q);
                                }
                                if (activeTab === 'pools') return true;
                                return isUserInCustomPool(pool.id, user?.id) || pool.creator_id === user?.id;
                            }).map((pool, index) => null)}
                        </div>
                    </div>
                </div>
            )}

            {/* Warning Leave Confirmation Overlay */}
            {leavingPoolConfirm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <Savio state="crying" size={80} showBubble={false} />
                    <h2 style={{ fontSize: 24, fontWeight: 800, marginTop: 24, marginBottom: 12, color: 'var(--drops-text-primary)', textAlign: 'center' }}>Are you sure?</h2>
                    <p style={{ color: 'var(--drops-text-secondary)', textAlign: 'center', fontSize: 15, marginBottom: 32, lineHeight: 1.5, maxWidth: 300 }}>
                        You created this pool. Leaving it will <strong>permanently delete it</strong> for everyone currently joined.
                    </p>
                    <div style={{ display: 'flex', gap: 16, width: '100%', maxWidth: 300 }}>
                        <button onClick={() => setLeavingPoolConfirm(null)} style={{ flex: 1, padding: 16, borderRadius: 100, border: 'none', background: 'var(--drops-surface-elevated)', color: 'var(--drops-text-primary)', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                            Cancel
                        </button>
                        <button onClick={confirmLeaveCustom} style={{ flex: 1, padding: 16, borderRadius: 100, border: 'none', background: 'var(--drops-red)', color: 'var(--drops-text-primary)', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                            Delete Drop
                        </button>
                    </div>
                </div>
            )}

            {/* End Drop Confirmation Overlay */}
            {endingPoolConfirm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <Savio state="proud" size={80} showBubble={false} />
                    <h2 style={{ fontSize: 24, fontWeight: 800, marginTop: 24, marginBottom: 12, color: 'var(--drops-text-primary)', textAlign: 'center' }}>Ready to End?</h2>
                    <p style={{ color: 'var(--drops-text-secondary)', textAlign: 'center', fontSize: 15, marginBottom: 32, lineHeight: 1.5, maxWidth: 300 }}>
                        Ending this pool means no new members can join, but current members can still see it in their history.
                    </p>
                    <div style={{ display: 'flex', gap: 16, width: '100%', maxWidth: 300 }}>
                        <button onClick={() => setEndingPoolConfirm(null)} style={{ flex: 1, padding: 16, borderRadius: 100, border: 'none', background: 'var(--drops-surface-elevated)', color: 'var(--drops-text-primary)', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                            Cancel
                        </button>
                        <button onClick={confirmEndCustom} style={{ flex: 1, padding: 16, borderRadius: 100, border: 'none', background: 'var(--drops-orange)', color: 'var(--drops-text-primary)', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                            End Drop
                        </button>
                    </div>
                </div>
            )}

            {showStore && (
                <SharedCartStore 
                    user={user} 
                    hallId={effectiveHallId}
                    activeSlot={typeof showStore === 'object' ? showStore.slot : showStore} 
                    poolName={typeof showStore === 'object' ? showStore.poolName : 'Blinkit Pool'}
                    poolEmoji={typeof showStore === 'object' ? showStore.poolEmoji : '🛒'}
                    platform={typeof showStore === 'object' ? (showStore.platform || 'blinkit') : 'blinkit'}
                    userLocation={userLocation}
                    onClose={() => setShowStore(null)} 
                />
            )}

            {simulatedPayment && (
                <MockPaymentUI
                    amount={simulatedPayment.amount}
                    orderId={simulatedPayment.orderId}
                    onClose={() => { setSimulatedPayment(null); setShowPaymentSim(null); }}
                    onSuccess={() => {
                        setSimulatedPayment(null);
                        setShowPaymentSim(null);
                        triggerFullScreenReaction('celebrating', 'Seat locked in! ⚡');
                        refetchPoolsRef.current?.();
                    }}
                />
            )}

            {showAIPricing && (
                <AIPricingModal
                    platform={showAIPricing.platform}
                    poolTypes={poolTypes}
                    slots={slots}
                    getDailySlotForPool={getDailySlotForPool}
                    getMembersForSlot={getMembersForSlot}
                    isUserInSlot={isUserInSlot}
                    onClose={() => setShowAIPricing(null)}
                    onJoin={async (planName, splitPrice, slotId) => {
                        const finalSlotId = await resolveLiveSlotForPlan(planName, slotId);
                        setShowAIPricing(null);
                        setShowPaymentSim({ planName, splitPrice, slotId: finalSlotId, platformFee: 0 });
                    }}
                />
            )}

            {showSubPricing && (
                <SubscriptionPoolModal 
                    platform={showSubPricing.platform}
                    poolTypes={poolTypes}
                    getDailySlotForPool={getDailySlotForPool}
                    getMembersForSlot={getMembersForSlot}
                    isUserInSlot={isUserInSlot}
                    onClose={() => setShowSubPricing(null)}
                    onJoin={async (planName, splitPrice, slotId) => {
                        const finalSlotId = await resolveLiveSlotForPlan(planName, slotId);
                        setShowSubPricing(null);
                        setShowPaymentSim({ planName, splitPrice, slotId: finalSlotId, platformFee: 0 });
                    }}
                />
            )}

            {/* ═══ Real Payment Gateway for Subscription Pools ═══ */}
            {showPaymentSim && (
                <div style={{ position: 'fixed', inset: 0, background: 'var(--sv-overlay)', backdropFilter: 'blur(16px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.3s ease-out' }}>
                    <div className="animate-fade-in-up" style={{ width: '100%', maxWidth: 380, borderRadius: 28, background: '#111', border: '1px solid var(--drops-surface-elevated)', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
                        {/* Header */}
                        <div style={{ padding: '28px 28px 20px', borderBottom: '1px solid var(--drops-surface-hover)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #0A84FF, #5E5CE6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <i className="fas fa-credit-card" style={{ color: 'var(--drops-text-primary)', fontSize: 20 }}></i>
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--drops-text-primary)' }}>Payment Summary</h3>
                                    <div style={{ fontSize: 13, color: 'var(--drops-text-secondary)', marginTop: 2 }}>{showPaymentSim.planName}</div>
                                </div>
                            </div>
                            <div style={{ background: 'var(--drops-surface)', border: '1px solid var(--drops-surface-hover)', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#aaa' }}>
                                    <span>Split Amount</span>
                                    <span style={{ color: 'var(--drops-text-primary)', fontWeight: 600 }}>₹{showPaymentSim.splitPrice}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#aaa' }}>
                                    <span>Platform Fee</span>
                                    <span style={{ color: 'var(--drops-text-primary)', fontWeight: 600 }}>₹{showPaymentSim.platformFee}</span>
                                </div>
                                <div style={{ borderTop: '1px solid var(--drops-border)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, color: 'var(--drops-text-primary)' }}>
                                    <span>Total</span>
                                    <span style={{ color: 'var(--drops-green)' }}>₹{showPaymentSim.splitPrice + showPaymentSim.platformFee}</span>
                                </div>
                            </div>
                        </div>
                        {/* Phone Number + Pay Button */}
                        <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {/* Phone number input */}
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--drops-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'block' }}>Phone Number</label>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <span style={{ position: 'absolute', left: 16, color: 'var(--drops-text-tertiary)', fontSize: 14, fontWeight: 600, zIndex: 2 }}>+91</span>
                                    <input
                                        type="tel"
                                        value={paymentPhone}
                                        onChange={(e) => setPaymentPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                                        placeholder="Enter 10-digit number"
                                        maxLength={10}
                                        style={{ width: '100%', background: 'var(--drops-surface)', border: `1px solid ${paymentPhone.length === 10 ? 'rgba(52,199,89,0.4)' : 'var(--drops-surface-elevated)'}`, padding: '14px 16px 14px 52px', borderRadius: 14, color: 'var(--drops-text-primary)', fontSize: 16, fontWeight: 600, outline: 'none', transition: 'border-color 0.2s', letterSpacing: '1px' }}
                                    />
                                    {paymentPhone.length === 10 && (
                                        <i className="fas fa-check-circle" style={{ position: 'absolute', right: 16, color: 'var(--drops-green)', fontSize: 16 }}></i>
                                    )}
                                </div>
                            </div>
                            <button 
                                onClick={handleRealPayment}
                                disabled={paymentProcessing || paymentPhone.length !== 10}
                                style={{ width: '100%', padding: 18, borderRadius: 16, border: 'none', background: paymentProcessing ? 'var(--drops-surface-elevated)' : (paymentPhone.length === 10 ? 'linear-gradient(135deg, #30D158, #28a745)' : 'var(--drops-border)'), color: paymentProcessing ? 'var(--drops-text-tertiary)' : (paymentPhone.length === 10 ? 'var(--drops-text-primary)' : '#555'), fontSize: 16, fontWeight: 800, cursor: paymentProcessing ? 'wait' : (paymentPhone.length === 10 ? 'pointer' : 'not-allowed'), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'all 0.2s', boxShadow: paymentPhone.length === 10 ? '0 8px 25px rgba(52,199,89,0.3)' : 'none' }}
                            >
                                {paymentProcessing ? <><i className="fas fa-spinner fa-spin"></i> Initiating Payment...</> : <><i className="fas fa-lock"></i> Pay ₹{showPaymentSim.splitPrice + showPaymentSim.platformFee}</>}
                            </button>
                            {/* Never disabled: this is the only way out if the
                                gateway hand-off stalls or the user comes back
                                from it without paying. */}
                            <button
                                onClick={() => { setPaymentProcessing(false); setShowPaymentSim(null); setPaymentPhone(''); }}
                                style={{ width: '100%', padding: 14, borderRadius: 14, border: '1px solid var(--drops-surface-elevated)', background: 'transparent', color: 'var(--drops-text-secondary)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showLocationPrompt && (
                <LocationPromptModal 
                    onAllow={handleAllowLocation}
                    onSkip={() => {
                        sessionStorage.setItem('savify_location_skipped', 'true');
                        setShowLocationPrompt(false);
                    }}
                />
            )}

            <FullScreenSavio
                isVisible={fsSavio.isVisible}
                state={fsSavio.state}
                message={fsSavio.message}
                subMessage={fsSavio.subMessage}
                onDismiss={fsSavio.onDismiss}
                dismissLabel={fsSavio.dismissLabel}
            />

            {/* ═══ Find Your Roommate Popup — REMOVED ═══ */}
            {/* ═══ Selected Hallmate Overlay — REMOVED ═══ */}

            {/* Legal footer — required to be reachable from the dashboard too.
                Extra bottom padding clears the fixed mobile nav bar. */}
            <div style={{ paddingBottom: 80 }}>
                <Footer />
            </div>
        </div>
    );
}
// Trigger rebuild
