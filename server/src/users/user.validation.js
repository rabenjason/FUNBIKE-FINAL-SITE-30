import { HttpError } from "../utils/http-error.js";

export const USER_ROLES = new Set(["ADMIN", "MARKETING"]);

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cleanString(value, field, { required = false, max = 255 } = {}, errors) {
  if (value === undefined || value === null || value === "") {
    if (required) errors.push(`${field} est obligatoire.`);
    return "";
  }
  if (typeof value !== "string") {
    errors.push(`${field} doit etre une chaine de caracteres.`);
    return "";
  }

  const cleaned = value.trim();
  if (required && !cleaned) errors.push(`${field} est obligatoire.`);
  if (cleaned.length > max) errors.push(`${field} depasse ${max} caracteres.`);
  return cleaned;
}

export function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function validateEmail(value, errors) {
  const email = normalizeEmail(value);
  if (!email) {
    errors.push("email est obligatoire.");
  } else if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("email doit etre une adresse valide.");
  }
  return email;
}

export function validatePassword(value, field = "password", errors) {
  if (typeof value !== "string" || value.length === 0) {
    errors.push(`${field} est obligatoire.`);
    return "";
  }
  if (value.length < 12) errors.push(`${field} doit contenir au moins 12 caracteres.`);
  if (value.length > 72) errors.push(`${field} doit contenir au maximum 72 caracteres.`);
  if (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) {
    errors.push(`${field} doit contenir au moins une lettre et un chiffre.`);
  }
  return value;
}

function cleanBoolean(value, field, errors, fallback = false) {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "boolean") {
    errors.push(`${field} doit etre un booleen.`);
    return fallback;
  }
  return value;
}

function validationError(errors) {
  return new HttpError(400, "VALIDATION_ERROR", "Les donnees utilisateur sont invalides.", errors);
}

export function parseUserId(value) {
  const id = Number.parseInt(String(value), 10);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, "VALIDATION_ERROR", "L'identifiant utilisateur doit etre un entier positif.");
  }
  return id;
}

export function validateCreateUser(body) {
  if (!isPlainObject(body)) {
    throw new HttpError(400, "VALIDATION_ERROR", "Le corps de la requete doit etre un objet JSON.");
  }

  const errors = [];
  const user = {
    name: cleanString(body.name, "name", { required: true, max: 120 }, errors),
    email: validateEmail(body.email, errors),
    password: validatePassword(body.password, "password", errors),
    role: cleanString(body.role ?? "MARKETING", "role", { required: true, max: 20 }, errors),
    canDeleteProducts: cleanBoolean(body.canDeleteProducts, "canDeleteProducts", errors, false),
  };

  if (user.role && !USER_ROLES.has(user.role)) errors.push("role doit valoir 'ADMIN' ou 'MARKETING'.");
  if (errors.length > 0) throw validationError(errors);
  return user;
}

/** Mise a jour par un ADMIN : aucun hash n'est accepte, password est rehache par la route. */
export function validateUpdateUser(body) {
  if (!isPlainObject(body)) {
    throw new HttpError(400, "VALIDATION_ERROR", "Le corps de la requete doit etre un objet JSON.");
  }

  const allowed = ["name", "email", "password", "role", "canDeleteProducts"];
  const provided = allowed.filter((field) => body[field] !== undefined);
  if (provided.length === 0) {
    throw new HttpError(400, "VALIDATION_ERROR", "Aucun champ modifiable n'a ete fourni.");
  }

  const errors = [];
  const updates = {};

  if (body.name !== undefined) updates.name = cleanString(body.name, "name", { required: true, max: 120 }, errors);
  if (body.email !== undefined) updates.email = validateEmail(body.email, errors);
  if (body.password !== undefined) updates.password = validatePassword(body.password, "password", errors);
  if (body.role !== undefined) {
    updates.role = cleanString(body.role, "role", { required: true, max: 20 }, errors);
    if (updates.role && !USER_ROLES.has(updates.role)) errors.push("role doit valoir 'ADMIN' ou 'MARKETING'.");
  }
  if (body.canDeleteProducts !== undefined) {
    updates.canDeleteProducts = cleanBoolean(body.canDeleteProducts, "canDeleteProducts", errors, false);
  }

  if (errors.length > 0) throw validationError(errors);
  return updates;
}

/** Profil personnel : un utilisateur ne peut jamais changer son role ni ses permissions ici. */
export function validateProfileUpdate(body) {
  if (!isPlainObject(body)) {
    throw new HttpError(400, "VALIDATION_ERROR", "Le corps de la requete doit etre un objet JSON.");
  }

  if (body.role !== undefined || body.canDeleteProducts !== undefined || body.password !== undefined) {
    throw new HttpError(
      403,
      "FORBIDDEN_PROFILE_FIELD",
      "Le role, les permissions et le mot de passe ne se modifient pas depuis le profil.",
    );
  }

  if (body.name === undefined && body.email === undefined) {
    throw new HttpError(400, "VALIDATION_ERROR", "Fournissez au moins name ou email.");
  }

  const errors = [];
  const updates = {};
  if (body.name !== undefined) updates.name = cleanString(body.name, "name", { required: true, max: 120 }, errors);
  if (body.email !== undefined) updates.email = validateEmail(body.email, errors);

  if (errors.length > 0) throw validationError(errors);
  return updates;
}

export function validateChangePassword(body) {
  if (!isPlainObject(body)) {
    throw new HttpError(400, "VALIDATION_ERROR", "Le corps de la requete doit etre un objet JSON.");
  }

  const errors = [];
  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  if (!currentPassword) errors.push("currentPassword est obligatoire.");
  const newPassword = validatePassword(body.newPassword, "newPassword", errors);
  if (currentPassword && newPassword && currentPassword === newPassword) {
    errors.push("newPassword doit etre different du mot de passe actuel.");
  }

  if (errors.length > 0) throw validationError(errors);
  return { currentPassword, newPassword };
}

export function validateLogin(body) {
  if (!isPlainObject(body)) {
    throw new HttpError(400, "VALIDATION_ERROR", "Le corps de la requete doit etre un objet JSON.");
  }

  const errors = [];
  const email = validateEmail(body.email, errors);
  const password = typeof body.password === "string" ? body.password : "";
  if (!password) errors.push("password est obligatoire.");
  if (password.length > 72) errors.push("password doit contenir au maximum 72 caracteres.");

  if (errors.length > 0) throw validationError(errors);
  return { email, password };
}

export function parseUserListQuery(query) {
  const errors = [];
  const role = query.role ? String(query.role) : undefined;
  if (role && !USER_ROLES.has(role)) errors.push("role doit valoir 'ADMIN' ou 'MARKETING'.");

  const limit = query.limit === undefined ? 100 : Number.parseInt(String(query.limit), 10);
  const offset = query.offset === undefined ? 0 : Number.parseInt(String(query.offset), 10);
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) errors.push("limit doit etre compris entre 1 et 500.");
  if (!Number.isInteger(offset) || offset < 0) errors.push("offset doit etre un entier positif.");

  if (errors.length > 0) throw validationError(errors);

  return {
    role,
    search: query.search ? String(query.search).trim() : undefined,
    limit,
    offset,
  };
}
