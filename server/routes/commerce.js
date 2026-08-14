import express from 'express';

const router = express.Router();

// ══════════════════════════════════════════════════════════════
// Platform Fee Configurations (Research-backed, updated July 2026)
// 
// How real delivery fees work:
// 1. If cart total >= free_delivery_threshold → delivery_fee = ₹0 (STRICTLY)
// 2. If cart total < free_delivery_threshold → base delivery fee applies
// 3. Very small orders (< small_order_threshold) get an EXTRA surcharge
//    because platforms lose money on tiny orders
// 4. Rain/peak hours can trigger surge pricing on top of everything
// 5. Food platforms also have distance-based delivery fee tiers
// ══════════════════════════════════════════════════════════════
const PLATFORM_FEES = {
    blinkit: {
        name: 'Blinkit',
        free_delivery_threshold: 199,
        // Tiered delivery fees based on cart value (below free threshold)
        delivery_tiers: [
            { max_amount: 49,  fee: 45 },   // Very small cart — high fee
            { max_amount: 99,  fee: 35 },   // Small cart
            { max_amount: 149, fee: 25 },   // Medium cart
            { max_amount: 199, fee: 15 },   // Almost free
        ],
        platform_fee: 5,                    // Handling charge
        small_order_fee: 30,                // Extra surcharge on tiny orders
        small_order_threshold: 49,          // Below ₹49 triggers surcharge
        surge_extra: 15
    },
    zepto: {
        name: 'Zepto',
        free_delivery_threshold: 299,
        delivery_tiers: [
            { max_amount: 49,  fee: 49 },
            { max_amount: 99,  fee: 39 },
            { max_amount: 149, fee: 29 },
            { max_amount: 249, fee: 19 },
            { max_amount: 299, fee: 10 },
        ],
        platform_fee: 5,
        small_order_fee: 25,
        small_order_threshold: 49,
        surge_extra: 20
    },
    swiggy_instamart: {
        name: 'Swiggy Instamart',
        free_delivery_threshold: 199,
        delivery_tiers: [
            { max_amount: 49,  fee: 40 },
            { max_amount: 99,  fee: 30 },
            { max_amount: 149, fee: 20 },
            { max_amount: 199, fee: 10 },
        ],
        platform_fee: 10,                   // Handling fee ₹7-10
        small_order_fee: 25,
        small_order_threshold: 49,
        surge_extra: 15
    },
    amazon_fresh: {
        name: 'Amazon Fresh',
        free_delivery_threshold: 600,
        delivery_tiers: [
            { max_amount: 149, fee: 49 },
            { max_amount: 299, fee: 39 },
            { max_amount: 449, fee: 29 },
            { max_amount: 600, fee: 19 },
        ],
        platform_fee: 0,
        small_order_fee: 30,
        small_order_threshold: 99,
        surge_extra: 0                       // Amazon doesn't do surge
    },
    swiggy_food: {
        name: 'Swiggy',
        free_delivery_threshold: 149,
        delivery_tiers: [
            { max_amount: 49,  fee: 45 },   // Tiny food order
            { max_amount: 99,  fee: 35 },   // Small food order
            { max_amount: 149, fee: 25 },   // Base delivery
        ],
        platform_fee: 18,                   // ₹17.58 incl GST
        small_order_fee: 30,                // "Small order fee" shown on app
        small_order_threshold: 99,
        surge_extra: 20
    },
    zomato_food: {
        name: 'Zomato',
        free_delivery_threshold: 199,
        delivery_tiers: [
            { max_amount: 49,  fee: 50 },
            { max_amount: 99,  fee: 40 },
            { max_amount: 149, fee: 30 },
            { max_amount: 199, fee: 20 },
        ],
        platform_fee: 15,                   // ₹14.90 pre-GST
        small_order_fee: 30,
        small_order_threshold: 99,
        surge_extra: 20
    }
};

// ══════════════════════════════════════════════════════════════
// In-memory cache for surge status (5-minute TTL)
// ══════════════════════════════════════════════════════════════
const surgeCache = {};
const SURGE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getSurgeStatus(platform) {
    const cached = surgeCache[platform];
    if (cached && (Date.now() - cached.timestamp) < SURGE_CACHE_TTL) {
        return cached.isSurge;
    }
    return false; // default to no surge
}

/**
 * Check if current time is late night (11PM - 6AM IST)
 * Returns late night surcharge amount or 0
 */
function getLateNightSurcharge() {
    const now = new Date();
    // Convert to IST (UTC+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset + (now.getTimezoneOffset() * 60 * 1000));
    const hour = istTime.getHours();
    // 11PM (23) to 6AM (5) — late night window
    if (hour >= 23 || hour < 6) return 10; // ₹10 late night surcharge
    return 0;
}

/**
 * Check if current time is peak hour
 * Returns peak hour handling fee or 0
 */
function getPeakHourFee() {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset + (now.getTimezoneOffset() * 60 * 1000));
    const hour = istTime.getHours();
    // Lunch peak: 12PM-2PM, Dinner peak: 7PM-10PM
    if ((hour >= 12 && hour < 14) || (hour >= 19 && hour < 22)) return 5; // ₹5 peak handling
    return 0;
}

