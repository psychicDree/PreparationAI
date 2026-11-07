import { createClient, type Provider, type SupabaseClient } from '@supabase/supabase-js';
import config from '../config';

// Supabase is used only for social sign-in (Supabase Auth). After the provider
// redirects back, the Supabase session is exchanged for this app's own JWT at
// POST /auth/supabase, and the rest of the app keeps using that JWT.

let client: SupabaseClient | null = null;

/** Returns the Supabase client, or null when VITE_SUPABASE_* are not set. */
export const getSupabase = (): SupabaseClient | null => {
  if (!config.supabase.url || !config.supabase.publishableKey) return null;
  if (!client) {
    client = createClient(config.supabase.url, config.supabase.publishableKey, {
      auth: {
        // PKCE: the provider returns a one-time ?code= that only this browser
        // (which holds the code verifier) can exchange.
        flowType: 'pkce',
        // The /auth/callback page exchanges the code itself.
        detectSessionInUrl: false,
        persistSession: true,
      },
    });
  }
  return client;
};

export type SocialProvider = Extract<Provider, 'google' | 'github' | 'linkedin_oidc' | 'apple'>;

/** Where the app sends the user after a social sign-in completes. */
export const AUTH_REDIRECT_KEY = 'auth_redirect_to';

/** Starts a social sign-in; the browser leaves the app for the provider. */
export const signInWithProvider = async (provider: SocialProvider, returnTo: string) => {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Social sign-in is not configured.');
  }
  try {
    sessionStorage.setItem(AUTH_REDIRECT_KEY, returnTo);
  } catch {
    // Storage can be unavailable (e.g. private mode); fall back to the default page.
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
  if (error) throw error;
};
