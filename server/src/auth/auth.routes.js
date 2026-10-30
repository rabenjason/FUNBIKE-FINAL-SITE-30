import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { HttpError, asyncHandler } from "../utils/http-error.js";
import { findPublicUserById, updateUser } from "../users/user.repository.js";
import {
  validateChangePassword,
  validateLogin,
  validateProfileUpdate,
} from "../users/user.validation.js";
import { authenticateRequest, changePassword, login, logout, refreshSession } from "./auth.service.js";
import {
  assertCookieRequestOrigin,
  clearRefreshCookie,
  getRefreshTokenFromCookie,
  setRefreshCookie,
} from "./cookies.js";
import { userWithPermissions } from "./permissions.js";

const router = Router();

router.use((_request, response, next) => {
  response.set("Cache-Control", "no-store");
  next();
});

function sendAuthentication(response, status, authentication) {
  const { refreshToken, ...data } = authentication;
  setRefreshCookie(response, refreshToken);
  return response.status(status).json({ success: true, data });
}

/** Connexion email + mot de passe. */
router.post(
  "/login",
  asyncHandler(async (request, response) => {
    const credentials = validateLogin(request.body);
    const authentication = await login(credentials, request);
    return sendAuthentication(response, 200, authentication);
  }),
);

/** Renouvelle l'acces et fait tourner le refresh token. */
router.post(
  "/refresh",
  asyncHandler(async (request, response) => {
    assertCookieRequestOrigin(request);
    const authentication = await refreshSession(getRefreshTokenFromCookie(request));
    return sendAuthentication(response, 200, authentication);
  }),
);

/** Deconnexion : la session est revoquee en base, puis le cookie est efface. */
router.post(
  "/logout",
  asyncHandler(async (request, response) => {
    assertCookieRequestOrigin(request);

    let sessionId;
    if (request.get("authorization")) {
      try {
        sessionId = (await authenticateRequest(request)).session.id;
      } catch {
        sessionId = undefined;
      }
    }

    await logout(getRefreshTokenFromCookie(request), sessionId);
    clearRefreshCookie(response);
    return response.status(204).send();
  }),
);

/** Verification d'identite pour le futur dashboard. */
router.get(
  "/me",
  authenticate,
  asyncHandler(async (request, response) => {
    return response.json({ success: true, data: userWithPermissions(request.user) });
  }),
);

/** Modification du profil personnel : nom et email uniquement. */
router.patch(
  "/me",
  authenticate,
  asyncHandler(async (request, response) => {
    const updates = validateProfileUpdate(request.body);
    const updated = await updateUser(request.user.id, updates);
    if (!updated) throw new HttpError(404, "USER_NOT_FOUND", "Utilisateur introuvable.");

    const current = await findPublicUserById(request.user.id);
    return response.json({ success: true, data: userWithPermissions(current) });
  }),
);

/** Changement de mot de passe : toutes les sessions sont revoquees. */
router.post(
  "/change-password",
  authenticate,
  asyncHandler(async (request, response) => {
    const { currentPassword, newPassword } = validateChangePassword(request.body);
    await changePassword(request.user.id, currentPassword, newPassword);
    clearRefreshCookie(response);
    return response.json({
      success: true,
      data: { passwordChanged: true, reconnectRequired: true },
    });
  }),
);

export default router;
