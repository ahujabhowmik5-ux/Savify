import { useState, useRef } from 'react';

export default function ExpenseModal({ isOpen, onClose, onSubmit }) {
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('Food');
    const [description, setDescription] = useState('');
    const formRef = useRef(null);

    const handleSubmit = (e) => {
        e.preventDefault();
        const amt = parseFloat(amount);
        if (isNaN(amt) || amt < 0) { alert('Expense cannot be negative!'); return; }
        if (amt > 999999) { alert('Amount is too large! Maximum allowed is ₹9,99,999.'); return; }
        onSubmit(amt, category, description);
        setAmount('');
        setCategory('Food');
        setDescription('');
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontFamily: 'var(--font-secondary)' }}>Add Expense</h2>
                    <span className="close-modal" onClick={onClose}>&times;</span>
                </div>
                <form ref={formRef} onSubmit={handleSubmit} id="expenseForm">
                    <div className="form-group">
                        <label>Amount (₹)</label>
                        <input type="number" id="expAmount" step="0.01" min="0" max="999999" value={amount} onChange={e => setAmount(e.target.value)} required placeholder="e.g. 120" />
                    </div>
                    <div className="form-group">
                        <label>Category</label>
                        <select id="expCategory" value={category} onChange={e => setCategory(e.target.value)}>
                            <option>Food</option>
                            <option>Transport</option>
                            <option>Shopping</option>
                            <option>Entertainment</option>
                            <option>Bills</option>
                            <option>Education</option>
                            <option>Investment</option>
                            <option>Others</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Description (Optional)</label>
                        <input type="text" id="expDesc" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Dinner at canteen" />
                    </div>
                    <div className="modal-btns">
                        <button type="button" className="modal-btn btn-cancel" onClick={onClose}>Cancel</button>
                        <button type="submit" className="modal-btn btn-confirm">Review</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
