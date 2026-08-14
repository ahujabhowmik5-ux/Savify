export default function Sidebar({ appData, activeTab, onTabChange, onOpenSupport, avatarUrl }) {
    const navItems = [
        { id: 'overview', icon: 'fas fa-home', label: 'Overview' },
        { id: 'analysis', icon: 'fas fa-chart-pie', label: 'Analysis' },
        { id: 'focus', icon: 'fas fa-shield-alt', label: 'Focus' },
        { id: 'teams', icon: 'fas fa-users', label: 'Teams' },
        { id: 'profile', icon: 'fas fa-user', label: 'Profile' },
    ];

    return (
        <aside className="sidebar">
            <div className="logo sidebar-logo-animated">
                <img src="https://i.ibb.co/v441FQJ1/gemini-2-5-flash-image-Refine-this-Savify-S-logo-to-be-flatter-more-geometric-and-ultra-premium.png" alt="Savify" className="logo-img" />
                Savify
            </div>

            <nav className="sidebar-nav">
                {navItems.map((item, index) => (
                    <a
                        key={item.id}
                        className={`nav-link sidebar-stagger-item ${activeTab === item.id ? 'active' : ''}`}
                        onClick={() => onTabChange(item.id)}
                        style={{ animationDelay: `${0.1 + index * 0.08}s` }}
                    >
                        <i className={item.icon}></i>
                        <span>{item.label}</span>
                        {activeTab === item.id && <div className="nav-active-indicator" />}
                    </a>
                ))}
                <a
                    className="nav-link sidebar-stagger-item"
                    onClick={onOpenSupport}
                    style={{ animationDelay: '0.42s' }}
                >
                    <i className="fas fa-headset"></i>
                    <span>Support</span>
                </a>
            </nav>

            <div className="kgp-badge sidebar-stagger-item" style={{ animationDelay: '0.52s' }}>
                <i className="fas fa-university kgp-icon"></i>
                <div>
                    <div style={{ fontWeight: 700, marginBottom: 2, color: '#fff', fontSize: '0.8rem' }}>Built at</div>
                    <div style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 600 }}>IIT Kharagpur</div>
                </div>
            </div>

            <div className="user-profile sidebar-stagger-item" style={{ animationDelay: '0.62s' }}>
                <img src={avatarUrl} alt="" className="avatar" />
                <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }} id="sidebarName">{appData?.full_name || 'User'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-stone)' }}>...</div>
                </div>
            </div>
        </aside>
    );
}
