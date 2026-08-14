import { useState } from 'react';
import { getCategoryIcon } from '../../utils/helpers';
import LeaderboardModal from '../modals/LeaderboardModal';
import TierInfoPopup from '../modals/TierInfoPopup';
import StreakRing from './StreakRing';
import AdBanner from './AdBanner';
import MilestonesSection from './MilestonesSection';
import RankBadge from './RankBadge';
import Savio from '../Savio';
import TasksCard from './TasksCard';

const AVATAR_COLORS = ['10B981', '3B82F6', '8B5CF6', 'F59E0B', 'EF4444', 'EC4899', '06B6D4', 'D946EF'];
const FLUENT_BASE = 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis';

function getTierClass(tierName) {
    const t = (tierName || 'Bronze').toLowerCase();
    if (t.includes('elite')) return 'tier-elite';
    if (t.includes('plat')) return 'tier-platinum';
    if (t.includes('gold')) return 'tier-gold';
    if (t.includes('silver')) return 'tier-silver';
    return 'tier-bronze';
}

export default function OverviewTab({
    balanceScore, currentRank, tier, currentBudget,
    currentSpending, remaining, budgetPct, streak, aiComment, history, friends,
    friendsLoading, hasMoreFriends, appData,
    onAddExpense, onOpenInvite, onOpenEdit, onLoadMoreFriends,
    widgetEnabled, onToggleWidget, onOpenTrustLogic, onReplayTutorial,
    // Ads props
    ad1, onAdClick,
    // Milestones props
    achievedMilestones, lockedMilestones,
    // Tasks props
    todayTasks, completedToday, onCompleteTask, taskStats,
}) {
    const isOverBudget = budgetPct > 100;
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [showTierInfo, setShowTierInfo] = useState(false);
    const tierClass = getTierClass(tier);

    return (
        <>
            {/* Tab Greeting */}
            <div className="tab-greeting">
                <RankBadge appData={appData} expenses={history} />
                <p>Monitoring your progress.</p>
            </div>

            {/* Streak Ring - Opal inspired */}
            <StreakRing streak={streak} />

            {/* Widget Toggle - Topmost */}
            <div className="widget-toggle-card">
                <div className="widget-toggle-info">
                    <div className="widget-toggle-icon">
                        <i className="fas fa-bolt"></i>
                    </div>
                    <div className="widget-toggle-text">
                        <h4>Quick Add Widget</h4>
                        <p>Floating shortcut to add expenses fast</p>
                        <p className="mobile-only-hint" style={{ color: 'var(--color-emerald)', fontSize: '0.7rem', marginTop: '4px', fontWeight: '600' }}>
                            <i className="fas fa-hand-pointer"></i> Touch & hold widget to open
                        </p>
                    </div>
                </div>
                <label className="widget-toggle-switch">
                    <input
                        type="checkbox"
                        checked={!!widgetEnabled}
                        onChange={(e) => onToggleWidget?.(e.target.checked)}
                    />
                    <span className="widget-toggle-slider"></span>
                </label>
            </div>

            {/* Savio Note Banner */}
            <div className="savio-note-banner">
                <div className="savio-note-row">
                    <div className="savio-note-icon">
                        <Savio state="explaining" size={36} showBubble={false} />
                    </div>
                    <div className="savio-note-content">
                        <span className="savio-note-label">Savio note</span>
                        <p className="savio-note-text">"{aiComment || 'Loading...'}"</p>
                    </div>
                    <button className="savio-replay-btn" onClick={onReplayTutorial} title="Replay Tutorial">
                        Replay <i className="fas fa-play-circle"></i>
                    </button>
                </div>
            </div>



            {/* Stats Cards Row */}
            <div className="stats-row">
                {/* Balance Score Card - Dark */}
                <div className="stat-card stat-card-dark">
                    <div className="stat-card-header">
                        <span className="stat-card-label">BALANCE SCORE</span>
                        <div className="stat-card-header-right">
                            <button className="stat-info-btn" onClick={onOpenTrustLogic} title="How scores are calculated">
                                <i className="fas fa-info-circle"></i>
                            </button>
                            <div className="stat-card-icon-circle">
                                <img src={`${FLUENT_BASE}/Travel%20and%20places/Glowing%20Star.png`} alt="" className="stat-card-3d-icon" loading="lazy" />
                            </div>
                        </div>
                    </div>
                    <div className="stat-card-value-large">{balanceScore}</div>
                    <div className="stat-card-footer" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span><i className="fas fa-sync-alt"></i> Live Sync</span>
                        {completedToday && completedToday.length > 0 && (
                            <span style={{ color: '#10B981', fontSize: '0.65rem', fontWeight: 700 }}>
                                <i className="fas fa-tasks"></i> +{Math.min(completedToday.length * 5, 10)} task bonus
                            </span>
                        )}
                    </div>
                </div>

                {/* Current Tier Card — Metallic */}
                <div className={`stat-card ${tierClass}`}>
                    <button className="tier-info-btn" onClick={() => setShowTierInfo(true)} title="Tier Information">
                        <i className="fas fa-info-circle"></i>
                    </button>
                    <div className="stat-card-icon-top">
                        <img src={`${FLUENT_BASE}/Activities/Trophy.png`} alt="" className="stat-card-3d-icon" loading="lazy" />
                    </div>
                    <span className="stat-card-label">CURRENT TIER</span>
                    <div className="stat-card-value-large">{tier || 'Bronze'}</div>
                </div>

                {/* Global Rank Card - Green */}
                <div className="stat-card stat-card-rank" onClick={() => setShowLeaderboard(true)} style={{ cursor: 'pointer' }}>
                    <div className="stat-card-icon-top">
                        <img src={`${FLUENT_BASE}/Activities/1st%20Place%20Medal.png`} alt="" className="stat-card-3d-icon" loading="lazy" />
                    </div>
                    <span className="stat-card-label">GLOBAL RANK</span>
                    <div className="stat-card-value-large">
                        {currentRank > 0 ? `#${currentRank}` : '#--'}
                    </div>
                </div>
            </div>

            {/* Milestones Section */}
            <MilestonesSection achieved={achievedMilestones} locked={lockedMilestones} />

            {/* Daily Missions */}
            {todayTasks && todayTasks.length > 0 && (
                <TasksCard
                    todayTasks={todayTasks}
                    completedToday={completedToday || []}
                    onComplete={onCompleteTask}
                    stats={taskStats || { taskStreak: 0, totalPoints: 0, completionRate: 0 }}
                />
            )}

            {/* Ad Banner Slot 1 */}
            <AdBanner ad={ad1} onAdClick={onAdClick} />

            {/* Campus Mates & Budget Row */}
            <div className="overview-bottom-row">
                {/* Campus Mates Card */}
                <div className="campus-mates-card">
                    <div className="campus-mates-header">
                        <h3>CAMPUS MATES ({appData?.college?.toUpperCase() || 'IIT KHARAGPUR'})</h3>
                        <div className="campus-manage-icon" title="Campus">
                            <i className="fas fa-university"></i>
                        </div>
                    </div>
                    <div className="friends-grid" id="friendsList"
                        onTouchStart={(e) => e.stopPropagation()}
                        onTouchEnd={(e) => e.stopPropagation()}
                    >
                        {/* Add Friend button */}
                        <div className="friend-item" onClick={onOpenInvite}>
                            <button className="add-friend-btn" title="Invite Friend">+</button>
                            <span className="friend-name">Invite</span>
                        </div>

                        {friends.map((friend, idx) => {
                            const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                            const friendAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.full_name)}&background=${color}&color=fff&size=100`;
                            return (
                                <div className="friend-item" key={idx}>
                                    <img src={friendAvatarUrl} alt={friend.full_name} className="friend-avatar" />
                                    <span className="friend-name">{friend.full_name.split(' ')[0]}</span>
                                </div>
                            );
                        })}

                        {friendsLoading && (
                            <div className="friend-item">
                                <div className="add-friend-btn" style={{ background: 'transparent', border: '2px solid #eee' }}>
                                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '1rem', color: '#999' }}></i>
                                </div>
                                <span className="friend-name">Loading...</span>
                            </div>
                        )}

                        {hasMoreFriends && !friendsLoading && (
                            <div className="friend-item" onClick={onLoadMoreFriends} style={{ cursor: 'pointer' }}>
                                <div className="add-friend-btn" style={{ background: '#e5e7eb', color: '#333', fontSize: '0.7rem' }}>
                                    <i className="fas fa-chevron-right"></i>
                                </div>
                                <span className="friend-name">More</span>
                            </div>
                        )}

                        {!friendsLoading && friends.length === 0 && (
                            <div style={{ padding: '1rem', color: 'var(--color-stone)', fontSize: '0.85rem' }}>
                                No friends found at your college yet. Be the first to invite!
                            </div>
                        )}
                    </div>
                </div>

                {/* Weekly Budget Card */}
                <div className="weekly-budget-card">
                    <button className="edit-pencil-btn budget-edit-btn" onClick={onOpenEdit} title="Edit Profile">
                        <i className="fas fa-pen"></i>
                    </button>
                    <div className="budget-icon-top">
                        <i className="fas fa-wallet"></i>
                    </div>
                    <span className="stat-card-label">WEEKLY BUDGET</span>
                    <div className="budget-value-display">₹{currentBudget.toLocaleString()}</div>
                    <div className="budget-bar-section">
                        <div className="budget-bar-labels">
                            <span>Usage</span>
                            <span>{Math.min(budgetPct, 999).toFixed(1)}%</span>
                        </div>
                        <div className="progress-bar">
                            <div className={`progress-fill ${isOverBudget ? 'over-100' : ''}`} style={{ width: `${Math.min(budgetPct, 100)}%` }}></div>
                        </div>
                    </div>
                    <div className={`budget-status-pill ${isOverBudget ? 'over' : ''}`}>
                        <i className={`fas ${isOverBudget ? 'fa-exclamation-triangle' : 'fa-piggy-bank'}`}></i>
                        <span>
                            {isOverBudget
                                ? `Overspent by ₹${Math.abs(remaining).toLocaleString()}`
                                : `₹${remaining.toLocaleString()} remaining`}
                        </span>
                    </div>
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="transactions-card">
                <div className="transactions-header">
                    <h2 className="transactions-title">Recent Transactions</h2>
                    <button className="add-expense-btn hide-on-mobile" onClick={onAddExpense}>
                        <i className="fas fa-plus"></i> Add Expense
                    </button>
                </div>
                <div className="transactions-list" id="historyList">
                    {history.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>No transactions yet.</div>
                    ) : (
                        history.map((exp, idx) => (
                            <div className="transaction-item" key={idx}>
                                <div className="transaction-left">
                                    <div className="transaction-icon">
                                        <i className={`fas ${getCategoryIcon(exp.category)}`}></i>
                                    </div>
                                    <div className="transaction-info">
                                        <span className="transaction-category">{exp.category}</span>
                                        <span className="transaction-date">
                                            {new Date(exp.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                        </span>
                                    </div>
                                </div>
                                <div className="transaction-amount">-₹{exp.amount.toLocaleString()}</div>
                            </div>
                        ))
                    )}
                </div>
            </div>



            <LeaderboardModal
                isOpen={showLeaderboard}
                onClose={() => setShowLeaderboard(false)}
                currentUserName={appData?.full_name}
            />

            <TierInfoPopup
                isOpen={showTierInfo}
                onClose={() => setShowTierInfo(false)}
                currentTier={tier || 'Bronze'}
            />
        </>
    );
}