import { useState } from 'react';
import { supabase } from '../../config/supabase';

export default function ForceBudgetModal({ isOpen, user, appData, onComplete }) {
    const [budget, setBudget] = useState(appData?.weekly_spending || '');
    const [submitting, setSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!budget || Number(budget) <= 0) {
            alert('Please enter a valid weekly budget greater than 0.');
            return;
        }
        if (Number(budget) > 999999) {
            alert('Budget is too large! Maximum allowed is ₹9,99,999.');
            return;
        }

        setSubmitting(true);
        try {
            const newBudget = parseFloat(budget);
            const currentSpent = appData?.current_weekly_spent || 0;
            
            // Recalculate score based on new budget
            let newScore = 0;
            if (newBudget > 0) {
                newScore = Math.max(0, Math.min(1000,
                    1000 - Math.round((currentSpent / newBudget) * 1000)
                ));
            }

            const { error } = await supabase
                .from('user_applications')
                .update({
                    weekly_spending: newBudget,
                    current_score: newScore,
                    budget_reset_done: true
                })
                .eq('user_id', user.id);

            if (error) throw error;
            
            onComplete({ weekly_spending: newBudget, current_score: newScore, budget_reset_done: true });
        } catch (err) {
            console.error('Force budget update error:', err);
            alert('Failed to save budget: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay open" style={{ zIndex: 10000, backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.7)' }}>
            <div className="modal" style={{ maxWidth: '400px' }}>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <div style={{
                        width: '60px', height: '60px', borderRadius: '50%', background: 'var(--color-emerald-light)',
                        color: 'var(--color-emerald)', fontSize: '1.5rem', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', margin: '0 auto 1rem'
                    }}>
                        <i className="fas fa-wallet"></i>
                    </div>
                    <h2 style={{ fontFamily: 'var(--font-secondary)', fontSize: '1.4rem', color: 'var(--color-obsidian)', marginBottom: '0.5rem' }}>
                        Important Update
                    </h2>
                    <p style={{ fontSize: '0.9rem', color: 'var(--color-stone)', lineHeight: '1.5' }}>
                        We're updating our scoring system to make it fairer for everyone. To continue using the dashboard, please confirm or update your <strong>Weekly Budget</strong>.
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Weekly Budget (₹) *</label>
                        <input
                            type="number"
                            value={budget}
                            onChange={(e) => setBudget(e.target.value)}
                            placeholder="e.g. 2000"
                            min="1"
                            max="999999"
                            required
                            style={{ fontSize: '1.1rem', padding: '0.8rem 1rem' }}
                        />
                    </div>
                    
                    <button 
                        type="submit" 
                        className="sexy-btn" 
                        disabled={submitting}
                        style={{ width: '100%', marginTop: '1rem', padding: '0.9rem' }}
                    >
                        {submitting ? (
                            <><i className="fas fa-spinner fa-spin"></i> Saving...</>
                        ) : (
                            <>Confirm Budget <i className="fas fa-arrow-right" style={{ marginLeft: '8px' }}></i></>
                        )}
                    </button>
                    <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#999', marginTop: '1rem' }}>
                        You cannot close this window until a budget is confirmed.
                    </p>
                </form>
            </div>
        </div>
    );
}
