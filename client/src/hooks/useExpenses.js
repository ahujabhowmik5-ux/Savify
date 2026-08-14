import { useState, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { APP_START_DATE } from '../utils/helpers';

export function useExpenses(userId) {
    const [expenses, setExpenses] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading] = useState(false);

    const fetchExpenses = useCallback(async () => {
        if (!userId) return [];
        const { data } = await supabase.from('expenses')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        const all = data || [];
        setExpenses(all);
        return all;
    }, [userId]);

    const fetchHistory = useCallback(async () => {
        if (!userId) return;
        const { data } = await supabase.from('expenses')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10);
        setHistory(data || []);
    }, [userId]);

    const addExpense = useCallback(async (amount, category, description) => {
        if (!userId) throw new Error('No user');
        
        // Optimistic update: add to local state immediately so charts update instantly
        const optimisticExpense = {
            id: `temp_${Date.now()}`,
            user_id: userId,
            amount,
            category,
            description,
            created_at: new Date().toISOString(),
        };
        setExpenses(prev => [optimisticExpense, ...prev]);

        const { data, error } = await supabase.from('expenses').insert([{
            user_id: userId,
            amount,
            category,
            description
        }]).select().single();
        
        if (error) {
            // Rollback optimistic update on error
            setExpenses(prev => prev.filter(e => e.id !== optimisticExpense.id));
            throw error;
        }
        
        // Replace optimistic entry with real DB entry
        if (data) {
            setExpenses(prev => prev.map(e => e.id === optimisticExpense.id ? data : e));
        }
    }, [userId]);

    const getFilteredExpenses = useCallback(() => {
        return expenses.filter(exp => new Date(exp.created_at) >= APP_START_DATE);
    }, [expenses]);

    const calculateStreak = useCallback(async () => {
        if (!userId) return 0;
        const { data } = await supabase.from('expenses')
            .select('created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (!data || data.length === 0) return 0;

        // Use local timezone dates to avoid UTC midnight issues
        const toLocalDateStr = (date) => {
            const d = new Date(date);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        };

        const dates = new Set(data.map(e => toLocalDateStr(e.created_at)));
        let streak = 0;
        let d = new Date();
        const todayStr = toLocalDateStr(d);
        // If no expense today, check from yesterday
        if (!dates.has(todayStr)) {
            d.setDate(d.getDate() - 1);
            if (!dates.has(toLocalDateStr(d))) return 0;
        }
        while (dates.has(toLocalDateStr(d))) { streak++; d.setDate(d.getDate() - 1); }
        return streak;
    }, [userId]);

    return {
        expenses,
        history,
        loading,
        fetchExpenses,
        fetchHistory,
        addExpense,
        getFilteredExpenses,
        calculateStreak
    };
}
