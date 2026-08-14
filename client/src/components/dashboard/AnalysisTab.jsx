import { useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart, ArcElement, PieController, DoughnutController, LineController, LineElement, BarController, BarElement, PointElement, CategoryScale, LinearScale, Filler, Tooltip } from 'chart.js';
import { chartColors, APP_START_DATE } from '../../utils/helpers';
import AdBanner from './AdBanner';
import RankBadge from './RankBadge';
import Savio from '../Savio';

Chart.register(ArcElement, PieController, DoughnutController, LineController, LineElement, BarController, BarElement, PointElement, CategoryScale, LinearScale, Filler, Tooltip);

/**
 * ML-Driven Analysis Utilities (client-side)
 * Uses statistical methods that run in the browser — no server needed.
 */

// Simple linear regression for trend prediction
function linearRegression(data) {
    const n = data.length;
    if (n < 2) return { slope: 0, intercept: 0, predict: () => 0 };
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
        sumX += i; sumY += data[i]; sumXY += i * data[i]; sumX2 += i * i;
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    return { slope, intercept, predict: (x) => slope * x + intercept };
}

// Z-score anomaly detection
function detectAnomalies(data, threshold = 1.8) {
    if (data.length < 3) return [];
    const mean = data.reduce((s, v) => s + v, 0) / data.length;
    const std = Math.sqrt(data.reduce((s, v) => s + (v - mean) ** 2, 0) / data.length);
    if (std === 0) return [];
    return data.map((v, i) => ({ index: i, value: v, zScore: (v - mean) / std, isAnomaly: Math.abs((v - mean) / std) > threshold }));
}

// Spending runway prediction
function predictRunway(dailyAvg, remaining) {
    if (dailyAvg <= 0 || remaining <= 0) return 0;
    return Math.floor(remaining / dailyAvg);
}

// Category momentum: which categories are growing vs shrinking
function categoryMomentum(expenses, days = 14) {
    const now = new Date();
    const halfwayDate = new Date(now);
    halfwayDate.setDate(halfwayDate.getDate() - Math.floor(days / 2));
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);

    const firstHalf = {}, secondHalf = {};
    expenses.forEach(exp => {
        const d = new Date(exp.created_at);
        if (d < startDate) return;
        const cat = exp.category;
        if (d < halfwayDate) {
            firstHalf[cat] = (firstHalf[cat] || 0) + exp.amount;
        } else {
            secondHalf[cat] = (secondHalf[cat] || 0) + exp.amount;
        }
    });

    const allCats = new Set([...Object.keys(firstHalf), ...Object.keys(secondHalf)]);
    const momentum = [];
    allCats.forEach(cat => {
        const before = firstHalf[cat] || 0;
        const after = secondHalf[cat] || 0;
        const change = before > 0 ? ((after - before) / before) * 100 : (after > 0 ? 100 : 0);
        momentum.push({ category: cat, before, after, change });
    });
    return momentum.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
}

// Day-of-week spending heatmap
function weekdayHeatmap(expenses) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const totals = new Array(7).fill(0);
    const counts = new Array(7).fill(0);
    expenses.forEach(exp => {
        const dow = new Date(exp.created_at).getDay();
        totals[dow] += exp.amount;
        counts[dow]++;
    });
    const max = Math.max(...totals, 1);
    return days.map((name, i) => ({
        name,
        total: totals[i],
        count: counts[i],
        avg: counts[i] > 0 ? Math.round(totals[i] / counts[i]) : 0,
        intensity: totals[i] / max,
    }));
}

