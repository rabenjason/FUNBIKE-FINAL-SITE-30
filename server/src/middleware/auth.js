import { authenticateRequest } from "../auth/auth.service.js";
import { hasPermission } from "../auth/permissions.js";
import { env } from "../config/env.js";
import { HttpError, asyncHandler } from "../utils/http-error.js";
import { hasValidApiKey } from "./require-write-access.js";

function applyAuthentication(request, auth) {
  request.user = auth.user;
  request.session = auth.session;
  request.authMethod = auth.authMethod;
}

/** Exige un utilisateur connecte, avec session encore active en base. */
export const authenticate = asyncHandler(async (request, _response, next) => {
  applyAuthentication(request, await authenticateRequest(request));
  next();
});

/**
 * Identifie l'utilisateur si un jeton est fourni, sans rendre la connexion
 * obligatoire. Utilise par les lectures publiques pour masquer les archives
 * aux visiteurs et les montrer aux utilisateurs connectes.
 */
export const optionalAuthenticate = asyncHandler(async (request, _response, next) => {
  if (!request.get("authorization")) return next();
  applyAuthentication(request, await authenticateRequest(request));
  return next();
});

export function requireRole(...roles) {
  return (request, _response, next) => {
    if (!request.user) return next(new HttpError(401, "AUTH_REQUIRED", "Connexion requise."));
    if (!roles.includes(request.user.role)) {
      return next(new HttpError(403, "FORBIDDEN", "Vous n'avez pas les droits necessaires."));
    }
    return next();
  };
}

export function requirePermission(permission) {
  return (request, _response, next) => {
    if (!request.user) return next(new HttpError(401, "AUTH_REQUIRED", "Connexion requise."));
    if (!hasPermission(request.user, permission)) {
      return next(new HttpError(403, "FORBIDDEN", "Vous n'avez pas les droits necessaires."));
    }
    return next();
  };
}

/**
 * Protection des modifications produits.
 * La voie normale est un utilisateur connecte avec la permission demandee.
 * L'ancienne ADMIN_API_KEY peut rester un secours machine uniquement si
 * ALLOW_API_KEY_WRITES=true ; elle est desactivee par defaut et ne donne
 * jamais acces aux routes utilisateurs ou auth.
 */
export function requireProductPermission(permission) {
  return asyncHandler(async (request, _response, next) => {
    if (!request.get("authorization") && env.allowApiKeyWrites && hasValidApiKey(request)) {
      request.authMethod = "api-key";
      request.user = undefined;
      return next();
    }

    applyAuthentication(request, await authenticateRequest(request));

    if (!hasPermission(request.user, permission)) {
      throw new HttpError(403, "FORBIDDEN", "Vous n'avez pas les droits necessaires pour cette action.");
    }

    return next();
  });
}
