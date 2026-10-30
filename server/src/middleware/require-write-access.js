import { timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";
import { HttpError } from "../utils/http-error.js";

function secureCompare(supplied, expected) {
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  return suppliedBuffer.length === expectedBuffer.length && timingSafeEqual(suppliedBuffer, expectedBuffer);
}

/**
 * Protection simple des ecritures, sans dashboard ni systeme de comptes.
 * Si ADMIN_API_KEY est vide, les ecritures restent ouvertes (mode local).
 * Des qu'une cle est configuree, l'en-tete x-api-key devient obligatoire.
 */
export function requireWriteAccess(request, _response, next) {
  if (!env.adminApiKey) return next();

  const suppliedKey = request.get("x-api-key") ?? "";
  if (!secureCompare(suppliedKey, env.adminApiKey)) {
    return next(new HttpError(401, "UNAUTHORIZED", "Cle API invalide ou absente."));
  }

  return next();
}
