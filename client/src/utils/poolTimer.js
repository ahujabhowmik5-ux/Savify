// ══════════════════════════════════════════════════════════════
// Quick-commerce pool timing
// ══════════════════════════════════════════════════════════════
// A pool runs in two phases:
//
//   1. Main window (15 min) — the countdown users see when they join.
//   2. Buffer (10 min)      — a red overtime countdown. The pool is still
//                             joinable and payable; nothing auto-completes yet.
//
// The pool only closes once the buffer runs out without the free-delivery
// threshold being met. Splitting it this way gives a pool a hard 15-minute
// promise while still letting late joiners top it over the threshold.

export const POOL_WINDOW_MINUTES = 15;
export const POOL_BUFFER_MINUTES = 10;

const MINUTE_MS = 60 * 1000;
export const POOL_WINDOW_MS = POOL_WINDOW_MINUTES * MINUTE_MS;
export const POOL_BUFFER_MS = POOL_BUFFER_MINUTES * MINUTE_MS;

/**
 * The hard deadline for a cart.
 * Falls back to expires_at + buffer for rows written before
 * supabase_pool_buffer_timer.sql was applied, so the two-phase timer works
 * whether or not the migration has run yet.
 */
export function poolHardDeadline(cart) {
    if (!cart) return null;
    if (cart.buffer_expires_at) return new Date(cart.buffer_expires_at);
    if (cart.expires_at) return new Date(new Date(cart.expires_at).getTime() + POOL_BUFFER_MS);
    return null;
}

/** The end of the visible 15-minute window. */
export function poolWindowDeadline(cart) {
    if (!cart?.expires_at) return null;
    return new Date(cart.expires_at);
}

/** mm:ss for a millisecond remainder, clamped at 00:00. */
export function formatCountdown(ms) {
    if (!Number.isFinite(ms) || ms <= 0) return '00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Current phase of a cart's life.
 *   { phase: 'window' | 'buffer' | 'ended', timeLeft, msLeft }
 */
export function poolTimerState(cart, now = new Date()) {
    const windowEnd = poolWindowDeadline(cart);
    const hardEnd = poolHardDeadline(cart);
    if (!windowEnd || !hardEnd) {
        return { phase: 'window', timeLeft: '', msLeft: null };
    }

    const toWindow = windowEnd.getTime() - now.getTime();
    if (toWindow > 0) {
        return { phase: 'window', timeLeft: formatCountdown(toWindow), msLeft: toWindow };
    }

    const toHard = hardEnd.getTime() - now.getTime();
    if (toHard > 0) {
        return { phase: 'buffer', timeLeft: formatCountdown(toHard), msLeft: toHard };
    }

    return { phase: 'ended', timeLeft: '00:00', msLeft: 0 };
}
