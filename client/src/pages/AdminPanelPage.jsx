import React, { useState, useEffect, useMemo } from 'react';
import './AdminPanelPage.css';
import { supabase } from '../config/supabase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { format, subDays, isSameDay, startOfDay } from 'date-fns';

const ADMIN_EMAILS = ['bhowmikahuja7@gmail.com', 'anantbhaidav@gmail.com'];
const SESSION_KEY = 'savify_admin_session';
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

// Premium Apple-style color palette
const COLORS = {
    primary: '#30D158', // iOS Green
    secondary: '#0A84FF', // iOS Blue
    accent: '#BF5AF2', // iOS Purple
    warning: '#FF9F0A', // iOS Orange
    danger: '#FF453A', // iOS Red
    background: '#000000',
    surface: '#111111',
    surfaceHover: '#1c1c1e',
    border: '#2c2c2e',
    text: '#ffffff',
    textMuted: '#8e8e93'
};

const CHART_COLORS = [COLORS.primary, COLORS.secondary, COLORS.accent, COLORS.warning, COLORS.danger];

// Subscription tabs in "Orders & Subscriptions". `match` is tested against the
// lower-cased pool type name; every platform sold in the app needs an entry here
// or its paid orders would be invisible to the admin.
const SUBSCRIPTION_TABS = [
    { label: 'All Subs', icon: 'layer-group', match: null },
    { label: 'Netflix', match: ['netflix'] },
    { label: 'Spotify', match: ['spotify'] },
    { label: 'Prime Video', match: ['prime video'] },
    { label: 'Jio Hotstar', match: ['hotstar'] },
    { label: 'Swiggy One', match: ['swiggy'] },
    { label: 'Zomato Gold', match: ['zomato'] },
    { label: 'Udemy', match: ['udemy'] },
    { label: 'Coursera', match: ['coursera'] },
    { label: 'YouTube', match: ['youtube'] },
    { label: 'LinkedIn', match: ['linkedin'] },
    { label: 'Jio', match: ['jio postpaid'] },
    { label: 'Airtel', match: ['airtel'] },
    { label: 'ChatGPT', match: ['chatgpt'] },
    { label: 'Claude', match: ['claude'] },
    { label: 'Gemini', match: ['google ai', 'gemini'] }
];

