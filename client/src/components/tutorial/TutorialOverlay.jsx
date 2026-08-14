import { useState, useEffect } from 'react';
import Savio from '../Savio';

const FLUENT_BASE = 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis';

const TUTORIAL_SECTIONS = [
    {
        section: 'Welcome', target: '.tab-greeting', title: 'Welcome to Savify!',
        message: "I'm Savio, your AI financial companion. I'll walk you through every feature so you can become a money master. This tour takes about 2 minutes!",
        tip: 'You can replay this tutorial anytime from the Overview tab.',
        tab: 'overview', scrollTo: true,
        emoji: `${FLUENT_BASE}/Hand%20gestures/Waving%20Hand.png`,
    },
    {
        section: 'Overview', target: '.widget-toggle-card', title: 'Quick Add Widget',
        message: "This toggle activates the Quick Add Widget — a floating golden button that lets you log expenses in just 2 taps. It stays on your screen and can be dragged anywhere. Spin through categories like Food, Transport, Shopping & more!",
        tip: 'Tap the golden button, pick a category from the arc, enter amount, done!',
        tab: 'overview', scrollTo: true,
        emoji: `${FLUENT_BASE}/Objects/Magic%20Wand.png`,
    },
    {
        section: 'Overview', target: '.savio-note-banner', title: "Savio's Notes",
        message: "I live here! After each expense, I'll give you a witty comment about your spending. I analyze your top categories and spending ratio to craft personalized roasts and encouragements.",
        tip: 'The "Replay" button next to me restarts this tutorial.',
        tab: 'overview', scrollTo: true,
        emoji: `${FLUENT_BASE}/Smilies/Robot.png`,
    },
    {
        section: 'Overview', target: '.stat-card-dark', title: 'Balance Score',
        message: "Your Balance Score (0–1000) reflects how well you manage your budget. It updates in real-time whenever you add an expense. Tap the info button to see exactly how it's calculated.",
        tip: 'Score = 1000 - (spending / budget × 1000). Stay under budget to keep it high!',
        tab: 'overview', scrollTo: true,
        emoji: `${FLUENT_BASE}/Travel%20and%20places/Glowing%20Star.png`,
    },
    {
        section: 'Overview', target: '.stat-card-rank', title: 'Global Rank',
        message: "You're competing with every Savify user worldwide! Your rank is determined by your Balance Score — the better you manage money, the higher you climb.",
        tip: 'Consistent budgeting beats occasional big saves. Stay steady!',
        tab: 'overview', scrollTo: true,
        emoji: `${FLUENT_BASE}/Activities/Trophy.png`,
    },
    {
        section: 'Overview', target: '.streak-ring-container', title: 'Daily Streak',
        message: "This ring tracks your consecutive days of expense logging. Every day you log at least one expense, your streak grows!",
        tip: 'Log at least one expense every day to keep your streak alive.',
        tab: 'overview', scrollTo: true,
        emoji: `${FLUENT_BASE}/Travel%20and%20places/Fire.png`,
    },
    {
        section: 'Overview', target: '.milestones-card', title: 'Milestones',
        message: "Earn milestones by tracking consistently, saving money, and reaching streak goals. Each milestone has unique 3D graphics and progress tracking.",
        tip: 'Tap any milestone to see details and how close you are to unlocking it.',
        tab: 'overview', scrollTo: true,
        emoji: `${FLUENT_BASE}/Objects/Gem%20Stone.png`,
    },
    {
        section: 'Overview', target: '.campus-mates-card', title: 'Campus Mates',
        message: "See friends from your college! Tap the + button to invite friends — Campus Mates (same college) or Outsiders (anyone with an email). Saving is more fun together!",
        tip: 'Inviting friends creates healthy accountability for spending.',
        tab: 'overview', scrollTo: true,
        emoji: `${FLUENT_BASE}/People/Busts%20in%20Silhouette.png`,
    },
    {
        section: 'Overview', target: '.weekly-budget-card', title: 'Weekly Budget',
        message: "Your weekly budget is shown here with a progress bar. Green = on track, red = overspent. Tap the pencil icon to edit. Your score, rank, and insights all depend on this.",
        tip: 'Be honest with your budget. Too high = no challenge. Too low = frustration.',
        tab: 'overview', scrollTo: true,
        emoji: `${FLUENT_BASE}/Objects/Purse.png`,
    },
    {
        section: 'Overview', target: '.transactions-card', title: 'Recent Transactions',
        message: "Every expense you log appears here with the category icon, amount, and date. This is your spending diary — review it regularly to spot patterns.",
        tip: 'Review your last 10 transactions weekly to catch unnecessary spending.',
        tab: 'overview', scrollTo: true,
        emoji: `${FLUENT_BASE}/Objects/Ledger.png`,
    },
    // Focus Schedule
    {
        section: 'Focus', target: '.inline-focus-section', title: 'Focus Schedule',
        message: "Focus Mode lets you block distracting payment and shopping apps during specific hours. Set a time range, select apps like Amazon, Swiggy, or GPay, and Savify will remind you not to spend during those hours. Perfect for study sessions or when you're trying to avoid impulse purchases!",
        tip: 'Use Focus Mode during evenings when impulse spending peaks.',
        tab: 'focus', scrollTo: true,
        emoji: `${FLUENT_BASE}/Objects/Locked.png`,
    },
    // Analysis
    {
        section: 'Analysis', target: '.report-header', title: 'Spending Analysis',
        message: "Welcome to Analytics! The pie chart shows category distribution, and the trend line tracks your daily spending velocity over the past week.",
        tip: 'Check this weekly to understand your spending personality.',
        tab: 'analysis', scrollTo: true,
        emoji: `${FLUENT_BASE}/Objects/Bar%20Chart.png`,
    },
    {
        section: 'Analysis', target: '.detailed-analysis-btn', title: 'Deep Dive Analytics',
        message: "Tap 'Detailed Analysis' for advanced insights: budget runway predictions, best & worst spending days, weekly comparisons, and velocity charts.",
        tip: 'The runway prediction is your most powerful tool — use it to pace yourself.',
        tab: 'analysis', scrollTo: false,
        emoji: `${FLUENT_BASE}/Objects/Gem%20Stone.png`,
    },
    // Teams
    {
        section: 'Teams', target: '.team-tab-container,.team-action-row', title: 'Teams Mode',
        message: "Create or join teams to track group expenses! Perfect for trips, roommates, or projects. Create a team, share the code with friends, and everyone can log shared expenses. The admin approves join requests and can remove members.",
        tip: 'Share the team code via WhatsApp for instant group expense tracking.',
        tab: 'teams', scrollTo: true,
        emoji: `${FLUENT_BASE}/People/People%20Hugging.png`,
    },
    // Profile
    {
        section: 'Profile', target: '.profile-header-card', title: 'Your Profile',
        message: "Your identity on Savify! See your avatar, display name, tier badge (Bronze → Silver → Gold → Platinum), and your institution.",
        tip: 'Reach 900+ Balance Score to unlock Platinum tier!',
        tab: 'profile', scrollTo: true,
        emoji: `${FLUENT_BASE}/Smilies/Smiling%20Face%20with%20Sunglasses.png`,
    },
    // Final
    {
        section: 'Get Started', target: '.mobile-fab,.transactions-card', title: 'Start Tracking!',
        message: "You're all set! Log your expenses consistently. The most important thing is awareness — every rupee you track brings you closer to financial mastery.",
        tip: "Start by logging today's expenses — even small ones count!",
        tab: 'overview', scrollTo: false,
        emoji: `${FLUENT_BASE}/Objects/Money%20Bag.png`,
    },
];

