import { useState } from 'react';
import { supabase } from '../../config/supabase';
import { SavioEmoji } from '../Savio';

export default function ContactModal({ isOpen, onClose, user }) {
    const [message, setMessage] = useState('');
    const [mood, setMood] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const moods = [
        { emotion: 'angry', label: 'Bad' },
        { emotion: 'sad', label: 'Sad' },
        { emotion: 'neutral', label: 'Okay' },
        { emotion: 'happy', label: 'Good' },
        { emotion: 'celebrating', label: 'Awesome' }
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!message.trim()) { alert('Please enter a message!'); return; }
        setSubmitting(true);
        try {
            const { error } = await supabase.from('contact_messages').insert([{
                user_id: user.id,
                message: message.trim(),
                mood: mood || 'Neutral'
            }]);
            if (error) throw error;
            setSuccess(true);
            setTimeout(() => { setSuccess(false); setMessage(''); setMood(''); onClose(); }, 3000);
        } catch (err) {
            console.error('Contact error:', err);
            alert('Failed to send message.');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontFamily: 'var(--font-secondary)' }}>Contact Us</h2>
                    <span className="close-modal" onClick={onClose}>&times;</span>
                </div>

                {success ? (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <i className="fas fa-check-circle premium-success-icon"></i>
                        <h3 className="gold-text-gradient" style={{ margin: '1rem 0' }}>Message Sent!</h3>
                        <p style={{ color: 'var(--color-stone)' }}>We'll get back to you soon.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} id="contactForm">
                        <div className="emoji-strip" id="contactEmojiStrip">
                            {moods.map(m => (
                                <span key={m.label} className={`emoji-opt ${mood === m.label ? 'selected' : ''}`} onClick={() => setMood(m.label)} title={m.label}>
                                    <SavioEmoji emotion={m.emotion} size={28} />
                                </span>
                            ))}
                        </div>
                        <div className="form-group">
                            <label>Your Message</label>
                            <textarea rows="4" value={message} onChange={e => setMessage(e.target.value)} placeholder="Tell us what's on your mind..." id="contactMessage" style={{ width: '100%', padding: '0.8rem 1rem', border: '1px solid var(--color-border)', borderRadius: 12, fontFamily: 'var(--font-primary)' }}></textarea>
                        </div>
                        <button type="submit" className="sexy-btn" disabled={submitting}>
                            {submitting ? <><i className="fas fa-spinner fa-spin"></i> Sending...</> : 'Send Message'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
