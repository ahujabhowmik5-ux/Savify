export function parseCurrency(value) {
    return parseFloat(String(value).replace(/[^0-9.]/g, '')) || 0;
}

export function getTierFromScore(score) {
    if (score >= 950) return 'Elite';
    if (score >= 900) return 'Platinum';
    if (score >= 600) return 'Gold';
    if (score >= 300) return 'Silver';
    return 'Bronze';
}

export function getDynamicRankTitle(topCategory, totalSpent, budget, rankTitles) {
    const ratio = budget > 0 ? (totalSpent / budget) : 0;
    if (ratio > 1.0) { const arr = rankTitles.broke; return arr[Math.floor(Math.random() * arr.length)]; }
    if (ratio < 0.3 && budget > 0) { const arr = rankTitles.saver; return arr[Math.floor(Math.random() * arr.length)]; }
    const catKey = topCategory.toLowerCase();
    let targetArray = rankTitles.balanced;
    if (rankTitles[catKey]) { targetArray = rankTitles[catKey]; }
    else if (topCategory === 'Others') { targetArray = rankTitles.balanced; }
    return targetArray[Math.floor(Math.random() * targetArray.length)];
}

export function getFlirtyComment(category, amount, ratio, flirtDb) {
    const r = Math.random();
    if (r < 0.05) return flirtDb.wildcard[Math.floor(Math.random() * flirtDb.wildcard.length)];
    if (ratio > 1.0) return flirtDb.broke[Math.floor(Math.random() * flirtDb.broke.length)];
    if (ratio < 0.2 && amount === 0) return flirtDb.saver[Math.floor(Math.random() * flirtDb.saver.length)];
    const catKey = category.toLowerCase();
    if (flirtDb[catKey]) {
        return flirtDb[catKey][Math.floor(Math.random() * flirtDb[catKey].length)];
    }
    return flirtDb.neutral[Math.floor(Math.random() * flirtDb.neutral.length)];
}

export function getDistanceInMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const p1 = lat1 * Math.PI / 180, p2 = lat2 * Math.PI / 180;
    const dp = (lat2 - lat1) * Math.PI / 180, dl = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function getCategoryIcon(category) {
    const icons = {
        'Food': 'fa-utensils',
        'Transport': 'fa-car',
        'Shopping': 'fa-shopping-bag',
        'Entertainment': 'fa-film',
        'Bills': 'fa-file-invoice',
        'Education': 'fa-graduation-cap',
        'Investment': 'fa-chart-line',
    };
    return icons[category] || 'fa-receipt';
}

export const APP_START_DATE = new Date('2026-02-10T00:00:00');

export const chartColors = ['#10B981', '#D4AF37', '#1F2937', '#78716C', '#FF5722', '#34D399', '#FBBF24', '#000000'];
