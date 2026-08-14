import { useState, useCallback, useEffect } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';

const AppBlocker = registerPlugin('AppBlocker');

const STORAGE_KEY = 'savify_focus_schedule';

const DEFAULT_APPS = [
    { id: 'paytm', name: 'Paytm', icon: 'fas fa-wallet', color: '#00BAF2' },
    { id: 'phonepe', name: 'PhonePe', icon: 'fas fa-mobile-alt', color: '#5F259F' },
    { id: 'gpay', name: 'GPay', icon: 'fab fa-google', color: '#4285F4' },
    { id: 'cred', name: 'CRED', icon: 'fas fa-credit-card', color: '#000000' },
    { id: 'amazon', name: 'Amazon', icon: 'fab fa-amazon', color: '#FF9900' },
    { id: 'flipkart', name: 'Flipkart', icon: 'fas fa-shopping-cart', color: '#047BD5' },
    { id: 'myntra', name: 'Myntra', icon: 'fas fa-tshirt', color: '#FF3F6C' },
    { id: 'meesho', name: 'Meesho', icon: 'fas fa-shopping-bag', color: '#F43397' },
    { id: 'zomato', name: 'Zomato', icon: 'fas fa-utensils', color: '#CB202D' },
    { id: 'swiggy', name: 'Swiggy', icon: 'fas fa-hamburger', color: '#FC8019' },
    { id: 'blinkit', name: 'Blinkit', icon: 'fas fa-bolt', color: '#F1D302' },
    { id: 'zepto', name: 'Zepto', icon: 'fas fa-shopping-basket', color: '#4A1D96' },
    { id: 'youtube', name: 'YouTube', icon: 'fab fa-youtube', color: '#FF0000' },
];

function loadSchedule() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : null;
    } catch { return null; }
}

function saveSchedule(schedule) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schedule));
}

export function useFocusSchedule() {
    const [schedule, setSchedule] = useState(() => loadSchedule());
    const [isActive, setIsActive] = useState(false);
    const [showBlockScreen, setShowBlockScreen] = useState(false);
    const [permissions, setPermissions] = useState({
        drawOverApps: false,
        appDataUsage: false,
    });

    // Check if current time is within schedule
    useEffect(() => {
        if (!schedule?.startTime || !schedule?.endTime || !schedule?.active) {
            setIsActive(false);
            return;
        }
        const checkTime = () => {
            const now = new Date();
            const [sh, sm] = schedule.startTime.split(':').map(Number);
            const [eh, em] = schedule.endTime.split(':').map(Number);
            const nowMin = now.getHours() * 60 + now.getMinutes();
            const startMin = sh * 60 + sm;
            const endMin = eh * 60 + em;
            const inRange = startMin <= endMin
                ? (nowMin >= startMin && nowMin <= endMin)
                : (nowMin >= startMin || nowMin <= endMin);
            setIsActive(inRange);
        };
        checkTime();
        const interval = setInterval(checkTime, 30000);
        return () => clearInterval(interval);
    }, [schedule]);

    const startSchedule = useCallback(async (startTime, endTime, selectedApps) => {
        const newSchedule = { startTime, endTime, selectedApps, active: true, createdAt: Date.now() };
        setSchedule(newSchedule);
        saveSchedule(newSchedule);

        if (Capacitor.isNativePlatform()) {
            try {
                await AppBlocker.setSchedule({
                    apps: selectedApps.map(a => a.id),
                    startTime,
                    endTime,
                    active: true
                });
            } catch (e) { console.error("Native plugin error:", e); }
        }
    }, []);

    const stopSchedule = useCallback(async () => {
        const updated = { ...schedule, active: false };
        setSchedule(updated);
        saveSchedule(updated);
        setIsActive(false);

        if (Capacitor.isNativePlatform()) {
            try {
                await AppBlocker.setSchedule({
                    apps: [],
                    startTime: '',
                    endTime: '',
                    active: false
                });
            } catch (e) { console.error("Native plugin error:", e); }
        }
    }, [schedule]);

    const grantPermission = useCallback(async (perm) => {
        if (Capacitor.isNativePlatform()) {
            try {
                if (perm === 'appDataUsage') {
                    await AppBlocker.requestUsageStatsPermission();
                } else if (perm === 'drawOverApps') {
                    await AppBlocker.requestOverlayPermission();
                }
            } catch (e) {
                console.error("Failed to request permission natively:", e);
            }
        }
        setPermissions(prev => ({ ...prev, [perm]: true }));
    }, []);

    const triggerBlock = useCallback(() => {
        setShowBlockScreen(true);
    }, []);

    const dismissBlock = useCallback((action) => {
        setShowBlockScreen(false);
        // action = 'continue' or 'block'
        return action;
    }, []);

    return {
        schedule,
        isActive,
        showBlockScreen,
        permissions,
        availableApps: DEFAULT_APPS,
        startSchedule,
        stopSchedule,
        grantPermission,
        triggerBlock,
        dismissBlock,
    };
}
