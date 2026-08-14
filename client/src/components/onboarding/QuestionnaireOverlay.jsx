import { useState } from 'react';
import { supabase } from '../../config/supabase';
import './questionnaire.css';

const SPENDING_HABITS = [
    { id: 'impulse', label: 'Impulse buying (random online/offline purchases)', stat: '72% of young adults do this' },
    { id: 'food', label: 'Ordering food too often', stat: '68% of students do this' },
    { id: 'subscriptions', label: 'Spending on subscriptions I don\'t use', stat: '84% of people have unused subscriptions' },
    { id: 'no_tracking', label: 'Not tracking where my money goes', stat: '76% of people don\'t track expenses' },
    { id: 'emotional', label: 'Spending when I feel bored/stressed', stat: '65% of millennials stress-spend' },
    { id: 'peer', label: 'Buying things just because friends have them', stat: '58% of Gen Z feel peer spending pressure' },
];

const AGE_GROUPS = ['Under 18', '18-22', '23-27', '28+'];
const CATEGORIES = ['School Student', 'College Student', 'Part-time Earner', 'Full-time Earner'];
const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

/*
 * NEW SLIDE ORDER:
 * 1. Monthly Spending
 * 2. Potential Savings
 * 3. Spending Habits
 * 4. Reality Check (was 6) — show potential BEFORE asking details
 * 5. Good News (was 7) — show savings potential BEFORE asking details
 * 6. Age Group (was 4)
 * 7. Category/Occupation (was 5)
 * 8. Gender
 * 9. Final chart
 */
const TOTAL_SLIDES = 9;

