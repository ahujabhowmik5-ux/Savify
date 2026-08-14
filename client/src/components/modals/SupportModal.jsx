export default function SupportModal({ isOpen, onClose, onContact, onFeedback }) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontFamily: 'var(--font-secondary)' }}>Support</h2>
                    <span className="close-modal" onClick={onClose}>&times;</span>
                </div>
                <div className="support-grid">
                    <div className="support-box" onClick={onContact}>
                        <i className="fas fa-envelope"></i>
                        <div style={{ fontWeight: 600 }}>Contact Us</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-stone)', marginTop: 4 }}>Send us a message</div>
                    </div>
                    <div className="support-box" onClick={onFeedback}>
                        <i className="fas fa-star"></i>
                        <div style={{ fontWeight: 600 }}>Feedback</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-stone)', marginTop: 4 }}>Rate your experience</div>
                    </div>
                    <div className="support-box" onClick={() => window.open('https://wa.me/919876543210', '_blank')}>
                        <i className="fab fa-whatsapp"></i>
                        <div style={{ fontWeight: 600 }}>WhatsApp</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-stone)', marginTop: 4 }}>Chat with us</div>
                    </div>
                    <div className="support-box" onClick={() => window.open('mailto:support@savify.co', '_blank')}>
                        <i className="fas fa-at"></i>
                        <div style={{ fontWeight: 600 }}>Email</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-stone)', marginTop: 4 }}>support@savify.co</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
