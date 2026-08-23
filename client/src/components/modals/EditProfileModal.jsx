import { useState } from 'react';
import { supabase } from '../../config/supabase';

const EDITABLE_FIELDS = [
    { key: 'full_name', label: 'Full Name', type: 'text', icon: 'fa-user' },
    { key: 'weekly_spending', label: 'Weekly Budget (₹)', type: 'number', icon: 'fa-wallet' },
    { key: 'college', label: 'College', type: 'select', icon: 'fa-university' },
    { key: 'hall', label: 'Hall of Residence', type: 'select', icon: 'fa-building' },
    { key: 'native_place', label: 'Native Place', type: 'text', icon: 'fa-map-marker-alt' },
];

const COLLEGES = ['IIT Kharagpur'];

const HALLS = [
    { group: 'Girls Halls', options: [
        'MT (Mother Teresa Hall)',
        'RLB (Rani Laxmibai Hall)',
        'SN / IG (Sarojini Naidu / Indira Gandhi Hall)',
        'SAM (Sir Ashutosh Mukherjee Hall)',
        'SNVH (Sister Nivedita Hall)'
    ]},
    { group: 'Boys Halls', options: [
        'Azad (Azad Hall)',
        'BCR (B C Roy Hall)',
        'BRA (B R Ambedkar Hall)',
        'HBH (Homi Bhabha Hall)',
        'JCB (J C Bose Hall)',
        'LLR (Lala Lajpat Rai Hall)',
        'LBS (Lalbahadur Sastry Hall)',
        'MMM (Madan Mohan Malviya Hall)',
        'MS (Megnad Saha Hall)',
        'Nehru (Nehru Hall)',
        'Patel (Patel Hall)',
        'RK (Radha Krishnan Hall)',
        'RP (Rajendra Prasad Hall)',
        'VS (Vidyasagar Hall)',
        'GH (Gokhale Hall)',
        'VGH (Visveswaraya Guest House)'
    ]}
];

