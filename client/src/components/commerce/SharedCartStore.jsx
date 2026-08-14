import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useCommerce } from '../../hooks/useCommerce';
import FullScreenSavio from '../FullScreenSavio';
import { triggerLightHaptic, triggerMediumHaptic } from '../../utils/haptics';

// ══════════════════════════════════════════════════════════════
// Platform Brand Themes
// ══════════════════════════════════════════════════════════════
const PLATFORM_THEMES = {
    blinkit: {
        name: 'Blinkit', accent: '#F8CF46', accentRgb: '248,207,70', gradient: 'linear-gradient(135deg, #F8CF46, #E8A317)',
        bg: 'rgba(248,207,70,0.08)', border: 'rgba(248,207,70,0.2)', logo: '/logos/blinkit.png',
        tagline: '10-minute delivery', type: 'grocery'
    },
    zepto: {
        name: 'Zepto', accent: '#8B5CF6', accentRgb: '139,92,246', gradient: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
        bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.2)', logo: '/logos/zepto.png',
        tagline: '10-minute delivery', type: 'grocery'
    },
    swiggy_instamart: {
        name: 'Swiggy Instamart', accent: '#FF6B00', accentRgb: '255,107,0', gradient: 'linear-gradient(135deg, #FF6B00, #E85D00)',
        bg: 'rgba(255,107,0,0.08)', border: 'rgba(255,107,0,0.2)', logo: '/logos/swiggy_instamart.png',
        tagline: 'Instant groceries', type: 'grocery'
    },
    amazon_fresh: {
        name: 'Amazon Fresh', accent: '#FF9900', accentRgb: '255,153,0', gradient: 'linear-gradient(135deg, #FF9900, #146EB4)',
        bg: 'rgba(255,153,0,0.08)', border: 'rgba(255,153,0,0.2)', logo: '/logos/amazon_now.png',
        tagline: 'Fresh groceries', type: 'grocery'
    },
    swiggy_food: {
        name: 'Swiggy', accent: '#FF6B00', accentRgb: '255,107,0', gradient: 'linear-gradient(135deg, #FF6B00, #FF3D00)',
        bg: 'rgba(255,107,0,0.08)', border: 'rgba(255,107,0,0.2)', logo: '/logos/swiggy.svg',
        tagline: 'Food delivery', type: 'food'
    },
    zomato_food: {
        name: 'Zomato', accent: '#E23744', accentRgb: '226,55,68', gradient: 'linear-gradient(135deg, #E23744, #CB202D)',
        bg: 'rgba(226,55,68,0.08)', border: 'rgba(226,55,68,0.2)', logo: '/logos/zomato.svg',
        tagline: 'Food delivery', type: 'food'
    }
};

// ══════════════════════════════════════════════════════════════
// Smart Search Maps per platform type
// ══════════════════════════════════════════════════════════════
const GROCERY_SEARCH_MAP = {
    'chips': ['chips', 'lays', 'kurkure', 'doritos', 'bingo', 'pringles', 'nachos', 'crisps'],
    'drink': ['drink', 'coke', 'pepsi', 'sprite', 'water', 'soda', 'juice', 'beverage', 'thums up', 'mazaa', 'fanta', 'limca', 'cola'],
    'chocolate': ['chocolate', 'dairy milk', 'snickers', 'kitkat', 'cadbury', 'ferrero', 'munch', '5star', 'perk'],
    'biscuit': ['biscuit', 'cookie', 'oreo', 'parle', 'bourbon', 'good day', 'marie', 'cream'],
    'milk': ['milk', 'dairy', 'curd', 'yogurt', 'paneer', 'cheese', 'butter', 'ghee', 'cream'],
    'bread': ['bread', 'pav', 'bun', 'roti', 'naan'],
    'rice': ['rice', 'basmati', 'grain', 'atta', 'flour', 'wheat'],
    'oil': ['oil', 'sunflower', 'mustard', 'olive', 'coconut oil', 'refined'],
    'cleaning': ['cleaning', 'detergent', 'surf', 'vim', 'harpic', 'lizol', 'mop', 'floor'],
    'hygiene': ['hygiene', 'soap', 'shampoo', 'toothpaste', 'toothbrush', 'dettol', 'sanitizer', 'deodorant'],
    'fruit': ['fruit', 'apple', 'banana', 'mango', 'orange', 'grape', 'papaya', 'watermelon'],
    'vegetable': ['vegetable', 'veggie', 'tomato', 'potato', 'onion', 'carrot', 'cabbage', 'capsicum', 'beans']
};

const FOOD_SEARCH_MAP = {
    'biryani': ['biryani', 'pulao', 'rice', 'dum', 'hyderabadi'],
    'curry': ['curry', 'masala', 'gravy', 'butter', 'paneer', 'chicken', 'dal', 'sabzi'],
    'chinese': ['chinese', 'noodles', 'fried rice', 'manchurian', 'hakka', 'chowmein', 'momos', 'spring roll'],
    'pizza': ['pizza', 'cheese', 'margherita', 'pepperoni', 'farmhouse'],
    'burger': ['burger', 'sandwich', 'wrap', 'roll', 'sub'],
    'south indian': ['dosa', 'idli', 'vada', 'uttapam', 'sambar', 'upma', 'pongal'],
    'dessert': ['dessert', 'sweet', 'cake', 'ice cream', 'gulab jamun', 'rasgulla', 'brownie', 'pastry'],
    'thali': ['thali', 'meal', 'combo', 'plate'],
    'tandoor': ['tandoor', 'tikka', 'kebab', 'seekh', 'malai', 'grill']
};

