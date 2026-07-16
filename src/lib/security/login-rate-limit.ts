const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export function isLoginAllowed(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) return true;
  return entry.count < MAX_ATTEMPTS;
}

export function registerLoginFailure(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
  else attempts.set(key, { ...entry, count: entry.count + 1 });
}

export function clearLoginAttempts(key: string) { attempts.delete(key); }
