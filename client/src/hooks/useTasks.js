import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * 60 Daily Tasks — 2 shown per day, cycling every 30 days.
 * Tasks are deterministically selected based on the day of the year
 * so all users see the same tasks on the same day.
 * 
 * Categories: saving, mindfulness, tracking, social, learning
 */
const ALL_TASKS = [
    // --- SAVING (15) ---
    { id: 1, text: 'Skip one unnecessary purchase today', category: 'saving', points: 10, icon: 'fa-ban' },
    { id: 2, text: 'Cook at home instead of ordering food', category: 'saving', points: 15, icon: 'fa-utensils' },
    { id: 3, text: 'Use public transport instead of a cab', category: 'saving', points: 10, icon: 'fa-bus' },
    { id: 4, text: 'Carry a water bottle — skip buying drinks', category: 'saving', points: 5, icon: 'fa-tint' },
    { id: 5, text: 'Unsubscribe from one unused subscription', category: 'saving', points: 20, icon: 'fa-times-circle' },
    { id: 6, text: 'Avoid online shopping apps for 24 hours', category: 'saving', points: 15, icon: 'fa-shopping-cart' },
    { id: 7, text: 'Pack lunch from home today', category: 'saving', points: 10, icon: 'fa-briefcase' },
    { id: 8, text: 'Set a ₹200 daily spending limit for today', category: 'saving', points: 10, icon: 'fa-hand-holding-usd' },
    { id: 9, text: 'Find a free alternative to something you\'d buy', category: 'saving', points: 15, icon: 'fa-lightbulb' },
    { id: 10, text: 'Delay a purchase by 48 hours before deciding', category: 'saving', points: 20, icon: 'fa-clock' },
    { id: 11, text: 'Compare prices before your next purchase', category: 'saving', points: 10, icon: 'fa-balance-scale' },
    { id: 12, text: 'Use a coupon or discount code today', category: 'saving', points: 10, icon: 'fa-tag' },
    { id: 13, text: 'Spend ₹0 on entertainment today', category: 'saving', points: 15, icon: 'fa-film' },
    { id: 14, text: 'Walk instead of taking a ride for short trips', category: 'saving', points: 10, icon: 'fa-walking' },
    { id: 15, text: 'Challenge: keep today\'s spending under ₹100', category: 'saving', points: 25, icon: 'fa-trophy' },

    // --- TRACKING (15) ---
    { id: 16, text: 'Log every single expense today — no skipping', category: 'tracking', points: 10, icon: 'fa-clipboard-check' },
    { id: 17, text: 'Review your last 5 transactions for accuracy', category: 'tracking', points: 10, icon: 'fa-search' },
    { id: 18, text: 'Check your weekly budget progress', category: 'tracking', points: 5, icon: 'fa-chart-bar' },
    { id: 19, text: 'Log an expense within 1 minute of making it', category: 'tracking', points: 15, icon: 'fa-bolt' },
    { id: 20, text: 'Categorize all expenses correctly today', category: 'tracking', points: 10, icon: 'fa-tags' },
    { id: 21, text: 'Take a screenshot of your spending analysis', category: 'tracking', points: 10, icon: 'fa-camera' },
    { id: 22, text: 'Visit the Deep Dive page and review insights', category: 'tracking', points: 10, icon: 'fa-chart-area' },
    { id: 23, text: 'Check which category has the highest spending', category: 'tracking', points: 5, icon: 'fa-chart-pie' },
    { id: 24, text: 'Log at least 3 expenses today', category: 'tracking', points: 15, icon: 'fa-list-ol' },
    { id: 25, text: 'Add a description to your next expense', category: 'tracking', points: 5, icon: 'fa-pen' },
    { id: 26, text: 'Check your Balance Score and note it', category: 'tracking', points: 5, icon: 'fa-star' },
    { id: 27, text: 'Review your spending trend for the week', category: 'tracking', points: 10, icon: 'fa-chart-line' },
    { id: 28, text: 'Log at least one expense before noon', category: 'tracking', points: 10, icon: 'fa-sun' },
    { id: 29, text: 'End the day with all expenses logged', category: 'tracking', points: 15, icon: 'fa-check-double' },
    { id: 30, text: 'Identify your most expensive purchase today', category: 'tracking', points: 5, icon: 'fa-arrow-up' },

    // --- MINDFULNESS (15) ---
    { id: 31, text: 'Before buying, ask: "Do I need this or want this?"', category: 'mindfulness', points: 10, icon: 'fa-brain' },
    { id: 32, text: 'Write down 3 things you\'re grateful for (free things)', category: 'mindfulness', points: 10, icon: 'fa-heart' },
    { id: 33, text: 'Pause for 10 seconds before every purchase today', category: 'mindfulness', points: 10, icon: 'fa-pause-circle' },
    { id: 34, text: 'Identify one emotional spending trigger today', category: 'mindfulness', points: 15, icon: 'fa-exclamation-triangle' },
    { id: 35, text: 'Plan tomorrow\'s spending tonight', category: 'mindfulness', points: 15, icon: 'fa-calendar-check' },
    { id: 36, text: 'Reflect: what was your best financial decision this week?', category: 'mindfulness', points: 10, icon: 'fa-medal' },
    { id: 37, text: 'Set one financial micro-goal for this week', category: 'mindfulness', points: 15, icon: 'fa-bullseye' },
    { id: 38, text: 'Think about where you want to be financially in 1 year', category: 'mindfulness', points: 10, icon: 'fa-rocket' },
    { id: 39, text: 'Notice one thing you almost bought but didn\'t', category: 'mindfulness', points: 10, icon: 'fa-eye' },
    { id: 40, text: 'Rate your spending mood today: happy, stressed, or neutral?', category: 'mindfulness', points: 5, icon: 'fa-smile' },
    { id: 41, text: 'Visualize your savings growing for 2 minutes', category: 'mindfulness', points: 5, icon: 'fa-seedling' },
    { id: 42, text: 'Identify your "spending weakness" category', category: 'mindfulness', points: 10, icon: 'fa-crosshairs' },
    { id: 43, text: 'Practice saying "I\'ll think about it" to one purchase', category: 'mindfulness', points: 10, icon: 'fa-comment' },
    { id: 44, text: 'Journal: What did I spend on that wasn\'t worth it?', category: 'mindfulness', points: 15, icon: 'fa-book' },
    { id: 45, text: 'Celebrate a small financial win from this week', category: 'mindfulness', points: 5, icon: 'fa-glass-cheers' },

    // --- SOCIAL (8) ---
    { id: 46, text: 'Share Savify with a friend who needs it', category: 'social', points: 20, icon: 'fa-share-alt' },
    { id: 47, text: 'Create or join a team for group expenses', category: 'social', points: 15, icon: 'fa-users' },
    { id: 48, text: 'Check your rank on the leaderboard', category: 'social', points: 5, icon: 'fa-crown' },
    { id: 49, text: 'Invite a campus mate to Savify', category: 'social', points: 15, icon: 'fa-user-plus' },
    { id: 50, text: 'Discuss budgeting tips with a friend today', category: 'social', points: 10, icon: 'fa-comments' },
    { id: 51, text: 'Share your Balance Score with a friend', category: 'social', points: 10, icon: 'fa-trophy' },
    { id: 52, text: 'Help a friend set up their weekly budget', category: 'social', points: 15, icon: 'fa-hands-helping' },
    { id: 53, text: 'Start a no-spend challenge with a friend', category: 'social', points: 20, icon: 'fa-fire' },

    // --- LEARNING (7) ---
    { id: 54, text: 'Learn: What is compound interest? (Google it)', category: 'learning', points: 10, icon: 'fa-graduation-cap' },
    { id: 55, text: 'Read one article about personal finance', category: 'learning', points: 15, icon: 'fa-newspaper' },
    { id: 56, text: 'Learn the 50-30-20 budgeting rule', category: 'learning', points: 10, icon: 'fa-book-open' },
    { id: 57, text: 'Watch a 5-min video about saving money', category: 'learning', points: 10, icon: 'fa-play-circle' },
    { id: 58, text: 'Learn: What is an emergency fund?', category: 'learning', points: 10, icon: 'fa-shield-alt' },
    { id: 59, text: 'Research: What are index funds?', category: 'learning', points: 15, icon: 'fa-chart-line' },
    { id: 60, text: 'Learn about the difference between SIP and lump sum', category: 'learning', points: 15, icon: 'fa-coins' },
];

