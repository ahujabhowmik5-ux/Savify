import { useState } from 'react';

export default function PremiumUpgradeModal({ isOpen, onClose, userId }) {
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleUpgrade = async () => {
        setLoading(true);
        try {
            // Call the Express backend to initiate PhonePe payment
            const response = await fetch('https://savify.in/api/payment/initiate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    userId: userId, 
                    amount: 1, // ₹1 for trial
                    redirectUrl: 'https://savify.in/?payment_success=true'
                })
            });
            const data = await response.json();
            
            if (data.success && data.redirectUrl) {
                // Redirect user to PhonePe payment page
                window.location.href = data.redirectUrl;
            } else {
                alert('Payment initiation failed. Please try again.');
            }
        } catch (error) {
            console.error('Payment Error:', error);
            alert('Failed to connect to payment gateway.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content premium-modal">
                <button className="modal-close" onClick={onClose}>
                    <i className="fas fa-times"></i>
                </button>
                <div className="modal-header">
                    <h2>Unlock Premium <i className="fas fa-crown" style={{ color: '#FCD34D' }}></i></h2>
                    <p>Get access to advanced features to supercharge your savings.</p>
                </div>
                
                <div className="premium-features-list" style={{ textAlign: 'left', margin: '20px 0' }}>
                    <div style={{ margin: '10px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <i className="fas fa-check-circle" style={{ color: '#10B981' }}></i>
                        <span><strong>Focus Scheduling</strong>: Block distracting spending apps completely</span>
                    </div>
                    <div style={{ margin: '10px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <i className="fas fa-check-circle" style={{ color: '#10B981' }}></i>
                        <span><strong>Unlimited Teams</strong>: Create and join unlimited finance squads</span>
                    </div>
                    <div style={{ margin: '10px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <i className="fas fa-check-circle" style={{ color: '#10B981' }}></i>
                        <span><strong>Ad-Free Experience</strong>: No more interruptions</span>
                    </div>
                </div>

                <div className="modal-actions" style={{ marginTop: '20px' }}>
                    <button 
                        className="btn-primary" 
                        onClick={handleUpgrade} 
                        disabled={loading}
                        style={{ width: '100%', background: 'linear-gradient(45deg, #8B5CF6, #EC4899)', border: 'none' }}
                    >
                        {loading ? 'Processing...' : 'Upgrade Now for ₹1'}
                    </button>
                    <button className="btn-secondary" onClick={onClose} style={{ width: '100%', marginTop: '10px' }}>
                        Maybe Later
                    </button>
                </div>
            </div>
        </div>
    );
}
