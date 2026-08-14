import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

// Page Imports
import IntroPage from './pages/IntroPage';
import OnboardingPage from './pages/OnboardingPage';
import DashboardPage from './pages/DashboardPage';
import AdminPanelPage from './pages/AdminPanelPage';
import LandingPage from './pages/LandingPage';
import PricingPage from './pages/PricingPage';
import AboutPage from './pages/AboutPage';
import FeaturesPage from './pages/FeaturesPage';
import ContactPage from './pages/ContactPage';
import FeedbackPage from './pages/FeedbackPage';
import WaitlistPage from './pages/WaitlistPage';
import AnalysisPage from './pages/AnalysisPage';
import BalanceScorePage from './pages/BalanceScorePage';
import BrokePage from './pages/BrokePage';
import ChallengePage from './pages/ChallengePage';
import CompetitionPage from './pages/CompetitionPage';
import LeaderboardPage from './pages/LeaderboardPage';
import RealityPage from './pages/RealityPage';
import SomethingPage from './pages/SomethingPage';
import StatusTiersPage from './pages/StatusTiersPage';
import TimerPage from './pages/TimerPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsPage from './pages/TermsPage';
import RefundPolicyPage from './pages/RefundPolicyPage';
import ExtraPolicyPage from './pages/ExtraPolicyPage';
import DeepDivePage from './pages/DeepDivePage';

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

// Protected Route — redirects to /login if not authenticated
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f5f5f4' }}>
        <div className="spinner"></div>
      </div>
    );
  }
  return user ? children : <Navigate to="/onboarding" replace />;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Intro animation on the index/home page */}
        <Route path="/" element={<IntroPage />} />

        {/* Auth & Onboarding */}
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/login" element={<Navigate to="/onboarding" replace />} />

        {/* Dashboard (protected) */}
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/dashboard.html" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        
        {/* Admin Dashboard */}
        <Route path="/admin-panel" element={<AdminPanelPage />} />

        {/* Temporary preview for design testing — remove before production */}
        <Route path="/preview" element={<DashboardPage />} />


        {/* Deep Dive (protected) */}
        <Route path="/deep-dive" element={<ProtectedRoute><DeepDivePage /></ProtectedRoute>} />

        {/* Public pages */}
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/feedback" element={<FeedbackPage />} />
        <Route path="/waitlist" element={<WaitlistPage />} />
        <Route path="/analysis" element={<AnalysisPage />} />
        <Route path="/balance-score" element={<BalanceScorePage />} />
        <Route path="/broke" element={<BrokePage />} />
        <Route path="/challenge" element={<ChallengePage />} />
        <Route path="/competition" element={<CompetitionPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/reality" element={<RealityPage />} />
        <Route path="/something" element={<SomethingPage />} />
        <Route path="/status-tiers" element={<StatusTiersPage />} />
        <Route path="/timer" element={<TimerPage />} />

        {/* Legal */}
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/terms-and-conditions" element={<TermsPage />} />
        <Route path="/refund-policy" element={<RefundPolicyPage />} />
        <Route path="/extra-policy" element={<ExtraPolicyPage />} />

        {/* Catch-all → redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}