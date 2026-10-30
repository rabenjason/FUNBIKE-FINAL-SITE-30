import { HttpError } from "../utils/http-error.js";

export const PRODUCT_TYPES = new Set(["bike", "part"]);
export const PRODUCT_STATUSES = new Set(["PUBLISHED", "ARCHIVED"]);
export const HOME_SECTIONS = {
  homeNew: { flag: "home_new", order: "home_new_order" },
  motosHome: { flag: "motos_home", order: "motos_home_order" },
  essentialsHome: { flag: "essentials_home", order: "essentials_home_order" },
};

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cleanString(value, field, { required = false, max = 2048 } = {}, errors) {
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

function cleanBoolean(value, field, errors) {
  if (value === undefined || value === null) return false;
  if (typeof value !== "boolean") {
    errors.push(`${field} doit etre un booleen.`);
    return false;
  }
  return value;
}

function cleanOrder(value, field, errors) {
  if (value === undefined || value === null || value === "") return null;
  if (!Number.isInteger(value) || value < 0) {
    errors.push(`${field} doit etre un entier positif ou null.`);
    return null;
  }
  return value;
}

function cleanStringArray(value, field, errors, fallback = []) {
  if (value === undefined || value === null) return fallback;
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    errors.push(`${field} doit etre un tableau de chaines de caracteres.`);
    return fallback;
  }
  return value.map((item) => item.trim()).filter(Boolean);
}

function cleanSpecs(value, errors) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    errors.push("specs doit etre un tableau de caracteristiques { label, value }.");
    return [];
  }

  return value.map((spec, index) => {
    if (!isPlainObject(spec)) {
      errors.push(`specs[${index}] doit etre un objet { label, value }.`);
      return { label: "", value: "" };
    }

    return {
      label: cleanString(spec.label, `specs[${index}].label`, { required: true, max: 150 }, errors),
      value: cleanString(spec.value, `specs[${index}].value`, { required: true, max: 500 }, errors),
    };
  });
}

function cleanMetadata(value, errors) {
  if (value === undefined || value === null) return undefined;
  if (!isPlainObject(value)) {
    errors.push("metadata doit etre un objet JSON ou null.");
    return undefined;
  }

  try {
    const serialized = JSON.stringify(value);
    if (serialized.length > 10000) errors.push("metadata depasse 10000 caracteres.");
    return JSON.parse(serialized);
  } catch {
    errors.push("metadata doit etre serialisable en JSON.");
    return undefined;
  }
}

function cleanHomeCard(value, errors) {
  if (value === undefined || value === null) return undefined;
  if (!isPlainObject(value)) {
    errors.push("homeCard doit etre un objet ou null.");
    return undefined;
  }

  return {
    surTitre: cleanString(value.surTitre, "homeCard.surTitre", { max: 255 }, errors),
    titre: cleanString(value.titre, "homeCard.titre", { max: 255 }, errors),
    description: cleanString(value.description, "homeCard.description", { max: 1000 }, errors),
    points: cleanStringArray(value.points, "homeCard.points", errors),
    alt: cleanString(value.alt, "homeCard.alt", { max: 500 }, errors),
  };
}

function validationError(errors) {
  return new HttpError(400, "VALIDATION_ERROR", "Les donnees du produit sont invalides.", errors);
}

/**
 * Normalise un produit complet pour POST et PUT.
 * Le format d'entree/sortie est exactement celui du type Product du frontend.
 */
