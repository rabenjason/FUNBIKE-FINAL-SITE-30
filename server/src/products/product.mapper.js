function parseJsonColumn(value, fallback) {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toStringArray(value) {
  const parsed = parseJsonColumn(value, []);
  return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
}

function toSpecs(value) {
  const parsed = parseJsonColumn(value, []);
  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter((spec) => spec && typeof spec.label === "string" && typeof spec.value === "string")
    .map((spec) => ({ label: spec.label, value: spec.value }));
}

function toHomeCard(value) {
  const parsed = parseJsonColumn(value, null);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return undefined;

  return {
    surTitre: typeof parsed.surTitre === "string" ? parsed.surTitre : "",
    titre: typeof parsed.titre === "string" ? parsed.titre : "",
    description: typeof parsed.description === "string" ? parsed.description : "",
    points: Array.isArray(parsed.points) ? parsed.points.filter((point) => typeof point === "string") : [],
    alt: typeof parsed.alt === "string" ? parsed.alt : "",
  };
}

/** Convertit une ligne MySQL en objet Product utilise par le frontend. */
export function rowToProduct(row) {
  const product = {
    id: row.id,
    type: row.product_type,
    name: row.name,
    brand: row.brand,
    category: row.category,
    description: row.description ?? "",
    image: row.image_url,
    images: toStringArray(row.images),
    alt: row.image_alt,
    specs: toSpecs(row.specs),
    price: row.price,
    status: row.status,
    homeNew: Boolean(row.home_new),
    motosHome: Boolean(row.motos_home),
    essentialsHome: Boolean(row.essentials_home),
    homeNewOrder: row.home_new_order,
    motosHomeOrder: row.motos_home_order,
    essentialsHomeOrder: row.essentials_home_order,
  };

  const homeCard = toHomeCard(row.home_card);
  if (homeCard) product.homeCard = homeCard;

  return product;
}

/** Convertit un Product valide en valeurs pretes pour MySQL. */
export function productToRowValues(product) {
  return [
    product.id,
    product.type,
    product.name,
    product.brand,
    product.category,
    product.description,
    product.image,
    JSON.stringify(product.images),
    product.alt,
    JSON.stringify(product.specs),
    product.price,
    product.status,
    product.homeNew ? 1 : 0,
    product.motosHome ? 1 : 0,
    product.essentialsHome ? 1 : 0,
    product.homeNewOrder,
    product.motosHomeOrder,
    product.essentialsHomeOrder,
    product.homeCard ? JSON.stringify(product.homeCard) : null,
  ];
}

export const PRODUCT_COLUMNS = [
  "id",
  "product_type",
  "name",
  "brand",
  "category",
  "description",
  "image_url",
  "images",
  "image_alt",
  "specs",
  "price",
  "status",
  "home_new",
  "motos_home",
  "essentials_home",
  "home_new_order",
  "motos_home_order",
  "essentials_home_order",
  "home_card",
];
