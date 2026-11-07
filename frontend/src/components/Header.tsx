import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import apiService from '../services/api';
import { 
  Bars3Icon,
  XMarkIcon,
  UserIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';

const Header = () => {
  const { user, isAuthenticated, resetApp, clearPersistedData } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close the mobile menu whenever the route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const goToOnboarding = (mode: 'signin' | 'signup') => {
    setMobileMenuOpen(false);
    navigate('/onboarding', { state: { mode } });
  };

  const handleLogout = async () => {
    try {
      await apiService.logout();
      clearPersistedData();
      resetApp();
      // Force navigation to landing page
      navigate('/', { replace: true });
      // Force a page reload to ensure clean state
      window.location.reload();
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if logout fails, clear local state
      clearPersistedData();
      resetApp();
      navigate('/', { replace: true });
    }
  };

  return (
    <header className="bg-white/95 backdrop-blur-sm shadow-lg border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-18">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group min-w-0">
            <div className="w-10 h-10 shrink-0 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg glow-effect">
              <span className="text-white font-bold text-xl">P</span>
            </div>
            <span className="text-xl sm:text-2xl font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors duration-300">PreparationAI</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link 
              to="/" 
              className="text-gray-600 hover:text-gray-900 font-medium transition-all duration-300 hover:scale-105"
            >
              How it Works
            </Link>
            <Link 
              to="/pricing" 
              className="text-gray-600 hover:text-gray-900 font-medium transition-all duration-300 hover:scale-105"
            >
              Pricing
            </Link>
            {isAuthenticated && (
              <Link 
                to="/dashboard" 
                className="text-gray-600 hover:text-gray-900 font-medium transition-all duration-300 hover:scale-105"
              >
                Dashboard
              </Link>
            )}
          </nav>

          {/* User Actions */}
          <div className="flex items-center shrink-0 space-x-2 md:space-x-4">
            {isAuthenticated ? (
              <>
                {/* User Menu */}
                <div className="flex items-center space-x-2 md:space-x-4">
                  <Link
                    to="/dashboard"
                    className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition-all duration-300 hover:scale-105 font-medium"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <UserIcon className="w-4 h-4 text-white" />
                    </div>
                    <span className="hidden sm:block">{user?.name}</span>
                  </Link>
                  
                  <button
                    onClick={handleLogout}
                    className="btn-ghost flex items-center space-x-2"
                  >
                    <ArrowRightOnRectangleIcon className="w-5 h-5" />
                    <span className="hidden sm:block">Sign Out</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => goToOnboarding('signin')}
                  className="hidden md:inline-block text-gray-600 hover:text-gray-900 font-medium transition-all duration-300 hover:scale-105 mr-4"
                >
                  Sign In
                </button>
                <button
                  onClick={() => goToOnboarding('signup')}
                  className="hidden md:inline-block btn-primary"
                >
                  Join Now
                </button>
              </>
            )}

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              className="md:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-300"
            >
              {mobileMenuOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div id="mobile-menu" className="md:hidden border-t border-gray-200 bg-white">
          <nav className="container mx-auto px-4 py-4 flex flex-col space-y-1">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 font-medium"
            >
              How it Works
            </Link>
            <Link
              to="/pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 font-medium"
            >
              Pricing
            </Link>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 font-medium"
              >
                Dashboard
              </Link>
            ) : (
              <div className="flex flex-col space-y-2 pt-3 mt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => goToOnboarding('signin')}
                  className="px-3 py-2 rounded-lg text-left text-gray-700 hover:bg-gray-100 font-medium"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => goToOnboarding('signup')}
                  className="btn-primary w-full text-center"
                >
                  Join Now
                </button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