// Generate smart text insights
function generateInsights(expenses, totalSpent, budget, dailyAvg, runway, momentum, anomalies) {
    const insights = [];
    
    // Runway insight
    if (runway > 0 && runway < 3) {
        insights.push({ icon: '⚠️', text: `Budget critical! Only ${runway} day${runway > 1 ? 's' : ''} of spending left at current pace.`, type: 'warning' });
    } else if (runway >= 3 && runway < 7) {
        insights.push({ icon: '📊', text: `${runway} days of budget remaining. Consider slowing down.`, type: 'caution' });
    } else if (runway >= 7) {
        insights.push({ icon: '✅', text: `Healthy runway: ${runway}+ days of budget left. Great pacing!`, type: 'success' });
    }

    // Spending ratio
    const ratio = budget > 0 ? totalSpent / budget : 0;
    if (ratio > 1) {
        insights.push({ icon: '🔴', text: `Over budget by ₹${Math.round(totalSpent - budget).toLocaleString()} (${Math.round(ratio * 100)}% used).`, type: 'warning' });
    } else if (ratio > 0.8) {
        insights.push({ icon: '🟡', text: `${Math.round(ratio * 100)}% of budget used. Approaching limit.`, type: 'caution' });
    }

    // Momentum
    const growing = momentum.filter(m => m.change > 20);
    if (growing.length > 0) {
        insights.push({ icon: '📈', text: `${growing[0].category} spending is up ${Math.round(growing[0].change)}% vs last week.`, type: 'info' });
    }

    // Anomalies
    const anomalyDays = anomalies.filter(a => a.isAnomaly && a.zScore > 0);
    if (anomalyDays.length > 0) {
        insights.push({ icon: '🔍', text: `${anomalyDays.length} unusual spending spike${anomalyDays.length > 1 ? 's' : ''} detected recently.`, type: 'info' });
    }

    // Daily average context
    if (dailyAvg > 0) {
        insights.push({ icon: '💰', text: `Daily average: ₹${Math.round(dailyAvg).toLocaleString()}/day.`, type: 'info' });
    }

    return insights.slice(0, 5); // Max 5 insights
}

