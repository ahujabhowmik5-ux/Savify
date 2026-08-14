import { useMemo } from 'react';

/**
 * 40 Milestones across 8 categories with 5 difficulty tiers:
 * 1 = Common (gray), 2 = Uncommon (green), 3 = Rare (blue), 
 * 4 = Epic (purple), 5 = Legendary (gold)
 */
const MILESTONES = [
    // ── BALANCE SCORE (5) ──
    { id: 'bs1', name: 'Spark',       category: 'score',   difficulty: 1, desc: 'Reach Balance Score 100',  threshold: 100,  field: 'score',    hint: 'Raise your balance score to 100' },
    { id: 'bs2', name: 'Steady',      category: 'score',   difficulty: 2, desc: 'Reach Balance Score 300',  threshold: 300,  field: 'score',    hint: 'Raise your balance score to 300' },
    { id: 'bs3', name: 'Rising',      category: 'score',   difficulty: 3, desc: 'Reach Balance Score 500',  threshold: 500,  field: 'score',    hint: 'Raise your balance score to 500' },
    { id: 'bs4', name: 'Blazing',     category: 'score',   difficulty: 4, desc: 'Reach Balance Score 750',  threshold: 750,  field: 'score',    hint: 'Raise your balance score to 750' },
    { id: 'bs5', name: 'Legendary',   category: 'score',   difficulty: 5, desc: 'Reach Balance Score 950',  threshold: 950,  field: 'score',    hint: 'Reach the Elite tier' },

    // ── AMOUNT MANAGED (5) ──
    { id: 'am1', name: 'Penny Wise',       category: 'amount',  difficulty: 1, desc: 'Track ₹1,000',       threshold: 1000,   field: 'totalManaged', hint: 'Track ₹1,000 in expenses' },
    { id: 'am2', name: 'Money Maven',      category: 'amount',  difficulty: 2, desc: 'Track ₹5,000',       threshold: 5000,   field: 'totalManaged', hint: 'Track ₹5,000 in expenses' },
    { id: 'am3', name: 'Cash Commander',   category: 'amount',  difficulty: 3, desc: 'Track ₹25,000',      threshold: 25000,  field: 'totalManaged', hint: 'Track ₹25,000 in expenses' },
    { id: 'am4', name: 'Wealth Warden',    category: 'amount',  difficulty: 4, desc: 'Track ₹50,000',      threshold: 50000,  field: 'totalManaged', hint: 'Track ₹50,000 in expenses' },
    { id: 'am5', name: 'Lakh Lord',        category: 'amount',  difficulty: 5, desc: 'Track ₹1,00,000',    threshold: 100000, field: 'totalManaged', hint: 'Track ₹1,00,000 in expenses' },

    // ── EXPENSE COUNT (5) ──
    { id: 'ta1', name: 'First Steps',   category: 'count',  difficulty: 1, desc: 'Add 10 expenses',   threshold: 10,  field: 'expenseCount', hint: 'Add 10 expenses to Savify' },
    { id: 'ta2', name: 'Consistent',    category: 'count',  difficulty: 2, desc: 'Add 50 expenses',   threshold: 50,  field: 'expenseCount', hint: 'Add 50 expenses to Savify' },
    { id: 'ta3', name: 'Dedicated',     category: 'count',  difficulty: 3, desc: 'Add 100 expenses',  threshold: 100, field: 'expenseCount', hint: 'Add 100 expenses to Savify' },
    { id: 'ta4', name: 'Relentless',    category: 'count',  difficulty: 4, desc: 'Add 250 expenses',  threshold: 250, field: 'expenseCount', hint: 'Add 250 expenses to Savify' },
    { id: 'ta5', name: 'Unstoppable',   category: 'count',  difficulty: 5, desc: 'Add 500 expenses',  threshold: 500, field: 'expenseCount', hint: 'Add 500 expenses to Savify' },

    // ── STREAKS (5) ──
    { id: 'st1', name: 'Genesis',        category: 'streak', difficulty: 1, desc: 'Add your first expense',  threshold: 1,   field: 'expenseCount', hint: 'Add your very first expense' },
    { id: 'st2', name: 'Three-peat',     category: 'streak', difficulty: 1, desc: '3-day streak',            threshold: 3,   field: 'streak',       hint: 'Maintain a 3-day streak' },
    { id: 'st3', name: 'Week Warrior',   category: 'streak', difficulty: 2, desc: '7-day streak',            threshold: 7,   field: 'streak',       hint: 'Maintain a 7-day streak' },
    { id: 'st4', name: 'Fortnight Fire', category: 'streak', difficulty: 3, desc: '14-day streak',           threshold: 14,  field: 'streak',       hint: 'Maintain a 14-day streak' },
    { id: 'st5', name: 'Month Master',   category: 'streak', difficulty: 5, desc: '30-day streak',           threshold: 30,  field: 'streak',       hint: 'Maintain a 30-day streak' },

    // ── SOCIAL (5) ──
    { id: 'so1', name: 'Team Player',       category: 'social', difficulty: 1, desc: 'Join a team',             threshold: 1,  field: 'teamCount',   hint: 'Join or create your first team' },
    { id: 'so2', name: 'Squad Leader',      category: 'social', difficulty: 3, desc: 'Join 3 teams',            threshold: 3,  field: 'teamCount',   hint: 'Be part of 3 teams' },
    { id: 'so3', name: 'Connector',         category: 'social', difficulty: 2, desc: 'Invite 1 friend',         threshold: 1,  field: 'inviteCount', hint: 'Invite your first friend' },
    { id: 'so4', name: 'Social Butterfly',  category: 'social', difficulty: 3, desc: 'Invite 5 friends',        threshold: 5,  field: 'inviteCount', hint: 'Invite 5 friends to Savify' },
    { id: 'so5', name: 'Ambassador',        category: 'social', difficulty: 5, desc: 'Invite 10 friends',       threshold: 10, field: 'inviteCount', hint: 'Invite 10 friends to Savify' },

    // ── EXPLORATION (5) ──
    { id: 'ex1', name: 'Explorer',      category: 'explore', difficulty: 1, desc: 'Use 3 categories',      threshold: 3,   field: 'categoryCount',  hint: 'Use 3 different categories' },
    { id: 'ex2', name: 'Cartographer',  category: 'explore', difficulty: 2, desc: 'Use 5 categories',      threshold: 5,   field: 'categoryCount',  hint: 'Use 5 different categories' },
    { id: 'ex3', name: 'Night Owl',     category: 'explore', difficulty: 2, desc: 'Expense after midnight', threshold: 1,   field: 'nightExpenses',  hint: 'Add expense between 12-5 AM' },
    { id: 'ex4', name: 'Early Bird',    category: 'explore', difficulty: 2, desc: 'Expense before 7 AM',   threshold: 1,   field: 'earlyExpenses',  hint: 'Add expense before 7 AM' },
    { id: 'ex5', name: 'Centurion',     category: 'explore', difficulty: 3, desc: 'Open app 100 times',    threshold: 100, field: 'appOpens',       hint: 'Open Savify 100 times' },

    // ── BUDGET MASTERY (5) ──
    { id: 'bm1', name: 'Budget Buddy',  category: 'budget', difficulty: 1, desc: 'Stay under budget 1 week',   threshold: 1,  field: 'underBudgetWeeks', hint: 'Finish 1 week under budget' },
    { id: 'bm2', name: 'Saver Scout',   category: 'budget', difficulty: 2, desc: 'Stay under budget 4 weeks',  threshold: 4,  field: 'underBudgetWeeks', hint: 'Stay under budget 4 weeks' },
    { id: 'bm3', name: 'Frugal Force',  category: 'budget', difficulty: 3, desc: 'Stay under budget 8 weeks',  threshold: 8,  field: 'underBudgetWeeks', hint: 'Stay under budget 8 weeks' },
    { id: 'bm4', name: 'Budget Boss',   category: 'budget', difficulty: 4, desc: 'Stay under budget 12 weeks', threshold: 12, field: 'underBudgetWeeks', hint: 'Stay under budget 12 weeks' },
    { id: 'bm5', name: 'Savings Sage',  category: 'budget', difficulty: 5, desc: 'Stay under budget 24 weeks', threshold: 24, field: 'underBudgetWeeks', hint: 'Stay under budget 24 weeks' },

    // ── APP MASTERY (5) ──
    { id: 'ap1', name: 'Newcomer',      category: 'app', difficulty: 1, desc: 'Open app 10 times',    threshold: 10,   field: 'appOpens', hint: 'Open the app 10 times' },
    { id: 'ap2', name: 'Regular',       category: 'app', difficulty: 2, desc: 'Open app 50 times',    threshold: 50,   field: 'appOpens', hint: 'Open the app 50 times' },
    { id: 'ap3', name: 'Devotee',       category: 'app', difficulty: 3, desc: 'Open app 200 times',   threshold: 200,  field: 'appOpens', hint: 'Open the app 200 times' },
    { id: 'ap4', name: 'Addict',        category: 'app', difficulty: 4, desc: 'Open app 500 times',   threshold: 500,  field: 'appOpens', hint: 'Open the app 500 times' },
    { id: 'ap5', name: 'Legend',        category: 'app', difficulty: 5, desc: 'Open app 1000 times',  threshold: 1000, field: 'appOpens', hint: 'Open the app 1000 times' },
];

