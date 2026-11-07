import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import apiService from '../services/api';
import { getSupabase, signInWithProvider, type SocialProvider } from '../utils/supabase';
import { EyeIcon, EyeSlashIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const OnboardingPage = () => {
  const location = useLocation();
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>(
    location.state?.mode || 'signin'
  );
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const { setUser, setAuthenticated } = useAppStore();
  const navigate = useNavigate();

  // Get the intended destination from state or default to role-setup
  const intendedDestination = location.state?.from || '/role-setup';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      if (authMode === 'signin') {
        const response = await apiService.login({
          email: formData.email,
          password: formData.password
        });
        setUser(response.user);
        setAuthenticated(true);
        setSuccess('Welcome back! Redirecting...');
        setTimeout(() => navigate(intendedDestination), 1000);
      } else {
        // Validation for signup
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          return;
        }
        if (formData.password.length < 6) {
          setError('Password must be at least 6 characters');
          return;
        }

        const response = await apiService.register({
          email: formData.email,
          password: formData.password,
          name: formData.name
        });
        setUser(response.user);
        setAuthenticated(true);
        setSuccess('Account created successfully! Redirecting...');
        setTimeout(() => navigate(intendedDestination), 1000);
      }
    } catch (error) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const socialSignInEnabled = getSupabase() !== null;

  // Leaves the app for the provider; /auth/callback finishes the sign-in.
  const handleOAuthAuth = async (provider: SocialProvider) => {
    setIsLoading(true);
    setError('');

    try {
      await signInWithProvider(provider, intendedDestination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start sign-in. Please try again.');
      setIsLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setAuthMode(prev => prev === 'signin' ? 'signup' : 'signin');
    setError('');
    setSuccess('');
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: ''
    });
  };

  const title = authMode === 'signin' ? 'Welcome back' : 'Create your account';
  const subtitle = authMode === 'signin'
    ? 'Sign in to continue your interview practice.'
    : 'Practice with questions tailored to your role.';

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-16">
      <div className="glow-hero pointer-events-none absolute left-1/2 top-1/2 h-[900px] w-[1100px] -translate-x-1/2 -translate-y-1/2 opacity-80" />
      <div className="relative w-full max-w-[440px]">
        <div className="rounded-[18px] border border-line bg-panel p-8 shadow-[0_24px_70px_rgba(0,0,0,0.45)] sm:p-10">
          <div className="text-center">
            <span className="mx-auto grid h-9 w-9 place-items-center rounded-[10px] bg-accent text-[19px] font-bold text-white">P</span>
            <h1 className="mt-5 text-[26px] font-bold tracking-[-0.02em] text-ink">{title}</h1>
            <p className="mt-2 text-[15px] text-muted">{subtitle}</p>
          </div>

          {socialSignInEnabled && (<>
          <div className="mt-7 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleOAuthAuth('google')}
              disabled={isLoading}
              className="flex h-11 items-center justify-center gap-2.5 rounded-[10px] border border-line bg-field text-sm font-semibold text-ink transition-colors hover:border-soft disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>
            <button
              type="button"
              onClick={() => handleOAuthAuth('github')}
              disabled={isLoading}
              className="flex h-11 items-center justify-center gap-2.5 rounded-[10px] border border-line bg-field text-sm font-semibold text-ink transition-colors hover:border-soft disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg className="h-[18px] w-[18px]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub
            </button>
            <button
              type="button"
              onClick={() => handleOAuthAuth('linkedin_oidc')}
              disabled={isLoading}
              className="flex h-11 items-center justify-center gap-2.5 rounded-[10px] border border-line bg-field text-sm font-semibold text-ink transition-colors hover:border-soft disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#0A66C2" d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"/>
              </svg>
              LinkedIn
            </button>
            <button
              type="button"
              onClick={() => handleOAuthAuth('apple')}
              disabled={isLoading}
              className="flex h-11 items-center justify-center gap-2.5 rounded-[10px] border border-line bg-field text-sm font-semibold text-ink transition-colors hover:border-soft disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg className="h-[18px] w-[18px]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M16.37 1.43c0 1.14-.47 2.23-1.2 3.03-.79.86-2.08 1.53-3.13 1.44-.13-1.11.43-2.27 1.17-3.04.82-.86 2.21-1.5 3.16-1.43zM20.5 17.21c-.57 1.31-.84 1.9-1.58 3.06-1.03 1.62-2.48 3.63-4.28 3.65-1.6.02-2.01-1.04-4.18-1.03-2.17.01-2.62 1.05-4.22 1.03-1.8-.02-3.17-1.84-4.2-3.46C-.85 15.94-1.15 10.66.75 7.83 2.1 5.82 4.23 4.64 6.23 4.64c2.03 0 3.31 1.11 4.99 1.11 1.63 0 2.62-1.11 4.97-1.11 1.78 0 3.66.97 5 2.64-4.39 2.41-3.68 8.68-.69 9.93z"/>
              </svg>
              Apple
            </button>
          </div>

          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-line" />
            <span className="text-xs font-medium text-soft">or with email</span>
            <div className="h-px flex-1 bg-line" />
          </div>
          </>)}

          <form onSubmit={handleEmailAuth} className={`space-y-4 ${socialSignInEnabled ? '' : 'mt-7'}`}>
            {authMode === 'signup' && (
              <div>
                <label htmlFor="name" className="mb-2 block text-[13px] font-medium text-muted">
                  Full name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required={authMode === 'signup'}
                  autoComplete="name"
                  className="input-field"
                  placeholder="Your name"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="mb-2 block text-[13px] font-medium text-muted">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                autoComplete="email"
                className="input-field"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-[13px] font-medium text-muted">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
                  className="input-field pr-11"
                  placeholder={authMode === 'signin' ? 'Your password' : 'At least 6 characters'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-soft hover:text-ink"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {authMode === 'signup' && (
              <div>
                <label htmlFor="confirmPassword" className="mb-2 block text-[13px] font-medium text-muted">
                  Confirm password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required={authMode === 'signup'}
                  autoComplete="new-password"
                  className="input-field"
                  placeholder="Repeat your password"
                />
              </div>
            )}

            {error && (
              <div role="alert" className="rounded-[10px] border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div role="status" className="flex items-center rounded-[10px] border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                <CheckCircleIcon className="mr-2 h-5 w-5" />
                {success}
              </div>
            )}

            <button type="submit" disabled={isLoading} className="btn-primary mt-2 w-full">
              {isLoading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {isLoading ? 'Processing…' : authMode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            {authMode === 'signin' ? 'New to PreparationAI?' : 'Already have an account?'}
            <button onClick={toggleAuthMode} className="ml-1 font-semibold text-accent-text hover:text-ink">
              {authMode === 'signin' ? 'Create an account' : 'Sign in'}
            </button>
          </p>
        </div>

        {/* Terms: shown in both modes, since social sign-in can create an account from either */}
        <p className="mx-auto mt-7 max-w-[360px] text-center text-xs leading-relaxed text-soft">
          By continuing, you agree to our{' '}
          <Link to="/terms" className="text-muted underline-offset-2 hover:text-ink hover:underline">Terms and Conditions</Link>
          {' '}and{' '}
          <Link to="/privacy" className="text-muted underline-offset-2 hover:text-ink hover:underline">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
};

export default OnboardingPage;
