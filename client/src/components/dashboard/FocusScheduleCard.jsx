import { useState } from 'react';

export default function FocusScheduleCard({ schedule, isActive, onOpenModal, onStop, onTriggerBlock }) {
    return (
        <div className="focus-schedule-card">
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
                            : 'Set a focus time to avoid distractions'
                    }</p>
                </div>
                <div className={`focus-status-dot ${isActive ? 'active' : ''}`}></div>
            </div>

            {schedule?.active && schedule?.selectedApps?.length > 0 && (
                <div className="focus-blocked-apps">
                    {schedule.selectedApps.slice(0, 4).map(app => (
                        <div key={app.id} className="focus-app-icon" style={{ background: app.color + '22' }}>
                            <i className={app.icon} style={{ color: app.color }}></i>
                        </div>
                    ))}
                    {schedule.selectedApps.length > 4 && (
                        <div className="focus-app-icon focus-app-more">
                            +{schedule.selectedApps.length - 4}
                        </div>
                    )}
                </div>
            )}

            <div className="focus-card-actions">
                {schedule?.active ? (
                    <>
                        <button className="focus-btn focus-btn-stop" onClick={onStop}>
                            <i className="fas fa-stop"></i> Stop
                        </button>
                        {isActive && (
                            <button className="focus-btn focus-btn-demo" onClick={onTriggerBlock}>
                                <i className="fas fa-eye"></i> Preview Block
                            </button>
                        )}
                    </>
                ) : (
                    <button className="focus-btn focus-btn-start" onClick={onOpenModal}>
                        <i className="fas fa-play"></i> Set Schedule
                    </button>
                )}
            </div>
        </div>
    );
}