export default function AdminPanelPage() {
    const [step, setStep] = useState('email'); // 'email', 'otp', 'dashboard'
    const [adminEmail, setAdminEmail] = useState(''); // tracks which admin is logging in
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Layout state
    const [activeView, setActiveView] = useState('metrics'); // 'metrics', 'crm', 'pools', 'revenue', 'transactions', 'fulfillment'
    const [fulfilledFilter, setFulfilledFilter] = useState('all'); // 'collecting', 'filled', 'completed', 'all'
    
    // Data states
    const [dashboardLoading, setDashboardLoading] = useState(true);
    const [users, setUsers] = useState([]);
    const [blinkitOrders, setBlinkitOrders] = useState([]);
    const [poolAddresses, setPoolAddresses] = useState({});
    const [headcountPools, setHeadcountPools] = useState([]);
    const [revenueData, setRevenueData] = useState([]);
    const [phonepeTxns, setPhonepeTxns] = useState([]);
    const [poolTypes, setPoolTypes] = useState([]);

    // Sub-states
    const [poolTab, setPoolTab] = useState('Blinkit');
    // Fulfilled orders leave the working queue by default; this brings them back.
    const [showFulfilled, setShowFulfilled] = useState(false);
    const [archiveSort, setArchiveSort] = useState('newest'); // 'newest' | 'oldest'
    const [archivePlatform, setArchivePlatform] = useState('All Subs');
    const [expandedOrder, setExpandedOrder] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedUser, setExpandedUser] = useState(null);

    // Form states for Revenue
    const [revAmount, setRevAmount] = useState('');
    const [revCategory, setRevCategory] = useState('Platform Fee');

    // --- 1. SESSION MANAGEMENT ---
    useEffect(() => {
        const checkSession = () => {
            const sessionStr = localStorage.getItem(SESSION_KEY);
            if (sessionStr) {
                try {
                    const session = JSON.parse(sessionStr);
                    if (ADMIN_EMAILS.includes(session.email)) {
                        const timeElapsed = Date.now() - session.lastActivity;
                        if (timeElapsed < TWENTY_FOUR_HOURS) {
                            if (step !== 'dashboard') setStep('dashboard');
                        } else {
                            handleLogout();
                        }
                    }
                } catch (e) {
                    handleLogout();
                }
            }
        };
        checkSession();
        const interval = setInterval(checkSession, 60000);
        return () => clearInterval(interval);
    }, []);

    const updateActivity = () => {
        const now = Date.now();
        const sessionStr = localStorage.getItem(SESSION_KEY);
        if (sessionStr) {
            try {
                const session = JSON.parse(sessionStr);
                if (now - session.lastActivity > 10000) { 
                    localStorage.setItem(SESSION_KEY, JSON.stringify({ email: session.email, lastActivity: now }));
                }
            } catch (e) {}
        } else {
            localStorage.setItem(SESSION_KEY, JSON.stringify({ email: adminEmail || ADMIN_EMAILS[0], lastActivity: now }));
        }
    };

    useEffect(() => {
        if (step !== 'dashboard') return;
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        const handleInteraction = () => updateActivity();
        events.forEach(e => window.addEventListener(e, handleInteraction));
        return () => events.forEach(e => window.removeEventListener(e, handleInteraction));
    }, [step]);

    // --- 2. AUTH FLOW ---
    const handleSendOtp = async (e) => {
        e.preventDefault();
        setError('');
        const enteredEmail = email.trim().toLowerCase();
        if (!ADMIN_EMAILS.includes(enteredEmail)) {
            setError('Unauthorized Security Clearance.');
            return;
        }
        setAdminEmail(enteredEmail);
        setLoading(true);
        const { error } = await supabase.auth.signInWithOtp({ email: enteredEmail });
        if (error) setError(error.message);
        else setStep('otp');
        setLoading(false);
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const { data, error } = await supabase.auth.verifyOtp({ email: adminEmail, token: otp.trim(), type: 'email' });
        if (error) {
            setError(error.message);
        } else if (data?.session) {
            updateActivity();
            setStep('dashboard');
        } else {
            setError('Verification failed.');
        }
        setLoading(false);
    };

    const handleLogout = () => {
        localStorage.removeItem(SESSION_KEY);
        setStep('email');
        setEmail('');
        setOtp('');
    };

    // --- 3. DATA FETCHING ---
    useEffect(() => {
        if (step === 'dashboard') {
            fetchAllData();
        }
    }, [step]);

    const fetchAllData = async () => {
        setDashboardLoading(true);
        
        try {
            // 0. Pool Types
            const { data: pt } = await supabase.from('pool_types').select('*');
            if (pt) setPoolTypes(pt);

            // 1. Users (with joined tables for deeper insights if possible, else raw)
            const { data: userData } = await supabase.from('user_profiles').select('*, college:new_colleges(name), hall:new_halls(name)').order('created_at', { ascending: false });
            if (userData) setUsers(userData);

            // 2. Blinkit Orders (Both pending and done for metrics) - last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const { data: blinkitData } = await supabase
                .from('group_carts')
                .select('id, pool_name, platform, time_slot, status, total_amount, delivery_fee, platform_fee, latitude, longitude, created_at, hall:new_halls(name), creator:user_profiles(full_name, mobile_number), items:cart_items(id, quantity, price_at_time, payment_status, product:products(name, image_url), user_id, user:user_profiles(full_name, mobile_number, email, hall:new_halls(name))), payments:cart_payments(user_id, amount_paid, payment_status)')
                .in('status', ['ordered', 'done'])
                .gte('created_at', thirtyDaysAgo.toISOString())
                .order('created_at', { ascending: false });
            if (blinkitData) setBlinkitOrders(blinkitData);

            // pool_members.user_id and phonepe_transactions.user_id both reference
            // auth.users, NOT user_profiles, so PostgREST cannot embed a profile —
            // asking it to 400s the whole query. Stitch the profile in from the
            // user list we already loaded above instead.
            const profileById = new Map((userData || []).map(u => [u.id, u]));
            const attachUser = (row) => ({ ...row, user: profileById.get(row.user_id) || null });

            // 3. Headcount Orders (fetch all pool_members for headcount pools directly)
            const { data: memberData, error: memberErr } = await supabase
                .from('pool_members')
                .select('id, user_id, joined_at, status, payment_status, paid_at, fulfilled_at, display_name, pool_slot:pool_slots(id, slot_date, slot_start, status, type:pool_types(name, max_members, pool_mode, split_price))')
                .order('joined_at', { ascending: false });
            if (memberErr) {
                console.error('Failed to load pool members:', memberErr);
            } else if (memberData) {
                setHeadcountPools(
                    memberData
                        .filter(m => m.pool_slot?.type?.pool_mode === 'headcount')
                        .map(attachUser)
                );
            }

            // 4. Revenue
            try {
                const { data: revData, error } = await supabase.from('admin_revenue').select('*').order('created_at', { ascending: true });
                if (!error && revData) setRevenueData(revData);
            } catch (e) {
                console.log("Revenue table might not exist yet.");
            }

            // 5. PhonePe / Cashfree Transactions
            try {
                const { data: txnData, error } = await supabase.from('phonepe_transactions')
                    .select('*')
                    .eq('status', 'SUCCESS')
                    .order('created_at', { ascending: false });
                if (error) console.error('Failed to load transactions:', error);
                if (!error && txnData) setPhonepeTxns(txnData.map(attachUser));
            } catch (e) {
                console.log("PhonePe txn table might not exist yet.");
            }

        } catch (err) {
            console.error("Error fetching admin data:", err);
        } finally {
            setDashboardLoading(false);
        }
    };

    // Real-time subscription: auto-refresh when orders change
    useEffect(() => {
        if (step !== 'dashboard') return;
        const adminChannel = supabase.channel('admin_orders_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'group_carts' }, () => {
                fetchAllData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'cart_payments' }, () => {
                fetchAllData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'phonepe_transactions' }, () => {
                fetchAllData();
            })
            // Paid seats and pool completions must land here without a manual refresh.
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pool_members' }, () => {
                fetchAllData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pool_slots' }, () => {
                fetchAllData();
            })
            .subscribe();
        return () => { supabase.removeChannel(adminChannel); };
    }, [step]);

    // --- ACTIONS ---
    const markBlinkitDone = async (cartId) => {
        if (!window.confirm("Mark this Blinkit order as fulfilled?")) return;
        await supabase.from('group_carts').update({ status: 'done' }).eq('id', cartId);
        fetchAllData();
    };

    // Closes the pool AND opens a fresh empty one for that plan, so the user-facing
    // plate drops back to 0/N instead of staying locked.
    const handleMarkCompleted = async (slotId) => {
        const { error } = await supabase.rpc('complete_pool_slot', { p_slot_id: slotId });
        if (error) {
            console.error('complete_pool_slot RPC failed, falling back:', error);
            const { error: updErr } = await supabase
                .from('pool_slots')
                .update({ status: 'completed' })
                .eq('id', slotId);
            if (updErr) {
                alert('Could not complete this pool: ' + updErr.message);
                return;
            }
        }
        fetchAllData(); // Refresh data
    };

    // pool_members has no UPDATE policy under RLS, so a direct update is silently
    // dropped (200 OK, zero rows changed). Go through the security-definer RPC and
    // confirm it actually changed a row before telling the admin it worked.
    const handleMarkMemberCompleted = async (memberId) => {
        if (!window.confirm("Mark this individual subscription order as fulfilled?")) return;

        const { data, error } = await supabase.rpc('fulfill_pool_member', { p_member_id: memberId });

        if (error) {
            alert('Could not mark as fulfilled: ' + error.message
                + '\n\nIf this mentions a missing function, run supabase_fulfillment_rpc.sql in the Supabase SQL editor.');
            return;
        }
        if (data === false) {
            alert('Nothing was updated — this order is either unpaid or no longer exists.');
            return;
        }

        // Drop it out of the queue immediately, then reconcile with the server.
        setHeadcountPools(prev => prev.map(m =>
            m.id === memberId ? { ...m, status: 'done', fulfilled_at: new Date().toISOString() } : m
        ));
        fetchAllData();
    };

    const handleUndoMemberCompleted = async (memberId) => {
        if (!window.confirm("Move this order back to the pending queue?")) return;
        const { error } = await supabase.rpc('unfulfill_pool_member', { p_member_id: memberId });
        if (error) {
            alert('Could not undo: ' + error.message);
            return;
        }
        setHeadcountPools(prev => prev.map(m =>
            m.id === memberId ? { ...m, status: 'pending', fulfilled_at: null } : m
        ));
        fetchAllData();
    };

    const clearHeadcountPool = async (slotId) => {
        if (!window.confirm("Reset this pool? This removes all members.")) return;
        await supabase.from('pool_members').delete().eq('pool_slot_id', slotId);
        fetchAllData();
    };

    const addManualRevenue = async (e) => {
        e.preventDefault();
        if (!revAmount || isNaN(revAmount)) return;
        const { error } = await supabase.from('admin_revenue').insert({
            amount: parseFloat(revAmount),
            category: revCategory,
            date: new Date().toISOString().split('T')[0]
        });
        if (error) {
            alert("Error adding revenue.");
            console.error(error);
        } else {
            setRevAmount('');
            fetchAllData();
        }
    };

    const fetchAddress = async (lat, lng, poolId) => {
        if (poolAddresses[poolId] || !lat || !lng) return;
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
            const data = await res.json();
            setPoolAddresses(prev => ({...prev, [poolId]: data.display_name || 'Address not found'}));
        } catch (e) {
            console.error(e);
            setPoolAddresses(prev => ({...prev, [poolId]: 'Error fetching address'}));
        }
    };

    // --- CSV EXPORT ---
    const exportToCSV = (data, filename) => {
        if (!data || data.length === 0) return;
        const keys = Object.keys(data[0]);
        const csvContent = "data:text/csv;charset=utf-8," 
            + keys.join(",") + "\n"
            + data.map(row => keys.map(k => {
                let cell = row[k] === null || row[k] === undefined ? '' : row[k];
                // stringify objects
                if (typeof cell === 'object') cell = JSON.stringify(cell);
                return `"${cell.toString().replace(/"/g, '""')}"`;
            }).join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- DERIVED METRICS ---
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    const signupsToday = users.filter(u => u.created_at && u.created_at.startsWith(todayStr)).length;
    const dauUsers = users.filter(u => new Date(u.created_at) > subDays(new Date(), 7));
    
    const pendingBlinkit = blinkitOrders.filter(o => o.status === 'ordered');
    const fulfilledBlinkit = blinkitOrders.filter(o => o.status === 'done');
    const totalBlinkitValue = blinkitOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const avgOrderValue = blinkitOrders.length > 0 ? (totalBlinkitValue / blinkitOrders.length).toFixed(0) : 0;

    const totalRevenue = revenueData.reduce((sum, r) => sum + r.amount, 0);
    const revenueToday = revenueData.filter(r => r.date === todayStr).reduce((sum, r) => sum + r.amount, 0);
    
    const successfulTxns = phonepeTxns.filter(t => t.status === 'SUCCESS');
    const totalTxnVolume = successfulTxns.reduce((sum, t) => sum + (t.amount || 0), 0);

    const safeFormat = (dateString, fmt) => {
        if (!dateString) return 'Unknown';
        try {
            const d = new Date(dateString);
            if (isNaN(d.getTime())) return 'Unknown';
            return format(d, fmt);
        } catch (e) {
            return 'Unknown';
        }
    };

    const generateChartData = () => {
        const data = [];
        for (let i = 6; i >= 0; i--) {
            const d = subDays(new Date(), i);
            const dateStr = format(d, 'yyyy-MM-dd');
            data.push({
                name: format(d, 'MMM dd'),
                signups: users.filter(u => u.created_at && u.created_at.startsWith(dateStr)).length,
                revenue: revenueData.filter(r => r.date === dateStr).reduce((sum, r) => sum + r.amount, 0)
            });
        }
        return data;
    };

    const chartData = generateChartData();

    // Calculate user specific deep metrics
    const getUserMetrics = (userId) => {
        const userTxns = successfulTxns.filter(t => t.user_id === userId);
        const totalSpent = userTxns.reduce((sum, t) => sum + t.amount, 0);
        
        let itemsOrdered = 0;
        blinkitOrders.forEach(cart => {
            cart.items.forEach(item => {
                if(item.user_id === userId) itemsOrdered += item.quantity;
            });
        });

        let poolsJoined = headcountPools.filter(m => m.user_id === userId).length;

        return { totalSpent, itemsOrdered, poolsJoined, txns: userTxns.length };
    };

    // Filtered lists
    const filteredUsers = users.filter(u => 
        (u.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.mobile_number || '').includes(searchQuery)
    );

    const activeHeadcountPools = headcountPools.filter(p => p.pool_slot?.slot_date === todayStr);

    // A member holds a seat only once their payment landed; legacy/free rows
    // have no payment_status and are treated as paid.
    const isPaidSeat = (m) => (m.payment_status || 'paid') === 'paid';

    // Every pool slot that at least one person has paid into, with its live
    // seat count. A pool becomes visible the moment the first payment lands —
    // not only once it is filled or completed.
    const poolGroups = (() => {
        const slotGroups = {};
        headcountPools.forEach(m => {
            const slotDate = m.pool_slot?.slot_date;
            if (!slotDate) return;
            const slotId = m.pool_slot?.id;
            const key = slotId || ((m.pool_slot?.type?.name || '') + '_' + slotDate);
            if (!slotGroups[key]) slotGroups[key] = {
                id: slotId,
                members: [],
                type: m.pool_slot?.type,
                slot_date: slotDate,
                slot_start: m.pool_slot?.slot_start,
                status: m.pool_slot?.status
            };
            slotGroups[key].members.push(m);
        });

        return Object.values(slotGroups).map(group => {
            const paidCount = group.members.filter(isPaidSeat).length;
            const maxMembers = group.type?.max_members || 0;
            const isFilled = maxMembers > 0 && paidCount >= maxMembers;
            const hasCompleted = group.status === 'completed'
                || group.members.some(m => m.status === 'completed' || m.status === 'done');
            // Every paid seat handed its credentials over.
            const paidMembers = group.members.filter(isPaidSeat);
            const allFulfilled = paidMembers.length > 0 && paidMembers.every(m => m.status === 'done');
            // Newest fulfilment timestamp, falling back to the slot's own date, so
            // the archive can be ordered by when work actually finished.
            const fulfilledStamps = group.members.map(m => m.fulfilled_at).filter(Boolean);
            const closedAt = fulfilledStamps.length
                ? fulfilledStamps.sort().slice(-1)[0]
                : group.slot_date;

            return {
                ...group,
                paidCount,
                maxMembers,
                isFilled,
                hasCompleted,
                allFulfilled,
                fulfilledCount: paidMembers.filter(m => m.status === 'done').length,
                closedAt,
                seatsLeft: Math.max(0, maxMembers - paidCount),
                // "Collecting" = money is in, still waiting on more members.
                isCollecting: paidCount > 0 && !isFilled && !hasCompleted,
                revenue: paidCount * (group.type?.split_price || 0)
            };
        })
        // A slot with only unpaid rows is an abandoned checkout, not a pool.
        .filter(g => g.paidCount > 0)
        .sort((a, b) => new Date(b.slot_date) - new Date(a.slot_date));
    })();

    // A pool is "done" once the slot is completed or every paid seat is fulfilled.
    // Those live in their own Completed Pools section rather than the active queue.
    const archivedPools = poolGroups
        .filter(g => g.hasCompleted || g.allFulfilled)
        .sort((a, b) => {
            const diff = new Date(b.closedAt) - new Date(a.closedAt);
            return archiveSort === 'oldest' ? -diff : diff;
        });

    const activePools = poolGroups.filter(g => !g.hasCompleted && !g.allFulfilled);

    const fulfilledPools = activePools.filter(g => {
        if (fulfilledFilter === 'collecting') return g.isCollecting;
        if (fulfilledFilter === 'filled') return g.isFilled;
        return true;
    });

    const collectingCount = activePools.filter(g => g.isCollecting).length;
    const filledCount = activePools.filter(g => g.isFilled).length;

    // --- RENDER HELPERS ---
    const MetricCard = ({ title, value, subtitle, icon, color, onClick }) => (
        <div 
            onClick={onClick}
            style={{ 
                background: 'rgba(28, 28, 30, 0.6)', 
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.05)', 
                borderRadius: '24px', 
                padding: '24px', 
                cursor: onClick ? 'pointer' : 'default', 
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden'
            }}
            onMouseOver={(e) => {
                if (onClick) {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = `0 12px 30px ${color}15`;
                    e.currentTarget.style.borderColor = `${color}40`;
                }
            }}
            onMouseOut={(e) => {
                if (onClick) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                }
            }}
        >
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '100px', opacity: 0.03, color: '#fff', transform: 'rotate(-15deg)' }}>
                <i className={`fas fa-${icon}`}></i>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: color }}>
                    <i className={`fas fa-${icon}`}></i>
                </div>
                <div style={{ fontSize: '13px', color: COLORS.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>{title}</div>
            </div>
            <div style={{ fontSize: '36px', fontWeight: '800', color: COLORS.text, marginBottom: '8px', letterSpacing: '-1px' }}>{value}</div>
            <div style={{ fontSize: '13px', color: COLORS.textMuted, fontWeight: '500' }}>{subtitle}</div>
        </div>
    );

    const TabButton = ({ id, label, icon }) => (
        <button 
            onClick={() => setPoolTab(label)}
            style={{ 
                background: poolTab === label ? COLORS.surfaceHover : 'transparent', 
                color: poolTab === label ? COLORS.text : COLORS.textMuted,
                border: poolTab === label ? `1px solid rgba(255,255,255,0.1)` : '1px solid transparent',
                padding: '12px 24px', borderRadius: '100px', fontSize: '14px', fontWeight: '600',
                cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: '8px'
            }}
        >
            {icon && <i className={`fas fa-${icon}`}></i>}
            {label}
        </button>
    );

    // --- AUTH VIEWS ---
    if (step === 'email' || step === 'otp') {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: COLORS.background, color: COLORS.text, fontFamily: 'Inter, system-ui, sans-serif' }}>
                <div style={{ background: 'rgba(28, 28, 30, 0.8)', backdropFilter: 'blur(20px)', padding: '48px', borderRadius: '32px', width: '100%', maxWidth: '420px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 40px 80px rgba(0,0,0,0.8)' }}>
                    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                        <div style={{ width: '64px', height: '64px', background: `${COLORS.primary}15`, borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                            <i className="fas fa-shield-alt" style={{ fontSize: '28px', color: COLORS.primary }}></i>
                        </div>
                        <h1 style={{ fontSize: '28px', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' }}>Savify Pro Center</h1>
                        <div style={{ fontSize: '15px', color: COLORS.textMuted, marginTop: '8px' }}>Restricted Deep Analytics Access</div>
                    </div>

                    {error && (
                        <div style={{ background: `${COLORS.danger}15`, color: COLORS.danger, padding: '16px', borderRadius: '16px', marginBottom: '24px', fontSize: '14px', textAlign: 'center', border: `1px solid ${COLORS.danger}33` }}>
                            {error}
                        </div>
                    )}

                    {step === 'email' ? (
                        <form onSubmit={handleSendOtp}>
                            <input 
                                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                placeholder="Admin Email" required
                                style={{ width: '100%', padding: '18px 24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: '16px', marginBottom: '24px', outline: 'none', transition: 'border-color 0.2s' }}
                                onFocus={(e) => e.target.style.borderColor = COLORS.primary}
                                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                            />
                            <button type="submit" disabled={loading || !email} style={{ width: '100%', padding: '18px', borderRadius: '16px', border: 'none', background: COLORS.primary, color: 'black', fontSize: '16px', fontWeight: '700', cursor: loading ? 'wait' : 'pointer', transition: 'all 0.2s' }}>
                                {loading ? 'Authenticating...' : 'Send Access Code'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOtp}>
                            <input 
                                type="text" value={otp} onChange={(e) => setOtp(e.target.value)}
                                placeholder="8-Digit OTP" maxLength={8} required
                                style={{ width: '100%', padding: '18px 24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.5)', color: COLORS.primary, fontSize: '24px', textAlign: 'center', letterSpacing: '8px', marginBottom: '24px', fontWeight: '800', outline: 'none' }}
                            />
                            <button type="submit" disabled={loading || otp.length < 6} style={{ width: '100%', padding: '18px', borderRadius: '16px', border: 'none', background: COLORS.primary, color: 'black', fontSize: '16px', fontWeight: '700', cursor: loading ? 'wait' : 'pointer' }}>
                                {loading ? 'Verifying...' : 'Enter Matrix'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        );
    }

    // --- DASHBOARD VIEWS ---
    return (
        <div style={{ minHeight: '100vh', background: COLORS.background, color: COLORS.text, fontFamily: 'Inter, system-ui, sans-serif' }}>
            
            {/* TOP NAVBAR (Glassmorphic) */}
            <div style={{ 
                background: 'rgba(10, 10, 10, 0.8)', 
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(255,255,255,0.05)', 
                padding: '16px 32px', 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                position: 'sticky', top: 0, zIndex: 100 
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '40px', height: '40px', background: `${COLORS.primary}15`, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="fas fa-shield-alt" style={{ color: COLORS.primary, fontSize: '20px' }}></i>
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '800', letterSpacing: '-0.5px' }}>Savify Pro Center</h1>
                        <div style={{ fontSize: '12px', color: COLORS.textMuted, display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                            <div style={{ width: '6px', height: '6px', background: COLORS.primary, borderRadius: '50%', boxShadow: `0 0 10px ${COLORS.primary}` }}></div>
                            Deep Data Synced
                        </div>
                    </div>
                </div>
                <div className="admin-navbar-buttons" style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={fetchAllData} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: COLORS.text, padding: '10px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
                        <i className={`fas fa-sync-alt ${dashboardLoading ? 'fa-spin' : ''}`}></i> Refresh Data
                    </button>
                    <button onClick={handleLogout} style={{ background: `${COLORS.danger}15`, border: '1px solid transparent', color: COLORS.danger, padding: '10px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = `${COLORS.danger}33`} onMouseOut={(e) => e.currentTarget.style.background = `${COLORS.danger}15`}>
                        Logout
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex' }}>
                {/* SIDEBAR NAVIGATION */}
                <div className="admin-sidebar" style={{ width: '280px', borderRight: '1px solid rgba(255,255,255,0.05)', height: 'calc(100vh - 73px)', position: 'sticky', top: '73px', padding: '32px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '11px', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700', paddingLeft: '16px', marginBottom: '8px' }}>Core Analytics</div>
                    
                    {[
                        { id: 'metrics', label: 'Platform Health', icon: 'heartbeat' },
                        { id: 'crm', label: 'User CRM & Intel', icon: 'users-cog' },
                        { id: 'pools', label: 'Orders & Subscriptions', icon: 'layer-group' },
                        { id: 'fulfillment', label: 'Active Paid Pools', icon: 'hourglass-half' },
                        { id: 'archive', label: 'Completed Pools', icon: 'check-double' },
                        { id: 'revenue', label: 'Revenue Engine', icon: 'vault' },
                        { id: 'transactions', label: 'Gateway Logs', icon: 'exchange-alt' }
                    ].map(view => (
                        <button 
                            key={view.id}
                            onClick={() => setActiveView(view.id)}
                            style={{ 
                                background: activeView === view.id ? 'rgba(255,255,255,0.08)' : 'transparent', 
                                border: 'none', 
                                color: activeView === view.id ? COLORS.text : COLORS.textMuted, 
                                fontSize: '15px', fontWeight: '600', 
                                padding: '16px', borderRadius: '16px',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px',
                                transition: 'all 0.2s', textAlign: 'left'
                            }}
                            onMouseOver={(e) => { if(activeView !== view.id) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                            onMouseOut={(e) => { if(activeView !== view.id) e.currentTarget.style.background = 'transparent' }}
                        >
                            <i className={`fas fa-${view.icon}`} style={{ width: '20px', textAlign: 'center', color: activeView === view.id ? COLORS.primary : 'inherit' }}></i> 
                            {view.label}
                        </button>
                    ))}

                    <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '24px' }}>
                        <div style={{ fontSize: '11px', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700', paddingLeft: '16px', marginBottom: '16px' }}>Database Health</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '0 8px' }}>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                                <div style={{ fontSize: '20px', fontWeight: '800', color: COLORS.text }}>{users.length}</div>
                                <div style={{ fontSize: '10px', color: COLORS.textMuted, textTransform: 'uppercase', marginTop: '4px' }}>Users</div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                                <div style={{ fontSize: '20px', fontWeight: '800', color: COLORS.text }}>{blinkitOrders.length}</div>
                                <div style={{ fontSize: '10px', color: COLORS.textMuted, textTransform: 'uppercase', marginTop: '4px' }}>Carts</div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                                <div style={{ fontSize: '20px', fontWeight: '800', color: COLORS.text }}>{headcountPools.length}</div>
                                <div style={{ fontSize: '10px', color: COLORS.textMuted, textTransform: 'uppercase', marginTop: '4px' }}>Pools</div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                                <div style={{ fontSize: '20px', fontWeight: '800', color: COLORS.text }}>{phonepeTxns.length}</div>
                                <div style={{ fontSize: '10px', color: COLORS.textMuted, textTransform: 'uppercase', marginTop: '4px' }}>Txns</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* MOBILE BOTTOM NAV */}
                <div className="admin-mobile-nav" style={{ display: 'none', position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200, background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '8px 4px', gap: '2px', justifyContent: 'space-around' }}>
                    {[
                        { id: 'metrics', icon: 'heartbeat', label: 'Health' },
                        { id: 'crm', icon: 'users-cog', label: 'CRM' },
                        { id: 'pools', icon: 'layer-group', label: 'Orders' },
                        { id: 'fulfillment', icon: 'hourglass-half', label: 'Active' },
                        { id: 'archive', icon: 'check-double', label: 'Done' },
                        { id: 'revenue', icon: 'vault', label: 'Revenue' },
                        { id: 'transactions', icon: 'exchange-alt', label: 'Txns' }
                    ].map(item => (
                        <button key={item.id} onClick={() => setActiveView(item.id)} style={{
                            background: activeView === item.id ? 'rgba(48,209,88,0.15)' : 'transparent',
                            border: 'none', color: activeView === item.id ? COLORS.primary : COLORS.textMuted,
                            fontSize: '10px', fontWeight: '600', padding: '6px 8px', borderRadius: '12px',
                            cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1
                        }}>
                            <i className={`fas fa-${item.icon}`} style={{ fontSize: '18px' }}></i>
                            {item.label}
                        </button>
                    ))}
                </div>

                {/* MAIN CONTENT AREA */}
                <div className="admin-main-content" style={{ flex: 1, padding: '48px', overflowY: 'auto' }}>
                    {dashboardLoading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', color: COLORS.textMuted }}>
                            <div className="spinner" style={{ borderColor: 'rgba(255,255,255,0.1)', borderTopColor: COLORS.primary, width: '40px', height: '40px', margin: '0 auto 24px' }}></div>
                            <div style={{ fontSize: '16px', fontWeight: '500' }}>Aggregating Deep Analytics...</div>
                        </div>
                    ) : (
                        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                            {/* ─── PLATFORM HEALTH / METRICS OVERVIEW ─── */}
                            {activeView === 'metrics' && (
                                <div style={{ animation: 'fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
                                        <div>
                                            <h2 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '8px', letterSpacing: '-1px' }}>Platform Health</h2>
                                            <p style={{ color: COLORS.textMuted, margin: 0, fontSize: '15px' }}>High-level overview of Savify's core KPIs.</p>
                                        </div>
                                    </div>
                                    
                                    <div className="admin-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '40px' }}>
                                        <MetricCard title="Total Users" value={users.length} subtitle="+Active growing base" icon="users" color={COLORS.secondary} />
                                        <MetricCard title="Signups Today" value={signupsToday} subtitle="In the last 24 hours" icon="user-plus" color={COLORS.primary} />
                                        <MetricCard title="Platform Revenue" value={`₹${totalRevenue.toLocaleString()}`} subtitle={`+₹${revenueToday} today`} icon="wallet" color={COLORS.warning} />
                                        <MetricCard title="Total Blinkit Value" value={`₹${totalBlinkitValue.toLocaleString()}`} subtitle={`${pendingBlinkit.length} carts pending`} icon="shopping-bag" color={COLORS.accent} />
                                    </div>

                                    <div className="admin-stats-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                                        {/* Growth Chart */}
                                        <div style={{ background: 'rgba(28, 28, 30, 0.6)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '32px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                                                <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Growth Trajectory (7 Days)</h3>
                                            </div>
                                            <div style={{ height: '350px' }}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <AreaChart data={chartData}>
                                                        <defs>
                                                            <linearGradient id="colorSignups" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/>
                                                                <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                                                            </linearGradient>
                                                        </defs>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                                        <XAxis dataKey="name" stroke={COLORS.textMuted} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: COLORS.textMuted }} dy={10} />
                                                        <YAxis stroke={COLORS.textMuted} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: COLORS.textMuted }} dx={-10} />
                                                        <Tooltip contentStyle={{ background: 'rgba(28, 28, 30, 0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} itemStyle={{ color: '#fff', fontWeight: 'bold' }} />
                                                        <Area type="monotone" name="Signups" dataKey="signups" stroke={COLORS.primary} strokeWidth={4} fillOpacity={1} fill="url(#colorSignups)" />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                        
                                        {/* Device Stats */}
                                        <div style={{ background: 'rgba(28, 28, 30, 0.6)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '32px', display: 'flex', flexDirection: 'column' }}>
                                            <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0, marginBottom: '32px' }}>Operational Insights</h3>
                                            
                                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                                <div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                        <span style={{ fontSize: '14px', color: COLORS.textMuted, fontWeight: '500' }}>Active Users (7-day Est.)</span>
                                                        <span style={{ fontSize: '14px', fontWeight: '700' }}>{dauUsers.length}</span>
                                                    </div>
                                                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '100px', overflow: 'hidden' }}>
                                                        <div style={{ height: '100%', width: `${Math.min(100, (dauUsers.length / Math.max(1, users.length)) * 100)}%`, background: COLORS.secondary, borderRadius: '100px' }}></div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                        <span style={{ fontSize: '14px', color: COLORS.textMuted, fontWeight: '500' }}>Blinkit Fulfillment Rate</span>
                                                        <span style={{ fontSize: '14px', fontWeight: '700' }}>{blinkitOrders.length ? Math.round((fulfilledBlinkit.length / blinkitOrders.length) * 100) : 0}%</span>
                                                    </div>
                                                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '100px', overflow: 'hidden' }}>
                                                        <div style={{ height: '100%', width: `${blinkitOrders.length ? (fulfilledBlinkit.length / blinkitOrders.length) * 100 : 0}%`, background: COLORS.primary, borderRadius: '100px' }}></div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                        <span style={{ fontSize: '14px', color: COLORS.textMuted, fontWeight: '500' }}>Avg. Blinkit Order Value</span>
                                                        <span style={{ fontSize: '14px', fontWeight: '700' }}>₹{avgOrderValue}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                <div style={{ fontSize: '12px', color: COLORS.textMuted, textAlign: 'center' }}>Total volume transacted via PhonePe</div>
                                                <div style={{ fontSize: '24px', fontWeight: '800', textAlign: 'center', color: COLORS.text, marginTop: '8px' }}>₹{totalTxnVolume.toLocaleString()}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ─── USER CRM & INTEL VIEW ─── */}
                            {activeView === 'crm' && (
                                <div style={{ animation: 'fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
                                        <div>
                                            <h2 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '8px', letterSpacing: '-1px' }}>User CRM & Intel</h2>
                                            <p style={{ color: COLORS.textMuted, margin: 0, fontSize: '15px' }}>Deep dive into individual user behavior and history.</p>
                                        </div>
                                        <div style={{ display: 'flex', gap: '16px' }}>
                                            <div style={{ position: 'relative' }}>
                                                <i className="fas fa-search" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: COLORS.textMuted }}></i>
                                                <input 
                                                    type="text" 
                                                    placeholder="Search users..." 
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    style={{ background: 'rgba(28,28,30,0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '12px 16px 12px 48px', borderRadius: '12px', fontSize: '14px', outline: 'none', width: '300px' }}
                                                />
                                            </div>
                                            <button onClick={() => exportToCSV(users.map(u => ({ID: u.id, Name: u.full_name, Username: u.username, Email: u.email, Phone: u.mobile_number, Joined: u.created_at})), 'Savify_Users')} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '12px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <i className="fas fa-download"></i> Export CSV
                                            </button>
                                        </div>
                                    </div>

                                    <div style={{ background: 'rgba(28, 28, 30, 0.6)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', overflow: 'hidden' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                            <thead>
                                                <tr style={{ background: 'rgba(0,0,0,0.2)', color: COLORS.textMuted, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                                    <th style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: '700' }}>User</th>
                                                    <th style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: '700' }}>Contact</th>
                                                    <th style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: '700' }}>Location</th>
                                                    <th style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: '700', textAlign: 'right' }}>Total Spent</th>
                                                    <th style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: '700' }}>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredUsers.length === 0 && (
                                                    <tr><td colSpan="5" style={{ padding: '60px', textAlign: 'center', color: COLORS.textMuted }}>No users found matching query.</td></tr>
                                                )}
                                                {filteredUsers.map(user => {
                                                    const metrics = getUserMetrics(user.id);
                                                    const isExpanded = expandedUser === user.id;
                                                    
                                                    return (
                                                        <React.Fragment key={user.id}>
                                                            <tr style={{ borderBottom: isExpanded ? 'none' : '1px solid rgba(255,255,255,0.02)', background: isExpanded ? 'rgba(255,255,255,0.02)' : 'transparent', transition: 'background 0.2s' }}>
                                                                <td style={{ padding: '20px 24px' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `linear-gradient(135deg, ${COLORS.primary}22 0%, ${COLORS.secondary}22 100%)`, color: COLORS.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '16px' }}>
                                                                            {(user.full_name || 'U')[0].toUpperCase()}
                                                                        </div>
                                                                        <div>
                                                                            <div style={{ fontWeight: '700', fontSize: '15px' }}>{user.full_name || 'Unknown User'}</div>
                                                                            <div style={{ fontSize: '13px', color: COLORS.secondary, marginTop: '2px', fontWeight: '500' }}>@{user.username || 'anon'}</div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td style={{ padding: '20px 24px' }}>
                                                                    <div style={{ fontSize: '14px' }}>{user.email || 'No email'}</div>
                                                                    <div style={{ fontSize: '13px', color: COLORS.textMuted, marginTop: '4px' }}>{user.mobile_number || 'No phone'}</div>
                                                                </td>
                                                                <td style={{ padding: '20px 24px' }}>
                                                                    <div style={{ fontSize: '14px', fontWeight: '600' }}>{user.hall?.name || 'No Hall'}</div>
                                                                    <div style={{ fontSize: '13px', color: COLORS.textMuted, marginTop: '4px' }}>{user.college?.name || 'No College'}</div>
                                                                </td>
                                                                <td style={{ padding: '20px 24px', textAlign: 'right', fontWeight: '800', fontSize: '16px', color: metrics.totalSpent > 0 ? COLORS.primary : COLORS.textMuted }}>
                                                                    ₹{metrics.totalSpent}
                                                                </td>
                                                                <td style={{ padding: '20px 24px' }}>
                                                                    <button onClick={() => setExpandedUser(isExpanded ? null : user.id)} style={{ background: isExpanded ? `${COLORS.secondary}33` : 'rgba(255,255,255,0.05)', color: isExpanded ? COLORS.secondary : '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}>
                                                                        {isExpanded ? 'Close Intel' : 'Deep Dive'}
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                            {isExpanded && (
                                                                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                                    <td colSpan="5" style={{ padding: '0 24px 24px' }}>
                                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', padding: '24px', background: 'rgba(0,0,0,0.3)', borderRadius: '16px' }}>
                                                                            <div>
                                                                                <div style={{ fontSize: '12px', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', fontWeight: '600' }}>Blinkit Engagement</div>
                                                                                <div style={{ fontSize: '24px', fontWeight: '800' }}>{metrics.itemsOrdered} <span style={{ fontSize: '14px', color: COLORS.textMuted, fontWeight: '500' }}>items ordered</span></div>
                                                                            </div>
                                                                            <div>
                                                                                <div style={{ fontSize: '12px', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', fontWeight: '600' }}>Subscription Pools</div>
                                                                                <div style={{ fontSize: '24px', fontWeight: '800' }}>{metrics.poolsJoined} <span style={{ fontSize: '14px', color: COLORS.textMuted, fontWeight: '500' }}>pools joined</span></div>
                                                                            </div>
                                                                            <div>
                                                                                <div style={{ fontSize: '12px', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', fontWeight: '600' }}>Account Age</div>
                                                                                <div style={{ fontSize: '16px', fontWeight: '700' }}>Joined {safeFormat(user.created_at, 'MMM dd, yyyy')}</div>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* ─── ORDERS & POOLS VIEW ─── */}
                            {activeView === 'pools' && (
                                <div style={{ animation: 'fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
                                        <div>
                                            <h2 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '8px', letterSpacing: '-1px' }}>Orders & Subscriptions</h2>
                                            <p style={{ color: COLORS.textMuted, margin: 0, fontSize: '15px' }}>Manage ongoing pools and fulfill commerce orders.</p>
                                        </div>
                                        <button onClick={() => exportToCSV(blinkitOrders.map(o => ({ID: o.id, Hall: o.hall?.name, Amount: o.total_amount, Status: o.status, Date: o.created_at})), 'Savify_Orders')} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '12px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <i className="fas fa-download"></i> Export Orders
                                        </button>
                                    </div>

                                    <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '16px', marginBottom: '32px', scrollbarWidth: 'none' }}>
                                        <TabButton id="Blinkit" label="Blinkit" icon="shopping-basket" />
                                        <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 8px' }}></div>
                                        {SUBSCRIPTION_TABS.map(t => (
                                            <TabButton key={t.label} id={t.label} label={t.label} icon={t.icon} />
                                        ))}
                                    </div>

                                    {poolTab === 'Blinkit' ? (
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                                <h3 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>All Historical & Active Carts</h3>
                                                <div style={{ background: `${COLORS.warning}22`, color: COLORS.warning, padding: '6px 16px', borderRadius: '100px', fontSize: '13px', fontWeight: '700' }}>
                                                    {pendingBlinkit.length} Pending Actions
                                                </div>
                                            </div>

                                            {blinkitOrders.length === 0 ? (
                                                <div style={{ padding: '80px', textAlign: 'center', color: COLORS.textMuted, border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '24px', background: 'rgba(255,255,255,0.02)' }}>
                                                    <i className="fas fa-box-open" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}></i>
                                                    <div style={{ fontSize: '16px', fontWeight: '600' }}>No Blinkit orders found.</div>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                                                    {blinkitOrders.map((order, index) => (
                                                        <div key={order.id} style={{ background: 'rgba(28, 28, 30, 0.6)', border: `1px solid ${order.status === 'ordered' ? COLORS.warning + '55' : 'rgba(255,255,255,0.05)'}`, borderRadius: '20px', overflow: 'hidden', transition: 'all 0.3s' }}>
                                                            <div 
                                                                onClick={() => {
                                                                    setExpandedOrder(expandedOrder === order.id ? null : order.id);
                                                                    if (expandedOrder !== order.id && !poolAddresses[order.id]) {
                                                                        fetchAddress(order.latitude, order.longitude, order.id);
                                                                    }
                                                                }}
                                                                style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: expandedOrder === order.id ? 'rgba(255,255,255,0.03)' : 'transparent' }}
                                                            >
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                                                    <div style={{ background: order.status !== 'done' ? `${COLORS.warning}22` : `${COLORS.primary}22`, color: order.status !== 'done' ? COLORS.warning : COLORS.primary, padding: '8px 16px', borderRadius: '12px', fontSize: '14px', fontWeight: '800' }}>
                                                                        {typeof order.time_slot === 'object' || order.time_slot === '[object Object]' ? 'Standard' : order.time_slot}
                                                                    </div>
                                                                    <div>
                                                                        <div style={{ fontSize: '18px', fontWeight: '700', color: COLORS.text, display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                            Pool ID: #{order.id.substring(0, 6).toUpperCase()}
                                                                            {order.status === 'done' ? (
                                                                                <span style={{ fontSize: '11px', background: COLORS.primary, color: '#000', padding: '4px 10px', borderRadius: '100px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800' }}>Fulfilled</span>
                                                                            ) : order.status === 'ordered' ? (
                                                                                <span style={{ fontSize: '11px', background: COLORS.secondary, color: '#fff', padding: '4px 10px', borderRadius: '100px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800' }}><i className="fas fa-check"></i> Paid — Ready to Fulfill</span>
                                                                            ) : (
                                                                                <span style={{ fontSize: '11px', background: COLORS.warning, color: '#000', padding: '4px 10px', borderRadius: '100px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800' }}><i className="fas fa-door-open"></i> Pool is Open</span>
                                                                            )}
                                                                        </div>
                                                                        <div style={{ fontSize: '14px', color: COLORS.textMuted, marginTop: '4px' }}>
                                                                            {safeFormat(order.created_at, 'MMM dd, HH:mm')} • {order.items.length} items
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    <i className={`fas fa-chevron-${expandedOrder === order.id ? 'up' : 'down'}`} style={{ color: COLORS.textMuted }}></i>
                                                                </div>
                                                            </div>

                                                            {expandedOrder === order.id && (
                                                                <div style={{ padding: '0 24px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
                                                                    <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                                        
                                                                        {/* Pool Metadata */}
                                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px' }}>
                                                                            <div>
                                                                                <div style={{ fontSize: '12px', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px', fontWeight: '700' }}>Platform</div>
                                                                                <div style={{ fontSize: '16px', fontWeight: '800', color: COLORS.text, textTransform: 'capitalize' }}>{order.platform || 'Blinkit'}</div>
                                                                            </div>
                                                                            <div>
                                                                                <div style={{ fontSize: '12px', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px', fontWeight: '700' }}>Delivery & Fees</div>
                                                                                <div style={{ fontSize: '15px', fontWeight: '700', color: COLORS.text }}>Del: ₹{order.delivery_fee || 25} | Plat: ₹{order.platform_fee || 5}</div>
                                                                            </div>
                                                                            <div>
                                                                                <div style={{ fontSize: '12px', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px', fontWeight: '700' }}>Pool Location (GPS)</div>
                                                                                <div style={{ fontSize: '14px', fontWeight: '600', color: COLORS.secondary }}>
                                                                                    {poolAddresses[order.id] ? (
                                                                                        <div style={{ marginBottom: '8px', fontSize: '13px', color: COLORS.text, lineHeight: '1.4' }}>
                                                                                            {poolAddresses[order.id]}
                                                                                        </div>
                                                                                    ) : (order.latitude && order.longitude && (
                                                                                        <div style={{ marginBottom: '8px', fontSize: '12px', color: COLORS.textMuted }}>Loading address...</div>
                                                                                    ))}
                                                                                    {order.latitude && order.longitude ? (
                                                                                        <a href={`https://www.google.com/maps/search/?api=1&query=${order.latitude},${order.longitude}`} target="_blank" rel="noreferrer" style={{ color: COLORS.secondary, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                                            <i className="fas fa-map-marker-alt"></i> View on Maps
                                                                                        </a>
                                                                                    ) : (
                                                                                        <span style={{ color: COLORS.textMuted }}>No GPS Data</span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        <div style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', color: COLORS.textMuted, fontWeight: '700', marginTop: '8px' }}>Participants & Items Manifest</div>
                                                                        
                                                                        {(() => {
                                                                            // Group items by user
                                                                            const userGroups = {};
                                                                            const poolTotal = order.items.reduce((sum, i) => sum + (i.price_at_time * i.quantity), 0);

                                                                            order.items.forEach(item => {
                                                                                if (!userGroups[item.user_id]) {
                                                                                    const userPayment = (order.payments || []).find(p => p.user_id === item.user_id && p.payment_status === 'success');
                                                                                    userGroups[item.user_id] = {
                                                                                        user: item.user,
                                                                                        items: [],
                                                                                        goodsTotal: 0,
                                                                                        payment: userPayment
                                                                                    };
                                                                                }
                                                                                userGroups[item.user_id].items.push(item);
                                                                                userGroups[item.user_id].goodsTotal += (item.price_at_time * item.quantity);
                                                                            });

                                                                            return (
                                                                                <>
                                                                                    {Object.entries(userGroups).map(([userId, group]) => {
                                                                                        const myProportion = poolTotal > 0 ? (group.goodsTotal / poolTotal) : 1;
                                                                                        const deliveryShare = Math.ceil((order.delivery_fee || 25) * myProportion);
                                                                                        const platformShare = Math.ceil((order.platform_fee || 5) * myProportion);
                                                                                        const savifyFee = 1;
                                                                                        const expectedTotal = group.goodsTotal + deliveryShare + platformShare + savifyFee;

                                                                                        return (
                                                                                            <div key={userId} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${COLORS.primary}44`, borderRadius: '16px', overflow: 'hidden', marginBottom: '16px' }}>
                                                                                                {/* User Header */}
                                                                                                <div style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                                                        <div style={{ width: '40px', height: '40px', background: `${COLORS.primary}22`, color: COLORS.primary, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800' }}>
                                                                                                            {(group.user?.full_name || 'U')[0].toUpperCase()}
                                                                                                        </div>
                                                                                                        <div>
                                                                                                            <div style={{ fontSize: '16px', fontWeight: '700', color: COLORS.text, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                                                                {group.user?.full_name || 'Unknown User'}
                                                                                                                {group.payment ? (
                                                                                                                    <span style={{ fontSize: '10px', background: 'rgba(48,209,88,0.2)', color: '#30D158', padding: '2px 6px', borderRadius: '4px', fontWeight: '800', border: '1px solid rgba(48,209,88,0.3)' }}>PAID</span>
                                                                                                                ) : (
                                                                                                                    <span style={{ fontSize: '10px', background: 'rgba(255,159,10,0.2)', color: '#FF9F0A', padding: '2px 6px', borderRadius: '4px', fontWeight: '800', border: '1px solid rgba(255,159,10,0.3)' }}>PENDING PAYMENT</span>
                                                                                                                )}
                                                                                                            </div>
                                                                                                            <div style={{ fontSize: '13px', color: COLORS.textMuted, display: 'flex', gap: '12px', marginTop: '4px' }}>
                                                                                                                <span><i className="fas fa-phone-alt" style={{ opacity: 0.6 }}></i> {group.user?.mobile_number || 'No Phone'}</span>
                                                                                                                <span><i className="fas fa-building" style={{ opacity: 0.6 }}></i> {group.user?.hall?.name || 'No Hall Info'}</span>
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    <div style={{ textAlign: 'right' }}>
                                                                                                        <div style={{ fontSize: '18px', fontWeight: '800', color: COLORS.primary }}>
                                                                                                            ₹{group.payment ? group.payment.amount_paid : expectedTotal}
                                                                                                        </div>
                                                                                                        {group.payment && group.payment.amount_paid < expectedTotal && (
                                                                                                            <div style={{ fontSize: '11px', color: COLORS.warning, fontWeight: '600', marginTop: '4px' }}>
                                                                                                                Expected: ₹{expectedTotal}
                                                                                                            </div>
                                                                                                        )}
                                                                                                    </div>
                                                                                                </div>

                                                                                                {/* User Items & Breakdown */}
                                                                                                <div style={{ padding: '16px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                                                                                                    <div style={{ flex: '1 1 300px' }}>
                                                                                                        <div style={{ fontSize: '12px', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', fontWeight: '700' }}>Ordered Items</div>
                                                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                                                            {group.items.map(item => (
                                                                                                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', background: 'rgba(0,0,0,0.15)', padding: '8px 12px', borderRadius: '8px' }}>
                                                                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: COLORS.text }}>
                                                                                                                        <div style={{ width: 32, height: 32, borderRadius: 6, overflow: 'hidden', background: 'rgba(255,255,255,0.05)', flexShrink: 0 }}>
                                                                                                                            {item.product?.image_url ? (
                                                                                                                                <img src={item.product.image_url} alt={item.product?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                                                                            ) : (
                                                                                                                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.textMuted, fontSize: 12 }}><i className="fas fa-box"></i></div>
                                                                                                                            )}
                                                                                                                        </div>
                                                                                                                        <span style={{ color: COLORS.secondary, background: `${COLORS.secondary}22`, padding: '2px 6px', borderRadius: '4px', fontWeight: '700', fontSize: '12px' }}>{item.quantity}x</span>
                                                                                                                        {item.product?.name || 'Unknown Item'}
                                                                                                                    </div>
                                                                                                                    <div style={{ fontWeight: '600' }}>₹{item.price_at_time * item.quantity}</div>
                                                                                                                </div>
                                                                                                            ))}
                                                                                                        </div>
                                                                                                    </div>

                                                                                                    <div style={{ width: '220px', background: 'rgba(0,0,0,0.2)', padding: '12px 16px', borderRadius: '12px', alignSelf: 'flex-start' }}>
                                                                                                        <div style={{ fontSize: '12px', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', fontWeight: '700' }}>Cost Breakdown</div>
                                                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                                                                                                            <span style={{ color: COLORS.textMuted }}>Goods</span>
                                                                                                            <span style={{ color: COLORS.text }}>₹{group.goodsTotal}</span>
                                                                                                        </div>
                                                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                                                                                                            <span style={{ color: COLORS.textMuted }}>Del. ({Math.round(myProportion*100)}%)</span>
                                                                                                            <span style={{ color: COLORS.text }}>₹{deliveryShare}</span>
                                                                                                        </div>
                                                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                                                                                                            <span style={{ color: COLORS.textMuted }}>Platform</span>
                                                                                                            <span style={{ color: COLORS.text }}>₹{platformShare}</span>
                                                                                                        </div>
                                                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                                                                                                            <span style={{ color: COLORS.textMuted }}>Savify Fee</span>
                                                                                                            <span style={{ color: COLORS.text }}>₹{savifyFee}</span>
                                                                                                        </div>
                                                                                                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '800' }}>
                                                                                                            <span>Total</span>
                                                                                                            <span style={{ color: COLORS.primary }}>₹{expectedTotal}</span>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </>
                                                                            );
                                                                        })()}
                                                                    </div>
                                                                    
                                                                    {order.status !== 'done' && (
                                                                        <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
                                                                            <button onClick={() => markBlinkitDone(order.id)} style={{ background: COLORS.primary, color: '#000', border: 'none', padding: '16px 32px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '12px', transition: 'transform 0.2s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                                                                                Mark Fulfilled on Platform <i className="fas fa-check-circle" style={{ fontSize: '18px' }}></i>
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div>
                                            {/* Historical & Active Headcount Pool View */}
                                            {(() => {
                                                const tabConfig = SUBSCRIPTION_TABS.find(t => t.label === poolTab);
                                                const forPlatform = headcountPools.filter(m => {
                                                    if (!m.pool_slot?.type?.name) return false;
                                                    if (!tabConfig) return false;
                                                    if (!tabConfig.match) return true; // "All Subs"
                                                    const name = m.pool_slot.type.name.toLowerCase();
                                                    return tabConfig.match.some(k => name.includes(k));
                                                });

                                                // Fulfilled orders drop out of the queue so only outstanding work shows.
                                                const fulfilledOnPlatform = forPlatform.filter(m => m.status === 'done');
                                                const allMembers = showFulfilled ? forPlatform : forPlatform.filter(m => m.status !== 'done');

                                                const queueHeader = (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
                                                        <div style={{ fontSize: '14px', color: COLORS.textMuted, fontWeight: '600' }}>
                                                            {forPlatform.length - fulfilledOnPlatform.length} awaiting fulfilment
                                                            <span style={{ opacity: 0.6 }}> • {fulfilledOnPlatform.length} fulfilled</span>
                                                        </div>
                                                        {fulfilledOnPlatform.length > 0 && (
                                                            <button onClick={() => setShowFulfilled(v => !v)} style={{ background: showFulfilled ? COLORS.surfaceHover : 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: showFulfilled ? COLORS.text : COLORS.textMuted, padding: '8px 16px', borderRadius: '100px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <i className={`fas fa-${showFulfilled ? 'eye-slash' : 'eye'}`}></i>
                                                                {showFulfilled ? 'Hide fulfilled' : `Show fulfilled (${fulfilledOnPlatform.length})`}
                                                            </button>
                                                        )}
                                                    </div>
                                                );

                                                if (allMembers.length === 0) return (
                                                    <div>
                                                        {forPlatform.length > 0 && queueHeader}
                                                        <div style={{ padding: '80px', textAlign: 'center', color: COLORS.textMuted, border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '24px', background: 'rgba(255,255,255,0.02)' }}>
                                                            <i className={`fas fa-${forPlatform.length > 0 ? 'check-double' : 'shopping-bag'}`} style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}></i>
                                                            <div style={{ fontSize: '16px', fontWeight: '600' }}>
                                                                {forPlatform.length > 0
                                                                    ? 'All orders here are fulfilled.'
                                                                    : 'No order history for this platform.'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );

                                                return (
                                                    <div>
                                                    {queueHeader}
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
                                                        {allMembers.map(m => {
                                                            const mUser = users.find(u => u.id === m.user_id);
                                                            const isDone = m.status === 'done';
                                                            const paid = isPaidSeat(m);
                                                            const poolCompleted = m.pool_slot?.status === 'completed';
                                                            return (
                                                            <div key={m.id} style={{ background: 'rgba(28, 28, 30, 0.6)', border: `1px solid ${isDone ? COLORS.primary + '55' : 'rgba(255,255,255,0.05)'}`, borderRadius: '24px', padding: '24px', position: 'relative', overflow: 'hidden', opacity: paid ? 1 : 0.65 }}>
                                                                {isDone && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: COLORS.primary }}></div>}
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                                                    <div>
                                                                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>{m.pool_slot.type?.name}</h3>
                                                                        <div style={{ fontSize: '12px', color: COLORS.textMuted, marginTop: '4px' }}>
                                                                            {safeFormat(paid ? (m.paid_at || m.joined_at) : m.joined_at, 'MMM dd, HH:mm')}
                                                                            {poolCompleted && <span style={{ marginLeft: '8px', color: COLORS.secondary, fontWeight: '700' }}>• Pool completed</span>}
                                                                        </div>
                                                                    </div>
                                                                    {paid ? (
                                                                        <div style={{ background: `${COLORS.primary}22`, color: COLORS.primary, padding: '4px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: '800' }}>PAID ₹{m.pool_slot.type?.split_price}</div>
                                                                    ) : (
                                                                        <div style={{ background: `${COLORS.warning}22`, color: COLORS.warning, padding: '4px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: '800' }}>UNPAID</div>
                                                                    )}
                                                                </div>
                                                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px' }}>
                                                                    <div style={{ fontSize: '15px', fontWeight: '700', color: COLORS.text }}>{mUser?.full_name || m.display_name || 'Anonymous User'}</div>
                                                                    <div style={{ fontSize: '13px', color: COLORS.textMuted, marginTop: '4px', display: 'flex', gap: '12px' }}>
                                                                        <span><i className="fas fa-phone-alt" style={{opacity: 0.5}}></i> {mUser?.mobile_number || 'N/A'}</span>
                                                                    </div>
                                                                </div>
                                                                {isDone ? (
                                                                    <div style={{ marginTop: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                                        <div style={{ flex: 1, padding: '12px', borderRadius: '12px', border: `1px solid ${COLORS.primary}`, color: COLORS.primary, fontWeight: '700', textAlign: 'center', fontSize: '14px' }}>
                                                                            <i className="fas fa-check-circle"></i> Fulfilled{m.fulfilled_at ? ` • ${safeFormat(m.fulfilled_at, 'MMM dd')}` : ''}
                                                                        </div>
                                                                        <button
                                                                            onClick={() => handleUndoMemberCompleted(m.id)}
                                                                            title="Move back to the pending queue"
                                                                            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: COLORS.textMuted, padding: '12px 14px', borderRadius: '12px', cursor: 'pointer', fontWeight: '700' }}
                                                                        >
                                                                            <i className="fas fa-undo"></i>
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => handleMarkMemberCompleted(m.id)}
                                                                        disabled={!paid}
                                                                        style={{ width: '100%', marginTop: '16px', background: paid ? COLORS.primary : 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: paid ? '#000' : COLORS.textMuted, padding: '12px', borderRadius: '12px', cursor: paid ? 'pointer' : 'default', fontWeight: '700', transition: 'all 0.2s' }}
                                                                    >
                                                                        {paid ? 'Fulfill & Send Credentials' : 'Awaiting payment'}
                                                                    </button>
                                                                )}
                                                            </div>
                                                            );
                                                        })}
                                                    </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ─── POOL FULFILLMENT VIEW ─── */}
                            {activeView === 'fulfillment' && (
                                <div style={{ animation: 'fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
                                        <div>
                                            <h2 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '8px', letterSpacing: '-1px' }}>Active Paid Pools</h2>
                                            <p style={{ color: COLORS.textMuted, margin: 0, fontSize: '15px' }}>
                                                Pools still in flight. Once fulfilled they move to{' '}
                                                <button onClick={() => setActiveView('archive')} style={{ background: 'none', border: 'none', padding: 0, color: COLORS.secondary, fontSize: '15px', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' }}>Completed Pools</button>
                                                {archivedPools.length > 0 ? ` (${archivedPools.length})` : ''}.
                                            </p>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '28px', fontWeight: '800', color: COLORS.primary, letterSpacing: '-1px' }}>₹{activePools.reduce((s, g) => s + g.revenue, 0).toLocaleString('en-IN')}</div>
                                            <div style={{ fontSize: '13px', color: COLORS.textMuted }}>in {activePools.length} active pool{activePools.length === 1 ? '' : 's'}</div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', flexWrap: 'wrap' }}>
                                        {[
                                            { id: 'collecting', label: 'Collecting', count: collectingCount, tint: COLORS.warning },
                                            { id: 'filled', label: 'Filled (Ready)', count: filledCount, tint: COLORS.primary },
                                            { id: 'all', label: 'All Active', count: activePools.length, tint: COLORS.text }
                                        ].map(f => {
                                            const on = fulfilledFilter === f.id;
                                            return (
                                                <button key={f.id} onClick={() => setFulfilledFilter(f.id)} style={{ background: on ? COLORS.surfaceHover : 'transparent', color: on ? COLORS.text : COLORS.textMuted, border: on ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent', padding: '12px 20px', borderRadius: '100px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {f.label}
                                                    <span style={{ background: on ? `${f.tint}22` : 'rgba(255,255,255,0.06)', color: on ? f.tint : COLORS.textMuted, padding: '2px 8px', borderRadius: '100px', fontSize: '12px', fontWeight: '800' }}>{f.count}</span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {fulfilledPools.length === 0 ? (
                                        <div style={{ padding: '80px', textAlign: 'center', color: COLORS.textMuted, border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '24px', background: 'rgba(255,255,255,0.02)' }}>
                                            <i className="fas fa-check-double" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}></i>
                                            <div style={{ fontSize: '16px', fontWeight: '600' }}>
                                                {fulfilledFilter === 'all'
                                                    ? (archivedPools.length > 0 ? 'No pools in flight — everything is fulfilled.' : 'No pool has taken a payment yet.')
                                                    : `No pools in the "${fulfilledFilter}" state right now.`}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="admin-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
                                            {fulfilledPools.map(pool => {
                                                const badge = pool.hasCompleted
                                                    ? { text: 'Completed', tint: COLORS.secondary }
                                                    : pool.isFilled
                                                        ? { text: 'Filled ✓', tint: COLORS.primary }
                                                        : { text: `Collecting • ${pool.seatsLeft} left`, tint: COLORS.warning };
                                                const pct = pool.maxMembers ? Math.min(100, (pool.paidCount / pool.maxMembers) * 100) : 0;
                                                return (
                                                <div key={pool.id} style={{ background: COLORS.surface, border: `1px solid ${badge.tint}33`, borderRadius: '24px', padding: '28px', display: 'flex', flexDirection: 'column' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', gap: '12px' }}>
                                                        <div>
                                                            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800' }}>{pool.type?.name}</h3>
                                                            <div style={{ fontSize: '13px', color: COLORS.textMuted, marginTop: '4px' }}>{safeFormat(pool.slot_date, 'MMM dd')} • {pool.slot_start}</div>
                                                        </div>
                                                        <div style={{
                                                            background: `${badge.tint}22`,
                                                            color: badge.tint,
                                                            padding: '6px 12px', borderRadius: '100px', fontSize: '13px', fontWeight: '700',
                                                            border: `1px solid ${badge.tint}44`, whiteSpace: 'nowrap'
                                                        }}>
                                                            {badge.text}
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '600', color: COLORS.textMuted, marginBottom: '8px' }}>
                                                        <span>{pool.paidCount}/{pool.maxMembers || '?'} paid members</span>
                                                        <span style={{ color: COLORS.primary }}>₹{pool.revenue.toLocaleString('en-IN')} collected</span>
                                                    </div>
                                                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '100px', overflow: 'hidden', marginBottom: '20px' }}>
                                                        <div style={{ height: '100%', width: `${pct}%`, background: badge.tint, borderRadius: '100px', transition: 'width 0.4s ease' }} />
                                                    </div>

                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, marginBottom: '24px' }}>
                                                        {pool.members?.map((m) => {
                                                            const paid = isPaidSeat(m);
                                                            return (
                                                            <div key={m.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', opacity: paid ? 1 : 0.55 }}>
                                                                <div style={{ width: '32px', height: '32px', background: `linear-gradient(135deg, ${COLORS.primary}22 0%, ${COLORS.secondary}22 100%)`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: COLORS.text, fontWeight: '800', flexShrink: 0 }}>
                                                                    {(m.user?.full_name || m.display_name || 'U')[0].toUpperCase()}
                                                                </div>
                                                                <div style={{ minWidth: 0, flex: 1 }}>
                                                                    <div style={{ fontSize: '14px', fontWeight: '700', color: COLORS.text }}>{m.user?.full_name || m.display_name || 'Anonymous'} <span style={{ fontSize: '12px', color: COLORS.secondary, fontWeight: '500' }}>@{m.user?.username || 'anon'}</span></div>
                                                                    <div style={{ fontSize: '12px', color: COLORS.textMuted, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.user?.mobile_number} • {m.user?.email}</div>
                                                                </div>
                                                                <span style={{ fontSize: '10px', fontWeight: '800', color: paid ? COLORS.primary : COLORS.warning, background: paid ? `${COLORS.primary}22` : `${COLORS.warning}22`, padding: '3px 8px', borderRadius: '100px', whiteSpace: 'nowrap' }}>
                                                                    {paid ? 'PAID' : 'UNPAID'}
                                                                </span>
                                                            </div>
                                                            );
                                                        })}
                                                        {pool.seatsLeft > 0 && !pool.hasCompleted && (
                                                            <div style={{ border: '1px dashed rgba(255,255,255,0.12)', padding: '12px', borderRadius: '12px', fontSize: '13px', color: COLORS.textMuted, textAlign: 'center' }}>
                                                                Waiting on {pool.seatsLeft} more member{pool.seatsLeft === 1 ? '' : 's'}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {pool.hasCompleted ? (
                                                        <button disabled style={{ width: '100%', background: 'rgba(255,255,255,0.05)', color: COLORS.textMuted, border: 'none', padding: '16px', borderRadius: '12px', fontWeight: '800', fontSize: '15px', cursor: 'not-allowed' }}>
                                                            ✓ Completed
                                                        </button>
                                                    ) : (
                                                        <button onClick={() => handleMarkCompleted(pool.id)} style={{ width: '100%', background: pool.isFilled ? `linear-gradient(135deg, ${COLORS.primary} 0%, #28a745 100%)` : 'transparent', color: pool.isFilled ? '#000' : COLORS.textMuted, border: pool.isFilled ? 'none' : '1px solid rgba(255,255,255,0.12)', padding: '16px', borderRadius: '12px', fontWeight: '800', fontSize: '15px', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                                                            {pool.isFilled ? 'Mark as Completed' : 'Close Early & Reopen Pool'}
                                                        </button>
                                                    )}
                                                </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ─── COMPLETED POOLS ARCHIVE ─── */}
                            {activeView === 'archive' && (() => {
                                const tabCfg = SUBSCRIPTION_TABS.find(t => t.label === archivePlatform);
                                const shown = archivedPools.filter(p => {
                                    if (!tabCfg || !tabCfg.match) return true;
                                    const n = (p.type?.name || '').toLowerCase();
                                    return tabCfg.match.some(k => n.includes(k));
                                });
                                const totalRevenue = shown.reduce((s, p) => s + p.revenue, 0);
                                const totalMembers = shown.reduce((s, p) => s + p.paidCount, 0);
                                const platformsUsed = SUBSCRIPTION_TABS.filter(t =>
                                    !t.match || archivedPools.some(p => t.match.some(k => (p.type?.name || '').toLowerCase().includes(k)))
                                );

                                // Group by calendar month so a long archive stays readable.
                                const byMonth = [];
                                shown.forEach(p => {
                                    const label = safeFormat(p.closedAt, 'MMMM yyyy');
                                    let bucket = byMonth.find(b => b.label === label);
                                    if (!bucket) { bucket = { label, pools: [] }; byMonth.push(bucket); }
                                    bucket.pools.push(p);
                                });

                                return (
                                <div style={{ animation: 'fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px', gap: '16px', flexWrap: 'wrap' }}>
                                        <div>
                                            <h2 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '8px', letterSpacing: '-1px' }}>Completed Pools</h2>
                                            <p style={{ color: COLORS.textMuted, margin: 0, fontSize: '15px' }}>Pools that were filled and fulfilled, newest first.</p>
                                        </div>
                                        <button onClick={() => exportToCSV(shown.map(p => ({
                                            Pool: p.type?.name, Closed: p.closedAt, Members: p.paidCount,
                                            Capacity: p.maxMembers, Revenue: p.revenue, Fulfilled: p.fulfilledCount
                                        })), 'Savify_Completed_Pools')} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '12px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <i className="fas fa-download"></i> Export
                                        </button>
                                    </div>

                                    {/* Summary */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                                        {[
                                            { label: 'Pools completed', value: shown.length, tint: COLORS.secondary, icon: 'check-double' },
                                            { label: 'Members served', value: totalMembers, tint: COLORS.accent, icon: 'users' },
                                            { label: 'Revenue closed', value: `₹${totalRevenue.toLocaleString('en-IN')}`, tint: COLORS.primary, icon: 'indian-rupee-sign' }
                                        ].map(s => (
                                            <div key={s.label} style={{ background: COLORS.surface, border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '20px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                                    <div style={{ width: '30px', height: '30px', borderRadius: '10px', background: `${s.tint}15`, color: s.tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px' }}>
                                                        <i className={`fas fa-${s.icon}`}></i>
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: COLORS.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
                                                </div>
                                                <div style={{ fontSize: '30px', fontWeight: '800', letterSpacing: '-1px' }}>{s.value}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Controls */}
                                    <div style={{ display: 'flex', gap: '12px', marginBottom: '28px', flexWrap: 'wrap', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', flex: 1, minWidth: '200px', paddingBottom: '4px' }}>
                                            {platformsUsed.map(t => {
                                                const on = archivePlatform === t.label;
                                                return (
                                                    <button key={t.label} onClick={() => setArchivePlatform(t.label)} style={{ background: on ? COLORS.surfaceHover : 'transparent', color: on ? COLORS.text : COLORS.textMuted, border: on ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent', padding: '10px 18px', borderRadius: '100px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                                        {t.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <button onClick={() => setArchiveSort(s => s === 'newest' ? 'oldest' : 'newest')} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: COLORS.textMuted, padding: '10px 18px', borderRadius: '100px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                                            <i className={`fas fa-arrow-${archiveSort === 'newest' ? 'down' : 'up'}-wide-short`}></i>
                                            {archiveSort === 'newest' ? 'Newest first' : 'Oldest first'}
                                        </button>
                                    </div>

                                    {shown.length === 0 ? (
                                        <div style={{ padding: '80px', textAlign: 'center', color: COLORS.textMuted, border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '24px', background: 'rgba(255,255,255,0.02)' }}>
                                            <i className="fas fa-box-open" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}></i>
                                            <div style={{ fontSize: '16px', fontWeight: '600' }}>No completed pools yet.</div>
                                            <div style={{ fontSize: '14px', marginTop: '8px', opacity: 0.8 }}>Pools land here once they fill up and every member is fulfilled.</div>
                                        </div>
                                    ) : (
                                        byMonth.map(bucket => (
                                            <div key={bucket.label} style={{ marginBottom: '36px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                                                    <div style={{ fontSize: '13px', fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '1px', whiteSpace: 'nowrap' }}>{bucket.label}</div>
                                                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', flex: 1 }}></div>
                                                    <div style={{ fontSize: '12px', color: COLORS.textMuted }}>{bucket.pools.length} pool{bucket.pools.length === 1 ? '' : 's'}</div>
                                                </div>

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                    {bucket.pools.map(pool => {
                                                        const open = expandedOrder === `arch_${pool.id}`;
                                                        return (
                                                        <div key={pool.id} style={{ background: COLORS.surface, border: `1px solid ${open ? COLORS.secondary + '55' : 'rgba(255,255,255,0.06)'}`, borderRadius: '20px', overflow: 'hidden', transition: 'border-color 0.2s' }}>
                                                            <div
                                                                onClick={() => setExpandedOrder(open ? null : `arch_${pool.id}`)}
                                                                style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', flexWrap: 'wrap' }}
                                                            >
                                                                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${COLORS.secondary}15`, color: COLORS.secondary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                    <i className="fas fa-check"></i>
                                                                </div>
                                                                <div style={{ flex: 1, minWidth: '160px' }}>
                                                                    <div style={{ fontSize: '16px', fontWeight: '800' }}>{pool.type?.name || 'Unknown pool'}</div>
                                                                    <div style={{ fontSize: '12px', color: COLORS.textMuted, marginTop: '3px' }}>
                                                                        Closed {safeFormat(pool.closedAt, 'MMM dd, yyyy')} • opened {safeFormat(pool.slot_date, 'MMM dd')}
                                                                    </div>
                                                                </div>
                                                                <div style={{ textAlign: 'right' }}>
                                                                    <div style={{ fontSize: '15px', fontWeight: '800', color: COLORS.primary }}>₹{pool.revenue.toLocaleString('en-IN')}</div>
                                                                    <div style={{ fontSize: '12px', color: COLORS.textMuted }}>{pool.paidCount}/{pool.maxMembers || '?'} members</div>
                                                                </div>
                                                                <div style={{ background: pool.allFulfilled ? `${COLORS.primary}22` : `${COLORS.secondary}22`, color: pool.allFulfilled ? COLORS.primary : COLORS.secondary, padding: '5px 12px', borderRadius: '100px', fontSize: '11px', fontWeight: '800', whiteSpace: 'nowrap' }}>
                                                                    {pool.allFulfilled ? 'FULFILLED' : `${pool.fulfilledCount}/${pool.paidCount} SENT`}
                                                                </div>
                                                                <i className={`fas fa-chevron-${open ? 'up' : 'down'}`} style={{ color: COLORS.textMuted, fontSize: '13px' }}></i>
                                                            </div>

                                                            {open && (
                                                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '20px 24px', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                                    {pool.members.filter(isPaidSeat).map(m => (
                                                                        <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px' }}>
                                                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: `linear-gradient(135deg, ${COLORS.primary}22, ${COLORS.secondary}22)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '14px', flexShrink: 0 }}>
                                                                                {(m.user?.full_name || m.display_name || 'U')[0].toUpperCase()}
                                                                            </div>
                                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                                <div style={{ fontSize: '14px', fontWeight: '700' }}>{m.user?.full_name || m.display_name || 'Anonymous'}</div>
                                                                                <div style={{ fontSize: '12px', color: COLORS.textMuted, overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.user?.mobile_number || 'No phone'} • {m.user?.email || 'No email'}</div>
                                                                            </div>
                                                                            <span style={{ fontSize: '10px', fontWeight: '800', padding: '4px 10px', borderRadius: '100px', whiteSpace: 'nowrap', color: m.status === 'done' ? COLORS.primary : COLORS.warning, background: m.status === 'done' ? `${COLORS.primary}22` : `${COLORS.warning}22` }}>
                                                                                {m.status === 'done' ? `SENT${m.fulfilled_at ? ' ' + safeFormat(m.fulfilled_at, 'MMM dd') : ''}` : 'NOT SENT'}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                );
                            })()}

                            {/* ─── REVENUE ENGINE VIEW ─── */}
                            {activeView === 'revenue' && (
                                <div style={{ animation: 'fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
                                        <div>
                                            <h2 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '8px', letterSpacing: '-1px' }}>Revenue Engine</h2>
                                            <p style={{ color: COLORS.textMuted, margin: 0, fontSize: '15px' }}>Track platform fees and manual revenue injections.</p>
                                        </div>
                                        <button onClick={() => exportToCSV(revenueData, 'Savify_Revenue')} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '12px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <i className="fas fa-download"></i> Export Revenue
                                        </button>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px' }}>
                                        
                                        {/* Manual Entry Form */}
                                        <div style={{ background: 'rgba(28, 28, 30, 0.6)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '32px', alignSelf: 'start' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${COLORS.secondary}22`, color: COLORS.secondary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                                                    <i className="fas fa-plus"></i>
                                                </div>
                                                <h3 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: '#fff' }}>Log Revenue</h3>
                                            </div>

                                            <form onSubmit={addManualRevenue}>
                                                <div style={{ marginBottom: '24px' }}>
                                                    <label style={{ display: 'block', fontSize: '13px', color: COLORS.textMuted, marginBottom: '12px', fontWeight: '600' }}>Amount (₹)</label>
                                                    <div style={{ position: 'relative' }}>
                                                        <span style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', fontSize: '24px', color: COLORS.textMuted, fontWeight: '800' }}>₹</span>
                                                        <input type="number" value={revAmount} onChange={(e) => setRevAmount(e.target.value)} placeholder="0.00" required style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '20px 20px 20px 50px', borderRadius: '16px', fontSize: '24px', fontWeight: '800', outline: 'none', transition: 'border-color 0.2s' }} onFocus={(e) => e.target.style.borderColor = COLORS.secondary} onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                                                    </div>
                                                </div>
                                                <div style={{ marginBottom: '32px' }}>
                                                    <label style={{ display: 'block', fontSize: '13px', color: COLORS.textMuted, marginBottom: '12px', fontWeight: '600' }}>Category</label>
                                                    <select value={revCategory} onChange={(e) => setRevCategory(e.target.value)} style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '16px', borderRadius: '16px', fontSize: '15px', outline: 'none', appearance: 'none' }}>
                                                        <option value="Platform Fee">Platform Fee (Blinkit)</option>
                                                        <option value="Cab Commission">Cab Commission</option>
                                                        <option value="Subscription">Subscription Cut</option>
                                                        <option value="Other">Other Injection</option>
                                                    </select>
                                                </div>
                                                <button type="submit" style={{ width: '100%', background: COLORS.secondary, color: '#fff', border: 'none', padding: '18px', borderRadius: '16px', fontWeight: '800', fontSize: '15px', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                                                    Inject Revenue to System
                                                </button>
                                            </form>
                                        </div>

                                        {/* Revenue Stats & Graph */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                                <div style={{ background: `linear-gradient(135deg, ${COLORS.surface} 0%, rgba(10, 132, 255, 0.1) 100%)`, border: `1px solid ${COLORS.secondary}33`, borderRadius: '24px', padding: '32px' }}>
                                                    <div style={{ fontSize: '14px', color: COLORS.secondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Net Revenue</div>
                                                    <div style={{ fontSize: '48px', fontWeight: '800', color: '#fff', letterSpacing: '-2px' }}>₹{totalRevenue.toLocaleString()}</div>
                                                </div>
                                                
                                                <div style={{ background: 'rgba(28, 28, 30, 0.6)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '32px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                                        <div style={{ fontSize: '14px', color: COLORS.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Milestone Progress</div>
                                                        <div style={{ fontSize: '14px', fontWeight: '800' }}>₹100k</div>
                                                    </div>
                                                    <div style={{ fontSize: '32px', fontWeight: '800', color: '#fff', marginBottom: '16px' }}>{Math.min(100, Math.round((totalRevenue / 100000) * 100))}%</div>
                                                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '100px', overflow: 'hidden' }}>
                                                        <div style={{ height: '100%', width: `${Math.min(100, (totalRevenue / 100000) * 100)}%`, background: COLORS.secondary, borderRadius: '100px' }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div style={{ background: 'rgba(28, 28, 30, 0.6)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '32px', flex: 1 }}>
                                                <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0, marginBottom: '32px' }}>Revenue Timeline</h3>
                                                <div style={{ height: '350px' }}>
                                                    {revenueData.length === 0 ? (
                                                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.textMuted }}>No revenue data logged yet.</div>
                                                    ) : (
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <BarChart data={generateChartData()}>
                                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                                                <XAxis dataKey="name" stroke={COLORS.textMuted} axisLine={false} tickLine={false} dy={10} />
                                                                <YAxis stroke={COLORS.textMuted} axisLine={false} tickLine={false} dx={-10} />
                                                                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} contentStyle={{ background: 'rgba(28, 28, 30, 0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} itemStyle={{ color: COLORS.secondary, fontWeight: 'bold' }} />
                                                                <Bar dataKey="revenue" name="Revenue (₹)" fill={COLORS.secondary} radius={[6, 6, 0, 0]} />
                                                            </BarChart>
                                                        </ResponsiveContainer>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {/* ─── TRANSACTIONS VIEW ─── */}
                            {activeView === 'transactions' && (
                                <div style={{ animation: 'fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
                                        <div>
                                            <h2 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '8px', letterSpacing: '-1px' }}>Gateway Logs</h2>
                                            <p style={{ color: COLORS.textMuted, margin: 0, fontSize: '15px' }}>Live feed of all payment gateway attempts via PhonePe.</p>
                                        </div>
                                        <button onClick={() => exportToCSV(phonepeTxns.map(t => ({ID: t.merchant_transaction_id, User: t.user?.full_name, Email: t.user?.email, Amount: t.amount, Status: t.status, Date: t.created_at})), 'Savify_Txns')} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '12px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <i className="fas fa-download"></i> Export Logs
                                        </button>
                                    </div>

                                    <div style={{ background: 'rgba(28, 28, 30, 0.6)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', overflow: 'hidden' }}>
                                        <div style={{ overflowX: 'auto' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                                                <thead>
                                                    <tr style={{ background: 'rgba(0,0,0,0.2)', color: COLORS.textMuted, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                                        <th style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: '700' }}>Timestamp</th>
                                                        <th style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: '700' }}>User Details</th>
                                                        <th style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: '700' }}>Context</th>
                                                        <th style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: '700' }}>Txn ID</th>
                                                        <th style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: '700' }}>Amount</th>
                                                        <th style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: '700' }}>Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {phonepeTxns.length === 0 && (
                                                        <tr><td colSpan="6" style={{ padding: '60px', textAlign: 'center', color: COLORS.textMuted }}>No gateway transactions found.</td></tr>
                                                    )}
                                                    {phonepeTxns.map(txn => (
                                                        <tr key={txn.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                                                            <td style={{ padding: '20px 24px', color: COLORS.textMuted, fontSize: '14px' }}>
                                                                {safeFormat(txn.created_at, 'MMM dd')} <br/>
                                                                <span style={{ fontSize: '12px', opacity: 0.7 }}>{safeFormat(txn.created_at, 'HH:mm')}</span>
                                                            </td>
                                                            <td style={{ padding: '20px 24px' }}>
                                                                <div style={{ fontWeight: '600', color: COLORS.text, fontSize: '15px' }}>{txn.user?.full_name || 'Anonymous'}</div>
                                                                <div style={{ fontSize: '13px', color: COLORS.textMuted, marginTop: '2px' }}>{txn.user?.email || 'N/A'}</div>
                                                            </td>
                                                            <td style={{ padding: '20px 24px' }}>
                                                                <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', textTransform: 'capitalize', fontWeight: '600' }}>
                                                                    {txn.context_type || 'General'}
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '20px 24px', fontFamily: 'monospace', fontSize: '13px', color: COLORS.textMuted }}>
                                                                {txn.merchant_transaction_id.substring(0, 16)}...
                                                            </td>
                                                            <td style={{ padding: '20px 24px', fontWeight: '800', fontSize: '16px', color: COLORS.text }}>₹{txn.amount}</td>
                                                            <td style={{ padding: '20px 24px' }}>
                                                                <span style={{ 
                                                                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                                    padding: '6px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: '700',
                                                                    background: txn.status === 'SUCCESS' ? `${COLORS.primary}15` : txn.status === 'FAILED' ? `${COLORS.danger}15` : `${COLORS.warning}15`,
                                                                    color: txn.status === 'SUCCESS' ? COLORS.primary : txn.status === 'FAILED' ? COLORS.danger : COLORS.warning,
                                                                    border: `1px solid ${txn.status === 'SUCCESS' ? COLORS.primary + '33' : txn.status === 'FAILED' ? COLORS.danger + '33' : COLORS.warning + '33'}`
                                                                }}>
                                                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }}></div>
                                                                    {txn.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
