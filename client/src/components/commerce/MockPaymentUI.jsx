import React, { useState } from 'react';
import Savio from '../Savio';

export default function MockPaymentUI({ amount, orderId, onClose, onSuccess }) {
    const [status, setStatus] = useState('idle'); // idle, processing, success, fail
    const [errorText, setErrorText] = useState('');

    const handlePay = async (shouldSucceed) => {
        setStatus('processing');
        setErrorText('');

        // Settle server-side: the simulator has to drive the same fulfilment
        // code the gateway does, or it proves nothing about seats and carts.
        try {
            const res = await fetch('/api/payment/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_id: orderId, outcome: shouldSucceed ? 'success' : 'failure' })
            });
            const data = await res.json();

            if (!res.ok) {
                setErrorText(data.error || 'Simulation failed.');
                setStatus('fail');
                return;
            }
            if (data.status === 'SUCCESS') {
                setStatus('success');
                setTimeout(() => onSuccess(data), 1200);
            } else {
                setErrorText('Payment declined (simulated).');
                setStatus('fail');
            }
        } catch (err) {
            setErrorText(err.message || 'Could not reach the simulator.');
            setStatus('fail');
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 1100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <div style={{ background: 'var(--drops-surface)', width: '100%', maxWidth: 400, borderRadius: '24px 24px 0 0', padding: 24, animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 800 }}>
                        Complete Payment
                        <span style={{ marginLeft: 8, fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', background: 'rgba(255,159,10,0.16)', color: 'var(--drops-orange)', padding: '3px 8px', borderRadius: 100, verticalAlign: 'middle' }}>Test mode</span>
                    </h2>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', width: 32, height: 32, borderRadius: '50%', color: 'white', cursor: 'pointer' }}>
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{ fontSize: 14, color: 'var(--drops-text-secondary)', marginBottom: 8 }}>Total Amount (inclusive of platform fees)</div>
                    <div style={{ fontSize: 48, fontWeight: 800, color: 'var(--drops-text-primary)' }}>₹{amount}</div>
                    
                    <div style={{ marginTop: 24 }}>
                        <Savio 
                            state={status === 'idle' ? 'waving' : status === 'processing' ? 'worried' : status === 'success' ? 'celebrating' : 'crying'} 
                            size={64} 
                            showBubble={false} 
                        />
                    </div>
                </div>

                {status === 'idle' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <button onClick={() => handlePay(true)} style={{ padding: 16, borderRadius: 16, border: 'none', background: 'var(--drops-green)', color: 'black', fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: 8 }}>
                            <i className="fas fa-check-circle"></i> Simulate UPI Success
                        </button>
                        <button onClick={() => handlePay(false)} style={{ padding: 16, borderRadius: 16, border: 'none', background: 'rgba(255,69,58,0.15)', color: 'var(--drops-red)', fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: 8 }}>
                            <i className="fas fa-times-circle"></i> Simulate UPI Failure
                        </button>
                    </div>
                )}

                {status === 'processing' && (
                    <div style={{ textAlign: 'center', padding: 24 }}>
                        <div className="spinner" style={{ border: '4px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--drops-blue)', borderRadius: '50%', width: 40, height: 40, animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}></div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--drops-blue)' }}>Processing UPI Payment...</div>
                    </div>
                )}

                {status === 'success' && (
                    <div style={{ textAlign: 'center', padding: 24 }}>
                        <i className="fas fa-check-circle" style={{ fontSize: 48, color: 'var(--drops-green)', marginBottom: 16 }}></i>
                        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--drops-green)' }}>Payment Successful!</div>
                    </div>
                )}

                {status === 'fail' && (
                    <div style={{ textAlign: 'center', padding: 24 }}>
                        <i className="fas fa-exclamation-circle" style={{ fontSize: 48, color: 'var(--drops-red)', marginBottom: 16 }}></i>
                        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--drops-red)', marginBottom: 8 }}>Payment Failed</div>
                        {errorText && <div style={{ fontSize: 13, color: 'var(--drops-text-secondary)', marginBottom: 12 }}>{errorText}</div>}
                        <button onClick={() => setStatus('idle')} style={{ padding: '8px 16px', borderRadius: 12, border: 'none', background: 'var(--drops-blue)', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Try Again</button>
                    </div>
                )}
            </div>
            <style>{`
                @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
