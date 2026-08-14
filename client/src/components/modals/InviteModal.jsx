import { useState } from 'react';
import { supabase } from '../../config/supabase';
import { SavioEmoji } from '../Savio';

export default function InviteModal({ isOpen, onClose, user, appData }) {
    const [step, setStep] = useState(1); // 1 = choose type, 2 = enter email
    const [inviteType, setInviteType] = useState(null);
    const [email, setEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleNext = () => {
        if (!inviteType) { alert('Please select Campus Mate or Outsider!'); return; }
        setStep(2);
    };

    const handleSend = async () => {
        if (!email.trim()) { alert('Please enter an email!'); return; }
        setSubmitting(true);
        try {
            const { error } = await supabase.functions.invoke('invite-friend', {
                body: {
                    inviterName: appData?.full_name || 'A Savify User',
                    inviterEmail: user?.email || '',
                    friendEmail: email.trim(),
                    type: inviteType
                }
            });
            if (error) throw error;
            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                setEmail('');
                setStep(1);
                setInviteType(null);
                onClose();
            }, 2000);
        } catch (err) {
            console.error('Invite error:', err);
            alert('Failed to send invite. Try again!');
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        setStep(1);
        setInviteType(null);
        setEmail('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && handleClose()}>
            <div className="modal invite-modal-redesign">
                <div className="invite-modal-top">
                    <h2 className="invite-modal-title">Invite Friend</h2>
                    <span className="close-modal" onClick={handleClose}>&times;</span>
                </div>

                {success ? (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}><SavioEmoji emotion="celebrating" size={48} /></div>
                        <h3 className="gold-text-gradient">Invite Sent!</h3>
                        <p style={{ color: 'var(--color-stone)' }}>Your friend will receive the invite shortly.</p>
                    </div>
                ) : step === 1 ? (
                    <>
                        <div className="invite-limit-note">
                            <i className="fas fa-exclamation-circle"></i> Note: You are limited to 2 invites per day.
                        </div>

                        <p className="invite-question">Who are you inviting?</p>

                        <div className="invite-type-grid">
                            <div
                                className={`invite-option ${inviteType === 'campus' ? 'selected' : ''}`}
                                onClick={() => setInviteType('campus')}
                            >
                                <i className="fas fa-university"></i>
                                <div className="invite-label">Campus Mate</div>
                                <div className="invite-desc">From your college</div>
                            </div>
                            <div
                                className={`invite-option ${inviteType === 'friend' ? 'selected' : ''}`}
                                onClick={() => setInviteType('friend')}
                            >
                                <i className="fas fa-globe"></i>
                                <div className="invite-label">Outsider</div>
                                <div className="invite-desc">Anyone else</div>
                            </div>
                        </div>

                        <button className="invite-next-btn" onClick={handleNext}>
                            NEXT
                        </button>
                    </>
                ) : (
                    <>
                        <button className="invite-back-btn" onClick={() => setStep(1)}>
                            <i className="fas fa-arrow-left"></i> Back
                        </button>

                        <p className="invite-question" style={{ marginTop: '0.5rem' }}>
                            Enter {inviteType === 'campus' ? "your campus mate's" : "your friend's"} email
                        </p>

                        <div className="form-group">
                            <label>{inviteType === 'campus' ? "Campus Mate's" : "Friend's"} Email</label>
                            <input
                                className="sexy-input"
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="friend@email.com"
                                autoFocus
                            />
                        </div>

                        <button className="sexy-btn" onClick={handleSend} disabled={submitting}>
                            {submitting ? <><i className="fas fa-spinner fa-spin"></i> Sending...</> : 'Send Invite'}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
