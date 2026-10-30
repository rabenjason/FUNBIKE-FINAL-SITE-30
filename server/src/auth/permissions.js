export const PERMISSIONS = {
  CATALOG_READ: "catalog:read",
  PRODUCTS_CREATE: "products:create",
  PRODUCTS_UPDATE: "products:update",
  PRODUCTS_PUBLISH: "products:publish",
  PRODUCTS_DELETE: "products:delete",
  USERS_MANAGE: "users:manage",
};

const ALL_PERMISSIONS = Object.values(PERMISSIONS);

const MARKETING_PERMISSIONS = [
  PERMISSIONS.CATALOG_READ,
  PERMISSIONS.PRODUCTS_CREATE,
  PERMISSIONS.PRODUCTS_UPDATE,
  PERMISSIONS.PRODUCTS_PUBLISH,
];

/**
 * Permissions effectives, toujours recalculees cote serveur.
 * ADMIN a tout. MARKETING ne peut supprimer que si canDeleteProducts
 * a ete accorde par un ADMIN.
 */
export function permissionsForUser(user) {
  if (!user) return [];
  if (user.role === "ADMIN") return [...ALL_PERMISSIONS];

  const permissions = [...MARKETING_PERMISSIONS];
  if (user.role === "MARKETING" && user.canDeleteProducts) {
    permissions.push(PERMISSIONS.PRODUCTS_DELETE);
  }
  return permissions;
}

export function hasPermission(user, permission) {
  return permissionsForUser(user).includes(permission);
}

export function userWithPermissions(user) {
  return user ? { ...user, permissions: permissionsForUser(user) } : user;
}
