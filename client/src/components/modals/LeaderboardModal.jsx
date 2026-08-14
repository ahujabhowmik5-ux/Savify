import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../config/supabase';
import { getTierFromScore } from '../../utils/helpers';

const TIER_COLORS = {
    'Bronze': '#CD7F32',
    'Silver': '#C0C0C0',
    'Gold': '#FFD700',
    'Platinum': '#E5E4E2',
    'Elite': '#FF4500',
};

export default function LeaderboardModal({ isOpen, onClose, currentUserName }) {
    const [loading, setLoading] = useState(true);
    const [leaderboard, setLeaderboard] = useState([]);
    const [expandedUser, setExpandedUser] = useState(null);

    useEffect(() => {
        if (!isOpen) return;
        const fetchLeaderboard = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('leaderboard_view')
                    .select('user_id, full_name, current_score, rank_number')
                    .order('rank_number', { ascending: true });

                if (!error && data) {
                    // Deduplicate by user_id — keep the entry with the best rank
                    const seen = new Map();
                    const unique = [];
                    for (const entry of data) {
                        const key = entry.user_id || entry.full_name;
                        if (!seen.has(key)) {
                            seen.set(key, true);
                            unique.push(entry);
                        }
                    }
                    setLeaderboard(unique);
                }
            } catch (e) {
                console.error('Leaderboard fetch error:', e);
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboard();
    }, [isOpen]);

    if (!isOpen) return null;

    const handleRowClick = (entry) => {
        const key = entry.user_id || entry.full_name;
        setExpandedUser(expandedUser === key ? null : key);
    };

    return createPortal(
        <div className="leaderboard-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="leaderboard-popup">
                <button className="leaderboard-close" onClick={onClose}>&times;</button>
                <div className="leaderboard-header">
                    <div className="leaderboard-trophy">
                        <i className="fas fa-trophy"></i>
                    </div>
                    <h2 className="leaderboard-title">Global Leaderboard</h2>
                </div>
                {loading ? (
                    <div className="leaderboard-loading">
                        <i className="fas fa-spinner fa-spin"></i>
                        <span>Loading leaderboard...</span>
                    </div>
                ) : leaderboard.length === 0 ? (
                    <div className="leaderboard-empty">No rankings available yet.</div>
                ) : (
                    <div className="leaderboard-list">
                        {leaderboard.map((entry) => {
                            const isCurrentUser = currentUserName && entry.full_name === currentUserName;
                            const isTop3 = entry.rank_number <= 3;
                            const entryKey = entry.user_id || entry.full_name;
                            const isExpanded = expandedUser === entryKey;
                            const score = Math.round(entry.current_score ?? 0);
                            const tier = getTierFromScore(score);
                            const tierColor = TIER_COLORS[tier] || '#CD7F32';

                            return (
                                <div key={entryKey}>
                                    <div
                                        className={`leaderboard-row ${isCurrentUser ? 'leaderboard-row-self' : ''} ${isTop3 ? 'leaderboard-row-top' : ''}`}
                                        onClick={() => handleRowClick(entry)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <span className={`leaderboard-rank ${isTop3 ? `rank-${entry.rank_number}` : ''}`}>
                                            {isTop3 ? (
                                                <i className={`fas fa-medal rank-medal-${entry.rank_number}`}></i>
                                            ) : (
                                                `#${entry.rank_number}`
                                            )}
                                        </span>
                                        <span className="leaderboard-name">
                                            {entry.full_name}
                                            {isCurrentUser && <span className="leaderboard-you-badge">You</span>}
                                        </span>
                                        <span className="leaderboard-expand-icon">
                                            <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`} style={{ fontSize: '0.6rem', color: '#666' }}></i>
                                        </span>
                                    </div>
                                    {isExpanded && (
                                        <div className="leaderboard-details">
                                            <div className="leaderboard-detail-item">
                                                <span className="leaderboard-detail-label">Balance Score</span>
                                                <span className="leaderboard-detail-value">{score}</span>
                                            </div>
                                            <div className="leaderboard-detail-item">
                                                <span className="leaderboard-detail-label">Tier</span>
                                                <span className="leaderboard-detail-value" style={{ color: tierColor }}>
                                                    {tier}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
