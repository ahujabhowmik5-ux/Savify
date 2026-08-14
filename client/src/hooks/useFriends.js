import { useState, useCallback } from 'react';
import { supabase } from '../config/supabase';

const FRIENDS_BATCH_SIZE = 100;

export function useFriends(userId) {
    const [friends, setFriends] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [offset, setOffset] = useState(0);

    const fetchFriends = useCallback(async (collegeName, isLoadMore = false) => {
        if (!collegeName || !userId) return;
        setLoading(true);

        const currentOffset = isLoadMore ? offset : 0;
        const start = currentOffset;
        const end = currentOffset + FRIENDS_BATCH_SIZE - 1;

        try {
            const { data, error } = await supabase.from('user_applications')
                .select('full_name')
                .eq('college', collegeName)
                .neq('user_id', userId)
                .order('priority_score', { ascending: false })
                .order('full_name', { ascending: true })
                .range(start, end);

            if (error) throw error;

            if (isLoadMore) {
                setFriends(prev => [...prev, ...(data || [])]);
            } else {
                setFriends(data || []);
            }

            const newOffset = currentOffset + (data?.length || 0);
            setOffset(newOffset);
            setHasMore((data?.length || 0) === FRIENDS_BATCH_SIZE);
        } catch (e) {
            console.error('Friend fetch error', e);
            if (!isLoadMore) setFriends([]);
        } finally {
            setLoading(false);
        }
    }, [userId, offset]);

    return { friends, loading, hasMore, fetchFriends };
}
