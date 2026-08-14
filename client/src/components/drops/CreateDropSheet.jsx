import React, { useState } from 'react';
import Savio from '../Savio';

export default function CreateDropSheet({ onClose, onSubmit, loading }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [emoji, setEmoji] = useState('🔥');
    const [durationHours, setDurationHours] = useState('2');

    const EMOJIS = ['🔥', '🍕', '🛒', '🚕', '🎬', '🎵', '⚽', '🍔', '📚'];

    const handleSubmit = () => {
        if (!title.trim()) return;
        onSubmit({
            title,
            description,
            emoji,
            durationHours: parseInt(durationHours, 10)
        });
    };

    return (
        <>
            <div className="drops-overlay" onClick={onClose} style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 99
            }} />
            
            <div className="drops-sheet" style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                background: 'rgba(20,20,22,0.95)',
                backdropFilter: 'blur(40px)',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                borderTopLeftRadius: 28, borderTopRightRadius: 28,
                padding: '24px 20px 40px', zIndex: 100,
                transform: 'translateY(0)', transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
                <div style={{ width: 40, height: 5, background: 'rgba(255,255,255,0.2)', borderRadius: 10, margin: '0 auto 24px' }} />
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                    <div style={{ width: 60, height: 60, background: 'rgba(255,255,255,0.05)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
                        {emoji}
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'white' }}>Create Drop</h2>
                        <div style={{ fontSize: 13, color: 'var(--drops-text-secondary)', marginTop: 4 }}>
                            Start a new pool in your hall
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', paddingBottom: 8 }}>
                    {EMOJIS.map(e => (
                        <div key={e} onClick={() => setEmoji(e)} style={{
                            padding: '10px', fontSize: 24, borderRadius: 12, cursor: 'pointer',
                            background: emoji === e ? 'rgba(255,255,255,0.1)' : 'transparent'
                        }}>
                            {e}
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                    <input 
                        type="text" 
                        placeholder="Title (e.g. Midnight Pizza Run)" 
                        value={title} 
                        onChange={e => setTitle(e.target.value)}
                        style={{ padding: 16, borderRadius: 12, border: '1px solid var(--drops-border)', background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: 16 }}
                    />
                    <input 
                        type="text" 
                        placeholder="Description (Optional)" 
                        value={description} 
                        onChange={e => setDescription(e.target.value)}
                        style={{ padding: 16, borderRadius: 12, border: '1px solid var(--drops-border)', background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: 16 }}
                    />
                    <div>
                        <label style={{ fontSize: 12, color: 'var(--drops-text-secondary)', marginBottom: 8, display: 'block' }}>Duration (Closes in)</label>
                        <select 
                            value={durationHours} 
                            onChange={e => setDurationHours(e.target.value)}
                            style={{ width: '100%', padding: 16, borderRadius: 12, border: '1px solid var(--drops-border)', background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: 16, appearance: 'none' }}
                        >
                            <option value="1">1 Hour</option>
                            <option value="2">2 Hours</option>
                            <option value="4">4 Hours</option>
                            <option value="12">12 Hours</option>
                            <option value="24">24 Hours</option>
                        </select>
                    </div>
                </div>

                <button 
                    onClick={handleSubmit} 
                    disabled={loading || !title.trim()}
                    className="drops-pay-btn"
                >
                    {loading ? 'Creating...' : 'Start Drop'}
                </button>
            </div>
        </>
    );
}
