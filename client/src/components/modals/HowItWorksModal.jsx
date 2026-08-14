export default function HowItWorksModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    const steps = [
        { icon: 'fa-plus-circle', color: '#10B981', title: 'Log Every Expense', desc: 'Food, travel, shopping — everything counts!' },
        { icon: 'fa-chart-line', color: '#D4AF37', title: 'Balance Score (0-1000)', desc: 'Calculated from budget vs spending ratio.' },
        { icon: 'fa-trophy', color: '#FF5722', title: 'Compete on Campus', desc: 'See how you rank against other students.' },
        { icon: 'fa-shield-alt', color: '#0A0A0A', title: 'Privacy First', desc: 'Only YOU see your finances. Always.' }
    ];

    return (
        <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontFamily: 'var(--font-secondary)' }}>
                        <i className="fas fa-question-circle" style={{ marginRight: 10, color: 'var(--color-gold)' }}></i>
                        How It Works
                    </h2>
                    <span className="close-modal" onClick={onClose}>&times;</span>
                </div>

                {steps.map((step, i) => (
                    <div className="info-grid-row" key={i}>
                        <div className="info-icon" style={{ background: `${step.color}20`, color: step.color }}>
                            <i className={`fas ${step.icon}`}></i>
                        </div>
                        <div>
                            <div style={{ fontWeight: 600, marginBottom: 2 }}>{step.title}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--color-stone)' }}>{step.desc}</div>
                        </div>
                    </div>
                ))}

                <button className="sexy-btn" style={{ marginTop: '1.5rem' }} onClick={onClose}>Got It!</button>
            </div>
        </div>
    );
}
