import { Router } from "express";
import { revokeAllUserSessions } from "../auth/session.repository.js";
import { hashPassword } from "../auth/password.js";
import { userWithPermissions } from "../auth/permissions.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { HttpError, asyncHandler } from "../utils/http-error.js";
import * as repository from "./user.repository.js";
import {
  parseUserId,
  parseUserListQuery,
  validateCreateUser,
  validateUpdateUser,
} from "./user.validation.js";

const router = Router();

// Toutes les routes utilisateurs sont reservees aux ADMIN connectes.
router.use(authenticate, requireRole("ADMIN"));

async function requireExistingUser(id) {
  const user = await repository.findUserById(id);
  if (!user) throw new HttpError(404, "USER_NOT_FOUND", "Utilisateur introuvable.");
  return user;
}

/** Liste des utilisateurs (sans hash, sans mot de passe). */
router.get(
  "/",
  asyncHandler(async (request, response) => {
    const filters = parseUserListQuery(request.query);
    const { users, total } = await repository.listUsers(filters);

    return response.json({
      success: true,
      data: users.map(userWithPermissions),
      pagination: { total, limit: filters.limit, offset: filters.offset },
    });
  }),
);

/** Creer un utilisateur ADMIN ou MARKETING. */
router.post(
  "/",
  asyncHandler(async (request, response) => {
    const input = validateCreateUser(request.body);
    const passwordHash = await hashPassword(input.password);
    const user = await repository.createUser({ ...input, passwordHash });

    return response.status(201).json({ success: true, data: userWithPermissions(user) });
  }),
);

/** Detail d'un utilisateur. */
router.get(
  "/:id",
  asyncHandler(async (request, response) => {
    const id = parseUserId(request.params.id);
    const storedUser = await requireExistingUser(id);
    const user = await repository.findPublicUserById(storedUser.id);
    return response.json({ success: true, data: userWithPermissions(user) });
  }),
);

/**
 * Modifier un utilisateur.
 * Un ADMIN gere les roles des autres comptes, mais ne peut ni changer son
 * propre role, ni retirer le dernier ADMIN.
 */
router.patch(
  "/:id",
  asyncHandler(async (request, response) => {
    const id = parseUserId(request.params.id);
    const target = await requireExistingUser(id);
    const input = validateUpdateUser(request.body);

    if (input.role !== undefined && input.role !== target.role) {
      if (target.id === request.user.id) {
        throw new HttpError(403, "CANNOT_CHANGE_OWN_ROLE", "Un ADMIN ne peut pas modifier son propre role.");
      }
      if (target.role === "ADMIN" && (await repository.countAdmins()) <= 1) {
        throw new HttpError(409, "LAST_ADMIN_REQUIRED", "Il doit rester au moins un compte ADMIN.");
      }
    }

    const updates = { ...input };
    if (input.password !== undefined) {
      updates.passwordHash = await hashPassword(input.password);
      delete updates.password;
    }

    const user = await repository.updateUser(id, updates);

    if (updates.passwordHash || updates.role !== undefined || updates.canDeleteProducts !== undefined) {
      await revokeAllUserSessions(id);
    }

    return response.json({ success: true, data: userWithPermissions(user) });
  }),
);

/** Supprimer un utilisateur ; ses sessions sont supprimees en cascade. */
router.delete(
  "/:id",
  asyncHandler(async (request, response) => {
    const id = parseUserId(request.params.id);
    const target = await requireExistingUser(id);

    if (target.id === request.user.id) {
      throw new HttpError(400, "CANNOT_DELETE_SELF", "Vous ne pouvez pas supprimer votre propre compte.");
    }
    if (target.role === "ADMIN" && (await repository.countAdmins()) <= 1) {
      throw new HttpError(409, "LAST_ADMIN_REQUIRED", "Il doit rester au moins un compte ADMIN.");
    }

    await repository.deleteUser(id);
    return response.status(204).send();
  }),
);

export default router;