export default function QuestionnaireOverlay({ user, onComplete }) {
    const [slide, setSlide] = useState(1);
    const [submitting, setSubmitting] = useState(false);

    // Q1
    const [monthlySpending, setMonthlySpending] = useState(5000);
    const [dontKnowSpending, setDontKnowSpending] = useState(false);
    const [spendingTarget, setSpendingTarget] = useState(3000);

    // Q2
    const [potentialSavings, setPotentialSavings] = useState(2000);
    const [dontKnowSavings, setDontKnowSavings] = useState(false);

    // Q3
    const [selectedHabits, setSelectedHabits] = useState([]);

    // Q6 (was Q4)
    const [ageGroup, setAgeGroup] = useState('');

    // Q7 (was Q5)
    const [userCategory, setUserCategory] = useState('');

    // Q8
    const [gender, setGender] = useState('');

    // Calculations for reality check (slides 4 & 5, swapped from 6 & 7)
    const baseSpend = dontKnowSpending ? spendingTarget : monthlySpending;
    const yearlyNonEssential = Math.round(baseSpend * 0.35 * 12);
    const savingsWithSavify = Math.round(yearlyNonEssential * 0.40);
    const headphones = Math.round(yearlyNonEssential / 2000);
    const meals = Math.round(yearlyNonEssential / 150);

    const progress = Math.round((slide / TOTAL_SLIDES) * 100);

    const toggleHabit = (id) => {
        setSelectedHabits(prev =>
            prev.includes(id) ? prev.filter(h => h !== id) : [...prev, id]
        );
    };

    const canProceed = () => {
        switch (slide) {
            case 1: return true;
            case 2: return true;
            case 3: return selectedHabits.length > 0;
            case 4: return true; // Reality Check (auto-proceed)
            case 5: return true; // Good News (auto-proceed)
            case 6: return !!ageGroup;
            case 7: return !!userCategory;
            case 8: return !!gender;
            case 9: return true;
            default: return true;
        }
    };

    const handleNext = () => {
        if (slide < TOTAL_SLIDES) {
            setSlide(slide + 1);
        } else {
            handleSubmit();
        }
    };

    const handleBack = () => {
        if (slide > 1) setSlide(slide - 1);
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const updates = {
                monthly_spend: dontKnowSpending ? null : monthlySpending,
                monthly_target: dontKnowSpending ? spendingTarget : null,
                could_have_saved: dontKnowSavings ? null : potentialSavings,
                habits_to_improve: selectedHabits,
                age_group: ageGroup,
                occupation_category: userCategory,
                gender: gender,
                onboarding_q_completed: true,
            };

            // Also update weekly_spending if user provided monthly
            if (!dontKnowSpending) {
                updates.weekly_spending = Math.round(monthlySpending / 4);
            } else if (spendingTarget) {
                updates.weekly_spending = Math.round(spendingTarget / 4);
            }

            const { error } = await supabase
                .from('user_applications')
                .update(updates)
                .eq('user_id', user.id);

            if (error) throw error;
            onComplete();
        } catch (err) {
            console.error('Questionnaire save error:', err);
            alert('Failed to save: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const formatCurrency = (val) => '₹' + Number(val).toLocaleString('en-IN');

    // 3D emoji helper
    const Emoji3D = ({ src, alt, size = 48 }) => (
        <img
            src={src}
            alt={alt}
            className="emoji-3d"
            style={{ width: size, height: size, display: 'block', margin: '0 auto' }}
            loading="lazy"
        />
    );

    return (
        <div className="questionnaire-overlay">
            {/* Progress Bar */}
            <div className="q-progress-container">
                <div className="q-progress-bar" style={{ width: `${progress}%` }} />
                <span className="q-progress-text">{progress}% completed</span>
            </div>

            <div className="q-slide-container">
                {/* SLIDE 1: Monthly Spending */}
                {slide === 1 && (
                    <div className="q-slide">
                        <div className="q-slide-icon">
                            <Emoji3D src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Money%20with%20Wings.png" alt="Money" size={56} />
                        </div>
                        <h2 className="q-title">How much do you spend in a month?</h2>
                        <p className="q-subtitle">Drag the slider or tap "I don't know"</p>

                        {!dontKnowSpending ? (
                            <div className="q-slider-section">
                                <div className="q-slider-value">{formatCurrency(monthlySpending)}</div>
                                <div className="q-slider-wrapper">
                                    <button className="q-slider-btn" onClick={() => setMonthlySpending(Math.max(500, monthlySpending - 500))}>
                                        <i className="fas fa-minus"></i>
                                    </button>
                                    <input
                                        type="range"
                                        className="q-slider"
                                        min="500"
                                        max="50000"
                                        step="500"
                                        value={monthlySpending}
                                        onChange={e => setMonthlySpending(Number(e.target.value))}
                                    />
                                    <button className="q-slider-btn" onClick={() => setMonthlySpending(Math.min(50000, monthlySpending + 500))}>
                                        <i className="fas fa-plus"></i>
                                    </button>
                                </div>
                                <div className="q-slider-labels">
                                    <span>₹500</span>
                                    <span>₹25,000</span>
                                    <span>₹50,000</span>
                                </div>
                                <button className="q-idk-btn" onClick={() => setDontKnowSpending(true)}>
                                    I don't know
                                </button>
                            </div>
                        ) : (
                            <div className="q-slider-section">
                                <h3 className="q-sub-question">Set a target you'd like to stay under</h3>
                                <div className="q-slider-value">{formatCurrency(spendingTarget)}</div>
                                <div className="q-slider-wrapper">
                                    <button className="q-slider-btn" onClick={() => setSpendingTarget(Math.max(500, spendingTarget - 500))}>
                                        <i className="fas fa-minus"></i>
                                    </button>
                                    <input
                                        type="range"
                                        className="q-slider"
                                        min="500"
                                        max="50000"
                                        step="500"
                                        value={spendingTarget}
                                        onChange={e => setSpendingTarget(Number(e.target.value))}
                                    />
                                    <button className="q-slider-btn" onClick={() => setSpendingTarget(Math.min(50000, spendingTarget + 500))}>
                                        <i className="fas fa-plus"></i>
                                    </button>
                                </div>
                                <div className="q-slider-labels">
                                    <span>₹500</span>
                                    <span>₹25,000</span>
                                    <span>₹50,000</span>
                                </div>
                                <button className="q-idk-btn active" onClick={() => setDontKnowSpending(false)}>
                                    ← Go back to estimate
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* SLIDE 2: Potential Savings */}
                {slide === 2 && (
                    <div className="q-slide">
                        <div className="q-slide-icon">
                            <Emoji3D src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Locked%20with%20Key.png" alt="Savings" size={56} />
                        </div>
                        <h2 className="q-title">How much could you have saved last month?</h2>
                        <p className="q-subtitle">Think about what you didn't really need</p>

                        {!dontKnowSavings ? (
                            <div className="q-slider-section">
                                <div className="q-slider-value">{formatCurrency(potentialSavings)}</div>
                                <div className="q-slider-wrapper">
                                    <button className="q-slider-btn" onClick={() => setPotentialSavings(Math.max(0, potentialSavings - 500))}>
                                        <i className="fas fa-minus"></i>
                                    </button>
                                    <input
                                        type="range"
                                        className="q-slider"
                                        min="0"
                                        max="30000"
                                        step="500"
                                        value={potentialSavings}
                                        onChange={e => setPotentialSavings(Number(e.target.value))}
                                    />
                                    <button className="q-slider-btn" onClick={() => setPotentialSavings(Math.min(30000, potentialSavings + 500))}>
                                        <i className="fas fa-plus"></i>
                                    </button>
                                </div>
                                <div className="q-slider-labels">
                                    <span>₹0</span>
                                    <span>₹15,000</span>
                                    <span>₹30,000</span>
                                </div>
                                <button className="q-idk-btn" onClick={() => { setDontKnowSavings(true); }}>
                                    I don't know
                                </button>
                            </div>
                        ) : (
                            <div className="q-slider-section">
                                <div className="q-idk-confirmed">
                                    <i className="fas fa-check-circle"></i>
                                    <span>No worries! We'll help you figure this out.</span>
                                </div>
                                <button className="q-idk-btn active" onClick={() => setDontKnowSavings(false)}>
                                    ← Actually, let me estimate
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* SLIDE 3: Spending Habits */}
                {slide === 3 && (
                    <div className="q-slide">
                        <div className="q-slide-icon">
                            <Emoji3D src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Activities/Direct%20Hit.png" alt="Target" size={56} />
                        </div>
                        <h2 className="q-title">Which spending habits do you want to improve?</h2>
                        <p className="q-subtitle">Select one or more options</p>

                        <div className="q-chips-grid">
                            {SPENDING_HABITS.map(habit => (
                                <button
                                    key={habit.id}
                                    className={`q-chip ${selectedHabits.includes(habit.id) ? 'selected' : ''}`}
                                    onClick={() => toggleHabit(habit.id)}
                                >
                                    <span className="q-chip-label">{habit.label}</span>
                                    {selectedHabits.includes(habit.id) && (
                                        <span className="q-chip-stat">{habit.stat}</span>
                                    )}
                                    <span className="q-chip-check">
                                        {selectedHabits.includes(habit.id) ? <i className="fas fa-check-circle"></i> : <i className="far fa-circle"></i>}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* SLIDE 4: Reality Check (MOVED UP from slide 6) */}
                {slide === 4 && (
                    <div className="q-slide q-slide-reveal">
                        <div className="q-slide-icon">
                            <Emoji3D src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Face%20with%20Open%20Mouth.png" alt="Shocked" size={56} />
                        </div>
                        <h2 className="q-title">Based on your answers, you may be spending</h2>

                        <div className="q-highlight-number">
                            <span className="q-rupee">₹</span>
                            <span className="q-big-number">{yearlyNonEssential.toLocaleString('en-IN')}</span>
                            <span className="q-per-year">per year</span>
                        </div>
                        <p className="q-subtitle-small">on non-essential things</p>

                        <div className="q-equivalents">
                            <h3>Which is equal to</h3>
                            <div className="q-equiv-grid">
                                <div className="q-equiv-item">
                                    <Emoji3D src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Headphone.png" alt="Headphones" size={36} />
                                    <span className="q-equiv-number">{headphones}</span>
                                    <span className="q-equiv-label">headphones</span>
                                </div>
                                <div className="q-equiv-item">
                                    <Emoji3D src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Food/Hamburger.png" alt="Meals" size={36} />
                                    <span className="q-equiv-number">{meals}+</span>
                                    <span className="q-equiv-label">meals</span>
                                </div>
                                <div className="q-equiv-item">
                                    <Emoji3D src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Travel%20and%20places/Airplane.png" alt="Trip" size={36} />
                                    <span className="q-equiv-number">1</span>
                                    <span className="q-equiv-label">trip you didn't take</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* SLIDE 5: Good News (MOVED UP from slide 7) */}
                {slide === 5 && (
                    <div className="q-slide q-slide-reveal">
                        <div className="q-good-news-badge">
                            <Emoji3D src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Activities/Party%20Popper.png" alt="Party" size={28} />
                            <span>GOOD NEWS!</span>
                        </div>
                        <h2 className="q-title">You can save</h2>

                        <div className="q-highlight-number savings">
                            <span className="q-rupee">₹</span>
                            <span className="q-big-number">{savingsWithSavify.toLocaleString('en-IN')}</span>
                            <span className="q-per-year">per year</span>
                        </div>

                        <p className="q-savings-message">
                            if you use <strong>Savify</strong> to manage your expenses wisely
                        </p>

                        <div className="q-savings-breakdown">
                            <div className="q-savings-item">
                                <span className="q-savings-label">Monthly savings</span>
                                <span className="q-savings-value">{formatCurrency(Math.round(savingsWithSavify / 12))}</span>
                            </div>
                            <div className="q-savings-item">
                                <span className="q-savings-label">Weekly savings</span>
                                <span className="q-savings-value">{formatCurrency(Math.round(savingsWithSavify / 52))}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* SLIDE 6: Age Group (MOVED DOWN from slide 4) */}
                {slide === 6 && (
                    <div className="q-slide">
                        <div className="q-slide-icon">
                            <Emoji3D src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Calendar.png" alt="Age" size={56} />
                        </div>
                        <h2 className="q-title">What's your age group?</h2>
                        <p className="q-subtitle">This helps us personalize your experience</p>

                        <div className="q-options-grid">
                            {AGE_GROUPS.map(age => (
                                <button
                                    key={age}
                                    className={`q-option-card ${ageGroup === age ? 'selected' : ''}`}
                                    onClick={() => setAgeGroup(age)}
                                >
                                    <span className="q-option-text">{age}</span>
                                    {ageGroup === age && <i className="fas fa-check-circle q-option-check"></i>}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* SLIDE 7: Category (MOVED DOWN from slide 5) */}
                {slide === 7 && (
                    <div className="q-slide">
                        <div className="q-slide-icon">
                            <Emoji3D src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Graduation%20Cap.png" alt="Category" size={56} />
                        </div>
                        <h2 className="q-title">Which category fits you best?</h2>
                        <p className="q-subtitle">We'll tailor tips to your lifestyle</p>

                        <div className="q-options-grid">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat}
                                    className={`q-option-card ${userCategory === cat ? 'selected' : ''}`}
                                    onClick={() => setUserCategory(cat)}
                                >
                                    <span className="q-option-text">{cat}</span>
                                    {userCategory === cat && <i className="fas fa-check-circle q-option-check"></i>}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* SLIDE 8: Gender */}
                {slide === 8 && (
                    <div className="q-slide">
                        <div className="q-slide-icon">
                            <Emoji3D src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/People/Bust%20in%20Silhouette.png" alt="Person" size={56} />
                        </div>
                        <h2 className="q-title">What's your gender?</h2>
                        <p className="q-subtitle">Almost done!</p>

                        <div className="q-options-grid">
                            {GENDERS.map(g => (
                                <button
                                    key={g}
                                    className={`q-option-card ${gender === g ? 'selected' : ''}`}
                                    onClick={() => setGender(g)}
                                >
                                    <span className="q-option-text">{g}</span>
                                    {gender === g && <i className="fas fa-check-circle q-option-check"></i>}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* SLIDE 9: Final - Spending Journey Chart */}
                {slide === 9 && (
                    <div className="q-slide q-slide-final">
                        <div className="q-slide-icon">
                            <Emoji3D src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Travel%20and%20places/Glowing%20Star.png" alt="Star" size={56} />
                        </div>
                        <h2 className="q-title">Your Spending Journey Starts Here</h2>
                        <p className="q-subtitle">Here's what Savify users typically experience</p>

                        <div className="q-chart-container">
                            <svg viewBox="0 0 300 180" className="q-chart-svg">
                                {/* Grid lines */}
                                <line x1="40" y1="20" x2="40" y2="150" stroke="#e2e8f0" strokeWidth="1" />
                                <line x1="40" y1="150" x2="280" y2="150" stroke="#e2e8f0" strokeWidth="1" />
                                <line x1="40" y1="85" x2="280" y2="85" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="4" />
                                <line x1="40" y1="52" x2="280" y2="52" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="4" />

                                {/* Y-axis labels */}
                                <text x="35" y="155" textAnchor="end" fontSize="8" fill="#94a3b8">₹0</text>
                                <text x="35" y="90" textAnchor="end" fontSize="8" fill="#94a3b8">{formatCurrency(Math.round(baseSpend / 2))}</text>
                                <text x="35" y="25" textAnchor="end" fontSize="8" fill="#94a3b8">{formatCurrency(baseSpend)}</text>

                                {/* Spending line (red, going down) */}
                                <path
                                    d="M50,30 Q90,35 120,50 Q150,65 180,90 Q210,110 240,120 Q260,125 270,128"
                                    fill="none"
                                    stroke="#f43f5e"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    className="q-chart-line-spending"
                                />

                                {/* Savings line (green, going up) */}
                                <path
                                    d="M50,145 Q90,140 120,130 Q150,115 180,95 Q210,80 240,65 Q260,55 270,50"
                                    fill="none"
                                    stroke="#10B981"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    className="q-chart-line-savings"
                                />

                                {/* Area fills */}
                                <path
                                    d="M50,145 Q90,140 120,130 Q150,115 180,95 Q210,80 240,65 Q260,55 270,50 L270,150 L50,150 Z"
                                    fill="url(#greenGradient)"
                                    className="q-chart-area-savings"
                                />

                                {/* Gradient definitions */}
                                <defs>
                                    <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
                                        <stop offset="100%" stopColor="#10B981" stopOpacity="0.02" />
                                    </linearGradient>
                                </defs>

                                {/* X-axis labels */}
                                <text x="50" y="165" textAnchor="middle" fontSize="7" fill="#94a3b8">Week 1</text>
                                <text x="120" y="165" textAnchor="middle" fontSize="7" fill="#94a3b8">Month 1</text>
                                <text x="200" y="165" textAnchor="middle" fontSize="7" fill="#94a3b8">Month 3</text>
                                <text x="270" y="165" textAnchor="middle" fontSize="7" fill="#94a3b8">Month 6</text>
                            </svg>

                            <div className="q-chart-legend">
                                <span className="q-legend-item"><span className="q-legend-dot spending"></span> Spending</span>
                                <span className="q-legend-item"><span className="q-legend-dot savings"></span> Savings</span>
                            </div>
                        </div>

                        <p className="q-final-message">
                            Let's make every rupee count!
                        </p>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <div className="q-nav-container">
                {slide > 1 && (
                    <button className="q-nav-back" onClick={handleBack}>
                        <i className="fas fa-arrow-left"></i> Back
                    </button>
                )}
                <button
                    className="q-nav-next"
                    onClick={handleNext}
                    disabled={!canProceed() || submitting}
                >
                    {submitting ? (
                        <><i className="fas fa-spinner fa-spin"></i> Saving...</>
                    ) : slide === TOTAL_SLIDES ? (
                        <>Let's Go!</>
                    ) : (
                        <>Next <i className="fas fa-arrow-right"></i></>
                    )}
                </button>
            </div>
        </div>
    );
}
