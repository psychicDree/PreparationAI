import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import apiService, { getApiErrorMessage } from '../services/api';
import { AUTH_REDIRECT_KEY, getSupabase } from '../utils/supabase';

// Landing page for social sign-in. The provider (via Supabase Auth) redirects
// here with ?code=...; this page exchanges it for a Supabase session, trades
// that for the app's own JWT, and continues to where the user was heading.
const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const { setUser, setAuthenticated } = useAppStore();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    // The code is single-use; guard against React StrictMode's double effect.
    if (started.current) return;
    started.current = true;

    const finish = async () => {
      const params = new URLSearchParams(window.location.search);
      const providerError = params.get('error_description') || params.get('error');
      if (providerError) {
        setError(providerError);
        return;
      }

      const supabase = getSupabase();
      const code = params.get('code');
      if (!supabase || !code) {
        setError('This sign-in link is invalid or has expired.');
        return;
      }

      try {
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError || !data.session) {
          throw exchangeError ?? new Error('No session returned.');
        }

        const response = await apiService.loginWithSupabase(data.session.access_token);
        setUser(response.user);
        setAuthenticated(true);

        // The app's JWT is now the session; the Supabase one isn't needed.
        await supabase.auth.signOut({ scope: 'local' });

        let destination = '/role-setup';
        try {
          destination = sessionStorage.getItem(AUTH_REDIRECT_KEY) || destination;
          sessionStorage.removeItem(AUTH_REDIRECT_KEY);
        } catch {
          // Storage unavailable; use the default destination.
        }
        navigate(destination, { replace: true });
      } catch (err) {
        setError(getApiErrorMessage(err, 'Sign-in failed. Please try again.'));
      }
    };

    finish();
  }, [navigate, setUser, setAuthenticated]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        {error ? (
          <>
            <p className="text-gray-900 font-medium mb-2">We couldn't sign you in.</p>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => navigate('/onboarding', { replace: true, state: { mode: 'signin' } })}
              className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
            >
              Back to sign in
            </button>
          </>
        ) : (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Signing you in...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallbackPage;
