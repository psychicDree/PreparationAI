import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import apiService from '../services/api';
import { 
  Bars3Icon, 
  UserIcon, 
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';

const Header = () => {
  const { user, isAuthenticated, resetApp, clearPersistedData } = useAppStore();
  const navigate = useNavigate();


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
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg glow-effect">
              <span className="text-white font-bold text-xl">P</span>
            </div>
            <span className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-300">PreparationAI</span>
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
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                {/* User Menu */}
                <div className="flex items-center space-x-4">
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
                  onClick={() => navigate('/onboarding', { state: { mode: 'signin' } })}
                  className="text-gray-600 hover:text-gray-900 font-medium transition-all duration-300 hover:scale-105 mr-4"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate('/onboarding', { state: { mode: 'signup' } })}
                  className="btn-primary"
                >
                  Join Now
                </button>
              </>
            )}

            {/* Mobile Menu Button */}
            <button className="md:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-300">
              <Bars3Icon className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