export default function EditProfileModal({ isOpen, onClose, user, appData }) {
    const [step, setStep] = useState(1); // 1 = select fields, 2 = edit values
    const [selectedFields, setSelectedFields] = useState([]);
    const [values, setValues] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [showBudgetWarning, setShowBudgetWarning] = useState(false);

    const toggleField = (key) => {
        setSelectedFields(prev =>
            prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key]
        );
    };

    const goToEditStep = () => {
        if (selectedFields.length === 0) { alert('Please select at least one field.'); return; }
        // Prefill current values
        const prefilled = {};
        selectedFields.forEach(key => {
            prefilled[key] = appData?.[key] ?? '';
        });
        setValues(prefilled);
        setStep(2);
    };

    const handleValueChange = (key, val) => {
        setValues(prev => ({ ...prev, [key]: val }));
    };

    const handleSubmit = async () => {
        // Budget change warning check
        if (selectedFields.includes('weekly_spending')) {
            const budgetVal = Number(values.weekly_spending);
            if (budgetVal > 999999) { alert('Budget is too large! Maximum allowed is ₹9,99,999.'); return; }
            if (budgetVal !== Number(appData?.weekly_spending) && !showBudgetWarning) {
                setShowBudgetWarning(true);
                return;
            }
        }

        setSubmitting(true);
        try {
            const updateData = {};
            selectedFields.forEach(key => {
                if (key === 'weekly_spending') {
                    updateData[key] = parseFloat(values[key]) || 0;
                } else {
                    updateData[key] = values[key]?.trim() || '';
                }
            });

            // If budget changed, recalculate score client-side too
            if (updateData.weekly_spending !== undefined) {
                const newBudget = updateData.weekly_spending;
                const currentSpent = appData?.current_weekly_spent || 0;
                if (newBudget > 0) {
                    updateData.current_score = Math.max(0, Math.min(1000,
                        1000 - Math.round((currentSpent / newBudget) * 1000)
                    ));
                } else {
                    updateData.current_score = 0;
                }
            }

            const { error } = await supabase
                .from('user_applications')
                .update(updateData)
                .eq('user_id', user.id);

            if (error) throw error;

            // Automatically sync the new hall to user_profiles for the Roommate matching system
            if (updateData.hall) {
                // Map the full string "LBS (Lalbahadur Sastry Hall)" to short name "LBS" (if needed, but usually we just search new_halls)
                const shortHall = updateData.hall.split(' ')[0]; // e.g. "LBS"
                const { data: hallData } = await supabase.from('new_halls').select('id').ilike('name', `${shortHall}%`).single();
                if (hallData) {
                    await supabase.from('user_profiles').update({ hall_id: hallData.id }).eq('id', user.id);
                }
            }

            alert('Profile updated successfully!');
            onClose();
            window.location.reload();
        } catch (err) {
            console.error('Edit error:', err);
            alert('Failed to update: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const resetAndClose = () => {
        setStep(1);
        setSelectedFields([]);
        setValues({});
        setShowBudgetWarning(false);
        onClose();
    };

    if (!isOpen) return null;

    const renderFieldInput = (field) => {
        const val = values[field.key] ?? '';
        if (field.key === 'college') {
            return (
                <select value={val} onChange={e => handleValueChange(field.key, e.target.value)}>
                    <option value="">Select College</option>
                    {COLLEGES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            );
        }
        if (field.key === 'hall') {
            return (
                <select value={val} onChange={e => handleValueChange(field.key, e.target.value)}>
                    <option value="" style={{ color: '#000' }}>Select Your Hall</option>
                    {HALLS.map(group => (
                        <optgroup key={group.group} label={group.group}>
                            {group.options.map(h => <option key={h} value={h} style={{ color: '#000' }}>{h}</option>)}
                        </optgroup>
                    ))}
                </select>
            );
        }
        return (
            <input
                type={field.type}
                value={val}
                onChange={e => handleValueChange(field.key, e.target.value)}
                placeholder={field.label}
                min={field.type === 'number' ? '0' : undefined}
                max={field.key === 'weekly_spending' ? '999999' : undefined}
            />
        );
    };

    return (
        <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && resetAndClose()}>
            <div className="modal">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontFamily: 'var(--font-secondary)' }}>
                        <i className="fas fa-pen" style={{ marginRight: 10, color: 'var(--color-emerald)', fontSize: '0.9rem' }}></i>
                        Edit Profile
                    </h2>
                    <span className="close-modal" onClick={resetAndClose}>&times;</span>
                </div>

                {step === 1 && (
                    <>
                        <p style={{ fontSize: '0.9rem', color: 'var(--color-stone)', marginBottom: '1rem' }}>
                            Select the fields you'd like to update:
                        </p>
                        <div className="edit-field-select-grid">
                            {EDITABLE_FIELDS.map(field => (
                                <label
                                    className={`edit-field-chip ${selectedFields.includes(field.key) ? 'selected' : ''}`}
                                    key={field.key}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedFields.includes(field.key)}
                                        onChange={() => toggleField(field.key)}
                                    />
                                    <i className={`fas ${field.icon}`}></i>
                                    <span>{field.label}</span>
                                </label>
                            ))}
                        </div>
                        <div className="modal-btns">
                            <button type="button" className="modal-btn btn-cancel" onClick={resetAndClose}>Cancel</button>
                            <button type="button" className="modal-btn btn-confirm" onClick={goToEditStep}>
                                Next <i className="fas fa-arrow-right" style={{ marginLeft: 6 }}></i>
                            </button>
                        </div>
                    </>
                )}

                {step === 2 && (
                    <>
                        <div className="edit-field-inputs">
                            {selectedFields.map(key => {
                                const field = EDITABLE_FIELDS.find(f => f.key === key);
                                return (
                                    <div className="form-group" key={key}>
                                        <label>
                                            <i className={`fas ${field.icon}`} style={{ marginRight: 6, color: 'var(--color-emerald)' }}></i>
                                            {field.label}
                                        </label>
                                        {renderFieldInput(field)}
                                    </div>
                                );
                            })}
                        </div>

                        {showBudgetWarning && (
                            <div className="edit-budget-warning">
                                <i className="fas fa-exclamation-triangle"></i>
                                <div>
                                    <strong>Score Impact Warning</strong>
                                    <p>Changing your weekly budget will recalculate your Balance Score. Your current spending will be re-evaluated against the new budget.</p>
                                </div>
                            </div>
                        )}

                        <div className="modal-btns">
                            <button type="button" className="modal-btn btn-cancel" onClick={() => { setStep(1); setShowBudgetWarning(false); }}>
                                Back
                            </button>
                            <button
                                type="button"
                                className="modal-btn btn-confirm"
                                onClick={handleSubmit}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <><i className="fas fa-spinner fa-spin"></i> Saving...</>
                                ) : showBudgetWarning ? (
                                    <><i className="fas fa-check"></i> Confirm &amp; Update</>
                                ) : (
                                    <><i className="fas fa-save"></i> Save Changes</>
                                )}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
