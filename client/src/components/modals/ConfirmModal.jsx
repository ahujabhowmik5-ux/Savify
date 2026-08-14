import { useState } from 'react';
import { SavioEmoji } from '../Savio';

export default function ConfirmModal({ isOpen, onClose, onConfirm, expense }) {
    const [submitting, setSubmitting] = useState(false);

    const handleConfirm = async () => {
        setSubmitting(true);
        try {
            await onConfirm();
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen || !expense) return null;

    return (
        <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}><SavioEmoji emotion="approving" size={48} /></div>
                <h2 style={{ fontFamily: 'var(--font-secondary)', marginBottom: '2rem' }}>Confirm Expense</h2>
                <div style={{ background: 'var(--color-ivory)', padding: '1.5rem', borderRadius: 16, marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-obsidian)', fontFamily: 'var(--font-secondary)' }} id="confAmount">
                        ₹{expense.amount}
                    </div>
                    <div style={{ color: 'var(--color-stone)', marginTop: 8 }}>
                        <span id="confCat">{expense.category}</span> • <span id="confTime">{new Date().toLocaleTimeString()}</span>
                    </div>
                </div>
                <div className="modal-btns">
                    <button className="modal-btn btn-cancel" onClick={onClose} disabled={submitting}>Cancel</button>
                    <button className="modal-btn btn-confirm" onClick={handleConfirm} disabled={submitting}>
                        {submitting ? <><i className="fas fa-spinner fa-spin"></i> Processing...</> : 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
    );
}
