import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';

export function usePools(userId, userLocation) {
    const [poolTypes, setPoolTypes] = useState([]);
    const [slots, setSlots] = useState([]);
    const [members, setMembers] = useState([]);
    
    // Custom Pools
    const [customPools, setCustomPools] = useState([]);
    const [customMembers, setCustomMembers] = useState([]);
    const [activities, setActivities] = useState([]);
    
    // Commerce Cart Contributors (for Timeslot pools like Blinkit)
    const [cartContributors, setCartContributors] = useState({});
    
    const [loading, setLoading] = useState(true);

    const today = new Date().toISOString().split('T')[0];

    const logUserActivity = async (actionType, description) => {
        if (!userId) return;
        const insertData = {
            user_id: userId,
            action_type: actionType,
            description: description
        };
        // Attach location if available
        if (userLocation?.lat && userLocation?.lng) {
            insertData.latitude = userLocation.lat;
            insertData.longitude = userLocation.lng;
        }
        await supabase.from('drops_activity_logs').insert(insertData);
        await fetchUserActivity();
    };

    const fetchUserActivity = useCallback(async () => {
        const { data } = await supabase
            .from('drops_activity_logs')
            .select('*, user:user_profiles(username, full_name)')
            .order('created_at', { ascending: false })
            .limit(1000);
        if (data) setActivities(data);
    }, []);

    // --- Fixed Pools ---
    const fetchPoolTypes = useCallback(async () => {
        const { data } = await supabase.from('pool_types').select('*').order('created_at');
        if (data) setPoolTypes(data);
    }, []);

    const fetchSlots = useCallback(async () => {
        // Ensure today's slots exist before fetching
        try {
            await supabase.rpc('generate_daily_pool_slots');
        } catch (rpcErr) {
            console.warn('generate_daily_pool_slots RPC failed (non-fatal):', rpcErr);
        }
        
        // Fetch the two pool modes separately and let Postgres do the filtering.
        // A single `slot_date=today OR status=running` query matches thousands of
        // rows and gets cut off at PostgREST's 1000-row cap — and because it is
        // ordered by slot_start, the "All Day" headcount slots sort last and were
        // dropped entirely, which is why every subscription plate read 0/N.
        const [headcountRes, timeslotRes] = await Promise.all([
            // Live headcount pools, plus any completed today so the UI can show
            // an "ended" state until a fresh pool takes over.
            supabase.from('pool_slots')
                .select('*, pool_types!inner(*)')
                .eq('pool_types.pool_mode', 'headcount')
                .or(`status.eq.running,slot_date.eq.${today}`),
            // Timeslot windows are tied to the clock, so only today's matter.
            supabase.from('pool_slots')
                .select('*, pool_types!inner(*)')
                .eq('pool_types.pool_mode', 'timeslot')
                .eq('slot_date', today)
                .order('slot_start')
        ]);

        if (headcountRes.error) console.error('Error fetching headcount pool slots:', headcountRes.error);
        if (timeslotRes.error) console.error('Error fetching timeslot pool slots:', timeslotRes.error);
        if (headcountRes.error && timeslotRes.error) return;

        setSlots([...(timeslotRes.data || []), ...(headcountRes.data || [])]);
    }, [today]);

    const fetchMembers = useCallback(async () => {
        const slotIds = slots.map(s => s.id);
        if (slotIds.length === 0) return;
        
        try {
            let allMembers = [];
            // Chunk slotIds into batches of 30 to prevent HTTP 414 URI Too Long errors
            for (let i = 0; i < slotIds.length; i += 30) {
                const chunk = slotIds.slice(i, i + 30);
                const { data, error } = await supabase.from('pool_members').select('*').in('pool_slot_id', chunk);
                if (data) allMembers = [...allMembers, ...data];
            }
            setMembers(allMembers);
        } catch (e) {
            console.error("Failed to fetch members in chunks:", e);
        }
    }, [slots]);

    // Normalize a time_slot string so all dash variants match
    const normalizeSlotKey = (str) => str?.replace(/[\u2013\u2014]/g, '-') || '';

    const fetchCartContributors = useCallback(async () => {
        const startOfDay = new Date();
        startOfDay.setHours(0,0,0,0);
        const { data: carts } = await supabase.from('group_carts').select('id, time_slot, status').gte('created_at', startOfDay.toISOString()).in('status', ['open', 'ordered', 'done', 'completed']);
        if (!carts || carts.length === 0) {
            setCartContributors({});
            return;
        }
        
        const cartIds = carts.map(c => c.id);
        const { data: items } = await supabase.from('cart_items').select('cart_id, user_id').in('cart_id', cartIds).eq('payment_status', 'paid');
        if (!items) { setCartContributors({}); return; }

        const slotUsers = {};
        carts.forEach(c => {
            const key = normalizeSlotKey(c.time_slot);
            const itemUsers = items.filter(i => i.cart_id === c.id).map(i => i.user_id);
            const uniqueUsers = [...new Set(itemUsers)];
            if (uniqueUsers.length > 0) {
                slotUsers[key] = (slotUsers[key] || []).concat(uniqueUsers);
            }
        });

        for (const slot in slotUsers) {
            slotUsers[slot] = [...new Set(slotUsers[slot])];
        }
        
        setCartContributors(slotUsers);
    }, []);

    // A member only holds a seat once their payment landed. Free pools and
    // legacy rows default to 'paid' in the DB, so they still count.
    const holdsSeat = (m) => (m.payment_status || 'paid') === 'paid';

    const joinSlot = useCallback(async (slotId, displayName) => {
        if (!userId) return { error: 'Not logged in' };
        const targetSlot = slots.find(s => s.id === slotId);

        if (targetSlot?.status === 'completed') {
            return { error: 'This pool has already been completed' };
        }

        // For headcount pools, check if max_members reached
        if (targetSlot?.pool_types?.pool_mode === 'headcount' && targetSlot?.pool_types?.max_members) {
            const currentMembers = members.filter(m => m.pool_slot_id === slotId && holdsSeat(m));
            if (currentMembers.length >= targetSlot.pool_types.max_members) {
                return { error: 'Pool is full' };
            }
        }

        // Check if user is already in this slot
        const alreadyIn = members.some(m => m.pool_slot_id === slotId && m.user_id === userId);
        if (alreadyIn) {
            return { error: 'Already in this pool' };
        }

        // Insert pool membership
        const { error } = await supabase.from('pool_members').insert({
            pool_slot_id: slotId,
            user_id: userId,
            display_name: displayName || 'Anonymous'
        });

        if (error) {
            console.error('Error joining pool:', error);
            return { error: error.message || 'Failed to join pool' };
        }

        await fetchMembers();
        const poolName = targetSlot?.pool_types?.name || 'a Pool';
        await logUserActivity('JOIN_POOL', `You joined ${poolName}`);
        return { success: true };
    }, [userId, slots, members, fetchMembers]);

    const leaveSlot = useCallback(async (slotId) => {
        if (!userId) return;
        const targetSlot = slots.find(s => s.id === slotId);
        await supabase.from('pool_members').delete().eq('pool_slot_id', slotId).eq('user_id', userId);
        await fetchMembers();
        const poolName = targetSlot?.pool_types?.name || 'a Live Pool';
        const slotLabel = targetSlot?.slot_start === 'All Day' ? '' : ` for ${targetSlot?.slot_start}`;
        await logUserActivity('LEAVE_POOL', `You left ${poolName}${slotLabel}`);
    }, [userId, fetchMembers, slots]);

    // Only seats that are actually paid for — an abandoned checkout must not
    // make a plate look occupied.
    const getMembersForSlot = useCallback((slotId) => {
        return members.filter(m => m.pool_slot_id === slotId && holdsSeat(m));
    }, [members]);

    const isUserInSlot = useCallback((slotId) => {
        return members.some(m => m.pool_slot_id === slotId && m.user_id === userId && holdsSeat(m));
    }, [members, userId]);

    // Helper: get the live slot for a headcount pool. Once a pool fills up the
    // DB completes it and opens a fresh one, so this flips back to an empty pool.
    const getDailySlotForPool = useCallback((poolTypeId) => {
        const byNewest = (a, b) => new Date(b.created_at) - new Date(a.created_at);
        const poolSlots = slots.filter(s => s.pool_type_id === poolTypeId && s.slot_start === 'All Day');

        const running = poolSlots.filter(s => s.status === 'running').sort(byNewest);
        if (running.length > 0) return running[0];

        // No live pool yet (the DB rollover has not landed) — fall back to the
        // most recent one so the card can still render an ended state.
        const completed = poolSlots.sort(byNewest);
        return completed.length > 0 ? completed[0] : null;
    }, [slots]);

    // --- Custom Pools ---
    const fetchCustomPools = useCallback(async () => {
        // Fetch custom pools from the last 24 hours
        const yesterday = new Date();
        yesterday.setHours(yesterday.getHours() - 24);

        const { data } = await supabase
            .from('custom_pools')
            .select('*, creator:user_profiles(username, full_name)')
            .gte('created_at', yesterday.toISOString())
            .order('closes_at', { ascending: false });
        if (data) setCustomPools(data);
    }, []);

    const fetchCustomMembers = useCallback(async () => {
        const poolIds = customPools.map(p => p.id);
        if (poolIds.length === 0) return;
        const { data } = await supabase
            .from('custom_pool_members')
            .select('*, user:user_profiles(username, full_name)')
            .in('custom_pool_id', poolIds);
        if (data) setCustomMembers(data);
    }, [customPools]);

    const createCustomPool = useCallback(async (poolData, userProfileId) => {
        if (!userId || !userProfileId) return { error: 'Not fully registered' };
        
        // Calculate closes_at
        const closesAt = new Date();
        closesAt.setHours(closesAt.getHours() + poolData.durationHours);

        const { data, error } = await supabase.from('custom_pools').insert({
            title: poolData.title,
            description: poolData.description,
            emoji: poolData.emoji,
            closes_at: closesAt.toISOString(),
            creator_id: userProfileId
        }).select('id').single();

        if (!error && data) {
            await joinCustomPool(data.id, userProfileId);
            await fetchCustomPools();
            await logUserActivity('CREATE_POOL', `You created a new drop: ${poolData.title}`);
        }
        return { error };
    }, [userId, fetchCustomPools]);

    const joinCustomPool = useCallback(async (customPoolId, userProfileId) => {
        if (!userId || !userProfileId) return { error: 'Not fully registered' };
        const { error } = await supabase.from('custom_pool_members').insert({
            custom_pool_id: customPoolId,
            user_id: userProfileId
        });
        if (!error) {
            await fetchCustomMembers();
            const pool = customPools.find(p => p.id === customPoolId);
            const title = pool ? pool.title : 'a custom drop';
            await logUserActivity('JOIN_POOL', `You joined ${title}`);
        }
        return { error };
    }, [userId, fetchCustomMembers, customPools]);

    const leaveCustomPool = useCallback(async (customPoolId, userProfileId) => {
        if (!userId || !userProfileId) return;
        await supabase.from('custom_pool_members').delete()
            .eq('custom_pool_id', customPoolId)
            .eq('user_id', userProfileId);
        await fetchCustomMembers();
        const pool = customPools.find(p => p.id === customPoolId);
        const title = pool ? pool.title : 'a custom drop';
        await logUserActivity('LEAVE_POOL', `You left ${title}`);
    }, [userId, fetchCustomMembers, customPools]);

    const endCustomPool = useCallback(async (customPoolId) => {
        if (!userId) return { error: 'Not fully registered' };
        const { error } = await supabase.from('custom_pools')
            .update({ status: 'completed' })
            .eq('id', customPoolId)
            .eq('creator_id', userId);
        if (!error) {
            await fetchCustomPools();
            const pool = customPools.find(p => p.id === customPoolId);
            const title = pool ? pool.title : 'a custom drop';
            await logUserActivity('UPDATE_POOL', `You ended ${title}`);
        }
        return { error };
    }, [userId, fetchCustomPools, customPools]);

    const getMembersForCustomPool = useCallback((poolId) => {
        return customMembers.filter(m => m.custom_pool_id === poolId);
    }, [customMembers]);

    const isUserInCustomPool = useCallback((poolId, userProfileId) => {
        return customMembers.some(m => m.custom_pool_id === poolId && m.user_id === userProfileId);
    }, [customMembers]);

    // Initial fetch
    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                await fetchPoolTypes();
                await fetchSlots();
                await fetchCustomPools();
                await fetchUserActivity();
                await fetchCartContributors();
            } catch (err) {
                console.error('Error initializing pools:', err);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [fetchPoolTypes, fetchSlots, fetchCustomPools, fetchUserActivity, fetchCartContributors]);

    useEffect(() => {
        if (slots.length > 0) fetchMembers();
    }, [slots, fetchMembers]);

    useEffect(() => {
        if (customPools.length > 0) fetchCustomMembers();
    }, [customPools, fetchCustomMembers]);

    // Real-time subscriptions
    useEffect(() => {
        const channel = supabase.channel('pools_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pool_slots' }, () => { fetchSlots(); })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pool_members' }, () => { fetchMembers(); })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_pools' }, () => { fetchCustomPools(); })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_pool_members' }, () => { fetchCustomMembers(); })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'drops_activity_logs' }, () => { fetchUserActivity(); })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'cart_items' }, () => { fetchCartContributors(); })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'group_carts' }, () => { fetchCartContributors(); })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [fetchMembers, fetchCustomPools, fetchCustomMembers, fetchUserActivity, fetchCartContributors]);

    return {
        // Fixed
        poolTypes, slots, members, loading, joinSlot, leaveSlot, getMembersForSlot, isUserInSlot,
        getDailySlotForPool, cartContributors,
        // Custom
        customPools, customMembers, createCustomPool, joinCustomPool, leaveCustomPool, endCustomPool, getMembersForCustomPool, isUserInCustomPool,
        // Activity
        activities,
        refetchMembers: fetchMembers,
        refetch: async () => { await fetchSlots(); await fetchMembers(); await fetchCustomPools(); await fetchUserActivity(); await fetchCartContributors(); }
    };
}
