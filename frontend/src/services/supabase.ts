import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zslhulzjyyqkfovbqied.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_PJsNxy8-WkiQYIforvfcMA_pykUV8su';

export const isSupabaseConfigured = () => {
  return (
    Boolean(supabaseUrl) &&
    Boolean(supabaseAnonKey) &&
    !supabaseUrl.includes('placeholder') &&
    !supabaseAnonKey.includes('placeholder')
  );
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Returns the current frontend origin URL for magic link redirects
 */
export const getFrontendRedirectUrl = (): string => {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin;
  }
  return 'http://localhost:5173';
};

/**
 * Sends a Supabase magic link login email with emailRedirectTo strictly targeting the frontend origin
 */
export const sendMagicLink = async (email: string) => {
  const emailRedirectTo = getFrontendRedirectUrl();
  return await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: {
      emailRedirectTo,
    },
  });
};