export default function TutorialOverlay({ onComplete, onOpenExpense, onSwitchTab }) {
    const [step, setStep] = useState(0);
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const currentStep = TUTORIAL_SECTIONS[step];
        if (!currentStep) return;

        // Switch tab if needed
        if (onSwitchTab && currentStep.tab) {
            onSwitchTab(currentStep.tab);
        }

        // Wait for DOM to update after tab switch, then spotlight
        const timer = setTimeout(() => {
            // Try first selector, fall back to second if comma-separated
            const selectors = currentStep.target.split(',');
            let targetEl = null;
            for (const sel of selectors) {
                targetEl = document.querySelector(sel.trim());
                if (targetEl) break;
            }
            if (targetEl) {
                targetEl.classList.add('tutorial-spotlight');

                // Rely solely on auto-scrolling to bring the element to the user
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 400);

        return () => {
            clearTimeout(timer);
            // Clean up all spotlights
            document.querySelectorAll('.tutorial-spotlight').forEach(el => {
                el.classList.remove('tutorial-spotlight');
            });
        };
    }, [step, onSwitchTab]);

    const handleNext = () => {
        document.querySelectorAll('.tutorial-spotlight').forEach(el => el.classList.remove('tutorial-spotlight'));
        if (step < TUTORIAL_SECTIONS.length - 1) {
            setStep(step + 1);
        } else {
            handleFinish();
            if (onOpenExpense) onOpenExpense();
        }
    };

    const handleFinish = () => {
        document.querySelectorAll('.tutorial-spotlight').forEach(el => el.classList.remove('tutorial-spotlight'));
        localStorage.setItem('savify_tutorial_done', 'true');
        if (onSwitchTab) onSwitchTab('overview');
        setVisible(false);
        onComplete?.();
    };

    if (!visible) return null;

    const currentStep = TUTORIAL_SECTIONS[step];
    const progress = ((step + 1) / TUTORIAL_SECTIONS.length) * 100;

    const sectionColors = {
        'Welcome': '#D4AF37',
        'Overview': '#10B981',
        'Focus': '#F59E0B',
        'Analysis': '#3B82F6',
        'Teams': '#8B5CF6',
        'Profile': '#EC4899',
        'Get Started': '#EF4444',
    };

    return (
        <>
            <div className="tutorial-overlay active" />
            <div className="tutorial-agent active" style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', top: 'auto' }}>
                <div className="tutorial-section-badge" style={{ background: sectionColors[currentStep.section] || '#10B981' }}>
                    {currentStep.section}
                </div>

                <div className="tutorial-avatar-wrapper">
                    <Savio 
                        state={step === 0 ? 'waving' : step === TUTORIAL_SECTIONS.length - 1 ? 'celebrating' : ['explaining', 'pointing', 'idle'][step % 3]} 
                        size={52} 
                        showBubble={false} 
                    />
                </div>

                <h3 className="tutorial-heading">{currentStep.title}</h3>

                <div className="tutorial-progress-bar">
                    <div className="tutorial-progress-fill" style={{ width: `${progress}%` }}></div>
                </div>
                <div className="tutorial-step-count">Step {step + 1} of {TUTORIAL_SECTIONS.length}</div>

                <p className="tutorial-message">{currentStep.message}</p>

                {currentStep.tip && (
                    <div className="tutorial-tip">
                        <span className="tutorial-tip-icon">
                            <img src={`${FLUENT_BASE}/Objects/Light%20Bulb.png`} alt="tip" style={{ width: 18, height: 18 }} loading="lazy" />
                        </span>
                        <span className="tutorial-tip-text">{currentStep.tip}</span>
                    </div>
                )}

                <div className="tutorial-actions">
                    <button className="tutorial-skip" onClick={handleFinish}>Skip</button>
                    <button className="tutorial-next" onClick={handleNext}>
                        {step < TUTORIAL_SECTIONS.length - 1 ? 'Next' : 'Finish'} <i className="fas fa-arrow-right" style={{ marginLeft: 6 }}></i>
                    </button>
                </div>
            </div>
        </>
    );
}
