import { useEffect, useRef } from 'react';
import { supabase } from '../config/supabase';

export function useRealtime(userId, onExpenseChange, onProfileChange) {
    const channelRef = useRef(null);
    // Use a ref to hold the latest callbacks, preventing re-subscriptions
    const callbacksRef = useRef({ onExpenseChange, onProfileChange });

    // Update refs on every render without triggering the websocket useEffect
    useEffect(() => {
        callbacksRef.current = { onExpenseChange, onProfileChange };
    }, [onExpenseChange, onProfileChange]);

    useEffect(() => {
        if (!userId) return;

        const channel = supabase.channel(`public:dashboard_updates:${userId}`);

        channel
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'expenses', filter: `user_id=eq.${userId}` },
                (payload) => {
                    console.log('💸 Expense detected! Refreshing...');
                    // Call from the ref to always get the latest function
                    if (callbacksRef.current.onExpenseChange) callbacksRef.current.onExpenseChange(payload);
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'user_applications', filter: `user_id=eq.${userId}` },
                (payload) => {
                    console.log('👤 Profile updated! Refreshing...');
                    if (callbacksRef.current.onProfileChange) callbacksRef.current.onProfileChange(payload);
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Realtime Connected');
                }
            });

        channelRef.current = channel;

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }
        };
    }, [userId]); // ONLY run this when userId changes!
}
