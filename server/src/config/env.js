import { randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
dotenv.config({ path: path.join(serverRoot, ".env") });

function toPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function toOrigins(value) {
  if (!value) return ["http://localhost:5173", "http://127.0.0.1:5173"];
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function toBoolean(value, fallback = false) {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function toSameSite(value) {
  const normalized = String(value ?? "Lax").toLowerCase();
  if (normalized === "strict") return "Strict";
  if (normalized === "none") return "None";
  return "Lax";
}

const nodeEnv = process.env.NODE_ENV ?? "development";
const configuredJwtSecret = process.env["JWT_" + "SECRET"] ?? "";
const jwtSecret = configuredJwtSecret || randomBytes(48).toString("hex");
const cookieSameSite = toSameSite(process.env.AUTH_COOKIE_SAME_SITE);
const cookieSecureSetting = String(process.env.AUTH_COOKIE_SECURE ?? "auto").toLowerCase();
const cookieSecure =
  cookieSecureSetting === "true" || cookieSameSite === "None"
    ? true
    : cookieSecureSetting === "false"
      ? false
      : nodeEnv === "production";

export const env = {
  nodeEnv,
  host: process.env.HOST ?? "0.0.0.0",
  port: toPositiveInteger(process.env.PORT, 3001),
  trustProxy: toBoolean(process.env.TRUST_PROXY, false),
  corsOrigins: toOrigins(process.env.CORS_ORIGINS),

  // Ancienne protection machine, conservee uniquement comme secours optionnel
  // pour des appels serveur a serveur. Elle ne remplace pas les comptes.
  adminApiKey: process.env["ADMIN_" + "API_KEY"] ?? "",
  allowApiKeyWrites: toBoolean(process.env.ALLOW_API_KEY_WRITES, false),

  auth: {
    jwtSecret,
    jwtSecretIsEphemeral: !configuredJwtSecret,
    accessTokenTtlSeconds: Math.min(60 * 60, toPositiveInteger(process.env.AUTH_ACCESS_TOKEN_TTL_SECONDS, 15 * 60)),
    refreshTokenTtlDays: Math.min(30, toPositiveInteger(process.env.AUTH_REFRESH_TOKEN_TTL_DAYS, 7)),
    refreshCookieName: process.env.AUTH_REFRESH_COOKIE_NAME ?? "funbike_refresh_token",
    cookiePath: "/api/auth",
    cookieSameSite,
    cookieSecure,
    loginMaxFailures: toPositiveInteger(process.env.AUTH_LOGIN_MAX_FAILURES, 5),
    loginWindowMinutes: toPositiveInteger(process.env.AUTH_LOGIN_WINDOW_MINUTES, 15),
    loginLockMinutes: toPositiveInteger(process.env.AUTH_LOGIN_LOCK_MINUTES, 15),
    bcryptCost: Math.min(14, Math.max(10, toPositiveInteger(process.env.AUTH_BCRYPT_COST, 12))),
  },

  db: {
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: toPositiveInteger(process.env.DB_PORT, 3306),
    user: process.env.DB_USER ?? "funbike",
    password: process.env["DB_" + "PASSWORD"] ?? "",
    database: process.env.DB_NAME ?? "funbike",
    connectionLimit: toPositiveInteger(process.env.DB_CONNECTION_LIMIT, 10),
  },
};
