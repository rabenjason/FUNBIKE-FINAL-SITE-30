import { Router } from "express";
import { PERMISSIONS } from "../auth/permissions.js";
import { optionalAuthenticate, requireProductPermission } from "../middleware/auth.js";
import { HttpError, asyncHandler } from "../utils/http-error.js";
import * as repository from "./product.repository.js";
import {
  HOME_SECTIONS,
  parseProductListQuery,
  validateProductPayload,
  validateStatusPayload,
} from "./product.validation.js";

const router = Router();

function sendProduct(response, status, product) {
  return response.status(status).json({ success: true, data: product });
}

async function requireExistingProduct(id) {
  const product = await repository.findProductById(id);
  if (!product) throw new HttpError(404, "PRODUCT_NOT_FOUND", "Produit introuvable.");
  return product;
}

/** Sections publiques de la page d'accueil : PUBLISHED + booleen de section, triees. */
router.get(
  "/home/:section",
  asyncHandler(async (request, response) => {
    const { section } = request.params;
    if (!HOME_SECTIONS[section]) {
      throw new HttpError(400, "VALIDATION_ERROR", "section doit valoir 'homeNew', 'motosHome' ou 'essentialsHome'.");
    }

    const products = await repository.getHomeProducts(section);
    return response.json({ success: true, data: products });
  }),
);

/** Liste des produits : filtres status, section, type, search, limit et offset. */
router.get(
  "/products",
  optionalAuthenticate,
  asyncHandler(async (request, response) => {
    const filters = parseProductListQuery(request.query);

    // Les visiteurs voient uniquement le catalogue publie. Les utilisateurs
    // connectes (ADMIN / MARKETING) peuvent aussi consulter les archives.
    if (!request.user) filters.status = "PUBLISHED";
    const { products, total } = await repository.listProducts(filters);

    return response.json({
      success: true,
      data: products,
      pagination: {
        total,
        limit: filters.limit,
        offset: filters.offset,
      },
    });
  }),
);

/** Detail d'un produit. */
router.get(
  "/products/:id",
  optionalAuthenticate,
  asyncHandler(async (request, response) => {
    const product = await requireExistingProduct(request.params.id);
    if (product.status === "ARCHIVED" && !request.user) {
      throw new HttpError(404, "PRODUCT_NOT_FOUND", "Produit introuvable.");
    }
    return sendProduct(response, 200, product);
  }),
);

/** Ajouter un produit. */
router.post(
  "/products",
  requireProductPermission(PERMISSIONS.PRODUCTS_CREATE),
  asyncHandler(async (request, response) => {
    const product = validateProductPayload(request.body);
    const created = await repository.createProduct(product);
    return sendProduct(response, 201, created);
  }),
);

/** Remplacer completement un produit existant. */
router.put(
  "/products/:id",
  requireProductPermission(PERMISSIONS.PRODUCTS_UPDATE),
  asyncHandler(async (request, response) => {
    await requireExistingProduct(request.params.id);
    const product = validateProductPayload(request.body, { pathId: request.params.id });
    const updated = await repository.replaceProduct(request.params.id, product);
    return sendProduct(response, 200, updated);
  }),
);

/** Modifier partiellement un produit : seuls les champs fournis changent. */
router.patch(
  "/products/:id",
  requireProductPermission(PERMISSIONS.PRODUCTS_UPDATE),
  asyncHandler(async (request, response) => {
    const current = await requireExistingProduct(request.params.id);
    const product = validateProductPayload(
      { ...current, ...request.body, id: current.id },
      { pathId: request.params.id },
    );
    const updated = await repository.replaceProduct(request.params.id, product);
    return sendProduct(response, 200, updated);
  }),
);

/** Publier ou archiver un produit. */
router.patch(
  "/products/:id/status",
  requireProductPermission(PERMISSIONS.PRODUCTS_PUBLISH),
  asyncHandler(async (request, response) => {
    await requireExistingProduct(request.params.id);
    const status = validateStatusPayload(request.body);
    const updated = await repository.updateProductStatus(request.params.id, status);
    return sendProduct(response, 200, updated);
  }),
);

/** Supprimer definitivement un produit. */
router.delete(
  "/products/:id",
  requireProductPermission(PERMISSIONS.PRODUCTS_DELETE),
  asyncHandler(async (request, response) => {
    const deleted = await repository.deleteProduct(request.params.id);
    if (!deleted) throw new HttpError(404, "PRODUCT_NOT_FOUND", "Produit introuvable.");
    return response.status(204).send();
  }),
);

export default router;
