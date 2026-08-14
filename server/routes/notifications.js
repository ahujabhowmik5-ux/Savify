import express from 'express';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Generate VAPID keys once and store in env vars
// To generate: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:support@savify.app';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// ══════════════════════════════════════════════════════════════
// GET /api/notifications/vapid-key
// Return the public VAPID key for client subscription
// ══════════════════════════════════════════════════════════════
router.get('/vapid-key', (req, res) => {
    if (!VAPID_PUBLIC_KEY) {
        return res.status(500).json({ success: false, error: 'VAPID keys not configured' });
    }
    res.json({ success: true, publicKey: VAPID_PUBLIC_KEY });
});

// ══════════════════════════════════════════════════════════════
// POST /api/notifications/register
// Register a push subscription for a user
// Body: { user_id, subscription: { endpoint, keys: { p256dh, auth } }, latitude, longitude }
// ══════════════════════════════════════════════════════════════
router.post('/register', async (req, res) => {
    const { user_id, subscription, latitude, longitude } = req.body;

    if (!user_id || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    try {
        // Upsert — replace existing subscription for this user
        const { error } = await supabase
            .from('push_subscriptions')
            .upsert({
                user_id,
                endpoint: subscription.endpoint,
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
                latitude: latitude || null,
                longitude: longitude || null
            }, { onConflict: 'user_id' });

        if (error) throw error;

        res.json({ success: true });
    } catch (err) {
        console.error('Error registering push subscription:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ══════════════════════════════════════════════════════════════
// POST /api/notifications/update-location
// Update a user's location for proximity notifications
// Body: { user_id, latitude, longitude }
// ══════════════════════════════════════════════════════════════
router.post('/update-location', async (req, res) => {
    const { user_id, latitude, longitude } = req.body;

    if (!user_id || latitude == null || longitude == null) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    try {
        const { error } = await supabase
            .from('push_subscriptions')
            .update({ latitude, longitude })
            .eq('user_id', user_id);

        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        console.error('Error updating location:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ══════════════════════════════════════════════════════════════
// POST /api/notifications/send-nearby
// Send push notification to all users within 100m radius
// Body: { latitude, longitude, platform, creator_id, pool_id }
// ══════════════════════════════════════════════════════════════
router.post('/send-nearby', async (req, res) => {
    const { latitude, longitude, platform, creator_id, pool_id } = req.body;

    if (!latitude || !longitude || !platform) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
        return res.json({ success: true, sent: 0, message: 'VAPID keys not configured, skipping push' });
    }

    try {
        // Find all subscriptions within ~100m radius
        // Using Haversine approximation: 0.001 degrees ≈ 111 meters
        const RADIUS_DEGREES = 0.001; // ~111m

        const { data: nearbyUsers, error } = await supabase
            .from('push_subscriptions')
            .select('*')
            .gte('latitude', latitude - RADIUS_DEGREES)
            .lte('latitude', latitude + RADIUS_DEGREES)
            .gte('longitude', longitude - RADIUS_DEGREES)
            .lte('longitude', longitude + RADIUS_DEGREES)
            .neq('user_id', creator_id); // Don't notify the creator

        if (error) throw error;

        if (!nearbyUsers || nearbyUsers.length === 0) {
            return res.json({ success: true, sent: 0 });
        }

        // More precise 100m filter using Haversine formula
        const EARTH_RADIUS_M = 6371000;
        const toRad = (deg) => deg * Math.PI / 180;

        const withinRadius = nearbyUsers.filter(user => {
            const dLat = toRad(user.latitude - latitude);
            const dLng = toRad(user.longitude - longitude);
            const a = Math.sin(dLat / 2) ** 2 +
                Math.cos(toRad(latitude)) * Math.cos(toRad(user.latitude)) *
                Math.sin(dLng / 2) ** 2;
            const distance = 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
            return distance <= 100; // 100 meters
        });

        const platformNames = {
            blinkit: 'Blinkit',
            zepto: 'Zepto',
            swiggy_instamart: 'Swiggy Instamart',
            amazon_fresh: 'Amazon Fresh',
            swiggy_food: 'Swiggy',
            zomato_food: 'Zomato'
        };

        const platformName = platformNames[platform] || platform;

        const payload = JSON.stringify({
            title: `${platformName} Pool Started! 🛒`,
            body: `Someone near you started a ${platformName} pool. Join to split delivery fees!`,
            data: { pool_id, platform, url: '/' }
        });

        let sentCount = 0;
        const sendPromises = withinRadius.map(async (user) => {
            const subscription = {
                endpoint: user.endpoint,
                keys: { p256dh: user.p256dh, auth: user.auth }
            };
            try {
                await webpush.sendNotification(subscription, payload);
                sentCount++;
            } catch (err) {
                // If subscription is expired/invalid, remove it
                if (err.statusCode === 404 || err.statusCode === 410) {
                    await supabase.from('push_subscriptions').delete().eq('id', user.id);
                }
                console.error(`Push failed for user ${user.user_id}:`, err.statusCode || err.message);
            }
        });

        await Promise.allSettled(sendPromises);

        res.json({ success: true, sent: sentCount, nearby: withinRadius.length });
    } catch (err) {
        console.error('Error sending nearby notifications:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