export default function AnalysisTab({ expenses, currentBudget, appData, ad2, onAdClick }) {
    const navigate = useNavigate();
    const pieRef = useRef(null);
    const lineRef = useRef(null);
    const heatmapRef = useRef(null);
    const pieChartRef = useRef(null);
    const lineChartRef = useRef(null);
    const heatmapChartRef = useRef(null);

    const filteredExpenses = useMemo(() => {
        return (expenses || []).filter(exp => new Date(exp.created_at) >= APP_START_DATE);
    }, [expenses]);

    // Weekly expenses: only THIS week's spending for budget comparison
    const weeklyExpenses = useMemo(() => {
        const now = new Date();
        const weekStart = new Date(now);
        const day = weekStart.getDay();
        const diff = day === 0 ? 6 : day - 1;
        weekStart.setDate(weekStart.getDate() - diff);
        weekStart.setHours(0, 0, 0, 0);
        return filteredExpenses.filter(exp => new Date(exp.created_at) >= weekStart);
    }, [filteredExpenses]);

    // Category totals — uses WEEKLY expenses for budget-relative analysis
    const { totalSpent, catTotals, pieLabels, pieData } = useMemo(() => {
        const catTotals = {};
        let totalSpent = 0;
        weeklyExpenses.forEach(exp => {
            catTotals[exp.category] = (catTotals[exp.category] || 0) + exp.amount;
            totalSpent += exp.amount;
        });
        return {
            catTotals,
            totalSpent,
            pieLabels: Object.keys(catTotals),
            pieData: Object.values(catTotals)
        };
    }, [weeklyExpenses]);

    // Daily totals for trend line (last 14 days — uses ALL filtered expenses for longer view)
    const { dayLabels, dailyData, dailyAverage } = useMemo(() => {
        const toLocalDate = (d) => {
            const dt = new Date(d);
            return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        };
        const dailyTotals = {};
        const days = [];
        const dayLabels = [];
        for (let i = 13; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            const dateStr = toLocalDate(d);
            days.push(dateStr);
            dayLabels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            dailyTotals[dateStr] = 0;
        }
        filteredExpenses.forEach(exp => {
            const dateStr = toLocalDate(exp.created_at);
            if (Object.prototype.hasOwnProperty.call(dailyTotals, dateStr)) dailyTotals[dateStr] += exp.amount;
        });
        const data = days.map(d => dailyTotals[d]);
        const nonZero = data.filter(v => v > 0);
        const dailyAverage = nonZero.length > 0 ? nonZero.reduce((s, v) => s + v, 0) / nonZero.length : 0;
        return { dayLabels, dailyData: data, dailyAverage };
    }, [filteredExpenses]);

    // ML-powered analytics — uses weekly totalSpent for budget metrics, all-time for trends
    const mlAnalytics = useMemo(() => {
        const remaining = currentBudget - totalSpent;
        const runway = predictRunway(dailyAverage, Math.max(remaining, 0));
        const trend = linearRegression(dailyData);
        const anomalies = detectAnomalies(dailyData);
        const momentum = categoryMomentum(filteredExpenses);
        const heatmap = weekdayHeatmap(filteredExpenses);
        const insights = generateInsights(weeklyExpenses, totalSpent, currentBudget, dailyAverage, runway, momentum, anomalies);

        // Predicted spending for next 3 days
        const predictions = [];
        for (let i = 0; i < 3; i++) {
            const predicted = Math.max(0, Math.round(trend.predict(dailyData.length + i)));
            predictions.push(predicted);
        }

        return { runway, trend, anomalies, momentum, heatmap, insights, predictions, remaining };
    }, [dailyData, dailyAverage, totalSpent, currentBudget, filteredExpenses, weeklyExpenses]);

    // Pie/Doughnut chart
    useEffect(() => {
        if (!pieRef.current) return;
        if (pieChartRef.current) pieChartRef.current.destroy();
        pieChartRef.current = new Chart(pieRef.current.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: pieLabels.length > 0 ? pieLabels : ['No data'],
                datasets: [{
                    data: pieData.length > 0 ? pieData : [1],
                    backgroundColor: pieData.length > 0 ? chartColors : ['#333'],
                    borderWidth: 2,
                    borderColor: '#0A0A0A',
                    cutout: '60%',
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.label}: ₹${ctx.raw.toLocaleString()}`
                        }
                    }
                }
            }
        });
        return () => { if (pieChartRef.current) pieChartRef.current.destroy(); };
    }, [pieLabels, pieData]);

    // Trend line chart with prediction overlay
    useEffect(() => {
        if (!lineRef.current) return;
        if (lineChartRef.current) lineChartRef.current.destroy();

        const anomalyColors = mlAnalytics.anomalies.map(a =>
            a.isAnomaly ? (a.zScore > 0 ? '#EF4444' : '#10B981') : '#D4AF37'
        );

        // Extended labels for predictions
        const allLabels = [...dayLabels];
        const allData = [...dailyData];
        const predData = new Array(dailyData.length).fill(null);
        
        for (let i = 0; i < mlAnalytics.predictions.length; i++) {
            const d = new Date();
            d.setDate(d.getDate() + i + 1);
            allLabels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            allData.push(null);
            predData.push(mlAnalytics.predictions[i]);
        }
        // Bridge prediction line
        if (dailyData.length > 0 && mlAnalytics.predictions.length > 0) {
            predData[dailyData.length - 1] = dailyData[dailyData.length - 1];
        }

        lineChartRef.current = new Chart(lineRef.current.getContext('2d'), {
            type: 'line',
            data: {
                labels: allLabels,
                datasets: [
                    {
                        label: 'Actual',
                        data: allData,
                        borderColor: '#D4AF37',
                        backgroundColor: 'rgba(212, 175, 55, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: anomalyColors,
                        pointBorderColor: anomalyColors,
                        pointRadius: dailyData.map((_, i) => {
                            const a = mlAnalytics.anomalies[i];
                            return a?.isAnomaly ? 6 : 3;
                        }),
                    },
                    {
                        label: 'Predicted',
                        data: predData,
                        borderColor: 'rgba(59, 130, 246, 0.7)',
                        backgroundColor: 'rgba(59, 130, 246, 0.05)',
                        fill: true,
                        tension: 0.4,
                        borderDash: [6, 4],
                        pointRadius: predData.map(v => v !== null ? 5 : 0),
                        pointBackgroundColor: '#3B82F6',
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#999' } },
                    x: { grid: { display: false }, ticks: { color: '#999', maxTicksLimit: 8 } }
                },
                plugins: { legend: { display: false } }
            }
        });
        return () => { if (lineChartRef.current) lineChartRef.current.destroy(); };
    }, [dayLabels, dailyData, mlAnalytics]);

    // Weekday heatmap bar chart
    useEffect(() => {
        if (!heatmapRef.current) return;
        if (heatmapChartRef.current) heatmapChartRef.current.destroy();

        const heatmapData = mlAnalytics.heatmap;
        heatmapChartRef.current = new Chart(heatmapRef.current.getContext('2d'), {
            type: 'bar',
            data: {
                labels: heatmapData.map(d => d.name),
                datasets: [{
                    data: heatmapData.map(d => d.total),
                    backgroundColor: heatmapData.map(d => {
                        const intensity = d.intensity;
                        if (intensity > 0.8) return 'rgba(239, 68, 68, 0.8)';
                        if (intensity > 0.5) return 'rgba(245, 158, 11, 0.7)';
                        if (intensity > 0.2) return 'rgba(16, 185, 129, 0.6)';
                        return 'rgba(107, 114, 128, 0.4)';
                    }),
                    borderRadius: 6,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#999' } },
                    x: { grid: { display: false }, ticks: { color: '#999' } }
                },
                plugins: { legend: { display: false } }
            }
        });
        return () => { if (heatmapChartRef.current) heatmapChartRef.current.destroy(); };
    }, [mlAnalytics.heatmap]);

    const trendDirection = mlAnalytics.trend.slope > 0.5 ? 'up' : mlAnalytics.trend.slope < -0.5 ? 'down' : 'stable';

    return (
        <div className="analysis-container" id="captureArea">
            {/* Tab Greeting */}
            <div className="tab-greeting">
                <RankBadge appData={appData} expenses={expenses} />
                <p>Monitoring your progress.</p>
            </div>

            <div className="report-header">
                <h2 className="spending-report-title">Spending Report</h2>
                <button className="detailed-analysis-btn" onClick={() => navigate('/deep-dive')}>
                    <i className="fas fa-chart-bar"></i> Deep Dive
                </button>
            </div>

            {/* ML INSIGHTS STRIP */}
            {mlAnalytics.insights.length > 0 && (
                <div className="analysis-insights-strip">
                    <div className="insights-strip-header">
                        <Savio state={mlAnalytics.runway < 3 ? 'thinking' : 'idle'} size={28} showBubble={false} />
                        <span className="insights-strip-label">AI Insights</span>
                    </div>
                    <div className="insights-strip-list">
                        {mlAnalytics.insights.map((insight, i) => (
                            <div key={i} className={`insight-chip ${insight.type}`}>
                                <span className="insight-icon">{insight.icon}</span>
                                <span className="insight-text">{insight.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* RUNWAY PREDICTION CARD */}
            <div className="analysis-runway-card">
                <div className="runway-metric">
                    <span className="runway-metric-label">RUNWAY</span>
                    <span className={`runway-metric-value ${mlAnalytics.runway < 3 ? 'critical' : mlAnalytics.runway < 7 ? 'caution' : 'healthy'}`}>
                        {mlAnalytics.remaining <= 0 ? '0' : mlAnalytics.runway} days
                    </span>
                </div>
                <div className="runway-metric">
                    <span className="runway-metric-label">DAILY AVG</span>
                    <span className="runway-metric-value">₹{Math.round(dailyAverage).toLocaleString()}</span>
                </div>
                <div className="runway-metric">
                    <span className="runway-metric-label">TREND</span>
                    <span className={`runway-metric-value trend-${trendDirection}`}>
                        <i className={`fas fa-arrow-${trendDirection === 'up' ? 'up' : trendDirection === 'down' ? 'down' : 'right'}`}></i>
                        {trendDirection === 'up' ? ' Rising' : trendDirection === 'down' ? ' Falling' : ' Stable'}
                    </span>
                </div>
            </div>

            {/* BENTO GRID LAYOUT */}
            <div className="analysis-bento">
                {/* Doughnut Chart */}
                <div className="analysis-card-premium">
                    <h3><i className="fas fa-chart-pie"></i> Expense Breakdown</h3>
                    <div className="chart-wrapper">
                        <canvas ref={pieRef}></canvas>
                    </div>
                    <div className="chart-legend-grid" style={{ display: 'flex', flexDirection: 'column', gap: '0', marginTop: '1rem' }}>
                        {pieLabels.map((label, index) => {
                            const amount = pieData[index];
                            const percent = totalSpent > 0 ? ((amount / totalSpent) * 100).toFixed(1) : 0;
                            const color = chartColors[index % chartColors.length];
                            return (
                                <div className="category-item-premium" key={label}>
                                    <div className="cat-info-left">
                                        <div className="cat-icon-container">
                                            <span className="cat-icon-fallback" style={{ background: color, position: 'absolute' }}></span>
                                        </div>
                                        <span className="cat-name-premium">{label}</span>
                                    </div>
                                    <span className="cat-percent-premium">{percent}%</span>
                                </div>
                            );
                        })}
                    </div>
                    <div className="watermark">SAVIFY</div>
                </div>

                {/* Trend Line with Predictions */}
                <div className="analysis-card-premium">
                    <h3>
                        <i className="fas fa-chart-line"></i> Spending Velocity
                        <span className="chart-legend-inline">
                            <span className="legend-dot-inline" style={{ background: '#D4AF37' }}></span> Actual
                            <span className="legend-dot-inline" style={{ background: '#3B82F6' }}></span> Predicted
                        </span>
                    </h3>
                    <div className="chart-wrapper" style={{ minHeight: '200px' }}>
                        <canvas ref={lineRef}></canvas>
                    </div>
                    <div className="trend-subtitle" style={{ color: '#aaa', fontSize: '0.75rem', marginTop: '0.75rem', display: 'flex', gap: '1rem' }}>
                        <span>14-day trend with 3-day forecast</span>
                        {mlAnalytics.anomalies.some(a => a.isAnomaly) && (
                            <span style={{ color: '#EF4444' }}><i className="fas fa-exclamation-circle"></i> Red dots = anomalies</span>
                        )}
                    </div>
                    <div className="watermark">SAVIFY</div>
                </div>

                {/* Weekday Heatmap */}
                <div className="analysis-card-premium">
                    <h3><i className="fas fa-calendar-alt"></i> Spending by Day</h3>
                    <div className="chart-wrapper" style={{ minHeight: '180px' }}>
                        <canvas ref={heatmapRef}></canvas>
                    </div>
                    <div className="trend-subtitle" style={{ color: '#aaa', fontSize: '0.75rem', marginTop: '0.75rem' }}>
                        Highest spending days highlighted in red
                    </div>
                    <div className="watermark">SAVIFY</div>
                </div>

                {/* Category Momentum */}
                <div className="analysis-card-premium">
                    <h3><i className="fas fa-exchange-alt"></i> Category Momentum</h3>
                    <div className="momentum-list">
                        {mlAnalytics.momentum.slice(0, 5).map((m, i) => (
                            <div className="momentum-item" key={i}>
                                <span className="momentum-cat">{m.category}</span>
                                <div className="momentum-bar-wrap">
                                    <div
                                        className={`momentum-bar ${m.change > 0 ? 'rising' : 'falling'}`}
                                        style={{ width: `${Math.min(Math.abs(m.change), 100)}%` }}
                                    ></div>
                                </div>
                                <span className={`momentum-pct ${m.change > 0 ? 'rising' : 'falling'}`}>
                                    {m.change > 0 ? '+' : ''}{Math.round(m.change)}%
                                </span>
                            </div>
                        ))}
                        {mlAnalytics.momentum.length === 0 && (
                            <div style={{ color: '#666', fontSize: '0.8rem', padding: '1rem' }}>Add more expenses to see trends</div>
                        )}
                    </div>
                    <div className="watermark">SAVIFY</div>
                </div>
            </div>

            {/* Ad Banner Slot 2 */}
            <AdBanner ad={ad2} onAdClick={onAdClick} />

            <div className="timestamp-tag" id="chartLastUpdate">
                Updated: {new Date().toLocaleTimeString()}
            </div>
        </div>
    );
}
