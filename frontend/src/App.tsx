import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import apiService from './services/api';

// Page components - 7 Screen Wireframe Flow
import LandingPage from './pages/LandingPage';
import OnboardingPage from './pages/OnboardingPage';
import RoleSetupPage from './pages/RoleSetupPage';
import WarmupPage from './pages/WarmupPage';
import PaymentPage from './pages/PaymentPage';
import InterviewDashboard from './pages/InterviewDashboard';
import FeedbackPage from './pages/FeedbackPage';
import DashboardPage from './pages/DashboardPage';
import PricingPage from './pages/PricingPage';

// Layout components
import Header from './components/Header';
import Footer from './components/Footer';

function App() {
  const { isAuthenticated, setUser, setAuthenticated, setLoading, setError, resetApp } = useAppStore();

  useEffect(() => {
    const initializeAuth = async () => {
      if (apiService.isAuthenticated()) {
        try {
          setLoading(true);
          const userData = await apiService.getProfile();
          setUser(userData);
          setAuthenticated(true);
        } catch (error) {
          console.error('Failed to initialize auth:', error);
          setError('Failed to authenticate user');
          // Clear all auth data on failure
          resetApp();
        } finally {
          setLoading(false);
        }
      } else {
        // Ensure clean state if no token
        resetApp();
      }
    };

    initializeAuth();
  }, [setUser, setAuthenticated, setLoading, setError, resetApp]);

  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    // Allow both authenticated users and guest sessions to proceed
    // Guest sessions are handled by the individual pages
    return <>{children}</>;
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="min-h-screen pt-18">
          <Routes>
            {/* 7-Screen Wireframe Flow */}
            
            {/* 1. Landing Page - Role input with sample question preview */}
            <Route path="/" element={<LandingPage />} />
            
            {/* Onboarding Page - Authentication */}
            <Route path="/onboarding" element={<OnboardingPage />} />
            
            {/* Pricing Page - Subscription plans */}
            <Route path="/pricing" element={<PricingPage />} />
            
            
            {/* 2. Role Setup - Skill tags and industry/role selection */}
            <Route 
              path="/role-setup" 
              element={
                <ProtectedRoute>
                  <RoleSetupPage />
                </ProtectedRoute>
              } 
            />
            
            {/* 3. Warmup - Experience level and preference calibration */}
            <Route 
              path="/warmup" 
              element={
                <ProtectedRoute>
                  <WarmupPage />
                </ProtectedRoute>
              } 
            />
            
            {/* 4. Payment - Session type selection and pricing */}
            <Route 
              path="/payment" 
              element={
                <ProtectedRoute>
                  <PaymentPage />
                </ProtectedRoute>
              } 
            />
            
            {/* 5. Interview Dashboard - Real-time interview with timer */}
            <Route 
              path="/interview/:sessionId" 
              element={
                <ProtectedRoute>
                  <InterviewDashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* 6. Feedback - Detailed scoring and recommendations */}
            <Route 
              path="/feedback/:sessionId" 
              element={
                <ProtectedRoute>
                  <FeedbackPage />
                </ProtectedRoute>
              } 
            />
            
            {/* 7. Dashboard - Progress tracking and session history */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              } 
            />

            {/* Default redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;