import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import { HttpError } from "../utils/http-error.js";
import { findUserByEmail, findUserById, updateUser } from "../users/user.repository.js";
import { rowToUser } from "../users/user.mapper.js";
import { assertLoginAllowed, recordFailedLogin, resetFailedLogins } from "./login-rate-limit.js";
import { hashPassword, verifyPassword } from "./password.js";
import { userWithPermissions } from "./permissions.js";
import * as sessions from "./session.repository.js";
import {
  createAccessToken,
  createRefreshToken,
  createSessionId,
  hashRefreshToken,
  refreshTokenExpiresAt,
  verifyAccessToken,
} from "./tokens.js";

let dummyPasswordHashPromise;

function getDummyPasswordHash() {
  dummyPasswordHashPromise ??= bcrypt.hash(randomBytes(32).toString("hex"), env.auth.bcryptCost);
  return dummyPasswordHashPromise;
}

function sessionMetadata(request) {
  return {
    ipAddress: request.ip?.slice(0, 45),
    userAgent: request.get("user-agent")?.slice(0, 500),
  };
}

function authenticationPayload(user, sessionId, refreshToken) {
  return {
    user: userWithPermissions(user),
    accessToken: createAccessToken(user, sessionId),
    refreshToken,
    tokenType: "Bearer",
    expiresIn: env.auth.accessTokenTtlSeconds,
  };
}

export async function login({ email, password }, request) {
  assertLoginAllowed(request, email);

  const storedUser = await findUserByEmail(email);
  const passwordHash = storedUser?.password_hash ?? (await getDummyPasswordHash());
  const passwordMatches = await verifyPassword(password, passwordHash);

  if (!storedUser || !passwordMatches) {
    recordFailedLogin(request, email);
    throw new HttpError(401, "INVALID_CREDENTIALS", "Email ou mot de passe incorrect.");
  }

  resetFailedLogins(request, email);

  const user = rowToUser(storedUser);
  const sessionId = createSessionId();
  const refreshToken = createRefreshToken();

  await sessions.createSession({
    id: sessionId,
    userId: user.id,
    refreshTokenHash: hashRefreshToken(refreshToken),
    expiresAt: refreshTokenExpiresAt(),
    ...sessionMetadata(request),
  });

  return authenticationPayload(user, sessionId, refreshToken);
}

export async function refreshSession(refreshToken) {
  if (!refreshToken) {
    throw new HttpError(401, "SESSION_REQUIRED", "Session absente ou expiree.");
  }

  const found = await sessions.findSessionByRefreshHash(hashRefreshToken(refreshToken));
  const expiresAt = found?.session.expiresAt ? new Date(found.session.expiresAt).getTime() : 0;

  if (!found || found.session.revokedAt || expiresAt <= Date.now()) {
    throw new HttpError(401, "SESSION_EXPIRED", "Session absente ou expiree.");
  }

  const nextRefreshToken = createRefreshToken();
  const rotated = await sessions.rotateSession(
    found.session.id,
    hashRefreshToken(nextRefreshToken),
    refreshTokenExpiresAt(),
  );

  if (!rotated) {
    throw new HttpError(401, "SESSION_EXPIRED", "Session absente ou expiree.");
  }

  return authenticationPayload(found.user, found.session.id, nextRefreshToken);
}

export async function logout(refreshToken, sessionId = undefined) {
  if (refreshToken) {
    await sessions.revokeSessionByRefreshHash(hashRefreshToken(refreshToken));
  }
  if (sessionId) {
    await sessions.revokeSessionById(sessionId);
  }
}

function extractBearerToken(request) {
  const authorization = request.get("authorization") ?? "";
  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return undefined;
  return token;
}

export async function authenticateRequest(request) {
  const token = extractBearerToken(request);
  if (!token) {
    throw new HttpError(401, "AUTH_REQUIRED", "Connexion requise.");
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (error) {
    if (error?.name === "TokenExpiredError") {
      throw new HttpError(401, "TOKEN_EXPIRED", "Le jeton d'acces a expire.");
    }
    throw new HttpError(401, "INVALID_TOKEN", "Jeton d'acces invalide.");
  }

  const userId = Number.parseInt(payload.sub, 10);
  const found = await sessions.findActiveSession(payload.sid, userId);
  if (!found) {
    throw new HttpError(401, "SESSION_EXPIRED", "Session absente, revoquee ou expiree.");
  }

  // Le role et la permission de suppression sont relus en base a chaque
  // requete : un changement fait par un ADMIN s'applique immediatement.
  return {
    user: userWithPermissions(found.user),
    session: found.session,
    authMethod: "user",
  };
}

export async function changePassword(userId, currentPassword, newPassword) {
  const storedUser = await findUserById(userId);

  if (!storedUser || !(await verifyPassword(currentPassword, storedUser.password_hash))) {
    throw new HttpError(401, "INVALID_CREDENTIALS", "Le mot de passe actuel est incorrect.");
  }

  const passwordHash = await hashPassword(newPassword);
  await updateUser(userId, { passwordHash });
  await sessions.revokeAllUserSessions(userId);
}
