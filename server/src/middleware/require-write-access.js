import { timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";
import { HttpError } from "../utils/http-error.js";

function secureCompare(supplied, expected) {
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  return suppliedBuffer.length === expectedBuffer.length && timingSafeEqual(suppliedBuffer, expectedBuffer);
}

export function hasValidApiKey(request) {
  if (!env.adminApiKey) return false;
  const suppliedKey = request.get("x-api-key") ?? "";
  return secureCompare(suppliedKey, env.adminApiKey);
}

/**
 * Ancienne protection machine, conservee pour compatibilite.
 * Les produits l'utilisent uniquement comme secours optionnel derriere
 * ALLOW_API_KEY_WRITES ; l'authentification utilisateur reste la regle.
 */
export function requireWriteAccess(request, _response, next) {
  if (!env.adminApiKey) return next();

  if (!hasValidApiKey(request)) {
    return next(new HttpError(401, "UNAUTHORIZED", "Cle API invalide ou absente."));
  }

  return next();
}
