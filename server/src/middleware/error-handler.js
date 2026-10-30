import { HttpError } from "../utils/http-error.js";

const DATABASE_UNAVAILABLE_CODES = new Set([
  "ECONNREFUSED",
  "ENOTFOUND",
  "ETIMEDOUT",
  "PROTOCOL_CONNECTION_LOST",
  "ER_ACCESS_DENIED_ERROR",
  "ER_BAD_DB_ERROR",
  "ER_NO_SUCH_TABLE",
]);

export function notFoundHandler(request, _response, next) {
  next(new HttpError(404, "NOT_FOUND", `Route introuvable : ${request.method} ${request.originalUrl}`));
}

export function errorHandler(error, _request, response, _next) {
  if (error instanceof HttpError) {
    return response.status(error.status).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    });
  }

  if (error?.type === "entity.parse.failed" || error instanceof SyntaxError) {
    return response.status(400).json({
      success: false,
      error: { code: "INVALID_JSON", message: "Le corps de la requete doit etre un JSON valide." },
    });
  }

  if (error?.code === "ER_DUP_ENTRY") {
    if (String(error.sqlMessage ?? error.message ?? "").includes("uq_users_email")) {
      return response.status(409).json({
        success: false,
        error: { code: "USER_EMAIL_ALREADY_EXISTS", message: "Un utilisateur avec cet email existe deja." },
      });
    }

    return response.status(409).json({
      success: false,
      error: { code: "PRODUCT_ALREADY_EXISTS", message: "Un produit avec cet id existe deja." },
    });
  }

  if (DATABASE_UNAVAILABLE_CODES.has(error?.code)) {
    console.error("Base de donnees indisponible :", error.message);
    return response.status(503).json({
      success: false,
      error: {
        code: "DATABASE_UNAVAILABLE",
        message: "La base de donnees MySQL est indisponible. Verifiez la configuration et executez la migration.",
      },
    });
  }

  console.error(error);
  return response.status(500).json({
    success: false,
    error: { code: "INTERNAL_SERVER_ERROR", message: "Une erreur interne est survenue." },
  });
}
