import { createHash, randomBytes, randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

const ISSUER = "funbike-server";
const AUDIENCE = "funbike-dashboard";

export function createAccessToken(user, sessionId) {
  return jwt.sign(
    {
      role: user.role,
      sid: sessionId,
      type: "access",
    },
    env.auth.jwtSecret,
    {
      algorithm: "HS256",
      audience: AUDIENCE,
      expiresIn: env.auth.accessTokenTtlSeconds,
      issuer: ISSUER,
      jwtid: randomUUID(),
      subject: String(user.id),
    },
  );
}

export function verifyAccessToken(token) {
  const payload = jwt.verify(token, env.auth.jwtSecret, {
    algorithms: ["HS256"],
    audience: AUDIENCE,
    issuer: ISSUER,
  });

  if (payload.type !== "access" || !payload.sub || !payload.sid) {
    throw new Error("Jeton d'acces invalide.");
  }

  return payload;
}

export function createRefreshToken() {
  return randomBytes(48).toString("base64url");
}

export function hashRefreshToken(refreshToken) {
  return createHash("sha256").update(refreshToken).digest("hex");
}

export function createSessionId() {
  return randomUUID();
}

export function refreshTokenExpiresAt() {
  return new Date(Date.now() + env.auth.refreshTokenTtlDays * 24 * 60 * 60 * 1000);
}
