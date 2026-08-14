import { useState } from 'react';
import { supabase } from '../../config/supabase';
import { SavioEmoji } from '../Savio';

export default function FeedbackModal({ isOpen, onClose, user }) {
    const [rating, setRating] = useState(0);
    const [mood, setMood] = useState('');
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [successData, setSuccessData] = useState({});

    const moods = [
        { emotion: 'angry', label: 'Bad' },
        { emotion: 'sad', label: 'Sad' },
        { emotion: 'neutral', label: 'Okay' },
        { emotion: 'happy', label: 'Good' },
        { emotion: 'celebrating', label: 'Awesome' }
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (rating === 0) { alert('Please select a star rating!'); return; }
        setSubmitting(true);
        try {
            const { error } = await supabase.from('app_feedback').insert([{
                user_id: user.id,
                rating: parseInt(rating),
                mood: mood || 'Neutral',
                comment: comment || 'No comment'
            }]);
            if (error) throw error;
            localStorage.setItem('savify_has_reviewed', 'true');

            let icon, title, text;
            if (mood === 'Bad') { icon = 'fa-heart-broken'; title = "We're Sorry"; text = "We'll work hard to fix this."; }
            else if (mood === 'Sad') { icon = 'fa-cloud-rain'; title = "We Hear You"; text = "Thank you for your honesty."; }
            else if (mood === 'Okay') { icon = 'fa-thumbs-up'; title = "Thanks!"; text = "We'll try to wow you next time."; }
            else { icon = 'fa-star'; title = "Thank You"; text = "Your voice shapes our future."; }
            setSuccessData({ icon, title, text });
            setSuccess(true);

            if (typeof window.confetti === 'function' && mood !== 'Bad') {
                window.confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 }, colors: ['#D4AF37', '#10B981', '#FFD700'] });
            }

            setTimeout(() => { setSuccess(false); setRating(0); setMood(''); setComment(''); onClose(); }, 3000);
        } catch (err) {
            console.error('Feedback error:', err);
            alert('Failed to submit feedback.');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontFamily: 'var(--font-secondary)' }}>How was it?</h2>
                    <span className="close-modal" onClick={onClose}>&times;</span>
                </div>

                {success ? (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <i className={`fas ${successData.icon} premium-success-icon`}></i>
                        <h3 className="gold-text-gradient" style={{ margin: '1rem 0' }}>{successData.title}</h3>
                        <p style={{ color: 'var(--color-stone)' }}>{successData.text}</p>
                        <button className="sexy-btn" style={{ marginTop: '1.5rem' }} onClick={() => { setSuccess(false); onClose(); }}>Done</button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} id="feedbackForm">
                        <div className="emoji-strip" id="feedbackEmojiStrip">
                            {moods.map(m => (
                                <span key={m.label} className={`emoji-opt ${mood === m.label ? 'selected' : ''}`} onClick={() => setMood(m.label)} title={m.label}>
                                    <SavioEmoji emotion={m.emotion} size={28} />
                                </span>
                            ))}
                        </div>
                        <div className="star-rating">
                            {[1, 2, 3, 4, 5].map(s => (
                                <i key={s} className={`fas fa-star ${s <= rating ? 'active' : ''}`} onClick={() => setRating(s)}></i>
                            ))}
                        </div>
                        <div className="form-group">
                            <label>Comment (Optional)</label>
                            <textarea rows="3" value={comment} onChange={e => setComment(e.target.value)} placeholder="Tell us more..." id="feedbackComment" style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--color-border)', borderRadius: 12, fontFamily: 'var(--font-primary)' }}></textarea>
                        </div>
                        <button type="submit" className="sexy-btn" disabled={submitting}>
                            {submitting ? <><i className="fas fa-spinner fa-spin"></i> Submitting...</> : 'Submit Feedback'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
