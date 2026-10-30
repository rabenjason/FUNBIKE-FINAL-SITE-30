function formatDate(value) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

/**
 * Convertit une ligne users en objet public.
 * Le hash du mot de passe n'est volontairement jamais expose.
 */
export function rowToUser(row) {
  if (!row) return undefined;

  return {
    id: Number(row.id),
    name: row.name,
    email: row.email,
    role: row.role,
    canDeleteProducts: Boolean(row.can_delete_products),
    createdAt: formatDate(row.created_at),
    updatedAt: formatDate(row.updated_at),
  };
}
