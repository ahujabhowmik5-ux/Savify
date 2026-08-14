import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../config/supabase';

export function useAdminMetrics() {
    const [metrics, setMetrics] = useState(null);
    const [dailySignups, setDailySignups] = useState([]);
    const [dailyExpenses, setDailyExpenses] = useState([]);
    const [categoryBreakdown, setCategoryBreakdown] = useState([]);
    const [recentUsers, setRecentUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastRefreshed, setLastRefreshed] = useState(null);
    const midnightTimer = useRef(null);

    const fetchAll = useCallback(async () => {
        try {
            setError(null);
            const [metricsRes, signupsRes, expensesRes, catRes, usersRes] = await Promise.all([
                supabase.rpc('admin_get_metrics'),
                supabase.rpc('admin_get_daily_signups', { days_back: 30 }),
                supabase.rpc('admin_get_daily_expenses', { days_back: 30 }),
                supabase.rpc('admin_get_category_breakdown'),
                supabase.rpc('admin_get_recent_users', { lim: 25 }),
            ]);

            if (metricsRes.error) throw metricsRes.error;
            setMetrics(metricsRes.data);
            setDailySignups(signupsRes.data || []);
            setDailyExpenses(expensesRes.data || []);
            setCategoryBreakdown(catRes.data || []);
            setRecentUsers(usersRes.data || []);
            setLastRefreshed(new Date());
        } catch (err) {
            setError(err.message || 'Failed to fetch metrics');
            console.error('[Admin] Metrics error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Real-time: re-fetch on new user signups & new expenses
    useEffect(() => {
        const userCh = supabase
            .channel('admin-rt-users')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_applications' }, () => fetchAll())
            .subscribe();

        const expCh = supabase
            .channel('admin-rt-expenses')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'expenses' }, () => fetchAll())
            .subscribe();

        return () => {
            supabase.removeChannel(userCh);
            supabase.removeChannel(expCh);
        };
    }, [fetchAll]);

    // Midnight auto-refresh
    useEffect(() => {
        const scheduleMidnight = () => {
            const now = new Date();
            const next = new Date(now);
            next.setHours(24, 0, 0, 0);
            const ms = next.getTime() - now.getTime();
            midnightTimer.current = setTimeout(() => {
                fetchAll();
                scheduleMidnight();
            }, ms);
        };
        scheduleMidnight();
        return () => clearTimeout(midnightTimer.current);
    }, [fetchAll]);

    return { metrics, dailySignups, dailyExpenses, categoryBreakdown, recentUsers, loading, error, lastRefreshed, refetch: fetchAll };
}