const STORAGE_KEY = 'savify_daily_tasks';
const HISTORY_KEY = 'savify_tasks_history';

// Deterministic daily task selection using day-of-year
function getDayOfYear() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getTodayDateStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function selectDailyTasks(dayOfYear) {
    // Use modular arithmetic to cycle through tasks
    // 60 tasks, 2 per day = 30 day cycle
    const idx1 = (dayOfYear * 2) % ALL_TASKS.length;
    const idx2 = (dayOfYear * 2 + 1) % ALL_TASKS.length;
    return [ALL_TASKS[idx1], ALL_TASKS[idx2]];
}

export function useTasks() {
    const todayStr = getTodayDateStr();
    const dayOfYear = getDayOfYear();

    // Today's 2 tasks
    const todayTasks = useMemo(() => selectDailyTasks(dayOfYear), [dayOfYear]);

    // Load completion state from localStorage
    const [completedToday, setCompletedToday] = useState(() => {
        try {
            const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            if (stored.date === todayStr) return stored.completed || [];
            return [];
        } catch { return []; }
    });

    // Load history
    const [history, setHistory] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
        } catch { return []; }
    });

    // Save to localStorage on change
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: todayStr, completed: completedToday }));
    }, [completedToday, todayStr]);

    useEffect(() => {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    }, [history]);

    // Purge entries older than 90 days on mount
    useEffect(() => {
        setHistory(prev => {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - 90);
            const cleaned = prev.filter(h => new Date(h.date) >= cutoff);
            return cleaned.length !== prev.length ? cleaned : prev;
        });
    }, []);

    const completeTask = useCallback((taskId) => {
        if (completedToday.includes(taskId)) return;
        const task = ALL_TASKS.find(t => t.id === taskId);
        setCompletedToday(prev => [...prev, taskId]);
        // Add to history
        setHistory(prev => {
            const updated = [...prev, { taskId, date: todayStr, points: task?.points || 10 }];
            // Keep last 90 days of history
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - 90);
            return updated.filter(h => new Date(h.date) >= cutoff);
        });
    }, [completedToday, todayStr]);

    // Stats
    const stats = useMemo(() => {
        const totalCompleted = history.length;
        const totalPoints = history.reduce((s, h) => s + (h.points || 10), 0);
        
        // Current streak: consecutive days with at least 1 task completed
        const dateSet = new Set(history.map(h => h.date));
        let taskStreak = 0;
        const d = new Date();
        // Check from today backwards
        const today = getTodayDateStr();
        if (!dateSet.has(today)) {
            d.setDate(d.getDate() - 1);
        }
        const toDateStr = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        while (dateSet.has(toDateStr(d))) {
            taskStreak++;
            d.setDate(d.getDate() - 1);
        }

        // Completion rate (last 7 days)
        const last7Days = [];
        for (let i = 0; i < 7; i++) {
            const dt = new Date();
            dt.setDate(dt.getDate() - i);
            last7Days.push(toDateStr(dt));
        }
        const daysWithTasks = last7Days.filter(day => dateSet.has(day)).length;
        const completionRate = Math.round((daysWithTasks / 7) * 100);

        return { totalCompleted, totalPoints, taskStreak, completionRate };
    }, [history, todayStr]);

    // Balance score bonus: +5 per completed task today, max +10
    const balanceBonus = Math.min(completedToday.length * 5, 10);

    return {
        todayTasks,
        completedToday,
        completeTask,
        stats,
        balanceBonus,
        allTasks: ALL_TASKS,
    };
}
