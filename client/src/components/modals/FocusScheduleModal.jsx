import { useState } from 'react';

export default function FocusScheduleModal({ isOpen, onClose, availableApps, permissions, onGrantPermission, onStartSchedule }) {
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('17:00');
    const [selectedApps, setSelectedApps] = useState([]);
    const [step, setStep] = useState('permissions'); // 'permissions', 'setup'

    if (!isOpen) return null;

    const allPermissionsGranted = permissions.drawOverApps && permissions.appDataUsage;

    const toggleApp = (app) => {
        setSelectedApps(prev =>
            prev.find(a => a.id === app.id)
                ? prev.filter(a => a.id !== app.id)
                : [...prev, app]
        );
    };

    const handleStart = () => {
        if (selectedApps.length === 0) return;
        onStartSchedule(startTime, endTime, selectedApps);
        onClose();
        setStep('permissions');
        setSelectedApps([]);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="focus-modal" onClick={e => e.stopPropagation()}>
                <button className="milestone-popup-close" onClick={onClose}>
                    <i className="fas fa-times"></i>
                </button>

                <h2 className="focus-modal-title">
                    <i className="fas fa-shield-alt"></i> Focus Schedule
                </h2>

                {step === 'permissions' && !allPermissionsGranted ? (
                    <div className="focus-permissions">
                        <p className="focus-permissions-desc">
                            To block distracting apps, we need two permissions:
                        </p>

                        <div className={`focus-perm-card ${permissions.drawOverApps ? 'granted' : ''}`}>
                            <div className="focus-perm-icon">
                                <i className={`fas ${permissions.drawOverApps ? 'fa-check-circle' : 'fa-layer-group'}`}></i>
                            </div>
                            <div className="focus-perm-info">
                                <h4>Draw Over Other Apps</h4>
                                <p>Shows the focus screen when you try to open blocked apps</p>
                            </div>
                            {!permissions.drawOverApps && (
                                <button className="focus-perm-btn" onClick={() => onGrantPermission('drawOverApps')}>
                                    Allow
                                </button>
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
                                <button className="focus-perm-btn" onClick={() => onGrantPermission('appDataUsage')}>
                                    Allow
                                </button>
                            )}
                        </div>

                        {allPermissionsGranted && (
                            <button className="sexy-btn" onClick={() => setStep('setup')} style={{ width: '100%', marginTop: '1rem' }}>
                                Continue <i className="fas fa-arrow-right"></i>
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="focus-setup">
                        {/* Time Picker */}
                        <div className="focus-time-row">
                            <div className="focus-time-input">
                                <label>Start Time</label>
                                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                            </div>
                            <div className="focus-time-separator">
                                <i className="fas fa-arrow-right"></i>
                            </div>
                            <div className="focus-time-input">
                                <label>End Time</label>
                                <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                            </div>
                        </div>

                        {/* App Grid */}
                        <div className="focus-app-grid">
                            <label className="focus-app-label">Select apps to block:</label>
                            <div className="focus-app-list">
                                {availableApps.map(app => {
                                    const isSelected = selectedApps.find(a => a.id === app.id);
                                    return (
                                        <div
                                            key={app.id}
                                            className={`focus-app-item ${isSelected ? 'selected' : ''}`}
                                            onClick={() => toggleApp(app)}
                                            style={{ '--app-color': app.color }}
                                        >
                                            <img 
                                                src={`/assets/icons/${app.id}.png`} 
                                                alt={app.name} 
                                                style={{ width: '28px', height: '28px', objectFit: 'contain', marginBottom: '8px' }}
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
                        </div>

                        <button
                            className="sexy-btn"
                            onClick={handleStart}
                            disabled={selectedApps.length === 0}
                            style={{ width: '100%', marginTop: '1rem' }}
                        >
                            <i className="fas fa-play"></i> Start Schedule ({selectedApps.length} apps)
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
