import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../config/supabase';
import { POOL_WINDOW_MS, POOL_BUFFER_MS, poolHardDeadline } from '../utils/poolTimer';

/**
 * Multi-platform commerce hook.
 * Supports: blinkit, zepto, swiggy_instamart, amazon_fresh, swiggy_food, zomato_food
 * 
 * @param {string} userId - Current user ID
 * @param {string} hallId - User's hall ID (fallback only)
 * @param {string} activeSlot - Pool slot identifier
 * @param {string} poolName - Pool display name (e.g., "Blinkit Pool")
 * @param {string} platform - Platform key (e.g., "blinkit", "zepto")
 * @param {{ lat: number, lng: number }} userLocation - User's GPS coordinates
 */
export function useCommerce(userId, hallId, activeSlot, poolName = 'Blinkit Pool', platform = 'blinkit', userLocation = null) {
    const [products, setProducts] = useState([]);
    
    // Remote state
    const [activeCart, setActiveCart] = useState(null);
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Local state (Phase 1)
    const [localCart, setLocalCart] = useState([]);
    const [isParticipating, setIsParticipating] = useState(false);
    // Distinguishes "no pool nearby" from "we cannot tell what is nearby".
    const [locationMissing, setLocationMissing] = useState(false);
    
    // Fee state — default delivery ₹25 for Blinkit, free at ₹199
    const [feeInfo, setFeeInfo] = useState({
        delivery_fee: platform === 'blinkit' ? 25 : 30,
        platform_fee: 5,
        free_delivery_threshold: 199,
        is_surge: false,
        amount_to_free_delivery: 199
    });

    const locationRef = useRef(userLocation);
    useEffect(() => { locationRef.current = userLocation; }, [userLocation]);

    // ══════════════════════════════════════════════════════════
    // Fetch products for this platform
    // ══════════════════════════════════════════════════════════
    const fetchProducts = useCallback(async () => {
        const { data } = await supabase
            .from('products')
            .select('*')
            .eq('in_stock', true)
            .eq('platform', platform);
        if (data) setProducts(data);
    }, [platform]);

    // ══════════════════════════════════════════════════════════
    // Fetch delivery fee from unified commerce API
    // ══════════════════════════════════════════════════════════
    const fetchFee = useCallback(async (totalAmount) => {
        try {
            const res = await fetch('/api/commerce/fee', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ platform, total_amount: totalAmount })
            });
            const data = await res.json();
            if (data.success) {
                setFeeInfo(data);
                return data;
            }
        } catch (e) {
            console.error('Fee fetch error:', e);
        }
        return null;
    }, [platform]);

    // ══════════════════════════════════════════════════════════
    // Fetch cart items + update fees dynamically
    // ══════════════════════════════════════════════════════════
    const fetchCartItems = async (cartId) => {
        if (!cartId) return;
        const { data } = await supabase
            .from('cart_items')
            .select('*, product:products(*), user:user_profiles(full_name)')
            .eq('cart_id', cartId);
        
        if (data) {
            setCartItems(data);
            const total = data.reduce((sum, item) => sum + (item.price_at_time * item.quantity), 0);
            
            setActiveCart(prev => {
                if (!prev) return null;

                // Fetch dynamic fee asynchronously if total changed
                if (total !== prev.total_amount) {
                    fetchFee(total).then(feeData => {
                        if (feeData) {
                            supabase.from('group_carts').update({ 
                                total_amount: total,
                                delivery_fee: feeData.delivery_fee,
                                platform_fee: feeData.platform_fee
                            }).eq('id', cartId).then();
                        }
                    });
                }

                // Transition to ordered if everyone paid
                if (prev.status === 'open' || prev.status === 'checkout_pending') {
                    const pendingItems = data.filter(i => i.payment_status === 'pending');
                    if (pendingItems.length === 0 && data.length > 0) {
                        supabase.from('group_carts').update({ status: 'ordered' }).eq('id', cartId).then(); // Removed fetchActiveCart to keep local state
                        return { ...prev, total_amount: total, status: 'ordered' };
                    }
                }
                
                return { ...prev, total_amount: total };
            });
        }
    };

    // ══════════════════════════════════════════════════════════
    // Fetch active cart — GPS-based proximity (100m radius)
    // ══════════════════════════════════════════════════════════
    const fetchActiveCart = useCallback(async () => {
        if (!activeSlot) return;

        const startOfDay = new Date();
        startOfDay.setHours(0,0,0,0);
        const todayStr = startOfDay.toISOString();

        // 1. Check if user is ALREADY participating in a cart today
        let paidCartIds = [];
        if (userId) {
            const { data: myItems } = await supabase
                .from('cart_items')
                .select('cart_id, payment_status')
                .eq('user_id', userId);
                
            if (myItems && myItems.length > 0) {
                // Separate items that are paid vs pending
                const pendingCartIds = myItems.filter(i => i.payment_status === 'pending').map(i => i.cart_id);
                paidCartIds = myItems.filter(i => i.payment_status === 'paid' || i.payment_status === 'success').map(i => i.cart_id);

                if (pendingCartIds.length > 0) {
                    const { data: myCarts } = await supabase
                        .from('group_carts')
                        .select('*, creator:user_profiles(full_name)')
                        .in('id', pendingCartIds)
                        .in('status', ['open', 'checkout_pending'])
                        .eq('pool_name', poolName)
                        .eq('platform', platform)
                        .gte('created_at', todayStr)
                        .order('created_at', { ascending: false })
                        .limit(1);

                if (myCarts && myCarts.length > 0) {
                    setActiveCart(myCarts[0]);
                    fetchCartItems(myCarts[0].id);
                    setIsParticipating(true);
                    setLocalCart([]);
                    // Fetch current fee info
                    fetchFee(myCarts[0].total_amount || 0);
                    return;
                }
                }
            }
        }

        // 2. Not participating — find OPEN pool within 200m using GPS
        const loc = locationRef.current;
        setLocationMissing(!loc?.lat || !loc?.lng);
        // A pool stays joinable through its buffer — that overtime exists
        // precisely so late joiners can push it over the free-delivery
        // threshold. Widen the filter by the buffer and do the exact check
        // below, which also covers rows written before buffer_expires_at
        // existed.
        let query = supabase
            .from('group_carts')
            .select('*, creator:user_profiles(full_name)')
            .eq('status', 'open')
            .eq('pool_name', poolName)
            .eq('platform', platform)
            .gte('created_at', todayStr)
            .gte('expires_at', new Date(new Date().getTime() - POOL_BUFFER_MS).toISOString());

        // Exclude carts where the user has already paid
        if (paidCartIds.length > 0) {
            paidCartIds.forEach(id => {
                query = query.neq('id', id);
            });
        }

        if (loc && loc.lat && loc.lng) {
            // GPS proximity: filter within ~200m bounding box
            // 0.002 degrees ≈ 222 meters at equator
            const RADIUS = 0.002;
            query = query
                .gte('latitude', loc.lat - RADIUS)
                .lte('latitude', loc.lat + RADIUS)
                .gte('longitude', loc.lng - RADIUS)
                .lte('longitude', loc.lng + RADIUS);
        } else if (hallId) {
            // Fallback to hall-based if no GPS
            query = query.eq('hall_id', hallId);
        }

        const { data: openCarts } = await query.order('created_at', { ascending: false }).limit(1);
            
        if (openCarts && openCarts.length > 0) {
            // If GPS is available, do precise Haversine check
            let matchedCart = openCarts[0];

            const hardDeadline = poolHardDeadline(matchedCart);
            if (hardDeadline && hardDeadline <= new Date()) {
                setActiveCart(null);
                setCartItems([]);
                setIsParticipating(false);
                return;
            }
            if (loc && loc.lat && loc.lng && matchedCart.latitude && matchedCart.longitude) {
                const distance = haversineDistance(loc.lat, loc.lng, matchedCart.latitude, matchedCart.longitude);
                if (distance > 200) {
                    // Outside 200m — no nearby pool
                    setActiveCart(null);
                    setCartItems([]);
                    setIsParticipating(false);
                    return;
                }
            }
            setActiveCart(matchedCart);
            fetchCartItems(matchedCart.id);
            setIsParticipating(false);
            fetchFee(matchedCart.total_amount || 0);
        } else {
            setActiveCart(null);
            setCartItems([]);
            setIsParticipating(false);
        }
    }, [activeSlot, userId, hallId, poolName, platform, fetchFee]);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await fetchProducts();
            await fetchActiveCart();
            // Fetch initial fee for empty cart
            await fetchFee(0);
            setLoading(false);
        };
        init();
    }, [fetchProducts, fetchActiveCart, fetchFee]);

    // Real-time: listen for group_carts / cart_items changes
    useEffect(() => {
        const channel = supabase.channel(`cart_realtime_${platform}_v4`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'group_carts' }, (payload) => {
                if (payload.new && payload.new.pool_name === poolName && payload.new.platform === platform) {
                    if (payload.new.status === 'ordered') {
                        setActiveCart(prev => prev && prev.id === payload.new.id ? { ...prev, status: 'ordered' } : prev);
                    } else {
                        fetchActiveCart();
                    }
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'cart_items' }, () => {
                setActiveCart(prev => {
                    if (prev) fetchCartItems(prev.id);
                    return prev;
                });
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [poolName, platform, fetchActiveCart]);


    // ══════════════════════════════════════════════════════════
    // PHASE 1: LOCAL CART ACTIONS
    // ══════════════════════════════════════════════════════════
    const addToLocalCart = (product) => {
        setLocalCart(prev => {
            const existing = prev.find(i => i.product.id === product.id);
            if (existing) {
                return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { product, quantity: 1 }];
        });
    };

    const removeFromLocalCart = (product) => {
        setLocalCart(prev => {
            const existing = prev.find(i => i.product.id === product.id);
            if (existing && existing.quantity > 1) {
                return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity - 1 } : i);
            }
            return prev.filter(i => i.product.id !== product.id);
        });
    };

    const startPool = async () => {
        if (!userId || localCart.length === 0) return;

        const loc = locationRef.current;

        // Proximity IS the matching mechanism for these pools. A cart saved
        // without coordinates can never be found by anyone standing next to
        // it — it silently becomes a pool of one. Refuse rather than create a
        // pool nobody can join.
        if (!loc?.lat || !loc?.lng) {
            return { error: 'NO_LOCATION' };
        }
        // Two-phase clock: a 15-minute window users see, then a 10-minute
        // buffer before the pool actually closes. See utils/poolTimer.js.
        const startedAt = new Date().getTime();
        const expiresAt = new Date(startedAt + POOL_WINDOW_MS);
        const bufferExpiresAt = new Date(startedAt + POOL_WINDOW_MS + POOL_BUFFER_MS);

        const insertObj = {
            creator_id: userId,
            time_slot: activeSlot,
            pool_name: poolName,
            platform: platform,
            status: 'open',
            target_amount: feeInfo.free_delivery_threshold || 199,
            expires_at: expiresAt.toISOString(),
            buffer_expires_at: bufferExpiresAt.toISOString(),
            delivery_fee: feeInfo.delivery_fee || 30,
            platform_fee: feeInfo.platform_fee || 5,
            latitude: loc?.lat || null,
            longitude: loc?.lng || null
        };
        if (hallId) insertObj.hall_id = hallId;

        let { data: cartData, error: cartErr } = await supabase.from('group_carts').insert(insertObj).select().single();

        // buffer_expires_at arrives with supabase_pool_buffer_timer.sql. Until
        // that migration runs, retry without it — poolHardDeadline() derives
        // the same deadline from expires_at, so the timer still behaves.
        if (cartErr && /buffer_expires_at/.test(cartErr.message || '')) {
            console.warn('buffer_expires_at column missing — run supabase_pool_buffer_timer.sql. Falling back.');
            const legacyInsert = { ...insertObj };
            delete legacyInsert.buffer_expires_at;
            ({ data: cartData, error: cartErr } = await supabase.from('group_carts').insert(legacyInsert).select().single());
        }

        if (cartErr) { alert("Failed to start pool: " + cartErr.message); return; }

        await _commitLocalCartToPool(cartData.id);
        
        await supabase.from('drops_activity_logs').insert({
            user_id: userId,
            action_type: 'CREATE_POOL',
            description: `You created a new ${poolName}`,
            latitude: loc?.lat || null,
            longitude: loc?.lng || null
        });
        
        // Send proximity notifications
        if (loc?.lat && loc?.lng) {
            try {
                await fetch('/api/notifications/send-nearby', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        latitude: loc.lat,
                        longitude: loc.lng,
                        platform,
                        creator_id: userId,
                        pool_id: cartData.id
                    })
                });
            } catch (e) {
                console.error('Failed to send nearby notifications:', e);
            }
        }

        // Announce the pool in the WhatsApp group for the hall it was started
        // from. Deliberately not awaited: the broadcast spaces its sends out
        // over seconds, and the creator should be in their pool long before it
        // finishes — a WhatsApp outage must never look like a slow pool.
        fetch('/api/whatsapp/notify-pool', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pool_id: cartData.id,
                platform,
                pool_name: poolName,
                hall_id: hallId || null,
                creator_id: userId
            })
        }).catch(e => console.error('Failed to send WhatsApp group notification:', e));

        fetchActiveCart();
    };

    const joinPool = async () => {
        if (!userId || !activeCart || localCart.length === 0) return;
        await _commitLocalCartToPool(activeCart.id);
        
        const loc = locationRef.current;
        await supabase.from('drops_activity_logs').insert({
            user_id: userId,
            action_type: 'JOIN_POOL',
            description: `You joined a ${poolName}`,
            latitude: loc?.lat || null,
            longitude: loc?.lng || null
        });
        
        fetchActiveCart();
    };

    const _commitLocalCartToPool = async (cartId) => {
        const itemsToInsert = localCart.map(item => ({
            cart_id: cartId,
            user_id: userId,
            product_id: item.product.id,
            quantity: item.quantity,
            price_at_time: item.product.price,
            payment_status: 'pending'
        }));
        const { error } = await supabase.from('cart_items').insert(itemsToInsert);
        if (error) console.error("Error committing items:", error);
    };


    // ══════════════════════════════════════════════════════════
    // PHASE 2: PARTICIPATING POOL ACTIONS
    // ══════════════════════════════════════════════════════════
    const addToPool = async (product) => {
        if (!userId || !activeCart || !isParticipating) return;
        
        const existingItem = cartItems.find(item => item.product_id === product.id && item.user_id === userId && item.payment_status === 'pending');
        
        if (existingItem) {
            await supabase.from('cart_items').update({ quantity: existingItem.quantity + 1 }).eq('id', existingItem.id);
        } else {
            await supabase.from('cart_items').insert({
                cart_id: activeCart.id,
                user_id: userId,
                product_id: product.id,
                quantity: 1,
                price_at_time: product.price,
                payment_status: 'pending'
            });
        }
    };

    const removeFromPool = async (product) => {
        if (!userId || !activeCart || !isParticipating) return;

        const existingItem = cartItems.find(item => item.product_id === product.id && item.user_id === userId && item.payment_status === 'pending');
        
        if (existingItem) {
            if (existingItem.quantity > 1) {
                await supabase.from('cart_items').update({ quantity: existingItem.quantity - 1 }).eq('id', existingItem.id);
            } else {
                await supabase.from('cart_items').delete().eq('id', existingItem.id);
            }
        }
    };

    const leavePool = async () => {
        if (!userId || !activeCart || !isParticipating) return;
        
        // Check the database directly to prevent accidental deletion if local state is stale
        const { data: paidItemsCheck } = await supabase
            .from('cart_items')
            .select('id')
            .eq('cart_id', activeCart.id)
            .eq('user_id', userId)
            .eq('payment_status', 'paid')
            .limit(1);

        if (paidItemsCheck && paidItemsCheck.length > 0) {
            return { error: 'You have already paid for your items. You cannot leave the pool.' };
        }
        
        // Delete all items for this user in this cart
        await supabase.from('cart_items').delete().eq('cart_id', activeCart.id).eq('user_id', userId);
        
        // Check if pool is now empty
        const { count } = await supabase.from('cart_items').select('*', { count: 'exact', head: true }).eq('cart_id', activeCart.id);
        if (count === 0) {
            await supabase.from('group_carts').update({ status: 'cancelled' }).eq('id', activeCart.id);
        }
        
        const loc = locationRef.current;
        await supabase.from('drops_activity_logs').insert({
            user_id: userId,
            action_type: 'LEAVE_POOL',
            description: `You left a ${poolName}`,
            latitude: loc?.lat || null,
            longitude: loc?.lng || null
        });
        
        setIsParticipating(false);
        setActiveCart(null);
        setCartItems([]);
        fetchActiveCart();
        return { success: true };
    };

    // Pay for pending items — Real Cashfree Payment Gateway
    const handlePayment = async (customerPhone, customerEmail, customerName) => {
        if (!activeCart || !userId) return false;

        const myPendingItems = cartItems.filter(i => i.user_id === userId && i.payment_status === 'pending');
        if (myPendingItems.length === 0) return false;

        if (!customerPhone) {
            return { error: 'Phone number is required for payment.' };
        }

        const goodsTotal = myPendingItems.reduce((sum, item) => sum + (item.price_at_time * item.quantity), 0);
        
        // Proportional split: use ALL cart items (pending + paid) as denominator
        // so each user's share stays fixed regardless of who pays first
        const poolTotal = cartItems.reduce((sum, item) => sum + (item.price_at_time * item.quantity), 0);
        const myProportion = poolTotal > 0 ? (goodsTotal / poolTotal) : 1;
        
        // Delivery + platform fees: split proportionally by order value
        const deliveryShare = Math.ceil((activeCart.delivery_fee || feeInfo.delivery_fee || 25) * myProportion);
        const platformShare = Math.ceil((activeCart.platform_fee || feeInfo.platform_fee || 5) * myProportion);
        
        // Savify fee: flat ₹1 per user (not proportional, regardless of pool size)
        const savifyFee = 1;
        
        const totalToPay = goodsTotal + deliveryShare + platformShare + savifyFee;

        try {
            const redirectBase = window.location.origin;

            // 1. Create order on backend
            const res = await fetch(`${redirectBase}/api/payment/cashfree/create-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: totalToPay,
                    user_id: userId,
                    context_type: 'cart',
                    context_id: activeCart.id,
                    customer_phone: customerPhone,
                    customer_email: customerEmail || '',
                    customer_name: customerName || 'Savify User'
                })
            });
            const text = await res.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch {
                // The payment route returned markup instead of JSON (routing or a
                // cold start). Report it plainly rather than dumping HTML at the user.
                console.error(`Payment API returned non-JSON (${res.status}):`, text.slice(0, 200));
                return { error: 'The payment service is not responding correctly. Please try again in a moment.' };
            }

            // Simulation mode: hand the order back so the caller can settle it
            // through the in-app prompt instead of a gateway redirect.
            if (data.simulated) {
                return { simulated: true, orderId: data.order_id, amount: data.amount ?? totalToPay };
            }

            if (data.payment_session_id) {
                // 2. Trigger Cashfree checkout (redirect mode)
                // Open the SDK on the same stack the session was minted on;
                // a sandbox session in production mode is rejected outright.
                const cashfree = window.Cashfree({ mode: data.cashfree_env === 'sandbox' ? 'sandbox' : 'production' });
                const checkoutResult = await cashfree.checkout({
                    paymentSessionId: data.payment_session_id,
                    redirectTarget: "_self"
                });

                // If we reach here, it means redirect failed or was cancelled
                if (checkoutResult && checkoutResult.error) {
                    console.error('Cashfree checkout error:', checkoutResult.error);
                    return { error: checkoutResult.error.message || 'Payment was cancelled.' };
                }

                return { redirecting: true };
            } else {
                console.error('Payment init error:', data.error);
                return { error: data.error || 'Payment initialization failed.' };
            }
        } catch (err) {
            console.error('Payment Init Error:', err);
            return { error: err.message || 'Network error during payment.' };
        }
    };

    return {
        products,
        activeCart,
        cartItems,
        loading,
        localCart,
        isParticipating,
        locationMissing,
        feeInfo,
        
        // Phase 1 Exposed
        addToLocalCart,
        removeFromLocalCart,
        startPool,
        joinPool,
        
        // Phase 2 Exposed
        addToPool,
        removeFromPool,
        leavePool,
        handlePayment
    };
}

// ══════════════════════════════════════════════════════════════
// Haversine distance calculation (meters)
// ══════════════════════════════════════════════════════════════
function haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const toRad = (deg) => deg * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
}
