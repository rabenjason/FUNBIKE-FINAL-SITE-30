import { env } from "../config/env.js";
import { HttpError } from "../utils/http-error.js";

const attempts = new Map();

function keyFor(request, email) {
  return `${request.ip ?? "unknown"}:${email}`;
}

function cleanup(now) {
  for (const [key, entry] of attempts.entries()) {
    const resetAt = Math.max(entry.windowStartedAt + env.auth.loginWindowMinutes * 60_000, entry.lockedUntil ?? 0);
    if (now > resetAt && !entry.lockedUntil) attempts.delete(key);
    if (entry.lockedUntil && now > entry.lockedUntil && now > resetAt) attempts.delete(key);
  }
}

export function assertLoginAllowed(request, email) {
  const now = Date.now();
  cleanup(now);

  const entry = attempts.get(keyFor(request, email));
  if (entry?.lockedUntil && entry.lockedUntil > now) {
    const retryAfterSeconds = Math.ceil((entry.lockedUntil - now) / 1000);
    throw new HttpError(
      429,
      "TOO_MANY_LOGIN_ATTEMPTS",
      "Trop de tentatives de connexion. Reessayez plus tard.",
      { retryAfterSeconds },
    );
  }
}

export function recordFailedLogin(request, email) {
  const now = Date.now();
  const key = keyFor(request, email);
  const windowMs = env.auth.loginWindowMinutes * 60_000;
  const current = attempts.get(key);

  const entry =
    !current || now - current.windowStartedAt > windowMs
      ? { failures: 0, windowStartedAt: now, lockedUntil: 0 }
      : current;

  entry.failures += 1;
  if (entry.failures >= env.auth.loginMaxFailures) {
    entry.lockedUntil = now + env.auth.loginLockMinutes * 60_000;
  }
  attempts.set(key, entry);
}

export function resetFailedLogins(request, email) {
  attempts.delete(keyFor(request, email));
}
