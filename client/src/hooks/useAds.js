import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

export function useAds() {
    const [ads, setAds] = useState({ ad1: null, ad2: null, ad3: null });
    const [loading, setLoading] = useState(true);

    const fetchAds = useCallback(async () => {
        try {
            const [r1, r2, r3] = await Promise.all([
                supabase.from('promotions').select('*').limit(1).maybeSingle(),
                supabase.from('promotions2').select('*').limit(1).maybeSingle(),
                supabase.from('promotions3').select('*').limit(1).maybeSingle(),
            ]);
            setAds({
                ad1: r1.data || null,
                ad2: r2.data || null,
                ad3: r3.data || null,
            });
        } catch (e) {
            console.error('Ads fetch error:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAds(); }, [fetchAds]);

    const handleAdClick = useCallback(async (ad) => {
        if (!ad) return;

        // Read URLs from supabase columns
        const rawUrl = ad.link_url || ad.app_link || ad.web_link || ad.link || ad.url
                     || ad.action_url || ad.redirect_url || ad.cta_link;
        const fallbackUrl = ad.fallback_url || null;

        if (!rawUrl && !fallbackUrl) {
            console.warn('Ad has no clickable URL. Ad data:', ad);
            if (ad.title) {
                alert(`📢 ${ad.title}\n\n${ad.description || ''}`);
            }
            return;
        }

        // Resolve the final HTTPS URL to open
        let finalUrl = '';
        const rawTrimmed = (rawUrl || '').trim();
        const isDeepLink = rawTrimmed && !/^https?:\/\//i.test(rawTrimmed);

        if (isDeepLink) {
            // link_url is a deep link (e.g. instagram://user?username=savify.app)
            // Deep links DON'T work in Chrome Custom Tabs or window.open
            // Always use fallback_url (the HTTPS version) instead
            if (fallbackUrl) {
                finalUrl = fallbackUrl.trim();
            } else if (rawTrimmed.startsWith('instagram://')) {
                // Manual conversion as last resort
                const usernameMatch = rawTrimmed.match(/username=([^&]+)/);
                finalUrl = usernameMatch ? `https://instagram.com/${usernameMatch[1]}` : 'https://instagram.com';
            } else {
                finalUrl = rawTrimmed; // nothing we can do, try as-is
            }
        } else {
            finalUrl = rawTrimmed || (fallbackUrl || '').trim();
        }

        // Ensure https:// prefix for plain domains like "google.com"
        if (finalUrl && !/^https?:\/\//i.test(finalUrl) && !/^[a-z0-9-]+:\/\//i.test(finalUrl)) {
            finalUrl = 'https://' + finalUrl;
        }

        if (!finalUrl) return;

        // Open the resolved HTTPS URL
        try {
            if (Capacitor.isNativePlatform()) {
                // Browser.open() launches Chrome Custom Tabs — works perfectly with HTTPS URLs
                await Browser.open({ url: finalUrl });
            } else {
                const newWin = window.open(finalUrl, '_blank');
                if (!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
                    window.location.href = finalUrl;
                }
            }
        } catch (e) {
            console.error('Redirect error, forcing location change:', e);
            window.location.href = finalUrl;
        }
    }, []);

    return { ads, loading, handleAdClick };
}
