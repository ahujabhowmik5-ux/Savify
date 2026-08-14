export default function MobileBottomNav({ activeTab, onTabChange }) {
    return (
        <nav className="mobile-bottom-nav">
            <div className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => onTabChange('overview')}>
                <i className="fas fa-th-large"></i>
                <span>Overview</span>
            </div>
            <div className={`nav-item ${activeTab === 'analysis' ? 'active' : ''}`} onClick={() => onTabChange('analysis')}>
                <i className="fas fa-chart-pie"></i>
                <span>Analysis</span>
            </div>
            <div className={`nav-item ${activeTab === 'focus' ? 'active' : ''}`} onClick={() => onTabChange('focus')}>
                <i className="fas fa-shield-alt"></i>
                <span>Focus</span>
            </div>
            <div className={`nav-item ${activeTab === 'teams' ? 'active' : ''}`} onClick={() => onTabChange('teams')}>
                <i className="fas fa-users"></i>
                <span>Teams</span>
            </div>
            <div className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => onTabChange('profile')}>
                <i className="fas fa-user"></i>
                <span>Profile</span>
            </div>
        </nav>
    );
}
