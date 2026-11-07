import { useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import apiService from '../services/api';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

export const Logo = ({ to = '/' }: { to?: string }) => (
  <Link to={to} className="flex items-center gap-3" aria-label="PreparationAI home">
    <span className="grid h-[30px] w-[30px] place-items-center rounded-lg bg-accent text-base font-bold text-white">P</span>
    <span className="text-lg font-semibold text-ink">PreparationAI</span>
  </Link>
);

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `text-[15px] font-medium transition-colors ${isActive ? 'text-ink' : 'text-muted hover:text-ink'}`;

const Header = () => {
  const { user, isAuthenticated, resetApp, clearPersistedData } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      clearPersistedData();
      resetApp();
      navigate('/', { replace: true });
      // Reload for a clean state, as before the redesign.
      window.location.reload();
    }
  };

  const go = (path: string, state?: object) => {
    setMenuOpen(false);
    navigate(path, state ? { state } : undefined);
  };

  const links = [
    { to: '/#how-it-works', label: 'How it works', end: true },
    { to: '/pricing', label: 'Pricing' },
    ...(isAuthenticated ? [{ to: '/dashboard', label: 'Dashboard' }] : []),
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-canvas/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-content items-center justify-between px-4 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-10 md:flex" aria-label="Main">
          {links.map((link) =>
            link.to.startsWith('/#') ? (
              <Link key={link.to} to={link.to} className={navLinkClass({ isActive: false })}>
                {link.label}
              </Link>
            ) : (
              <NavLink key={link.to} to={link.to} className={navLinkClass}>
                {link.label}
              </NavLink>
            )
          )}
        </nav>

        <div className="hidden items-center gap-6 md:flex">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="text-[15px] font-medium text-muted hover:text-ink">
                {user?.name || 'Account'}
              </Link>
              <button onClick={handleLogout} className="btn-ghost text-[15px]">
                Sign out
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => go('/onboarding', { mode: 'signin' })}
                className="text-[15px] font-medium text-muted transition-colors hover:text-ink"
              >
                Sign in
              </button>
              <button onClick={() => go('/onboarding', { mode: 'signup' })} className="btn-light px-4 py-2 text-[15px]">
                Start free
              </button>
            </>
          )}
        </div>

        <button
          className="rounded-lg p-2 text-muted hover:bg-white/[0.06] hover:text-ink md:hidden"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-line bg-canvas px-4 pb-6 pt-4 md:hidden" key={location.pathname}>
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {links.map((link) => (
              <button
                key={link.to}
                onClick={() => go(link.to)}
                className="rounded-lg px-3 py-3 text-left text-base font-medium text-muted hover:bg-white/[0.06] hover:text-ink"
              >
                {link.label}
              </button>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-3">
            {isAuthenticated ? (
              <button onClick={() => { setMenuOpen(false); handleLogout(); }} className="btn-secondary w-full">
                Sign out
              </button>
            ) : (
              <>
                <button onClick={() => go('/onboarding', { mode: 'signin' })} className="btn-secondary w-full">
                  Sign in
                </button>
                <button onClick={() => go('/onboarding', { mode: 'signup' })} className="btn-light w-full">
                  Start free
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
