import { useEffect } from 'react';
import { getSupabaseClient } from '../../infrastructure/supabase/client';

/** Clears auth hash from URL after Supabase processes email confirm / recovery link. */
export function AuthCallbackHandler() {
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || typeof window === 'undefined') return;

    const hash = window.location.hash;
    if (!hash.includes('access_token') && !hash.includes('type=')) return;

    void supabase.auth.getSession().then(() => {
      if (window.location.hash) {
        window.history.replaceState({}, '', window.location.pathname + window.location.search);
      }
    });
  }, []);

  return null;
}
