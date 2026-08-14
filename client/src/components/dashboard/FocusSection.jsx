import { useState } from 'react';

export default function FocusSection({ schedule, isActive, availableApps, permissions: permissionsProp, onStartSchedule, onStop, onGrantPermission, onTriggerBlock }) {
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('17:00');
    const [selectedApps, setSelectedApps] = useState([]);
    const [showPermissionPopup, setShowPermissionPopup] = useState(false);

    // Safety: default permissions to false if undefined
    const permissions = permissionsProp || { drawOverApps: false, appDataUsage: false };

    const toggleApp = (app) => {
        setSelectedApps(prev =>
            prev.find(a => a.id === app.id)
                ? prev.filter(a => a.id !== app.id)
                : [...prev, app]
        );
    };

    const handleScheduleClick = () => {
        if (selectedApps.length === 0) return;
        // Always show permission popup first — user must grant both permissions
        if (!permissions.drawOverApps || !permissions.appDataUsage) {
            setShowPermissionPopup(true);
        } else {
            onStartSchedule(startTime, endTime, selectedApps);
            setSelectedApps([]);
        }
    };

    const handlePermissionContinue = () => {
        if (permissions.drawOverApps && permissions.appDataUsage) {
            setShowPermissionPopup(false);
            onStartSchedule(startTime, endTime, selectedApps);
            setSelectedApps([]);
        }
    };

    return (
        <div className="focus-schedule-card inline-focus-section">
            <div className="focus-card-header">
                <div className="focus-card-icon">
                    <i className={`fas ${isActive ? 'fa-shield-alt' : 'fa-clock'}`}></i>
                </div>
                <div className="focus-card-info">
                    <h4>Focus Schedule</h4>
                    <p>{isActive
                        ? `Active: ${schedule?.startTime} — ${schedule?.endTime}`
                        : schedule?.active
                            ? `Scheduled: ${schedule?.startTime} — ${schedule?.endTime}`
                            : 'Block payment apps to avoid spending'
                    }</p>
                </div>
                <div className={`focus-status-dot ${isActive ? 'active' : ''}`}></div>
            </div>

            {schedule?.active ? (
                <>
                    <div className="focus-blocked-apps">
                        {schedule.selectedApps.map(app => (
                            <div key={app.id} className="focus-app-icon" style={{ background: app.color + '22' }}>
                                <img 
                                    src={`/assets/icons/${app.id}.png`} 
                                    alt={app.name} 
                                    style={{ width: '20px', height: '20px', objectFit: 'contain' }}
                                    onError={(e) => { 
                                        if (!e.target.dataset.triedJpg) {
                                            e.target.dataset.triedJpg = 'true';
                                            e.target.src = `/assets/icons/${app.id}.jpg`;
                                        } else if (!e.target.dataset.triedJpeg) {
                                            e.target.dataset.triedJpeg = 'true';
                                            e.target.src = `/assets/icons/${app.id}.jpeg`;
                                        } else {
                                            e.target.style.display = 'none'; 
                                            e.target.nextSibling.style.display = 'inline-block'; 
                                        }
                                    }}
                                />
                                <i className={app.icon} style={{ color: app.color, display: 'none' }}></i>
                            </div>
                        ))}
                    </div>
                    <div className="focus-card-actions">
                        <button className="focus-btn focus-btn-stop" onClick={onStop}>
                            <i className="fas fa-stop"></i> Stop
                        </button>
                        {isActive && (
                            <button className="focus-btn focus-btn-demo" onClick={onTriggerBlock}>
                                <i className="fas fa-eye"></i> Preview Block
                            </button>
                        )}
                    </div>
                </>
            ) : (
                <div className="focus-setup-inline" style={{ marginTop: '1.2rem' }}>
                    <div className="focus-time-row" style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '14px' }}>
                        <div className="focus-time-input">
                            <label style={{ color: 'rgba(255,255,255,0.7)' }}>From</label>
                            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none' }} />
                        </div>
                        <div className="focus-time-separator" style={{ color: 'rgba(255,255,255,0.5)' }}>
                            <i className="fas fa-arrow-right"></i>
                        </div>
                        <div className="focus-time-input">
                            <label style={{ color: 'rgba(255,255,255,0.7)' }}>To</label>
                            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none' }} />
                        </div>
                    </div>

                    <div className="focus-app-list" style={{ marginTop: '1rem' }}>
                        {availableApps.map(app => {
                            const isSelected = selectedApps.find(a => a.id === app.id);
                            return (
                                <div
                                    key={app.id}
                                    className={`focus-app-item ${isSelected ? 'selected' : ''}`}
                                    onClick={() => toggleApp(app)}
                                    style={{ '--app-color': app.color, background: isSelected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.05)', borderColor: isSelected ? '#10b981' : 'transparent', color: '#fff' }}
                                >
                                    <img 
                                        src={`/assets/icons/${app.id}.png`} 
                                        alt={app.name} 
                                        style={{ width: '24px', height: '24px', objectFit: 'contain', marginBottom: '8px' }}
                                        onError={(e) => { 
                                            if (!e.target.dataset.triedJpg) {
                                                e.target.dataset.triedJpg = 'true';
                                                e.target.src = `/assets/icons/${app.id}.jpg`;
                                            } else if (!e.target.dataset.triedJpeg) {
                                                e.target.dataset.triedJpeg = 'true';
                                                e.target.src = `/assets/icons/${app.id}.jpeg`;
                                            } else {
                                                e.target.style.display = 'none'; 
                                                e.target.nextSibling.style.display = 'inline-block'; 
                                            }
                                        }}
                                    />
                                    <i className={app.icon} style={{ display: 'none', fontSize: '1.5rem', marginBottom: '8px' }}></i>
                                    <span>{app.name}</span>
                                    {isSelected && <i className="fas fa-check focus-app-check"></i>}
                                </div>
                            );
                        })}
                    </div>

                    <button
                        className="focus-btn focus-btn-start"
                        onClick={() => {
                            if (selectedApps.length === 0) {
                                alert("Please select at least one app to block before scheduling.");
                                return;
                            }
                            handleScheduleClick();
                        }}
                        style={{ marginTop: '1rem', width: '100%', padding: '0.8rem' }}
                    >
                        <i className="fas fa-play"></i> Schedule {selectedApps.length > 0 ? `(${selectedApps.length} apps)` : ''}
                    </button>
                </div>
            )}

            {/* Permission Popup inline modal */}
            {showPermissionPopup && (
                <div className="modal-overlay open" onClick={() => setShowPermissionPopup(false)}>
                    <div className="focus-modal" onClick={e => e.stopPropagation()}>
                        <button className="milestone-popup-close" onClick={() => setShowPermissionPopup(false)}>
                            <i className="fas fa-times"></i>
                        </button>
                        <h2 className="focus-modal-title">
                            <i className="fas fa-shield-alt"></i> Permissions Required
                        </h2>
                        <p className="focus-permissions-desc">
                            To block distracting apps, Savify needs two permissions:
                        </p>
                        <div className={`focus-perm-card ${permissions.drawOverApps ? 'granted' : ''}`}>
                            <div className="focus-perm-icon">
                                <i className={`fas ${permissions.drawOverApps ? 'fa-check-circle' : 'fa-layer-group'}`}></i>
                            </div>
                            <div className="focus-perm-info">
                                <h4>Draw Over Other Apps</h4>
                                <p>Shows the focus screen when you open blocked apps</p>
                            </div>
                            {!permissions.drawOverApps && (
                                <button className="focus-perm-btn" onClick={() => onGrantPermission('drawOverApps')}>Allow</button>
                            )}
                        </div>
                        <div className={`focus-perm-card ${permissions.appDataUsage ? 'granted' : ''}`}>
                            <div className="focus-perm-icon">
                                <i className={`fas ${permissions.appDataUsage ? 'fa-check-circle' : 'fa-chart-bar'}`}></i>
                            </div>
                            <div className="focus-perm-info">
                                <h4>App Data Usage</h4>
                                <p>Detects when you open a blocked app</p>
                            </div>
                            {!permissions.appDataUsage && (
                                <button className="focus-perm-btn" onClick={() => onGrantPermission('appDataUsage')}>Allow</button>
                            )}
                        </div>
                        {(permissions.drawOverApps && permissions.appDataUsage) && (
                            <button className="sexy-btn" onClick={handlePermissionContinue} style={{ width: '100%', marginTop: '1rem' }}>
                                Start Block <i className="fas fa-play"></i>
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
