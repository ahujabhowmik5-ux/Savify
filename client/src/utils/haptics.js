import { Haptics, ImpactStyle } from '@capacitor/haptics';

/**
 * Triggers a light haptic feedback (ideal for standard button taps)
 */
export const triggerLightHaptic = async () => {
    try {
        await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) {
        // Fallback for web if capacitor plugin isn't available or fails
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(10);
        }
    }
};

/**
 * Triggers a medium haptic feedback (ideal for primary actions)
 */
export const triggerMediumHaptic = async () => {
    try {
        await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (e) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(20);
        }
    }
};

/**
 * Triggers a heavy haptic feedback (ideal for major state changes or destructive actions)
 */
export const triggerHeavyHaptic = async () => {
    try {
        await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (e) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(40);
        }
    }
};

/**
 * Triggers a success haptic pattern
 */
export const triggerSuccessHaptic = async () => {
    try {
        await Haptics.notification({ type: 'SUCCESS' });
    } catch (e) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([20, 50, 40]);
        }
    }
};

/**
 * Triggers an error haptic pattern
 */
export const triggerErrorHaptic = async () => {
    try {
        await Haptics.notification({ type: 'ERROR' });
    } catch (e) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([40, 50, 40, 50, 60]);
        }
    }
};
