export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return Boolean(url && key && url.length > 0 && key.length > 0);
}

/** When true, app is gated behind email+password login (no anonymous access). */
export function isAuthRequired(): boolean {
  const flag = import.meta.env.VITE_QBX_REQUIRE_AUTH;
  if (flag === 'false') return false;
  if (flag === 'true') return true;
  return isSupabaseConfigured();
}

/** supabase = cloud; local = browser storage (dev without Supabase project) */
export function authBackendMode(): 'supabase' | 'local' | 'off' {
  if (!isAuthRequired()) return 'off';
  if (isSupabaseConfigured()) return 'supabase';
  const forced = import.meta.env.VITE_QBX_AUTH_BACKEND;
  if (forced === 'supabase') return 'supabase';
  return 'local';
}

export function isAuthConfigured(): boolean {
  const mode = authBackendMode();
  if (mode === 'local') return true;
  if (mode === 'supabase') return isSupabaseConfigured();
  return false;
}

export function dataBackendMode(): 'supabase' | 'local' {
  const flag = import.meta.env.VITE_QBX_DATA_BACKEND;
  if (isAuthRequired() && isSupabaseConfigured()) return 'supabase';
  if (flag === 'local') return 'local';
  if (isSupabaseConfigured()) return 'supabase';
  return 'local';
}

export function supabaseUrl(): string {
  return import.meta.env.VITE_SUPABASE_URL ?? '';
}

export function supabaseAnonKey(): string {
  return import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
}
