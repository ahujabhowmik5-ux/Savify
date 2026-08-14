import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core'; // 🚀 Brought the Native checker back!

export function useAuth() {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signInWithGoogle = async (customRedirectUrl) => {
        // 🚀 THE AFTERNOON FIX: Check if we are on a phone, use Deep Link if true!
        const isNative = Capacitor.isNativePlatform();
        const defaultRedirect = isNative 
            ? 'savifyapplink://dashboard' 
            : 'https://savify.in/dashboard';

        const finalUrl = customRedirectUrl || defaultRedirect;
        
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: finalUrl,
                skipBrowserRedirect: true, // Internal app browser handling
                queryParams: {             // The coder's offline refresh tokens
                    access_type: 'offline',
                    prompt: 'consent'
                }
            }
        });

        if (error) throw error;

        // Open login in the internal app browser
        if (data?.url) {
            await Browser.open({ url: data.url });
        }

        return data;
    };

    const signOut = async () => {
        Object.keys(sessionStorage).forEach(k => { if (k.startsWith('savify')) sessionStorage.removeItem(k); });
        Object.keys(localStorage).forEach(k => { if (k.startsWith('savify') && k !== 'savify_admin_session') localStorage.removeItem(k); });
        await supabase.auth.signOut();
    };

    return { user, session, loading, signInWithGoogle, signOut };
}