/**
 * Calculate the tiered delivery fee based on cart total.
 * Returns ₹0 if the total meets or exceeds the free delivery threshold.
 */
function calculateDeliveryFee(config, totalAmount) {
    // STRICT: Free delivery if threshold is met
    if (totalAmount >= config.free_delivery_threshold) {
        return 0;
    }

    // Find the correct tier
    for (const tier of config.delivery_tiers) {
        if (totalAmount <= tier.max_amount) {
            return tier.fee;
        }
    }

    // Fallback: last tier fee (should not reach here normally)
    return config.delivery_tiers[config.delivery_tiers.length - 1].fee;
}

// ══════════════════════════════════════════════════════════════
// POST /api/commerce/fee
// Calculate delivery fee for any supported platform
// Body: { platform: string, total_amount: number }
//
// Returns a SINGLE delivery_fee that includes small order surcharge,
// so the frontend doesn't need to handle two separate fee fields.
// ══════════════════════════════════════════════════════════════
router.post('/fee', async (req, res) => {
    const { platform, total_amount = 0 } = req.body;

    if (!platform || !PLATFORM_FEES[platform]) {
        return res.status(400).json({
            success: false,
            error: `Unsupported platform: ${platform}. Supported: ${Object.keys(PLATFORM_FEES).join(', ')}`
        });
    }

    const config = PLATFORM_FEES[platform];
    const isSurge = getSurgeStatus(platform);
    const lateNightSurcharge = getLateNightSurcharge();
    const peakHourFee = getPeakHourFee();

    // Step 1: Calculate tiered delivery fee (₹0 if above threshold)
    let delivery_fee = calculateDeliveryFee(config, total_amount);

    // Step 2: Small order surcharge — ONLY if delivery is NOT free
    let small_order_fee = 0;
    if (delivery_fee > 0 && config.small_order_threshold > 0 && total_amount < config.small_order_threshold) {
        small_order_fee = config.small_order_fee;
    }

    // Step 3: Surge pricing — ONLY if delivery is NOT free
    if (delivery_fee > 0 && isSurge) {
        delivery_fee += config.surge_extra;
    }

    // Step 4: Late night surcharge — applies regardless of free delivery
    // (Blinkit/Zepto charge this even with free delivery)
    const total_late_night = lateNightSurcharge;

    // Step 5: Combine delivery + small order fee into one unified delivery_fee
    const total_delivery_fee = delivery_fee + small_order_fee + total_late_night;

    const platform_fee = config.platform_fee + peakHourFee;

    return res.json({
        success: true,
        platform: config.name,
        delivery_fee: total_delivery_fee,
        delivery_fee_breakdown: {
            base_delivery: delivery_fee,
            small_order_surcharge: small_order_fee,
            late_night_surcharge: total_late_night,
            peak_hour_handling: peakHourFee
        },
        platform_fee,
        is_surge: isSurge,
        is_late_night: lateNightSurcharge > 0,
        is_peak_hour: peakHourFee > 0,
        free_delivery_threshold: config.free_delivery_threshold,
        total_amount,
        amount_to_free_delivery: Math.max(config.free_delivery_threshold - total_amount, 0)
    });
});

// ══════════════════════════════════════════════════════════════
// GET /api/commerce/platforms
// Returns all platform configurations (for frontend display)
// ══════════════════════════════════════════════════════════════
router.get('/platforms', (req, res) => {
    const platforms = Object.entries(PLATFORM_FEES).map(([key, config]) => ({
        id: key,
        name: config.name,
        free_delivery_threshold: config.free_delivery_threshold,
        platform_fee: config.platform_fee
    }));
    res.json({ success: true, platforms });
});

// ══════════════════════════════════════════════════════════════
// GET /api/commerce/fee/:platform
// Quick initial fee fetch for a platform (no total_amount needed)
// Used by frontend to pre-populate delivery fee info on store open
// ══════════════════════════════════════════════════════════════
router.get('/fee/:platform', (req, res) => {
    const { platform } = req.params;
    const config = PLATFORM_FEES[platform];
    if (!config) {
        return res.status(400).json({ success: false, error: `Unknown platform: ${platform}` });
    }
    const lateNightSurcharge = getLateNightSurcharge();
    const peakHourFee = getPeakHourFee();
    const isSurge = getSurgeStatus(platform);

    // Default delivery fee for new pool (assume ₹0 cart)
    let baseFee = config.delivery_tiers[0]?.fee || 25;
    if (isSurge) baseFee += config.surge_extra;

    res.json({
        success: true,
        platform: config.name,
        delivery_fee: baseFee + lateNightSurcharge,
        platform_fee: config.platform_fee + peakHourFee,
        free_delivery_threshold: config.free_delivery_threshold,
        is_surge: isSurge,
        is_late_night: lateNightSurcharge > 0,
        is_peak_hour: peakHourFee > 0
    });
});

export default router;
