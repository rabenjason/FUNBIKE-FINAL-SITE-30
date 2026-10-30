import { env } from "../config/env.js";
import { HttpError } from "../utils/http-error.js";

function parseCookieHeader(header) {
  const cookies = {};
  if (!header) return cookies;

  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index <= 0) continue;
    const name = part.slice(0, index).trim();
    const rawValue = part.slice(index + 1).trim();
    try {
      cookies[name] = decodeURIComponent(rawValue);
    } catch {
      cookies[name] = rawValue;
    }
  }

  return cookies;
}

export function getRefreshTokenFromCookie(request) {
  return parseCookieHeader(request.get("cookie"))[env.auth.refreshCookieName];
}

export function setRefreshCookie(response, refreshToken) {
  const maxAgeSeconds = env.auth.refreshTokenTtlDays * 24 * 60 * 60;
  const attributes = [
    `${env.auth.refreshCookieName}=${encodeURIComponent(refreshToken)}`,
    `Path=${env.auth.cookiePath}`,
    `Max-Age=${maxAgeSeconds}`,
    "HttpOnly",
    `SameSite=${env.auth.cookieSameSite}`,
  ];

  if (env.auth.cookieSecure) attributes.push("Secure");
  response.append("Set-Cookie", attributes.join("; "));
}

export function clearRefreshCookie(response) {
  const attributes = [
    `${env.auth.refreshCookieName}=`,
    `Path=${env.auth.cookiePath}`,
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "HttpOnly",
    `SameSite=${env.auth.cookieSameSite}`,
  ];

  if (env.auth.cookieSecure) attributes.push("Secure");
  response.append("Set-Cookie", attributes.join("; "));
}

/**
 * Les routes qui utilisent le cookie de session verifient Origin quand le
 * navigateur en envoie un. Cela complete SameSite contre les appels CSRF.
 */
export function assertCookieRequestOrigin(request) {
  const origin = request.get("origin");
  if (!origin) return;
  if (env.corsOrigins.includes("*") || env.corsOrigins.includes(origin)) return;
  throw new HttpError(403, "FORBIDDEN_ORIGIN", "Origine non autorisee pour cette session.");
}
