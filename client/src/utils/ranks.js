// Badge rank utility — determines user's rank based on app opens + expenses added
// Rank is IRREVERSIBLE — once earned, it cannot be lost.

const RANKS = [
    { id: 'omega',  name: 'OMEGA',  symbol: 'ω', minOpens: 0,   minExpenses: 0,   color: '#71717A', glow: 'rgba(113,113,122,0.3)', decoration: 1, effect: '' },
    { id: 'gamma',  name: 'GAMMA',  symbol: 'γ', minOpens: 50,  minExpenses: 10,  color: '#CD7F32', glow: 'rgba(205,127,50,0.5)',  decoration: 2, effect: 'rank-effect-pulse' },
    { id: 'delta',  name: 'DELTA',  symbol: 'δ', minOpens: 100, minExpenses: 20,  color: '#60A5FA', glow: 'rgba(96,165,250,0.5)',  decoration: 3, effect: 'rank-effect-breathe' },
    { id: 'beta',   name: 'BETA',   symbol: 'β', minOpens: 300, minExpenses: 60,  color: '#D4AF37', glow: 'rgba(212,175,55,0.6)',  decoration: 4, effect: 'rank-effect-shimmer' },
    { id: 'alpha',  name: 'ALPHA',  symbol: 'α', minOpens: 800, minExpenses: 160, color: '#FF4500', glow: 'rgba(255,69,0,0.6)',    decoration: 5, effect: 'rank-effect-fire' },
    { id: 'sigma',  name: 'SIGMA',  symbol: 'σ', minOpens: 800, minExpenses: 160, color: '#8B5CF6', glow: 'rgba(139,92,246,0.6)', decoration: 5, effect: 'rank-effect-fire' },
];

// Highest achieved rank is stored and never regresses
const ACHIEVED_RANK_KEY = 'savify_highest_rank';

function getHighestAchievedRank() {
    return localStorage.getItem(ACHIEVED_RANK_KEY) || 'omega';
}

function setHighestAchievedRank(rankId) {
    const current = getHighestAchievedRank();
    const currentIdx = RANKS.findIndex(r => r.id === current);
    const newIdx = RANKS.findIndex(r => r.id === rankId);
    // Only update if new rank is higher (irreversible)
    if (newIdx > currentIdx) {
        localStorage.setItem(ACHIEVED_RANK_KEY, rankId);
    }
}

// Alpha and Sigma share the same threshold — user gets to choose between them
export function getRank(appOpens, expenseCount, chosenTopRank = null) {
    // Find highest qualifying rank based on current stats
    let qualifiedRank = RANKS[0];
    for (const rank of RANKS) {
        if (rank.id === 'sigma') continue;
        if (appOpens >= rank.minOpens && expenseCount >= rank.minExpenses) {
            qualifiedRank = rank;
        }
    }

    // Check if user qualifies for top tier
    const alphaRank = RANKS.find(r => r.id === 'alpha');
    if (appOpens >= alphaRank.minOpens && expenseCount >= alphaRank.minExpenses) {
        if (chosenTopRank === 'sigma') qualifiedRank = RANKS.find(r => r.id === 'sigma');
        else qualifiedRank = alphaRank;
    }

    // Save highest achieved (irreversible)
    setHighestAchievedRank(qualifiedRank.id);

    // Return the HIGHEST ever achieved (never regress)
    const highestId = getHighestAchievedRank();
    const highestRank = RANKS.find(r => r.id === highestId);
    
    // But if chosenTopRank overrides at alpha level
    if (highestId === 'alpha' && chosenTopRank === 'sigma') {
        return RANKS.find(r => r.id === 'sigma');
    }
    if (highestId === 'sigma' && chosenTopRank === 'alpha') {
        return RANKS.find(r => r.id === 'alpha');
    }

    return highestRank || qualifiedRank;
}

export function getNextRank(appOpens, expenseCount) {
    // Find the index of the current fully-qualified rank
    let currentIdx = 0;
    for (let i = RANKS.length - 1; i >= 0; i--) {
        const r = RANKS[i];
        if (r.id === 'sigma') continue;
        if (appOpens >= r.minOpens && expenseCount >= r.minExpenses) {
            currentIdx = i;
            break;
        }
    }
    // Next rank is the one AFTER the current (skip sigma which is a choice, not a progression)
    for (let i = currentIdx + 1; i < RANKS.length; i++) {
        if (RANKS[i].id === 'sigma') continue;
        return RANKS[i];
    }
    return null; // At top — no next rank
}

export function getRankProgress(appOpens, expenseCount) {
    const next = getNextRank(appOpens, expenseCount);
    if (!next) return { opensNeeded: 0, expensesNeeded: 0, atTop: true };

    return {
        opensNeeded: Math.max(0, next.minOpens - appOpens),
        expensesNeeded: Math.max(0, next.minExpenses - expenseCount),
        nextRank: next,
        atTop: false,
    };
}

export function getAppOpens() {
    return parseInt(localStorage.getItem('savify_app_opens') || '0', 10);
}

export function getChosenTopRank() {
    return localStorage.getItem('savify_chosen_top_rank') || null;
}

export function setChosenTopRank(choice) {
    localStorage.setItem('savify_chosen_top_rank', choice);
}

export { RANKS };
