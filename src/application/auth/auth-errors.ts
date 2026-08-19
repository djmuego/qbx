/** Map Supabase auth errors to i18n keys (fallback to raw message). */
export function mapAuthError(message: string): { key: string; fallback: string } {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials') || m.includes('invalid email or password')) {
    return { key: 'auth.errors.invalidCredentials', fallback: 'Неверный email или пароль' };
  }
  if (m.includes('email not confirmed')) {
    return { key: 'auth.errors.emailNotConfirmed', fallback: 'Подтвердите email — проверьте почту' };
  }
  if (m.includes('user already registered') || m.includes('already been registered')) {
    return { key: 'auth.errors.alreadyRegistered', fallback: 'Этот email уже зарегистрирован' };
  }
  if (m.includes('password') && m.includes('least')) {
    return { key: 'auth.errors.passwordTooShort', fallback: 'Пароль должен быть не короче 6 символов' };
  }
  if (m.includes('rate limit') || m.includes('too many requests')) {
    return { key: 'auth.errors.rateLimit', fallback: 'Слишком много попыток. Подождите немного.' };
  }
  if (m.includes('valid email')) {
    return { key: 'auth.errors.invalidEmail', fallback: 'Некорректный email' };
  }
  return { key: 'auth.errors.generic', fallback: message };
}