export default function SharedCartStore({ user, hallId, activeSlot, poolName = 'Blinkit Pool', poolEmoji = '🛒', platform = 'blinkit', userLocation, onClose }) {
    const theme = PLATFORM_THEMES[platform] || PLATFORM_THEMES.blinkit;
    const searchMap = theme.type === 'food' ? FOOD_SEARCH_MAP : GROCERY_SEARCH_MAP;

    const { 
        products, activeCart, cartItems, loading, localCart, isParticipating, feeInfo,
        addToLocalCart, removeFromLocalCart, startPool, joinPool,
        addToPool, removeFromPool, leavePool, handlePayment 
    } = useCommerce(user?.id, hallId, activeSlot, poolName, platform, userLocation);
    
    const [viewingCart, setViewingCart] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    
    // Payment phone number — pre-fill from user profile
    const [paymentPhone, setPaymentPhone] = useState('');
    const [paymentProcessing, setPaymentProcessing] = useState(false);

    // Coming back from the gateway without paying (iOS Safari restores this page
    // from the back-forward cache with state intact) otherwise leaves the Pay
    // button stuck on "Initiating Payment..." with no way to retry.
    useEffect(() => {
        const clear = () => setPaymentProcessing(false);
        const onPageShow = (e) => { if (e.persisted) clear(); };
        const onVisibility = () => { if (document.visibilityState === 'visible') clear(); };
        window.addEventListener('pageshow', onPageShow);
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            window.removeEventListener('pageshow', onPageShow);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, []);


    // Pre-fill phone from user profile on mount
    useEffect(() => {
        if (user?.id) {
            import('../../config/supabase').then(({ supabase }) => {
                supabase.from('user_profiles').select('mobile_number, email').eq('id', user.id).single().then(({ data }) => {
                    if (data?.mobile_number) setPaymentPhone(data.mobile_number);
                });
            });
        }
    }, [user?.id]);
    
    
    // Countdown Timer
    const [timeLeft, setTimeLeft] = useState('');
    const [isExpired, setIsExpired] = useState(false);
    const [showExpiredModal, setShowExpiredModal] = useState(false);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

    // Loading stage animation
    const [loadingStage, setLoadingStage] = useState(0);
    const LOADING_MESSAGES = [`Connecting to ${theme.name}...`, `Loading ${theme.name} menu...`, 'Almost ready!'];
    useEffect(() => {
        if (!loading) return;
        const interval = setInterval(() => {
            setLoadingStage(prev => Math.min(prev + 1, LOADING_MESSAGES.length - 1));
        }, 1200);
        return () => { clearInterval(interval); setLoadingStage(0); };
    }, [loading]);

    useEffect(() => {
        if (!activeCart?.expires_at) return;
        const updateTimer = () => {
            const diff = new Date(activeCart.expires_at) - new Date();
            if (diff <= 0) {
                setTimeLeft('00:00');
                setIsExpired(true);
            } else {
                const m = Math.floor((diff / 1000 / 60) % 60);
                const s = Math.floor((diff / 1000) % 60);
                setTimeLeft(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
                setIsExpired(false);
            }
        };
        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [activeCart?.expires_at]);

    useEffect(() => {
        if (isExpired && isParticipating) {
            const myPending = cartItems.filter(item => item.user_id === user?.id && item.payment_status === 'pending');
            if (myPending.length > 0) {
                setShowExpiredModal(true);
            }
        }
    }, [isExpired, isParticipating, cartItems, user?.id]);

    const handleAttemptClose = () => {
        const myPending = isParticipating ? cartItems.filter(item => item.user_id === user?.id && item.payment_status === 'pending') : [];
        if (isParticipating && myPending.length > 0) {
            setShowLeaveConfirm(true);
        } else {
            onClose();
        }
    };

    // Animated search placeholder
    const PLACEHOLDERS = theme.type === 'food' 
        ? ['Biryani', 'Pizza', 'Chinese', 'Desserts', 'Thali']
        : ['Chips', 'Milk', 'Bread', 'Chocolates', 'Drinks'];
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const [placeholderAnim, setPlaceholderAnim] = useState('in');

    useEffect(() => {
        const interval = setInterval(() => {
            setPlaceholderAnim('out');
            setTimeout(() => {
                setPlaceholderIndex(prev => (prev + 1) % PLACEHOLDERS.length);
                setPlaceholderAnim('in');
            }, 300);
        }, 1500);
        return () => clearInterval(interval);
    }, []);

    const [fsSavio, setFsSavio] = useState({ isVisible: false, state: '', message: '' });
    const triggerFullScreenReaction = (state, message) => {
        setFsSavio({ isVisible: true, state, message });
        setTimeout(() => setFsSavio({ isVisible: false, state: '', message: '' }), 3000);
    };

    const handleAdd = useCallback((product) => {
        triggerLightHaptic();
        if (isParticipating) addToPool(product);
        else addToLocalCart(product);
    }, [isParticipating, addToPool, addToLocalCart]);

    const handleRemove = useCallback((product) => {
        triggerMediumHaptic();
        if (isParticipating) removeFromPool(product);
        else removeFromLocalCart(product);
    }, [isParticipating, removeFromPool, removeFromLocalCart]);

    // Smart search
    const isMatch = (product) => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return true;
        
        const pName = product.name.toLowerCase();
        const pCategory = (product.category || '').toLowerCase();
        
        if (pName.includes(q) || pCategory.includes(q)) return true;
        
        // Check tags array
        if (product.tags && Array.isArray(product.tags)) {
            if (product.tags.some(tag => tag.toLowerCase().includes(q))) return true;
        }
        
        // Smart synonym matching
        for (const [key, synonyms] of Object.entries(searchMap)) {
            const queryMatchesGroup = key.includes(q) || synonyms.some(s => s === q || (q.length >= 3 && s.includes(q)));
            if (queryMatchesGroup) {
                const productMatchesGroup = synonyms.some(s => pName.includes(s) || pCategory.includes(s));
                if (productMatchesGroup) return true;
            }
        }
        return false;
    };

    // Category tabs
    const categories = useMemo(() => {
        const cats = new Set(products.map(p => p.category).filter(Boolean));
        return ['all', ...Array.from(cats).sort()];
    }, [products]);

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            if (activeCategory !== 'all' && p.category !== activeCategory) return false;
            return isMatch(p);
        });
    }, [products, activeCategory, searchQuery]);
    


    // Item arrays
    const myPendingItems = useMemo(() => isParticipating 
        ? cartItems.filter(item => item.user_id === user?.id && item.payment_status === 'pending')
        : localCart.map(i => ({ id: i.product.id, product: i.product, product_id: i.product.id, quantity: i.quantity, price_at_time: i.product.price })), [isParticipating, cartItems, localCart, user?.id]);
        
    const myPaidItems = useMemo(() => isParticipating 
        ? cartItems.filter(item => item.user_id === user?.id && item.payment_status === 'paid')
        : [], [isParticipating, cartItems, user?.id]);
    
    const myPendingShare = myPendingItems.reduce((sum, item) => sum + (item.price_at_time * item.quantity), 0);
    const myPaidShare = myPaidItems.reduce((sum, item) => sum + (item.price_at_time * item.quantity), 0);
    
    const uniqueUsers = new Set(cartItems.map(i => i.user_id));
    const numUsers = Math.max(uniqueUsers.size, 1);
    const rawDeliveryFee = isParticipating ? (activeCart?.delivery_fee ?? feeInfo.delivery_fee ?? 0) : (feeInfo.delivery_fee ?? 0);
    const platformFee = isParticipating ? (activeCart?.platform_fee ?? feeInfo.platform_fee ?? 0) : (feeInfo.platform_fee ?? 0);
    
    const freeThreshold = feeInfo.free_delivery_threshold || 199;
    const currentTotal = activeCart?.total_amount || myPendingShare;
    const poolTotal = activeCart?.total_amount || currentTotal || 0;
    const deliveryFee = poolTotal >= freeThreshold ? 0 : rawDeliveryFee;
    // Proportional split: use ALL cart items (pending + paid) as denominator
    // so that each user's share stays fixed regardless of who pays first
    const poolTotalForSplit = cartItems.reduce((sum, item) => sum + (item.price_at_time * item.quantity), 0) || 1;
    const myProportion = myPendingShare / poolTotalForSplit;
    // Delivery + platform fees split proportionally by order value
    const deliveryShare = deliveryFee === 0 ? 0 : (isParticipating ? Math.ceil(deliveryFee * myProportion) : deliveryFee);
    const platformShare = isParticipating ? Math.ceil(platformFee * myProportion) : platformFee;
    // Savify fee: flat ₹1 per user (not proportional)
    const savifyFee = myPendingShare > 0 ? 1 : 0;
    const myTotalToPay = myPendingShare > 0 ? myPendingShare + deliveryShare + platformShare + savifyFee : 0;

    const isCheckoutPending = isParticipating && activeCart?.status === 'checkout_pending';
    const progressPercent = Math.min((currentTotal / freeThreshold) * 100, 100);
    const amountLeft = Math.max(freeThreshold - currentTotal, 0);

    const productGridItems = useMemo(() => {
        return filteredProducts.map(product => {
            const pendingItem = myPendingItems.find(i => i.product_id === product.id);
            const qty = pendingItem ? pendingItem.quantity : 0;
            const isSelected = qty > 0;

            return (
                <div key={product.id} style={{ background: isSelected ? `linear-gradient(180deg, rgba(${theme.accentRgb},0.12) 0%, rgba(${theme.accentRgb},0.04) 100%)` : 'rgba(255,255,255,0.02)', border: `1px solid ${isSelected ? theme.border : 'rgba(255,255,255,0.05)'}`, borderRadius: 20, padding: 14, display: 'flex', flexDirection: 'column', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: isSelected ? `0 8px 24px rgba(${theme.accentRgb},0.12)` : 'none', transform: isSelected ? 'translateY(-2px)' : 'none' }}>
                    <div style={{ height: 100, background: 'rgba(255,255,255,0.03)', borderRadius: 14, marginBottom: 12, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                        {product.image_url ? (
                            <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))', transition: 'transform 0.3s ease', transform: isSelected ? 'scale(1.08)' : 'scale(1)' }} />
                        ) : (
                            <i className={`fas fa-${theme.type === 'food' ? 'utensils' : 'box'}`} style={{ fontSize: 28, color: 'var(--drops-text-tertiary)' }}></i>
                        )}
                        {isSelected && (
                            <div style={{ position: 'absolute', top: 6, right: 6, background: theme.accent, color: theme.accent === '#F8CF46' || theme.accent === '#FF9900' ? '#000' : '#fff', width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>{qty}</div>
                        )}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, flex: 1, marginBottom: 10, lineHeight: 1.4, color: 'rgba(255,255,255,0.85)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{product.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: 'white' }}>₹{product.price}</div>
                        
                        {qty > 0 ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: theme.gradient, borderRadius: 100, padding: '6px 10px', color: theme.accent === '#F8CF46' || theme.accent === '#FF9900' ? '#000' : '#fff', boxShadow: `0 4px 12px rgba(${theme.accentRgb},0.3)` }}>
                                <button onClick={() => handleRemove(product)} style={{ background: 'transparent', color: 'inherit', border: 'none', cursor: 'pointer', padding: '0 2px', fontSize: 16, fontWeight: 800 }}>-</button>
                                <span style={{ fontSize: 13, fontWeight: 800, minWidth: 12, textAlign: 'center' }}>{qty}</span>
                                <button onClick={() => handleAdd(product)} style={{ background: 'transparent', color: 'inherit', border: 'none', cursor: 'pointer', padding: '0 2px', fontSize: 16, fontWeight: 800 }}>+</button>
                            </div>
                        ) : (
                            <button onClick={() => handleAdd(product)} style={{ background: theme.bg, color: theme.accent, border: `1px solid ${theme.border}`, padding: '7px 16px', borderRadius: 100, cursor: 'pointer', fontSize: 13, fontWeight: 700, transition: 'all 0.2s ease' }}>
                                Add
                            </button>
                        )}
                    </div>
                </div>
            );
        });
    }, [filteredProducts, myPendingItems, theme, handleAdd, handleRemove]);

    // Ordered status screen
    if (activeCart?.status === 'ordered' && isParticipating) {
        if (myPaidShare === 0) {
            return (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div className="animate-fade-in-up" style={{ width: '100%', maxWidth: 360, background: 'var(--drops-surface)', borderRadius: 24, padding: 24, border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
                        <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(255,159,10,0.15)', color: '#FF9F0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 20px' }}>
                            <i className="fas fa-box-open"></i>
                        </div>
                        <h3 style={{ fontSize: 20, fontWeight: 800, color: 'white', marginBottom: 12 }}>Pool is Closed</h3>
                        <p style={{ fontSize: 14, color: 'var(--drops-text-secondary)', lineHeight: 1.5, marginBottom: 24 }}>
                            This pool has been completed. You didn't pay for any items.
                        </p>
                        <button onClick={async () => {
                            await leavePool();
                            onClose();
                        }} style={{ width: '100%', padding: 16, borderRadius: 16, background: '#FF9F0A', color: 'black', border: 'none', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>
                            Start a New Pool
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div style={{ position: 'fixed', inset: 0, background: 'var(--drops-bg)', zIndex: 500, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                <div style={{ width: 100, height: 100, borderRadius: 32, background: theme.bg, border: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, padding: 16 }}>
                    <img src={theme.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12, textAlign: 'center', color: 'white' }}>Order is on the way!</h2>
                <p style={{ color: 'var(--drops-text-secondary)', textAlign: 'center', marginBottom: 40, fontSize: 16, lineHeight: 1.5, maxWidth: 300 }}>
                    Your {theme.name} pool is complete and out for delivery.
                </p>
                <button onClick={() => {
                    // Force refresh to allow new pools
                    onClose();
                    window.location.reload();
                }} style={{ background: theme.gradient, color: theme.accent === '#F8CF46' || theme.accent === '#FF9900' ? '#000' : '#fff', padding: '18px 40px', borderRadius: 100, border: 'none', fontSize: 16, fontWeight: 800, cursor: 'pointer', boxShadow: `0 4px 25px rgba(${theme.accentRgb},0.4)` }}>
                    Back to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--drops-bg)', zIndex: 500, overflow: 'hidden', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
            
            {/* ═══ Header ═══ */}
            <div style={{ position: 'relative', zIndex: 50, background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(20px)', borderBottom: `1px solid ${theme.border}` }}>
                {/* Brand bar */}
                <div style={{ height: 3, background: theme.gradient }}></div>
                
                <div style={{ padding: '20px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 16, background: theme.bg, border: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8, boxShadow: `0 4px 20px rgba(${theme.accentRgb},0.1)` }}>
                            <img src={theme.logo} alt={theme.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px', color: 'white', margin: 0 }}>{theme.name} <span style={{ fontSize: 14, fontWeight: 600, color: theme.accent }}>Pool</span></h2>
                            {isParticipating && activeCart ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: theme.accent, fontWeight: 700, marginTop: 4 }}>
                                    <i className="fas fa-users"></i> {numUsers} {numUsers === 1 ? 'person' : 'people'}
                                    <span style={{ margin: '0 4px', color: 'var(--drops-text-tertiary)' }}>•</span>
                                    <i className="fas fa-clock"></i> 
                                    {isExpired ? 'Time is up!' : `${timeLeft} left`}
                                </div>
                            ) : (
                                <div style={{ fontSize: 13, color: 'var(--drops-text-secondary)', marginTop: 4, fontWeight: 500 }}>
                                    {activeCart && !isExpired ? <span style={{ color: 'var(--drops-green)' }}>Active pool nearby! ({timeLeft} left)</span> : theme.tagline}
                                </div>
                            )}
                        </div>
                    </div>
                    <button onClick={handleAttemptClose} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: 'white', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(10px)' }}>
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {/* Search */}
                <div style={{ padding: '0 20px 16px' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <i className="fas fa-search" style={{ position: 'absolute', left: 20, color: 'var(--drops-text-tertiary)', fontSize: 16, zIndex: 2 }}></i>
                        {!searchQuery && (
                            <div style={{
                                position: 'absolute', left: 48, top: 0, bottom: 0, display: 'flex', alignItems: 'center', pointerEvents: 'none', color: 'var(--drops-text-tertiary)', fontSize: 15, fontWeight: 500, transition: 'opacity 0.3s ease, transform 0.3s ease', opacity: placeholderAnim === 'in' ? 1 : 0, transform: placeholderAnim === 'in' ? 'translateY(0)' : 'translateY(-10px)', zIndex: 2
                            }}>
                                Search <span style={{ color: theme.accent, marginLeft: 6, fontWeight: 700 }}>{PLACEHOLDERS[placeholderIndex]}</span>...
                            </div>
                        )}
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${searchQuery ? theme.border : 'rgba(255,255,255,0.08)'}`, padding: '14px 16px 14px 48px', borderRadius: 16, color: 'white', fontSize: 15, fontWeight: 600, outline: 'none', position: 'relative', zIndex: 1, transition: 'border-color 0.2s' }}
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: 16, background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2 }}>
                                <i className="fas fa-times" style={{ fontSize: 12 }}></i>
                            </button>
                        )}
                    </div>
                </div>

                {/* Category Chips */}
                <div style={{ padding: '0 20px 16px', overflowX: 'auto', display: 'flex', gap: 8, scrollbarWidth: 'none' }}>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => { setActiveCategory(cat); triggerLightHaptic(); }}
                            style={{
                                whiteSpace: 'nowrap',
                                padding: '8px 16px',
                                borderRadius: 100,
                                border: `1px solid ${activeCategory === cat ? theme.accent : 'rgba(255,255,255,0.08)'}`,
                                background: activeCategory === cat ? theme.bg : 'rgba(255,255,255,0.03)',
                                color: activeCategory === cat ? theme.accent : 'var(--drops-text-secondary)',
                                fontSize: 13,
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                flexShrink: 0,
                                textTransform: 'capitalize'
                            }}
                        >
                            {cat === 'all' ? 'All Items' : cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* ═══ Scrollable Content ═══ */}
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 160, position: 'relative' }}>
                
                {/* Delivery Fee Progress */}
                {(isParticipating || myPendingShare > 0) && (
                    <div style={{ padding: '20px 24px', background: `linear-gradient(180deg, rgba(${theme.accentRgb},0.04) 0%, transparent 100%)`, borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                            <div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--drops-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{theme.name} Delivery</div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                                    <span style={{ fontSize: 22, fontWeight: 800, color: deliveryFee === 0 ? 'var(--drops-green)' : 'white' }}>
                                        {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                                    </span>
                                    {deliveryFee > 0 && <span style={{ fontSize: 13, color: 'var(--drops-text-secondary)' }}>delivery</span>}
                                </div>
                            </div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: deliveryFee === 0 ? 'var(--drops-green)' : theme.accent, background: deliveryFee === 0 ? 'rgba(52,199,89,0.15)' : theme.bg, padding: '6px 14px', borderRadius: 100, border: `1px solid ${deliveryFee === 0 ? 'rgba(52,199,89,0.3)' : theme.border}` }}>
                                {deliveryFee === 0 ? '✓ Free Delivery' : `Free at ₹${freeThreshold}`}
                            </div>
                        </div>
                        <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 100, overflow: 'hidden', marginBottom: 8 }}>
                            <div style={{ height: '100%', width: `${progressPercent}%`, background: deliveryFee === 0 ? 'var(--drops-green)' : theme.gradient, transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)', borderRadius: 100 }} />
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--drops-text-secondary)', fontWeight: 500, textAlign: 'center' }}>
                            {deliveryFee === 0 ? 'Free delivery unlocked! 🎉' : `Add ₹${amountLeft} more for free delivery`}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--drops-text-tertiary)', textAlign: 'center', marginTop: 4, fontStyle: 'italic' }}>
                            Prices are indicative. Final charges on {theme.name} may vary.
                        </div>
                    </div>
                )}

                {/* Product Grid */}
                <div style={{ padding: '0 20px', filter: (myPaidShare > 0) ? 'blur(8px)' : 'none', pointerEvents: (myPaidShare > 0) ? 'none' : 'auto', transition: 'filter 0.3s ease' }}>
                    {loading ? (
                        <>
                            <style>{`
                                @keyframes pulse-skeleton {
                                    0% { opacity: 0.6; }
                                    50% { opacity: 0.3; }
                                    100% { opacity: 0.6; }
                                }
                                @keyframes shimmer-slide {
                                    0% { transform: translateX(-100%); }
                                    100% { transform: translateX(100%); }
                                }
                            `}</style>
                            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {/* Branded loading header */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '20px 0 10px' }}>
                                    <div style={{ width: 56, height: 56, borderRadius: 16, background: theme.bg, border: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10, animation: 'pulse-skeleton 1.5s ease-in-out infinite' }}>
                                        <img src={theme.logo} alt={theme.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                    </div>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: theme.accent, animation: 'pulse-skeleton 1.2s ease-in-out infinite' }}>{LOADING_MESSAGES[loadingStage]}</div>
                                </div>
                                {/* Shimmer skeleton cards */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                                    {[1,2,3,4,5,6].map(i => (
                                        <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20, padding: 14, overflow: 'hidden', position: 'relative' }}>
                                            <div style={{ height: 100, borderRadius: 14, background: 'rgba(255,255,255,0.04)', marginBottom: 12, overflow: 'hidden', position: 'relative' }}>
                                                <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, transparent 0%, rgba(${theme.accentRgb},0.08) 50%, transparent 100%)`, animation: 'shimmer-slide 1.5s ease-in-out infinite' }} />
                                            </div>
                                            <div style={{ height: 14, width: '70%', borderRadius: 6, background: 'rgba(255,255,255,0.05)', marginBottom: 8, animation: 'pulse-skeleton 1.5s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ height: 16, width: '30%', borderRadius: 6, background: 'rgba(255,255,255,0.06)', animation: 'pulse-skeleton 1.5s ease-in-out infinite' }} />
                                                <div style={{ height: 32, width: 60, borderRadius: 100, background: `rgba(${theme.accentRgb},0.1)`, animation: 'pulse-skeleton 1.5s ease-in-out infinite' }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {filteredProducts.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: 60, color: 'var(--drops-text-secondary)', background: 'rgba(255,255,255,0.02)', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)', margin: '16px 0' }}>
                                    <i className="fas fa-search" style={{ fontSize: 32, marginBottom: 16, color: 'var(--drops-text-tertiary)', display: 'block' }}></i>
                                    <div style={{ fontSize: 16, fontWeight: 600 }}>
                                        {searchQuery ? `No items match "${searchQuery}"` : `No items in ${activeCategory}`}
                                    </div>
                                    <div style={{ fontSize: 13, color: 'var(--drops-text-tertiary)', marginTop: 4 }}>Try a different search term</div>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, paddingTop: 16 }}>
                                    {productGridItems}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Post-Payment Lockout */}
            {isParticipating && myPaidShare > 0 && activeCart?.status !== 'ordered' && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(10px)', zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(52,199,89,0.15)', color: 'var(--drops-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, marginBottom: 24, border: '1px solid rgba(52,199,89,0.3)', boxShadow: '0 0 40px rgba(52,199,89,0.2)' }}>
                        <i className="fas fa-check"></i>
                    </div>
                    <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12, textAlign: 'center', color: 'white' }}>Split Paid!</h2>
                    <p style={{ color: 'var(--drops-text-secondary)', textAlign: 'center', fontSize: 15, lineHeight: 1.6, maxWidth: 300, marginBottom: 32 }}>
                        Your items are locked in.<br/>Awaiting others to pay their splits.
                    </p>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', padding: '16px 32px', borderRadius: 100, border: '1px solid rgba(255,255,255,0.05)', fontSize: 16, fontWeight: 800, cursor: 'pointer', transition: 'background 0.2s' }}>
                        Back to Dashboard
                    </button>
                </div>
            )}

            {/* ═══ Bottom Action Bar ═══ */}
            {!viewingCart && (
                <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'linear-gradient(180deg, transparent 0%, rgba(10,10,10,0.95) 20%)', paddingTop: 40, paddingBottom: 32, paddingLeft: 20, paddingRight: 20, zIndex: 120, pointerEvents: 'none' }}>
                    
                    {myPendingShare > 0 && myPaidShare === 0 ? (
                        <div style={{ pointerEvents: 'auto', background: 'rgba(20,20,20,0.95)', backdropFilter: 'blur(20px)', borderRadius: 24, padding: 20, border: `1px solid ${theme.border}`, boxShadow: `0 10px 40px rgba(0,0,0,0.5)` }}>
                            {!isParticipating && (
                                <div style={{ textAlign: 'center', fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 16, fontWeight: 500 }}>
                                    {activeCart && !isExpired ? `Active ${theme.name} pool nearby — join it!` : `Start a new ${theme.name} pool`}
                                </div>
                            )}
                            
                            <div style={{ display: 'flex', gap: 12 }}>
                                <button onClick={() => setViewingCart(true)} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: 'white', padding: '16px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>
                                    <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>₹{myTotalToPay}</div>
                                    <div style={{ fontSize: 12, color: 'var(--drops-text-secondary)', fontWeight: 600 }}>Cart ({myPendingItems.reduce((acc, i) => acc + i.quantity, 0)})</div>
                                </button>
                                
                                {!isParticipating ? (
                                    <button onClick={() => {
                                        if (activeCart && !isExpired) {
                                            triggerFullScreenReaction('thinking', 'Joining nearby pool...');
                                            joinPool();
                                        } else {
                                            triggerFullScreenReaction('thinking', 'Starting a new pool...');
                                            startPool();
                                        }
                                    }} style={{ flex: 1.5, background: theme.gradient, color: theme.accent === '#F8CF46' || theme.accent === '#FF9900' ? '#000' : '#fff', padding: '16px', borderRadius: 16, border: 'none', fontSize: 16, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 25px rgba(${theme.accentRgb},0.3)`, transition: 'transform 0.2s' }}>
                                        {activeCart && !isExpired ? (
                                            <>Join Pool <i className="fas fa-sign-in-alt" style={{ marginLeft: 8 }}></i></>
                                        ) : (
                                            <>Start Pool <i className="fas fa-play" style={{ marginLeft: 8 }}></i></>
                                        )}
                                    </button>
                                ) : (
                                    <div style={{ flex: 1.5, background: theme.bg, color: theme.accent, border: `1px dashed ${theme.border}`, padding: '16px', borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                        <div style={{ fontSize: 15, fontWeight: 800 }}>Pool is Live!</div>
                                        <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2, fontWeight: 500 }}>Items added instantly</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : null}
                </div>
            )}

            {/* ═══ Cart Bottom Sheet ═══ */}
            <div style={{ 
                position: 'fixed', inset: 0, zIndex: 600, 
                background: viewingCart ? 'rgba(0,0,0,0.6)' : 'transparent', 
                pointerEvents: viewingCart ? 'auto' : 'none',
                backdropFilter: viewingCart ? 'blur(4px)' : 'none',
                transition: 'all 0.3s ease'
            }} onClick={() => setViewingCart(false)}>
                
                <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, 
                    background: 'var(--drops-bg)', 
                    borderTopLeftRadius: 32, borderTopRightRadius: 32, 
                    borderTop: `1px solid ${theme.border}`,
                    boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
                    transform: viewingCart ? 'translateY(0)' : 'translateY(100%)',
                    transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    maxHeight: '85vh', display: 'flex', flexDirection: 'column'
                }} onClick={(e) => e.stopPropagation()}>
                    
                    {/* Drag Handle */}
                    <div style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
                        <div style={{ width: 40, height: 5, borderRadius: 10, background: 'rgba(255,255,255,0.2)' }}></div>
                    </div>

                    <div style={{ padding: '0 24px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: theme.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4 }}>
                                <img src={theme.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            </div>
                            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'white' }}>Your Cart</h2>
                        </div>
                        <button onClick={() => setViewingCart(false)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: 'white', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <i className="fas fa-times"></i>
                        </button>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
                            {myPendingItems.map(item => (
                                <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                                        <div style={{ width: 56, height: 56, background: 'rgba(255,255,255,0.03)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8 }}>
                                            {item.product?.image_url ? (
                                                <img src={item.product?.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                            ) : (
                                                <i className={`fas fa-${theme.type === 'food' ? 'utensils' : 'box'}`} style={{ color: 'var(--drops-text-tertiary)' }}></i>
                                            )}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>{item.product?.name}</div>
                                            <div style={{ fontSize: 13, color: 'var(--drops-text-secondary)', marginTop: 4, fontWeight: 500 }}>₹{item.price_at_time} / item</div>
                                        </div>
                                    </div>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
                                        <div style={{ fontSize: 16, fontWeight: 800, color: 'white' }}>₹{item.price_at_time * item.quantity}</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.08)', borderRadius: 100, padding: '4px 8px', color: 'white' }}>
                                                <button onClick={() => handleRemove(item.product)} style={{ background: 'transparent', color: 'white', border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 800, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                                                <span style={{ fontSize: 13, fontWeight: 800 }}>{item.quantity}</span>
                                                <button onClick={() => handleAdd(item.product)} style={{ background: 'transparent', color: 'white', border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 800, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                                            </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Bill Breakdown */}
                        <div style={{ padding: 24, background: `linear-gradient(135deg, rgba(${theme.accentRgb},0.04) 0%, rgba(255,255,255,0.01) 100%)`, borderRadius: 24, border: `1px solid ${theme.border}` }}>
                            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 20, color: 'white' }}>Bill Breakdown</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                                <span style={{ color: 'var(--drops-text-secondary)', fontSize: 14, fontWeight: 500 }}>Items Total</span>
                                <span style={{ fontWeight: 700, fontSize: 14, color: 'white' }}>₹{myPendingShare}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                                <span style={{ color: 'var(--drops-text-secondary)', fontSize: 14, fontWeight: 500 }}>Delivery Fee {isParticipating && numUsers > 1 ? <span style={{ fontSize: 11, color: 'var(--drops-text-tertiary)' }}>({Math.round(myProportion * 100)}% share)</span> : null}</span>
                                <span style={{ fontWeight: 700, fontSize: 14, color: deliveryShare === 0 ? 'var(--drops-green)' : 'white' }}>{deliveryShare === 0 ? 'FREE' : `₹${deliveryShare}`}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                                <span style={{ color: 'var(--drops-text-secondary)', fontSize: 14, fontWeight: 500 }}>{theme.name} Handling {isParticipating && numUsers > 1 ? <span style={{ fontSize: 11, color: 'var(--drops-text-tertiary)' }}>({Math.round(myProportion * 100)}% share)</span> : null}</span>
                                <span style={{ fontWeight: 700, fontSize: 14, color: 'white' }}>₹{platformShare}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 20, borderBottom: '1px dashed rgba(255,255,255,0.1)' }}>
                                <span style={{ color: 'var(--drops-text-secondary)', fontSize: 14, fontWeight: 500 }}>Savify Fee <span style={{ fontSize: 11, color: 'var(--drops-text-tertiary)' }}>(flat per user)</span></span>
                                <span style={{ fontWeight: 700, fontSize: 14, color: 'white' }}>₹{savifyFee}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 800, fontSize: 18, color: 'white' }}>Total</span>
                                <span style={{ fontWeight: 800, fontSize: 28, color: theme.accent }}>₹{myTotalToPay}</span>
                            </div>
                        </div>
                    </div>

                    <div style={{ padding: '20px 24px 32px', background: 'rgba(20,20,20,0.95)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        {isParticipating ? (
                            <>
                                {/* Phone number input for Cashfree payment */}
                                <div style={{ marginBottom: 12 }}>
                                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--drops-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'block' }}>Phone Number (for payment)</label>
                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                        <span style={{ position: 'absolute', left: 16, color: 'var(--drops-text-tertiary)', fontSize: 14, fontWeight: 600, zIndex: 2 }}>+91</span>
                                        <input
                                            type="tel"
                                            value={paymentPhone}
                                            onChange={(e) => setPaymentPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                                            placeholder="Enter 10-digit number"
                                            maxLength={10}
                                            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${paymentPhone.length === 10 ? 'rgba(52,199,89,0.4)' : 'rgba(255,255,255,0.1)'}`, padding: '14px 16px 14px 52px', borderRadius: 14, color: 'white', fontSize: 16, fontWeight: 600, outline: 'none', transition: 'border-color 0.2s', letterSpacing: '1px' }}
                                        />
                                        {paymentPhone.length === 10 && (
                                            <i className="fas fa-check-circle" style={{ position: 'absolute', right: 16, color: 'var(--drops-green)', fontSize: 16 }}></i>
                                        )}
                                    </div>
                                </div>

                                <button 
                                    onClick={async () => { 
                                        if (paymentPhone.length !== 10) {
                                            alert('Please enter a valid 10-digit phone number.');
                                            return;
                                        }
                                        setPaymentProcessing(true);
                                        setViewingCart(false); 
                                        const result = await handlePayment(paymentPhone, user?.email || '', user?.user_metadata?.full_name || 'Savify User');
                                        setPaymentProcessing(false);
                                        if (result && result.error) {
                                            alert('Payment Error: ' + result.error);
                                        } else if (result && result.redirecting) {
                                            // User is being redirected to Cashfree — do nothing
                                        } else if (!result) {
                                            alert('Payment gateway error. Please try again.');
                                        }
                                    }} 
                                    disabled={paymentProcessing || paymentPhone.length !== 10}
                                    style={{ width: '100%', background: paymentProcessing ? '#222' : (paymentPhone.length === 10 ? 'linear-gradient(135deg, var(--drops-green), #28a745)' : 'rgba(255,255,255,0.08)'), color: paymentProcessing ? '#666' : (paymentPhone.length === 10 ? 'white' : 'var(--drops-text-tertiary)'), padding: '18px', borderRadius: 16, border: 'none', fontSize: 18, fontWeight: 800, cursor: paymentProcessing ? 'wait' : (paymentPhone.length === 10 ? 'pointer' : 'not-allowed'), display: 'flex', justifyContent: 'center', gap: 12, boxShadow: paymentPhone.length === 10 ? '0 8px 25px rgba(52,199,89,0.3)' : 'none', marginBottom: 12, transition: 'all 0.3s ease' }}
                                >
                                    {paymentProcessing ? <><i className="fas fa-spinner fa-spin"></i> Initiating Payment...</> : <><i className="fas fa-lock"></i> Pay ₹{myTotalToPay}</>}
                                </button>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <button onClick={() => setViewingCart(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.1)', color: 'white', padding: '16px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', fontSize: 15, fontWeight: 800, cursor: 'pointer', transition: 'background 0.2s' }}>
                                        Add More
                                    </button>
                                    <button onClick={async () => {
                                        const result = await leavePool();
                                        if (result && result.error) {
                                            alert(result.error);
                                            return;
                                        }
                                        triggerFullScreenReaction('waiting', 'Left the pool.');
                                    }} style={{ flex: 1, background: 'rgba(226,55,68,0.1)', color: '#E23744', padding: '16px', borderRadius: 16, border: '1px solid rgba(226,55,68,0.2)', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                                        Leave Pool
                                    </button>
                                </div>
                            </>
                        ) : (
                            <button onClick={() => setViewingCart(false)} style={{ width: '100%', background: 'rgba(255,255,255,0.1)', color: 'white', padding: '18px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', fontSize: 16, fontWeight: 800, cursor: 'pointer', transition: 'background 0.2s' }}>
                                Continue Shopping
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Leave Confirm Modal */}
            {showLeaveConfirm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div className="animate-fade-in-up" style={{ width: '100%', maxWidth: 360, background: 'var(--drops-surface)', borderRadius: 24, padding: 24, border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
                        <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(226,55,68,0.15)', color: '#E23744', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 20px' }}>
                            <i className="fas fa-door-open"></i>
                        </div>
                        <h3 style={{ fontSize: 20, fontWeight: 800, color: 'white', marginBottom: 12 }}>Leave Pool?</h3>
                        <p style={{ fontSize: 14, color: 'var(--drops-text-secondary)', lineHeight: 1.5, marginBottom: 24 }}>
                            You have unpaid items. If you leave, your items will be removed and the fee will recalculate for others.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <button onClick={async () => {
                                setShowLeaveConfirm(false);
                                await leavePool();
                                onClose();
                            }} style={{ width: '100%', padding: 16, borderRadius: 16, background: '#E23744', color: 'white', border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                                Yes, Leave Pool
                            </button>
                            <button onClick={() => {
                                setShowLeaveConfirm(false);
                                onClose(); // Let them close but keep items in background
                            }} style={{ width: '100%', padding: 16, borderRadius: 16, background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                                Keep Items & Close
                            </button>
                            <button onClick={() => setShowLeaveConfirm(false)} style={{ width: '100%', padding: 16, borderRadius: 16, background: 'transparent', color: 'var(--drops-text-tertiary)', border: 'none', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Expired Modal */}
            {showExpiredModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div className="animate-fade-in-up" style={{ width: '100%', maxWidth: 360, background: 'var(--drops-surface)', borderRadius: 24, padding: 24, border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
                        <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(255,159,10,0.15)', color: '#FF9F0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 20px' }}>
                            <i className="fas fa-clock"></i>
                        </div>
                        <h3 style={{ fontSize: 20, fontWeight: 800, color: 'white', marginBottom: 12 }}>Pool Expired</h3>
                        <p style={{ fontSize: 14, color: 'var(--drops-text-secondary)', lineHeight: 1.5, marginBottom: 24 }}>
                            The 30-minute window for this pool has expired before you paid. Your items have been cleared.
                        </p>
                        <button onClick={async () => {
                            setShowExpiredModal(false);
                            await leavePool();
                            onClose();
                        }} style={{ width: '100%', padding: 16, borderRadius: 16, background: '#FF9F0A', color: 'black', border: 'none', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>
                            Create New Pool
                        </button>
                    </div>
                </div>
            )}

            <FullScreenSavio isVisible={fsSavio.isVisible} state={fsSavio.state} message={fsSavio.message} />
        </div>
    );
}
