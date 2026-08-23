# Savify 💰

**Smart expense tracking for students.** Savify gamifies personal finance with balance scores, streaks, daily missions, leaderboards, and an AI mascot — making budgeting feel like a game, not a chore.

🌐 **Live:** [savifypivot.vercel.app](https://savifypivot.vercel.app)

---

## Features

### Core
- **Expense Tracking** — Log expenses in seconds with category, amount, and description
- **Weekly Budget** — Set a weekly spending limit; track how much you've used
- **Balance Score (0–1000)** — A single number reflecting your financial discipline, calculated via EMA blending of weekly performance with historical score
- **AI Comments** — Get personalized AI feedback on each expense

### Gamification
- **Tier System** — Bronze → Silver → Gold → Platinum → Elite based on Balance Score
- **Rank System** — 6 ranks (Unranked → σ) based on app opens + experience points
- **Daily Missions** — 2 tasks per day from a pool of 60, cycling every 30 days. Completing tasks gives +3 score each
- **Streak Tracking** — Expense streak (consecutive days logging) + Task streak (consecutive days completing missions)
- **7-Day Completion Rate** — Live stat showing task consistency over the past week
- **Achievements & Milestones** — Unlock badges based on score, expenses, streaks, and team count
- **Leaderboard** — College-wide rankings by Balance Score

### Social
- **Teams** — Create/join teams for group expense tracking
- **Friend System** — Add friends, view their progress
- **Invite System** — Share Savify with campus mates

### Analysis
- **Analysis Tab** — Category breakdown, daily/weekly spending charts, budget utilization
- **Deep Dive Page** — 12-section advanced analytics: outlier detection (IQR), median vs average, weekday heatmap, recent transactions, spending patterns

### Mascot: Savio (V4)
- **26 emotional states** across 3 color palettes (green/yellow/red)
- **Premium design**: golden crown with ruby gem, colorful scarf with animated tails, coin belly emblem, 4-finger hands, sneakers
- **Articulated animations**: arm wave/celebrate/point/gesture, pupil tracking with blink, crown bounce, scarf flutter, dance, shock, angry steam
- **SavioEmoji** — Inline mini-face component for all UI feedback states (no Unicode emojis)

### Other
- **Focus Schedule** — Block distracting apps during study time
- **Widget** — Quick-access floating widget
- **Tutorial System** — Interactive onboarding with Savio as guide
- **Trust Logic Modal** — Full transparency on how the gamification system works
- **Dark Mode** — Premium dark theme with gold accents throughout

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 7, React Router 7 |
| Styling | Vanilla CSS with CSS custom properties |
| Charts | Chart.js + react-chartjs-2 |
| Backend | Supabase (Auth, Database, Realtime) |
| Mobile | Capacitor (Android) |
| AI | Supabase Edge Functions |
| Hosting | Vercel |

---

## Project Structure

```
Savify-main/
├── client/
│   └── src/
│       ├── components/
│       │   ├── Savio.jsx              # V4 mascot + SavioEmoji
│       │   ├── dashboard/             # OverviewTab, AnalysisTab, ProfileTab, etc.
│       │   ├── modals/                # Expense, Invite, TierInfo, TrustLogic, etc.
│       │   ├── onboarding/            # OnboardingForm, QuestionnaireOverlay
│       │   ├── tutorial/              # Interactive tutorial system
│       │   └── widget/                # Floating widget
│       ├── hooks/
│       │   ├── useAchievements.js     # Milestone tracking
│       │   ├── useAuth.js             # Supabase auth
│       │   ├── useExpenses.js         # CRUD + history
│       │   ├── useTasks.js            # Daily missions + stats + streak
│       │   ├── useTeams.js            # Team management
│       │   ├── useFriends.js          # Social features
│       │   ├── useFocusSchedule.js    # App blocking
│       │   └── useRealtime.js         # Supabase realtime subscriptions
│       ├── pages/                     # 20+ pages (Dashboard, DeepDive, Leaderboard, etc.)
│       ├── styles/
│       │   ├── variables.css          # Design tokens
│       │   ├── dashboard.css          # Main dashboard styles
│       │   ├── savio.css              # Mascot animations
│       │   └── tasks.css              # Daily missions styles
│       └── config/
│           └── supabase.js            # Supabase client config
├── server/                            # Edge functions
└── vercel.json                        # Deployment config
```

---

## Balance Score Algorithm

The score uses **Exponential Moving Average (EMA)** blending:

```
weekScore = clamp(0, 1000 - (spending / budget) × 1000, 1000)
blendedScore = weekScore × 0.4 + previousScore × 0.6
+ streakBonus (3 if streak ≥ 7 days)
+ taskBonus   (2 per task, max 4)
capped at ±50 swing per expense
```

Tasks also give **+3 directly** to the score when completed, applied immediately.

---

## Getting Started

```bash
# Install dependencies
cd client && npm install

# Set up environment variables
cp .env.example .env
# Add your Supabase URL and anon key

# Run development server
npm run dev
```

### Server / serverless environment

Supabase, Cashfree, web push and WaSenderAPI settings live in the Vercel project
(and `server/.env` locally). See [`.env.example`](.env.example) for the full list.

**Cashfree lives in one of two stacks and a key only works against its own.**
Set `CASHFREE_ENV` to `production` for live keys or `sandbox` for test keys —
leave it blank and it is inferred from the app ID (`TEST…` means sandbox).
Getting this wrong is what produces
`transactions are not enabled for your payment gateway account` on every order.
Check what a deployment is using with `GET /api/payment/cashfree/config`.

### Database migrations

Run these in the Supabase SQL Editor:

| File | What it adds |
|---|---|
| `supabase_pool_buffer_timer.sql` | 15-minute pool window + 10-minute buffer |
| `supabase_whatsapp_pool_groups.sql` | Hall → WhatsApp group mapping |

### WhatsApp hall-group broadcasts

Opening a quick-commerce pool announces it in the WhatsApp group for that hall.
Setup: [`WHATSAPP_SETUP.md`](WHATSAPP_SETUP.md).

---

## Pool timing

A quick-commerce pool runs in two phases (`client/src/utils/poolTimer.js`):

1. **Window — 15 min.** The countdown users see when they join.
2. **Buffer — 10 min.** A red overtime countdown. The pool stays open and
   joinable; nothing auto-completes yet.

The pool only closes once the buffer runs out without the free-delivery
threshold being met. A pool that crosses the threshold completes as it always
did, whichever phase it is in.

---

## Recent Changes

### August 23, 2026
- **Cashfree sandbox/production switch** — `CASHFREE_ENV` picks the stack and the browser SDK opens the matching one, fixing `transactions are not enabled for your payment gateway account`. Gateway errors now say what to do about them; added `GET /api/payment/cashfree/config`.
- **15 + 10 pool timer** — the 30-minute flat window became a 15-minute window plus a 10-minute red buffer before auto-completion.
- **WhatsApp hall broadcasts** — pools are announced in the WhatsApp group for the hall they started from, via WaSenderAPI.

### May 28, 2025
- **Removed "Important Update" popup** — ForceBudgetModal was showing every page load because `budget_reset_done` was null for most users. Migration is complete; modal removed.

### May 24, 2025
- **Savio V4** — Complete mascot redesign with crown, scarf, coin belly emblem, iris+pupil eyes, 4-finger hands, sneakers
- **Eye blink fix** — Changed from `scaleY` (which broke SVG positioning) to opacity-based blink
- **7-day rate refresh** — Added `todayStr` to stats useMemo dependency so rate recalculates daily
- **Task → score connection** — Completing daily tasks now gives +3 score each, applied immediately
- **Score difficulty increase** — EMA 70/30→40/60, streak +10→+3, task +10→+4, maxSwing 200→50
- **Elite tier CSS** — Added crimson/orange gradient for Elite tier in popup
- **Deep Dive rework** — 12-section dashboard with outlier detection, median vs average, weekday analysis
- **Timezone fix** — Local date extraction instead of UTC for correct expense date attribution
- **Performance** — Reduced blur values, CSS containment, `prefers-reduced-motion` support
- **Emoji cleanup** — All Unicode emojis replaced with SavioEmoji components

---

## License

Private — All rights reserved.

<!-- Trigger Vercel Build -->
