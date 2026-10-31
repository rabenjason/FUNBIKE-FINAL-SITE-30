import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Router } from "express";
import multer from "multer";
import { PERMISSIONS, hasPermission } from "../auth/permissions.js";
import { authenticate } from "../middleware/auth.js";
import { HttpError, asyncHandler } from "../utils/http-error.js";

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const uploadsRoot = path.join(serverRoot, "uploads");
const productsUploadRoot = path.join(uploadsRoot, "products");

fs.mkdirSync(productsUploadRoot, { recursive: true });

const EXTENSION_BY_MIME = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
  ["image/avif", ".avif"],
]);

const storage = multer.diskStorage({
  destination: productsUploadRoot,
  filename(_request, file, callback) {
    const extension = EXTENSION_BY_MIME.get(file.mimetype) ?? ".img";
    callback(null, `${Date.now()}-${randomBytes(12).toString("hex")}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter(_request, file, callback) {
    if (!EXTENSION_BY_MIME.has(file.mimetype)) {
      return callback(new HttpError(400, "INVALID_IMAGE_TYPE", "Formats acceptes : JPG, PNG, WebP, GIF ou AVIF."));
    }
    return callback(null, true);
  },
});

function requireImageUploadPermission(request, _response, next) {
  if (
    !hasPermission(request.user, PERMISSIONS.PRODUCTS_CREATE) &&
    !hasPermission(request.user, PERMISSIONS.PRODUCTS_UPDATE)
  ) {
    return next(new HttpError(403, "FORBIDDEN", "Vous n'avez pas les droits necessaires pour ajouter une image."));
  }
  return next();
}

const router = Router();

/**
 * Televersement d'une image produit.
 * Authentification obligatoire, permission produits verifiee cote serveur,
 * format et taille controles. Le fichier est ensuite servi sous /uploads.
 */
router.post(
  "/products/images",
  authenticate,
  requireImageUploadPermission,
  upload.single("image"),
  asyncHandler(async (request, response) => {
    if (!request.file) {
      throw new HttpError(400, "IMAGE_REQUIRED", "Choisissez une image a envoyer.");
    }

    return response.status(201).json({
      success: true,
      data: {
        imageUrl: `/uploads/products/${request.file.filename}`,
        filename: request.file.filename,
        size: request.file.size,
        mimeType: request.file.mimetype,
      },
    });
  }),
);

export function uploadErrorHandler(error, _request, response, next) {
  if (error instanceof multer.MulterError) {
    const tooLarge = error.code === "LIMIT_FILE_SIZE";
    return response.status(tooLarge ? 413 : 400).json({
      success: false,
      error: {
        code: tooLarge ? "IMAGE_TOO_LARGE" : "UPLOAD_ERROR",
        message: tooLarge ? "L'image depasse la taille maximale de 5 Mo." : "Le televersement de l'image a echoue.",
      },
    });
  }

  return next(error);
}

export default router;
