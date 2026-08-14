import { useState } from 'react';
import Savio from '../Savio';
import '../../styles/tasks.css';

const CATEGORY_COLORS = {
    saving: { bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)', text: '#10B981', label: 'Saving' },
    tracking: { bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.3)', text: '#3B82F6', label: 'Tracking' },
    mindfulness: { bg: 'rgba(168, 85, 247, 0.12)', border: 'rgba(168, 85, 247, 0.3)', text: '#A855F7', label: 'Mindfulness' },
    social: { bg: 'rgba(236, 72, 153, 0.12)', border: 'rgba(236, 72, 153, 0.3)', text: '#EC4899', label: 'Social' },
    learning: { bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)', text: '#F59E0B', label: 'Learning' },
};

export default function TasksCard({ todayTasks, completedToday, onComplete, stats }) {
    const [completingId, setCompletingId] = useState(null);
    const allDone = todayTasks.every(t => completedToday.includes(t.id));

    const handleComplete = (taskId) => {
        if (completedToday.includes(taskId)) return;
        setCompletingId(taskId);
        setTimeout(() => {
            onComplete(taskId);
            setCompletingId(null);
        }, 600);
    };

    return (
        <div className="tasks-card">
            {/* Header */}
            <div className="tasks-header">
                <div className="tasks-title-row">
                    <h3 className="tasks-title">
                        <i className="fas fa-tasks"></i> Daily Missions
                    </h3>
                    <span className="tasks-completion-badge">
                        {completedToday.length}/{todayTasks.length}
                    </span>
                </div>
                <p className="tasks-subtitle">Complete tasks to boost your Balance Score</p>
            </div>

            {/* Task Items */}
            <div className="tasks-list">
                {todayTasks.map((task) => {
                    const isCompleted = completedToday.includes(task.id);
                    const isCompleting = completingId === task.id;
                    const catStyle = CATEGORY_COLORS[task.category] || CATEGORY_COLORS.saving;

                    return (
                        <div
                            key={task.id}
                            className={`task-item ${isCompleted ? 'completed' : ''} ${isCompleting ? 'completing' : ''}`}
                            onClick={() => handleComplete(task.id)}
                        >
                            <div className="task-check">
                                {isCompleted ? (
                                    <div className="task-check-done">
                                        <i className="fas fa-check"></i>
                                    </div>
                                ) : (
                                    <div className="task-check-empty"></div>
                                )}
                            </div>
                            <div className="task-content">
                                <span className="task-text">{task.text}</span>
                                <div className="task-meta">
                                    <span
                                        className="task-category-badge"
                                        style={{ background: catStyle.bg, color: catStyle.text, borderColor: catStyle.border }}
                                    >
                                        {catStyle.label}
                                    </span>
                                    <span className="task-points">+{task.points} pts</span>
                                </div>
                            </div>
                            <div className="task-icon" style={{ color: catStyle.text }}>
                                <i className={`fas ${task.icon}`}></i>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* All Done State */}
            {allDone && (
                <div className="tasks-done-state">
                    <Savio state="celebrating" size={48} showBubble={false} />
                    <p>All missions complete! +{todayTasks.reduce((s, t) => s + t.points, 0)} points earned today</p>
                </div>
            )}

            {/* Mini Stats */}
            <div className="tasks-stats-row">
                <div className="tasks-stat">
                    <span className="tasks-stat-value">{stats.taskStreak}</span>
                    <span className="tasks-stat-label">Day Streak</span>
                </div>
                <div className="tasks-stat">
                    <span className="tasks-stat-value">{stats.totalPoints}</span>
                    <span className="tasks-stat-label">Total Pts</span>
                </div>
                <div className="tasks-stat">
                    <span className="tasks-stat-value">{stats.completionRate}%</span>
                    <span className="tasks-stat-label">7-Day Rate</span>
                </div>
            </div>
        </div>
    );
}
