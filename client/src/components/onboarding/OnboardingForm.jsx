import { useState } from 'react';
import { supabase } from '../../config/supabase';

export default function OnboardingForm({ user, onComplete }) {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        full_name: user?.user_metadata?.full_name || '',
        college: '',
        hall: '',
        native_place: '',
        weekly_spending: ''
    });
    const [submitting, setSubmitting] = useState(false);

    const colleges = ['IIT Kharagpur'];
    const halls = [
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

    const handleSubmit = async () => {
        if (!formData.full_name || !formData.college || !formData.weekly_spending) {
            alert('Please fill in all required fields.');
            return;
        }
        if (parseFloat(formData.weekly_spending) > 999999) {
            alert('Budget is too large! Maximum allowed is ₹9,99,999.');
            return;
        }

        setSubmitting(true);
        try {
            const { error } = await supabase.from('user_applications').upsert({
                user_id: user.id,
                full_name: formData.full_name,
                college: formData.college,
                hall: formData.hall,
                native_place: formData.native_place,
                weekly_spending: parseFloat(formData.weekly_spending),
                current_weekly_spent: 0,
                current_score: 1000,
                budget_reset_done: true
            }, { onConflict: 'user_id' });
            if (error) throw error;

            // Automatically sync the new hall to user_profiles for the Roommate matching system
            if (formData.hall) {
                const shortHall = formData.hall.split(' ')[0]; // e.g. "LBS"
                const { data: hallData } = await supabase.from('new_halls').select('id').ilike('name', `${shortHall}%`).single();
                
                // If user_profiles doesn't exist, this might fail, so do an upsert or check
                // Typically user_profiles is created by a trigger on auth.users creation.
                if (hallData) {
                    await supabase.from('user_profiles').update({ 
                        full_name: formData.full_name,
                        hall_id: hallData.id 
                    }).eq('id', user.id);
                }
            }

            onComplete();
        } catch (err) {
            console.error('Onboarding error:', err);
            alert('Failed to save: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: '#0A0A0B',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            fontFamily: 'var(--font-primary)'
        }}>
            <div style={{
                background: '#111111',
                borderRadius: '20px',
                padding: '2.5rem',
                maxWidth: '480px',
                width: '100%',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                border: '1px solid var(--color-border, rgba(255,255,255,0.06))'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ width: 48, height: 48, margin: '0 auto 0.8rem', background: 'var(--color-gold, rgba(212, 175, 55, 0.15))', color: 'var(--color-gold, #D4AF37)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                        <i className="fas fa-user-astronaut"></i>
                    </div>
                    <h1 style={{
                        fontFamily: 'var(--font-secondary)',
                        fontSize: '1.8rem',
                        marginBottom: '0.5rem',
                        color: 'var(--color-gold, #D4AF37)'
                    }}>
                        Welcome to Savify!
                    </h1>
                    <p style={{ color: 'var(--color-stone, #78716C)', fontSize: '0.9rem' }}>Let's set up your profile</p>
                </div>

                {/* Step indicator */}
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ width: 40, height: 4, borderRadius: 4, background: step >= 1 ? '#D4AF37' : '#333333' }} />
                    <div style={{ width: 40, height: 4, borderRadius: 4, background: step >= 2 ? '#D4AF37' : '#333333' }} />
                </div>

                {step === 1 && (
                    <>
                        <div className="form-group">
                            <label style={{ color: '#A1A1AA' }}>Full Name *</label>
                            <input type="text" style={{ background: '#1a1a1a', color: '#fff', border: '1px solid #333' }} value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} placeholder="Your full name" />
                        </div>
                        <div className="form-group">
                            <label style={{ color: '#A1A1AA' }}>College *</label>
                            <select style={{ background: '#1a1a1a', color: '#fff', border: '1px solid #333' }} value={formData.college} onChange={e => setFormData({ ...formData, college: e.target.value })}>
                                <option value="" style={{ color: '#000' }}>Select College</option>
                                {colleges.map(c => <option key={c} value={c} style={{ color: '#000' }}>{c}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label style={{ color: '#A1A1AA' }}>Hall of Residence *</label>
                            <select style={{ background: '#1a1a1a', color: '#fff', border: '1px solid #333' }} value={formData.hall} onChange={e => setFormData({ ...formData, hall: e.target.value })}>
                                <option value="" style={{ color: '#000' }}>Select Your Hall</option>
                                {halls.map(group => (
                                    <optgroup key={group.group} label={group.group} style={{ color: '#999' }}>
                                        {group.options.map(h => <option key={h} value={h} style={{ color: '#000' }}>{h}</option>)}
                                    </optgroup>
                                ))}
                            </select>
                        </div>
                        <button className="sexy-btn" onClick={() => setStep(2)} style={{ width: '100%', marginTop: '1rem' }}>
                            Next <i className="fas fa-arrow-right" style={{ marginLeft: 8 }}></i>
                        </button>
                    </>
                )}

                {step === 2 && (
                    <>
                        <div className="form-group">
                            <label style={{ color: '#A1A1AA' }}>Native Place</label>
                            <input type="text" style={{ background: '#1a1a1a', color: '#fff', border: '1px solid #333' }} value={formData.native_place} onChange={e => setFormData({ ...formData, native_place: e.target.value })} placeholder="Where are you from?" />
                        </div>
                        <div className="form-group">
                            <label style={{ color: '#A1A1AA' }}>Weekly Budget (₹) *</label>
                            <input type="number" style={{ background: '#1a1a1a', color: '#fff', border: '1px solid #333' }} value={formData.weekly_spending} onChange={e => setFormData({ ...formData, weekly_spending: e.target.value })} placeholder="e.g. 2000" min="0" max="999999" />
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                            <button className="modal-btn btn-cancel" onClick={() => setStep(1)} style={{ flex: 1 }}>Back</button>
                            <button className="sexy-btn" onClick={handleSubmit} disabled={submitting} style={{ flex: 2 }}>
                                {submitting ? <><i className="fas fa-spinner fa-spin"></i> Saving...</> : 'Start Tracking!'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
