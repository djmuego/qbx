import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

describe('supabase config auth gate', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    vi.stubEnv('VITE_QBX_REQUIRE_AUTH', '');
    vi.stubEnv('VITE_QBX_DATA_BACKEND', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('requires auth when supabase keys are set', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://x.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
    const { isAuthRequired } = await import('./config');
    expect(isAuthRequired()).toBe(true);
  });

  it('allows offline when REQUIRE_AUTH=false', async () => {
    vi.stubEnv('VITE_QBX_REQUIRE_AUTH', 'false');
    const { isAuthRequired } = await import('./config');
    expect(isAuthRequired()).toBe(false);
  });

  it('forces supabase backend when auth required', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://x.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
    vi.stubEnv('VITE_QBX_DATA_BACKEND', 'local');
    const { dataBackendMode } = await import('./config');
    expect(dataBackendMode()).toBe('supabase');
  });

  it('uses local auth when required but supabase keys missing', async () => {
    vi.stubEnv('VITE_QBX_REQUIRE_AUTH', 'true');
    const { authBackendMode, isAuthConfigured } = await import('./config');
    expect(authBackendMode()).toBe('local');
    expect(isAuthConfigured()).toBe(true);
  });
});