export function validateProductPayload(body, { pathId = undefined } = {}) {
  if (!isPlainObject(body)) {
    throw new HttpError(400, "VALIDATION_ERROR", "Le corps de la requete doit etre un objet JSON.");
  }

  const errors = [];
  const id = cleanString(pathId ?? body.id, "id", { required: true, max: 100 }, errors);

  if (id && !/^[A-Za-z0-9_-]+$/.test(id)) {
    errors.push("id ne doit contenir que des lettres, chiffres, tirets et underscores.");
  }
  if (pathId && body.id !== undefined && body.id !== pathId) {
    errors.push("id du corps ne correspond pas a l'id de l'URL.");
  }

  const type = cleanString(body.type ?? "part", "type", { required: true, max: 20 }, errors);
  if (type && !PRODUCT_TYPES.has(type)) errors.push("type doit valoir 'bike' ou 'part'.");

  const status = cleanString(body.status ?? "PUBLISHED", "status", { required: true, max: 20 }, errors);
  if (status && !PRODUCT_STATUSES.has(status)) errors.push("status doit valoir 'PUBLISHED' ou 'ARCHIVED'.");

  const image = cleanString(body.image, "image", { required: true }, errors);
  let images = cleanStringArray(body.images, "images", errors);
  if (images.length === 0 && image) images = [image];
  if (image && !images.includes(image)) images = [image, ...images];

  const product = {
    id,
    type,
    name: cleanString(body.name, "name", { required: true, max: 255 }, errors),
    brand: cleanString(body.brand, "brand", { required: true, max: 150 }, errors),
    category: cleanString(body.category, "category", { required: true, max: 150 }, errors),
    description: cleanString(body.description, "description", { max: 10000 }, errors),
    image,
    images,
    alt: cleanString(body.alt, "alt", { max: 500 }, errors),
    specs: cleanSpecs(body.specs, errors),
    price: cleanString(body.price, "price", { required: true, max: 100 }, errors),
    status,
    homeNew: cleanBoolean(body.homeNew, "homeNew", errors),
    motosHome: cleanBoolean(body.motosHome, "motosHome", errors),
    essentialsHome: cleanBoolean(body.essentialsHome, "essentialsHome", errors),
    homeNewOrder: cleanOrder(body.homeNewOrder, "homeNewOrder", errors),
    motosHomeOrder: cleanOrder(body.motosHomeOrder, "motosHomeOrder", errors),
    essentialsHomeOrder: cleanOrder(body.essentialsHomeOrder, "essentialsHomeOrder", errors),
  };

  const homeCard = cleanHomeCard(body.homeCard, errors);
  if (homeCard) product.homeCard = homeCard;

  const metadata = cleanMetadata(body.metadata, errors);
  if (metadata && Object.keys(metadata).length > 0) product.metadata = metadata;

  if (errors.length > 0) throw validationError(errors);
  return product;
}

export function validateStatusPayload(body) {
  if (!isPlainObject(body) || !PRODUCT_STATUSES.has(body.status)) {
    throw new HttpError(400, "VALIDATION_ERROR", "status doit valoir 'PUBLISHED' ou 'ARCHIVED'.");
  }
  return body.status;
}

export function parseProductListQuery(query) {
  const errors = [];
  const status = query.status ? String(query.status) : undefined;
  const type = query.type ? String(query.type) : undefined;
  const section = query.section ? String(query.section) : undefined;

  if (status && !PRODUCT_STATUSES.has(status)) errors.push("status doit valoir 'PUBLISHED' ou 'ARCHIVED'.");
  if (type && !PRODUCT_TYPES.has(type)) errors.push("type doit valoir 'bike' ou 'part'.");
  if (section && !HOME_SECTIONS[section]) {
    errors.push("section doit valoir 'homeNew', 'motosHome' ou 'essentialsHome'.");
  }

  const limit = query.limit === undefined ? 100 : Number.parseInt(String(query.limit), 10);
  const offset = query.offset === undefined ? 0 : Number.parseInt(String(query.offset), 10);

  if (!Number.isInteger(limit) || limit < 1 || limit > 500) errors.push("limit doit etre compris entre 1 et 500.");
  if (!Number.isInteger(offset) || offset < 0) errors.push("offset doit etre un entier positif.");

  if (errors.length > 0) throw validationError(errors);

  return {
    status,
    type,
    section,
    search: query.search ? String(query.search).trim() : undefined,
    limit,
    offset,
  };
}
