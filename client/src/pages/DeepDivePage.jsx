import { useEffect, useRef, useMemo, useState } from 'react';
import { SavioEmoji } from '../components/Savio';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useExpenses } from '../hooks/useExpenses';
import { supabase } from '../config/supabase';
import { parseCurrency, chartColors, APP_START_DATE } from '../utils/helpers';
import { Chart, ArcElement, DoughnutController, LineController, LineElement, PointElement, BarController, BarElement, CategoryScale, LinearScale, Filler, Tooltip } from 'chart.js';
import '../styles/dashboard.css';

Chart.register(ArcElement, DoughnutController, LineController, LineElement, PointElement, BarController, BarElement, CategoryScale, LinearScale, Filler, Tooltip);

// Helper: local date string (avoids UTC timezone shift)
const toLocalDate = (d) => {
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function DeepDivePage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { expenses, fetchExpenses } = useExpenses(user?.id);
    const donutRef = useRef(null);
    const donutChartRef = useRef(null);
    const velocityRef = useRef(null);
    const velocityChartRef = useRef(null);
    const weekdayBarRef = useRef(null);
    const weekdayBarChartRef = useRef(null);
    const [budgetVal, setBudgetVal] = useState(0);
    const [refreshKey, setRefreshKey] = useState(0);

    // Auto-refresh data on mount and on focus
    useEffect(() => {
        if (user) fetchExpenses();
    }, [user, refreshKey]);

    // Refresh when page regains focus
    useEffect(() => {
        const handleFocus = () => { setRefreshKey(k => k + 1); };
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, []);

    // Fetch budget
    useEffect(() => {
        if (!user) return;
        const fetchBudget = async () => {
            const { data } = await supabase
                .from('user_applications')
                .select('weekly_spending, current_weekly_spent')
                .eq('user_id', user.id)
                .maybeSingle();
            if (data) {
                const val = parseCurrency(data.weekly_spending);
                setBudgetVal(val);
            }
        };
        fetchBudget();
    }, [user]);

    const filteredExpenses = useMemo(() => {
        return (expenses || []).filter(exp => new Date(exp.created_at) >= APP_START_DATE);
    }, [expenses]);

    // ─── CORE METRICS ───
    const { totalSpent, catTotals, pieLabels, pieData, expenseCount } = useMemo(() => {
        const catTotals = {};
        let totalSpent = 0;
        filteredExpenses.forEach(exp => {
            catTotals[exp.category] = (catTotals[exp.category] || 0) + exp.amount;
            totalSpent += exp.amount;
        });
        return {
            catTotals, totalSpent, expenseCount: filteredExpenses.length,
            pieLabels: Object.keys(catTotals),
            pieData: Object.values(catTotals)
        };
    }, [filteredExpenses]);

    // ─── DAILY ANALYTICS ───
    const {
        bestDay, worstDay, dailyAverage, runwayDays,
        allTimeDailyData, allTimeDayLabels,
        weekdayAvg, streakDays, spendFreeDays,
        medianDaily, topCategory, topCategoryPct,
        avgPerExpense, hourlyHotspot, monthlyBurn
    } = useMemo(() => {
        const dailyTotals = {};
        const hourCounts = new Array(24).fill(0);
        const weekdaySums = new Array(7).fill(0);
        const weekdayCounts = new Array(7).fill(0);

        filteredExpenses.forEach(exp => {
            const dateStr = toLocalDate(exp.created_at);
            dailyTotals[dateStr] = (dailyTotals[dateStr] || 0) + exp.amount;
            const dt = new Date(exp.created_at);
            hourCounts[dt.getHours()]++;
            weekdaySums[dt.getDay()] += exp.amount;
            weekdayCounts[dt.getDay()]++;
        });

        const days = Object.entries(dailyTotals);
        let bestDay = { date: 'N/A', amount: 0 };
        let worstDay = { date: 'N/A', amount: 0 };
        let totalDays = days.length;
        let dailyAverage = totalDays > 0 ? totalSpent / totalDays : 0;

        if (days.length > 0) {
            const sorted = [...days].sort((a, b) => a[1] - b[1]);
            bestDay = { date: sorted[0][0], amount: sorted[0][1] };
            worstDay = { date: sorted[sorted.length - 1][0], amount: sorted[sorted.length - 1][1] };
        }

        // Median daily
        const sortedAmounts = days.map(d => d[1]).sort((a, b) => a - b);
        const medianDaily = sortedAmounts.length > 0
            ? sortedAmounts[Math.floor(sortedAmounts.length / 2)] : 0;

        // Budget runway
        const remaining = budgetVal - totalSpent;
        const runwayDays = dailyAverage > 0 ? Math.max(0, Math.floor(remaining / dailyAverage)) : 0;

        // Streak: count consecutive days with expenses ending today
        let streakDays = 0;
        let checkDate = new Date();
        while (true) {
            const ds = toLocalDate(checkDate);
            if (dailyTotals[ds]) { streakDays++; checkDate.setDate(checkDate.getDate() - 1); }
            else break;
        }

        // Spend-free days (days with no expenses in the period)
        const firstDate = days.length > 0 ? new Date(days.sort((a, b) => a[0].localeCompare(b[0]))[0][0]) : new Date();
        const totalCalendarDays = Math.max(1, Math.floor((new Date() - firstDate) / 86400000) + 1);
        const spendFreeDays = totalCalendarDays - totalDays;

        // Weekday averages
        const weekdayAvg = weekdaySums.map((sum, i) => weekdayCounts[i] > 0 ? Math.round(sum / weekdayCounts[i]) : 0);

        // All-time daily data sorted by date
        const sortedDays = [...Object.entries(dailyTotals)].sort((a, b) => a[0].localeCompare(b[0]));
        const allTimeDayLabels = sortedDays.map(([date]) => {
            const d = new Date(date + 'T00:00:00');
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });
        const allTimeDailyData = sortedDays.map(([, amount]) => amount);

        // Top category
        const topEntry = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];
        const topCategory = topEntry ? topEntry[0] : 'N/A';
        const topCategoryPct = topEntry && totalSpent > 0 ? Math.round((topEntry[1] / totalSpent) * 100) : 0;

        // Avg per expense
        const avgPerExpense = filteredExpenses.length > 0 ? Math.round(totalSpent / filteredExpenses.length) : 0;

        // Hour with most expenses
        const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
        const hourlyHotspot = peakHour >= 12 ? `${peakHour - 12 || 12} PM` : `${peakHour || 12} AM`;

        // Monthly burn rate (last 30 days)
        const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const last30 = filteredExpenses.filter(e => new Date(e.created_at) >= thirtyDaysAgo);
        const monthlyBurn = last30.reduce((s, e) => s + e.amount, 0);

        return {
            bestDay, worstDay, dailyAverage, runwayDays,
            allTimeDailyData, allTimeDayLabels,
            weekdayAvg, streakDays, spendFreeDays,
            medianDaily, topCategory, topCategoryPct,
            avgPerExpense, hourlyHotspot, monthlyBurn
        };
    }, [filteredExpenses, totalSpent, budgetVal, catTotals]);

    // ─── WEEKLY COMPARISON ───
    const weeklyComparison = useMemo(() => {
        const now = new Date();
        const thisWeekStart = new Date(now);
        const day = thisWeekStart.getDay();
        const diff = day === 0 ? 6 : day - 1;
        thisWeekStart.setDate(thisWeekStart.getDate() - diff);
        thisWeekStart.setHours(0, 0, 0, 0);

        const lastWeekStart = new Date(thisWeekStart);
        lastWeekStart.setDate(lastWeekStart.getDate() - 7);
        const lastWeekEnd = new Date(thisWeekStart);

        const thisWeekExpenses = filteredExpenses.filter(exp => new Date(exp.created_at) >= thisWeekStart);
        const lastWeekExpenses = filteredExpenses.filter(exp => {
            const d = new Date(exp.created_at);
            return d >= lastWeekStart && d < lastWeekEnd;
        });

        const thisTotal = thisWeekExpenses.reduce((s, e) => s + e.amount, 0);
        const lastTotal = lastWeekExpenses.reduce((s, e) => s + e.amount, 0);

        const daysSoFar = Math.max(1, (day === 0 ? 7 : day));
        const thisAvg = thisTotal / daysSoFar;
        const lastAvg = lastWeekExpenses.length > 0 ? lastTotal / 7 : 0;

        return {
            thisTotal, lastTotal,
            thisAvg: Math.round(thisAvg),
            lastAvg: Math.round(lastAvg),
            thisCount: thisWeekExpenses.length,
            lastCount: lastWeekExpenses.length,
            totalDiff: thisTotal - lastTotal,
            avgDiff: Math.round(thisAvg - lastAvg),
            countDiff: thisWeekExpenses.length - lastWeekExpenses.length
        };
    }, [filteredExpenses]);

    // ─── OUTLIER DETECTION ───
    const outliers = useMemo(() => {
        if (filteredExpenses.length < 5) return [];
        const amounts = filteredExpenses.map(e => e.amount).sort((a, b) => a - b);
        const q1 = amounts[Math.floor(amounts.length * 0.25)];
        const q3 = amounts[Math.floor(amounts.length * 0.75)];
        const iqr = q3 - q1;
        const threshold = q3 + 1.5 * iqr;
        return filteredExpenses
            .filter(e => e.amount > threshold)
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);
    }, [filteredExpenses]);

    // ─── RECENT TRANSACTIONS ───
    const recentExpenses = useMemo(() => {
        return [...filteredExpenses].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 8);
    }, [filteredExpenses]);

    // ─── CHARTS ───

    // Donut chart
    useEffect(() => {
        if (!donutRef.current) return;
        if (donutChartRef.current) donutChartRef.current.destroy();

        donutChartRef.current = new Chart(donutRef.current.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: pieLabels.length > 0 ? pieLabels : ['No data'],
                datasets: [{ data: pieData.length > 0 ? pieData : [1], backgroundColor: pieData.length > 0 ? chartColors : ['#333'], borderWidth: 2, borderColor: '#0A0A0A', cutout: '65%' }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ₹${ctx.raw.toLocaleString()}` } } }
            }
        });
        return () => { if (donutChartRef.current) donutChartRef.current.destroy(); };
    }, [pieLabels, pieData]);

    // Velocity chart
    useEffect(() => {
        if (!velocityRef.current || allTimeDailyData.length === 0) return;
        if (velocityChartRef.current) velocityChartRef.current.destroy();

        velocityChartRef.current = new Chart(velocityRef.current.getContext('2d'), {
            type: 'line',
            data: {
                labels: allTimeDayLabels,
                datasets: [{ label: 'Daily Spending', data: allTimeDailyData, borderColor: '#D4AF37', backgroundColor: 'rgba(212, 175, 55, 0.15)', fill: true, tension: 0.4, pointRadius: 0 }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#999' } }, x: { grid: { display: false }, ticks: { color: '#999', maxTicksLimit: 6 } } },
                plugins: { legend: { display: false } }
            }
        });
        return () => { if (velocityChartRef.current) velocityChartRef.current.destroy(); };
    }, [allTimeDailyData, allTimeDayLabels]);

    // Weekday bar chart
    useEffect(() => {
        if (!weekdayBarRef.current) return;
        if (weekdayBarChartRef.current) weekdayBarChartRef.current.destroy();

        const barColors = weekdayAvg.map((v) => {
            const max = Math.max(...weekdayAvg);
            return v === max ? '#EF4444' : 'rgba(16, 185, 129, 0.7)';
        });

        weekdayBarChartRef.current = new Chart(weekdayBarRef.current.getContext('2d'), {
            type: 'bar',
            data: {
                labels: WEEKDAYS,
                datasets: [{ data: weekdayAvg, backgroundColor: barColors, borderRadius: 6, borderSkipped: false }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#999' } }, x: { grid: { display: false }, ticks: { color: '#999' } } },
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `Avg: ₹${ctx.raw.toLocaleString()}` } } }
            }
        });
        return () => { if (weekdayBarChartRef.current) weekdayBarChartRef.current.destroy(); };
    }, [weekdayAvg]);

    const formatDate = (dateStr) => {
        if (dateStr === 'N/A') return 'N/A';
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
    };

    const handleDownload = async () => {
        const captureArea = document.getElementById('deepDiveCapture');
        if (!captureArea) return;

        if (typeof window.html2canvas !== 'undefined') {
            try {
                captureArea.scrollTop = 0;
                window.scrollTo(0, 0);
                await new Promise(r => setTimeout(r, 500));
                const canvas = await window.html2canvas(captureArea, {
                    backgroundColor: '#f8f5f0', scale: 2, useCORS: true, allowTaint: true,
                    scrollY: -window.scrollY, scrollX: 0,
                    width: captureArea.scrollWidth, height: captureArea.scrollHeight,
                    windowWidth: captureArea.scrollWidth, windowHeight: captureArea.scrollHeight,
                });
                const link = document.createElement('a');
                link.download = `Savify-DeepDive-${Date.now()}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            } catch (err) {
                console.error('Screenshot error:', err);
                alert('Failed to capture screenshot.');
            }
        } else if (navigator.share) {
            navigator.share({ title: 'My Savify Deep Dive Report', text: 'Check out my spending analysis!' });
        } else {
            alert('Screenshot feature is loading. Please try again.');
        }
    };

    const remaining = budgetVal - totalSpent;
    const budgetExhausted = remaining <= 0;

    return (
        <div className="dashboard-body" style={{ minHeight: '100vh' }}>
            <div className="deep-dive-container" id="deepDiveCapture">
                {/* Header */}
                <div className="deep-dive-header">
                    <button className="deep-dive-back" onClick={() => navigate('/dashboard')}>
                        <i className="fas fa-arrow-left"></i>
                    </button>
                    <div className="deep-dive-title">
                        <h1>Deep Dive</h1>
                        <p>Financial Forensics</p>
                    </div>
                    <button className="deep-dive-download" onClick={handleDownload} style={{ color: '#D4AF37', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 12, padding: '8px 12px' }}>
                        <i className="fas fa-download"></i>
                    </button>
                </div>

                {/* ─── 1. QUICK STATS GRID ─── */}
                <div className="dd-stats-grid">
                    <div className="dd-stat-card">
                        <span className="dd-stat-label">Total Spent</span>
                        <span className="dd-stat-value">₹{totalSpent.toLocaleString()}</span>
                    </div>
                    <div className="dd-stat-card">
                        <span className="dd-stat-label">Transactions</span>
                        <span className="dd-stat-value">{expenseCount}</span>
                    </div>
                    <div className="dd-stat-card">
                        <span className="dd-stat-label">Avg / Expense</span>
                        <span className="dd-stat-value">₹{avgPerExpense.toLocaleString()}</span>
                    </div>
                    <div className="dd-stat-card">
                        <span className="dd-stat-label">30-Day Burn</span>
                        <span className="dd-stat-value">₹{monthlyBurn.toLocaleString()}</span>
                    </div>
                </div>

                {/* ─── 2. RUNWAY PREDICTION ─── */}
                <div className="runway-card">
                    <span className="runway-label">RUNWAY PREDICTION</span>
                    <div className={`runway-days ${budgetExhausted ? 'exhausted' : ''}`}>
                        {budgetExhausted ? '0' : runwayDays} Days
                    </div>
                    <p className="runway-subtitle">
                        {budgetExhausted ? 'Budget exhausted' : `${runwayDays} days of budget remaining`}
                    </p>
                    <div className="runway-divider"></div>
                    <div className="runway-average">
                        <span>Overall Daily Average</span>
                        <span className="runway-average-value">₹{Math.round(dailyAverage).toLocaleString()}</span>
                    </div>
                </div>

                {/* ─── 3. BEST / WORST DAY ─── */}
                <div className="best-worst-row">
                    <div className="best-worst-card">
                        <div className="best-worst-emoji best"><SavioEmoji emotion="happy" size={28} /></div>
                        <span className="best-worst-label">BEST DAY (LOWEST)</span>
                        <div className="best-worst-amount best">₹{bestDay.amount.toLocaleString()}</div>
                        <span className="best-worst-date">{formatDate(bestDay.date)}</span>
                    </div>
                    <div className="best-worst-card">
                        <div className="best-worst-emoji worst"><SavioEmoji emotion="worried" size={28} /></div>
                        <span className="best-worst-label">WORST DAY (HIGHEST)</span>
                        <div className="best-worst-amount worst">₹{worstDay.amount.toLocaleString()}</div>
                        <span className="best-worst-date">{formatDate(worstDay.date)}</span>
                    </div>
                </div>

                {/* ─── 4. SPENDING PATTERNS ROW ─── */}
                <div className="dd-patterns-row">
                    <div className="dd-pattern-card">
                        <i className="fas fa-fire" style={{ color: '#EF4444' }}></i>
                        <span className="dd-pattern-label">Logging Streak</span>
                        <span className="dd-pattern-value">{streakDays} day{streakDays !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="dd-pattern-card">
                        <i className="fas fa-leaf" style={{ color: '#10B981' }}></i>
                        <span className="dd-pattern-label">Spend-Free Days</span>
                        <span className="dd-pattern-value">{spendFreeDays}</span>
                    </div>
                    <div className="dd-pattern-card">
                        <i className="fas fa-clock" style={{ color: '#F59E0B' }}></i>
                        <span className="dd-pattern-label">Peak Spending Hour</span>
                        <span className="dd-pattern-value">{hourlyHotspot}</span>
                    </div>
                </div>

                {/* ─── 5. MEDIAN vs AVERAGE ─── */}
                <div className="dd-median-card">
                    <h3><i className="fas fa-balance-scale" style={{ marginRight: 8, color: '#8B5CF6' }}></i>Central Tendency</h3>
                    <div className="dd-median-row">
                        <div className="dd-median-item">
                            <span className="dd-median-label">Mean (Average)</span>
                            <span className="dd-median-value">₹{Math.round(dailyAverage).toLocaleString()}</span>
                        </div>
                        <div className="dd-median-divider"></div>
                        <div className="dd-median-item">
                            <span className="dd-median-label">Median (Typical)</span>
                            <span className="dd-median-value">₹{medianDaily.toLocaleString()}</span>
                        </div>
                    </div>
                    <p className="dd-median-insight">
                        {medianDaily < dailyAverage * 0.7
                            ? '⚠ Your average is inflated by large outliers. Median is more representative.'
                            : '✓ Your spending is evenly distributed — no major outlier distortion.'}
                    </p>
                </div>

                {/* ─── 6. TOP CATEGORY ─── */}
                <div className="dd-top-category-card">
                    <h3><i className="fas fa-crosshairs" style={{ marginRight: 8, color: '#D4AF37' }}></i>Top Spending Category</h3>
                    <div className="dd-top-category-content">
                        <span className="dd-top-category-name">{topCategory}</span>
                        <span className="dd-top-category-pct">{topCategoryPct}%</span>
                    </div>
                    <div className="dd-top-category-bar">
                        <div className="dd-top-category-fill" style={{ width: `${topCategoryPct}%` }}></div>
                    </div>
                </div>

                {/* ─── 7. SPENDING DISTRIBUTION ─── */}
                <div className="spending-distribution-card">
                    <h3>Spending Distribution</h3>
                    <div className="donut-wrapper">
                        <canvas ref={donutRef}></canvas>
                    </div>
                    <div className="donut-legend">
                        {pieLabels.map((label, index) => {
                            const amount = pieData[index];
                            const percent = totalSpent > 0 ? ((amount / totalSpent) * 100).toFixed(1) : 0;
                            const color = chartColors[index % chartColors.length];
                            return (
                                <div className="donut-legend-item" key={label}>
                                    <span className="legend-dot" style={{ background: color }}></span>
                                    <span>{label} {percent}%</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ─── 8. WEEKDAY SPENDING PATTERN ─── */}
                <div className="velocity-card">
                    <h3><i className="fas fa-calendar-week" style={{ marginRight: 8, color: '#10B981' }}></i>Weekday Spending Pattern</h3>
                    <div className="velocity-chart-wrapper">
                        <canvas ref={weekdayBarRef}></canvas>
                    </div>
                </div>

                {/* ─── 9. SPENDING VELOCITY ─── */}
                <div className="velocity-card">
                    <h3><i className="fas fa-chart-area" style={{ marginRight: 8 }}></i> Spending Velocity (All Time)</h3>
                    <div className="velocity-chart-wrapper">
                        <canvas ref={velocityRef}></canvas>
                    </div>
                </div>

                {/* ─── 10. WEEKLY COMPARISON ─── */}
                <div className="weekly-comparison-card">
                    <h3><i className="fas fa-exchange-alt" style={{ marginRight: 8, color: '#D4AF37' }}></i>Weekly Comparison</h3>
                    <p className="weekly-comparison-subtitle">This Week vs Last Week</p>
                    <div className="weekly-comparison-table">
                        <div className="weekly-comparison-row">
                            <span className="weekly-comparison-label">Total Spent</span>
                            <div className="weekly-comparison-value-group">
                                <span className="weekly-comparison-value">₹{weeklyComparison.thisTotal.toLocaleString()}</span>
                                <span className={`weekly-comparison-diff ${weeklyComparison.totalDiff > 0 ? 'negative' : 'positive'}`}>
                                    {weeklyComparison.totalDiff > 0 ? '+' : ''}₹{weeklyComparison.totalDiff.toLocaleString()}
                                </span>
                            </div>
                        </div>
                        <div className="weekly-comparison-row">
                            <span className="weekly-comparison-label">Daily Average</span>
                            <div className="weekly-comparison-value-group">
                                <span className="weekly-comparison-value">₹{weeklyComparison.thisAvg.toLocaleString()}</span>
                                <span className={`weekly-comparison-diff ${weeklyComparison.avgDiff > 0 ? 'negative' : 'positive'}`}>
                                    {weeklyComparison.avgDiff > 0 ? '+' : ''}₹{weeklyComparison.avgDiff.toLocaleString()}
                                </span>
                            </div>
                        </div>
                        <div className="weekly-comparison-row">
                            <span className="weekly-comparison-label">Transaction Count</span>
                            <div className="weekly-comparison-value-group">
                                <span className="weekly-comparison-value">{weeklyComparison.thisCount}</span>
                                <span className={`weekly-comparison-diff ${weeklyComparison.countDiff > 0 ? 'negative' : 'positive'}`}>
                                    {weeklyComparison.countDiff > 0 ? '+' : ''}{weeklyComparison.countDiff}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── 11. OUTLIER DETECTION ─── */}
                {outliers.length > 0 && (
                    <div className="dd-outlier-card">
                        <h3><i className="fas fa-exclamation-triangle" style={{ marginRight: 8, color: '#EF4444' }}></i>Outlier Expenses</h3>
                        <p className="dd-outlier-desc">Unusually large expenses detected (IQR method)</p>
                        <div className="dd-outlier-list">
                            {outliers.map((exp, i) => (
                                <div className="dd-outlier-item" key={i}>
                                    <span className="dd-outlier-cat">{exp.category}</span>
                                    <span className="dd-outlier-amount">₹{exp.amount.toLocaleString()}</span>
                                    <span className="dd-outlier-date">{formatDate(toLocalDate(exp.created_at))}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ─── 12. RECENT TRANSACTIONS ─── */}
                <div className="dd-recent-card">
                    <h3><i className="fas fa-history" style={{ marginRight: 8, color: '#60A5FA' }}></i>Recent Transactions</h3>
                    <div className="dd-recent-list">
                        {recentExpenses.map((exp, i) => (
                            <div className="dd-recent-item" key={i}>
                                <div className="dd-recent-left">
                                    <span className="dd-recent-cat">{exp.category}</span>
                                    <span className="dd-recent-date">{new Date(exp.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <span className="dd-recent-amount">₹{exp.amount.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <p className="deep-dive-disclaimer">Data is sourced from your verified activity.</p>
            </div>
        </div>
    );
}
