import { describe, expect, it } from 'vitest';
import { mapAuthError } from './auth-errors';

describe('mapAuthError', () => {
  it('maps invalid credentials', () => {
    expect(mapAuthError('Invalid login credentials').key).toBe('auth.errors.invalidCredentials');
  });

  it('maps email not confirmed', () => {
    expect(mapAuthError('Email not confirmed').key).toBe('auth.errors.emailNotConfirmed');
  });
});