// Difficulty tier metadata for badge rendering
const DIFFICULTY_TIERS = {
    1: { name: 'Common',    color: '#71717A', glow: 'rgba(113,113,122,0.2)', bg: 'rgba(113,113,122,0.08)', border: 'rgba(113,113,122,0.2)' },
    2: { name: 'Uncommon',  color: '#10B981', glow: 'rgba(16,185,129,0.3)',  bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.25)' },
    3: { name: 'Rare',      color: '#3B82F6', glow: 'rgba(59,130,246,0.3)',  bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.25)' },
    4: { name: 'Epic',      color: '#8B5CF6', glow: 'rgba(139,92,246,0.35)', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.3)' },
    5: { name: 'Legendary', color: '#D4AF37', glow: 'rgba(212,175,55,0.4)',  bg: 'rgba(212,175,55,0.1)',  border: 'rgba(212,175,55,0.35)' },
};

function getAppOpens() {
    return parseInt(localStorage.getItem('savify_app_opens') || '0', 10);
}

export function incrementAppOpens() {
    const count = getAppOpens() + 1;
    localStorage.setItem('savify_app_opens', String(count));
    return count;
}

export function useAchievements({ balanceScore = 0, expenses = [], streak = 0, teamCount = 0 }) {
    const milestones = useMemo(() => {
        const expenseCount = expenses.length;
        const totalManaged = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const categories = new Set(expenses.map(e => e.category));
        const categoryCount = categories.size;
        const nightExpenses = expenses.filter(e => {
            const h = new Date(e.created_at).getHours();
            return h >= 0 && h < 5;
        }).length;
        const earlyExpenses = expenses.filter(e => {
            const h = new Date(e.created_at).getHours();
            return h >= 5 && h < 7;
        }).length;
        const inviteCount = parseInt(localStorage.getItem('savify_invite_count') || '0', 10);
        const appOpens = getAppOpens();
        const underBudgetWeeks = parseInt(localStorage.getItem('savify_under_budget_weeks') || '0', 10);

        const stats = {
            score: balanceScore,
            totalManaged,
            expenseCount,
            streak,
            teamCount,
            underBudgetWeeks,
            categoryCount,
            nightExpenses,
            earlyExpenses,
            inviteCount,
            appOpens,
        };

        return MILESTONES.map(m => {
            const current = stats[m.field] || 0;
            const progress = Math.min(100, Math.round((current / m.threshold) * 100));
            const achieved = current >= m.threshold;
            const tier = DIFFICULTY_TIERS[m.difficulty] || DIFFICULTY_TIERS[1];
            return { ...m, current, progress, achieved, tier };
        });
    }, [balanceScore, expenses, streak, teamCount]);

    const achieved = milestones.filter(m => m.achieved);
    const locked = milestones.filter(m => !m.achieved);

    return { milestones, achieved, locked };
}

export { MILESTONES, DIFFICULTY_TIERS };
