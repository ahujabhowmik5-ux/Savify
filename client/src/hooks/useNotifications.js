import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to manage Web Push Notifications.
 * Handles permission, subscription, and registration with backend.
 */
export function useNotifications(userId, userLocation) {
    const [permission, setPermission] = useState('default');
    const [isSubscribed, setIsSubscribed] = useState(false);

    useEffect(() => {
        if ('Notification' in window) {
            setPermission(Notification.permission);
        }
    }, []);

    // Update location on backend whenever it changes
    useEffect(() => {
        if (!userId || !userLocation?.lat || !userLocation?.lng || !isSubscribed) return;
        fetch('/api/notifications/update-location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                latitude: userLocation.lat,
                longitude: userLocation.lng
            })
        }).catch(e => console.error('Location update failed:', e));
    }, [userId, userLocation?.lat, userLocation?.lng, isSubscribed]);

    const subscribe = useCallback(async () => {
        if (!userId) return false;
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.warn('Push notifications not supported');
            return false;
        }

        try {
            // Request permission
            const perm = await Notification.requestPermission();
            setPermission(perm);
            if (perm !== 'granted') return false;

            // Register service worker
            const registration = await navigator.serviceWorker.register('/sw.js');
            await navigator.serviceWorker.ready;

            // Get VAPID key
            const vapidRes = await fetch('/api/notifications/vapid-key');
            const vapidData = await vapidRes.json();
            if (!vapidData.success) {
                console.warn('VAPID keys not configured on server');
                return false;
            }

            // Subscribe
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidData.publicKey)
            });

            // Register with backend
            const regRes = await fetch('/api/notifications/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    subscription: subscription.toJSON(),
                    latitude: userLocation?.lat || null,
                    longitude: userLocation?.lng || null
                })
            });
            const regData = await regRes.json();

            if (regData.success) {
                setIsSubscribed(true);
                return true;
            }
        } catch (err) {
            console.error('Push subscription failed:', err);
        }
        return false;
    }, [userId, userLocation]);

    return { permission, isSubscribed, subscribe };
}

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}
