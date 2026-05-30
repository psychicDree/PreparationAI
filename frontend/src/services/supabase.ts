// Supabase client for the frontend.
//
// Uses the publishable (anon) key, which is safe to ship to the browser —
// row-level security in Supabase is what protects data, not key secrecy.
// Configuration is read through the central config module.
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';

let client: SupabaseClient | null = null;

// getSupabase returns a lazily-created singleton Supabase client. It throws if
// the Supabase environment variables are missing so misconfiguration surfaces
// immediately rather than as opaque request failures.
export const getSupabase = (): SupabaseClient => {
  if (!config.supabase.url || !config.supabase.publishableKey) {
    throw new Error(
      'Supabase is not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY',
    );
  }

  if (!client) {
    client = createClient(config.supabase.url, config.supabase.publishableKey);
  }

  return client;
};

export default getSupabase;
