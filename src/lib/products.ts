/**
 * Couche d'accès au catalogue produits FunBike.
 *
 * Le site est relié au serveur Node.js + MySQL :
 *
 * 1. Au premier rendu, le catalogue local actuel sert d'affichage immédiat
 *    et de secours si l'API est momentanément inaccessible.
 * 2. Le hook `useProductCatalog()` charge ensuite les produits PUBLISHED
 *    depuis `GET /api/products`. Dès que l'API répond, ses produits
 *    remplacent l'affichage : les ajouts, modifications, publications,
 *    archivages et suppressions faits par le CRUD deviennent visibles
 *    sans reconstruire le site.
 * 3. Pour remplir MySQL au départ, les produits locaux normalisés dans
 *    `PRODUCTS` sont fournis au serveur dans
 *    `server/database/seed-products.json` (`npm run db:seed`).
 *
 * En développement, Vite transmet `/api` au serveur local (voir
 * `vite.config.ts`). En production, on peut définir `VITE_API_URL`
 * avec l'adresse publique de l'API.
 */
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { ALL_PARTS, BIKES, partBrandLabel, partFamily } from "../data";
import type {
  AccessoryCategory,
  AccessoryKind,
  Bike,
  BikeFamily,
  CompatibleBrand,
  HomeSection,
  Part,
  PartType,
  Product,
  ProductStatus,
} from "../types";

/** Statut appliqué quand la fiche locale ne précise rien. */
const DEFAULT_STATUS: ProductStatus = "PUBLISHED";

const API_BASE_URL = (
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_API_URL ?? ""
).replace(/\/$/, "");

function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

/** Les images televersees sont stockees sous /uploads sur l'API. */
function resolveProductImage(url: string): string {
  return url.startsWith("/uploads/") && API_BASE_URL ? `${API_BASE_URL}${url}` : url;
}

/* ------------------------------------------------------------------ */
/* Normalisation des collections locales vers le modèle Product        */
/* Ces objets servent d'affichage initial, de secours et de seed MySQL. */
/* ------------------------------------------------------------------ */

function bikeToProduct(bike: Bike): Product {
  return {
    id: bike.id,
    type: "bike",
    name: bike.name,
    brand: bike.brand,
    category: bike.family,
    description: bike.desc,
    image: bike.image,
    images: bike.gallery ?? [bike.image],
    alt: bike.alt,
    specs: bike.specs,
    price: bike.price,
    status: bike.status ?? DEFAULT_STATUS,
    homeNew: bike.homeNew ?? false,
    motosHome: bike.motosHome ?? false,
    essentialsHome: bike.essentialsHome ?? false,
    homeNewOrder: bike.homeNewOrder ?? null,
    motosHomeOrder: bike.motosHomeOrder ?? null,
    essentialsHomeOrder: bike.essentialsHomeOrder ?? null,
    homeCard: bike.homeCard,
    metadata: bike.tag ? { tag: bike.tag } : undefined,
  };
}

function partToProduct(part: Part): Product {
  const metadata: Record<string, unknown> = { kind: part.kind };
  if (part.category !== undefined) metadata.category = part.category;
  if (part.compatibleBrand !== undefined) metadata.compatibleBrand = part.compatibleBrand;
  if (part.partType !== undefined) metadata.partType = part.partType;
  if (part.sourceUrl !== undefined) metadata.sourceUrl = part.sourceUrl;

  return {
    id: part.id,
    type: "part",
    name: part.name,
    brand: partBrandLabel(part),
    category: part.category ?? part.partType ?? partFamily(part),
    description: part.desc ?? "",
    image: part.image,
    images: part.gallery ?? [part.image],
    alt: part.name,
    specs: part.specs ?? [],
    price: part.price,
    status: part.status ?? DEFAULT_STATUS,
    homeNew: part.homeNew ?? false,
    motosHome: part.motosHome ?? false,
    essentialsHome: part.essentialsHome ?? false,
    homeNewOrder: part.homeNewOrder ?? null,
    motosHomeOrder: part.motosHomeOrder ?? null,
    essentialsHomeOrder: part.essentialsHomeOrder ?? null,
    metadata,
  };
}

/**
 * Catalogue local normalisé : une ligne par produit.
 * Il sert à générer le seed MySQL initial et d'affichage de secours ;
 * quand l'API est disponible, c'est elle qui fait foi.
 */
export const PRODUCTS: Product[] = [
  ...BIKES.map(bikeToProduct),
  ...ALL_PARTS.map(partToProduct),
];

/* ------------------------------------------------------------------ */
/* Conversion des produits API vers les objets attendus par les cartes */
/* ------------------------------------------------------------------ */

const BIKE_FAMILIES: BikeFamily[] = ["Off-road", "Urbain", "3 roues"];
const ACCESSORY_CATEGORIES: AccessoryCategory[] = ["Casques", "Blousons", "Gants", "Bottes", "Pièces"];
const ACCESSORY_KINDS: AccessoryKind[] = ["piece", "tld", "gaerne", "mt", "tvs"];
const COMPATIBLE_BRANDS: CompatibleBrand[] = ["Universal", "TVS", "Sherco", "Fantic"];
const PART_TYPES: PartType[] = [
  "Pneus",
  "Freinage",
  "Transmission",
  "Filtration",
  "Pièces moteur",
  "Consommables",
];

function metadataString(product: Product, key: string): string | undefined {
  const value = product.metadata?.[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function productManagement(product: Product) {
  return {
    status: product.status,
    homeNew: product.homeNew,
    motosHome: product.motosHome,
    essentialsHome: product.essentialsHome,
    homeNewOrder: product.homeNewOrder ?? undefined,
    motosHomeOrder: product.motosHomeOrder ?? undefined,
    essentialsHomeOrder: product.essentialsHomeOrder ?? undefined,
  };
}

export function productToBike(product: Product): Bike | undefined {
  if (product.type !== "bike") return undefined;

  return {
    id: product.id,
    name: product.name,
    brand: product.brand,
    family: BIKE_FAMILIES.includes(product.category as BikeFamily)
      ? (product.category as BikeFamily)
      : "Urbain",
    price: product.price,
    tag: metadataString(product, "tag"),
    alt: product.alt,
    image: resolveProductImage(product.image),
    gallery: (product.images.length > 0 ? product.images : [product.image]).map(resolveProductImage),
    specs: product.specs,
    desc: product.description,
    homeCard: product.homeCard,
    ...productManagement(product),
  };
}

function inferPartKind(product: Product): AccessoryKind {
  if (product.brand === "Troy Lee Designs") return "tld";
  if (product.brand === "Gaerne") return "gaerne";
  if (product.brand === "MT Helmets") return "mt";
  if (product.brand === "TVS" && ACCESSORY_CATEGORIES.includes(product.category as AccessoryCategory)) {
    return "tvs";
  }
  return "piece";
}

export function productToPart(product: Product): Part | undefined {
  if (product.type !== "part") return undefined;

  const kindValue = metadataString(product, "kind");
  const categoryValue = metadataString(product, "category") ?? product.category;
  const compatibleValue = metadataString(product, "compatibleBrand");
  const partTypeValue = metadataString(product, "partType");

  return {
    id: product.id,
    name: product.name,
    price: product.price,
    image: resolveProductImage(product.image),
    kind: ACCESSORY_KINDS.includes(kindValue as AccessoryKind)
      ? (kindValue as AccessoryKind)
      : inferPartKind(product),
    category: ACCESSORY_CATEGORIES.includes(categoryValue as AccessoryCategory)
      ? (categoryValue as AccessoryCategory)
      : undefined,
    compatibleBrand: COMPATIBLE_BRANDS.includes(compatibleValue as CompatibleBrand)
      ? (compatibleValue as CompatibleBrand)
      : undefined,
    partType: PART_TYPES.includes(partTypeValue as PartType) ? (partTypeValue as PartType) : undefined,
    sourceUrl: metadataString(product, "sourceUrl"),
    gallery: (product.images.length > 0 ? product.images : [product.image]).map(resolveProductImage),
    desc: product.description || undefined,
    specs: product.specs,
    ...productManagement(product),
  };
}

/* ------------------------------------------------------------------ */
/* Magasin du catalogue : local au départ, API dès qu'elle répond      */
/* ------------------------------------------------------------------ */

export type ProductCatalogSource = "local" | "api";

export interface ProductCatalogSnapshot {
  products: Product[];
  bikes: Bike[];
  parts: Part[];
  source: ProductCatalogSource;
  loading: boolean;
  error: string | null;
}

function buildSnapshot(
  products: Product[],
  source: ProductCatalogSource,
  loading: boolean,
  error: string | null,
): ProductCatalogSnapshot {
  return {
    products,
    bikes: products.flatMap((product) => {
      const bike = productToBike(product);
      return bike ? [bike] : [];
    }),
    parts: products.flatMap((product) => {
      const part = productToPart(product);
      return part ? [part] : [];
    }),
    source,
    loading,
    error,
  };
}

let catalogSnapshot = buildSnapshot(PRODUCTS, "local", false, null);
const listeners = new Set<() => void>();
let loadPromise: Promise<ProductCatalogSnapshot> | null = null;

const localOrder = new Map(PRODUCTS.map((product, index) => [product.id, index]));

function sortLikeCurrentSite(products: Product[]): Product[] {
  return [...products].sort((a, b) => {
    const orderA = localOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const orderB = localOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    return a.name.localeCompare(b.name, "fr");
  });
}

function notifyCatalogChanged() {
  listeners.forEach((listener) => listener());
}

function subscribeToCatalog(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getProductCatalogSnapshot(): ProductCatalogSnapshot {
  return catalogSnapshot;
}

export function getCatalogBikes(): Bike[] {
  return catalogSnapshot.bikes;
}

export function getCatalogParts(): Part[] {
  return catalogSnapshot.parts;
}

function replaceCatalog(products: Product[], source: ProductCatalogSource, error: string | null = null) {
  catalogSnapshot = buildSnapshot(products, source, false, error);
  notifyCatalogChanged();
  return catalogSnapshot;
}

function upsertCatalogProduct(product: Product) {
  if (product.status !== DEFAULT_STATUS) {
    replaceCatalog(
      catalogSnapshot.products.filter((item) => item.id !== product.id),
      catalogSnapshot.source,
    );
    return;
  }

  const exists = catalogSnapshot.products.some((item) => item.id === product.id);
  const products = exists
    ? catalogSnapshot.products.map((item) => (item.id === product.id ? product : item))
    : sortLikeCurrentSite([...catalogSnapshot.products, product]);
  replaceCatalog(products, catalogSnapshot.source);
}

function removeCatalogProduct(id: string) {
  replaceCatalog(
    catalogSnapshot.products.filter((product) => product.id !== id),
    catalogSnapshot.source,
  );
}

/* ------------------------------------------------------------------ */
/* Chargement depuis l'API REST                                        */
/* ------------------------------------------------------------------ */

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  error?: { message?: string };
};

async function readApiEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error?.message ?? `API indisponible (${response.status}).`);
  }
  return payload;
}

/** Charge (ou recharge) le catalogue publié depuis le serveur. */
export function loadProductCatalog(force = false): Promise<ProductCatalogSnapshot> {
  if (loadPromise && !force) return loadPromise;
  if (catalogSnapshot.source === "api" && !force) return Promise.resolve(catalogSnapshot);

  catalogSnapshot = { ...catalogSnapshot, loading: true, error: null };
  notifyCatalogChanged();

  loadPromise = (async () => {
    try {
      const response = await fetch(apiUrl("/api/products?status=PUBLISHED&limit=500"), {
        headers: { Accept: "application/json" },
      });
      const payload = await readApiEnvelope<Product[]>(response);
      if (!Array.isArray(payload.data)) throw new Error("Réponse produits invalide.");

      return replaceCatalog(sortLikeCurrentSite(payload.data), "api");
    } catch (error) {
      catalogSnapshot = {
        ...catalogSnapshot,
        loading: false,
        error: error instanceof Error ? error.message : "API indisponible.",
      };
      notifyCatalogChanged();
      return catalogSnapshot;
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
}

export function refreshProductCatalog(): Promise<ProductCatalogSnapshot> {
  return loadProductCatalog(true);
}

/**
 * Catalogue produits du site. Le premier rendu utilise les données
 * locales actuelles ; dès que l'API répond, l'affichage bascule sur
 * les produits stockés dans MySQL.
 */
export function useProductCatalog(): ProductCatalogSnapshot {
  const snapshot = useSyncExternalStore(
    subscribeToCatalog,
    getProductCatalogSnapshot,
    getProductCatalogSnapshot,
  );

  useEffect(() => {
    void loadProductCatalog();
  }, []);

  return snapshot;
}

/* ------------------------------------------------------------------ */
/* Sélecteurs utilisés par les pages et composants                     */
/* ------------------------------------------------------------------ */

function isSelected(product: Product, section: HomeSection): boolean {
  if (section === "homeNew") return product.homeNew;
  if (section === "motosHome") return product.motosHome;
  return product.essentialsHome;
}

function orderOf(product: Product, section: HomeSection): number {
  const order =
    section === "homeNew"
      ? product.homeNewOrder
      : section === "motosHome"
        ? product.motosHomeOrder
        : product.essentialsHomeOrder;
  return order ?? Number.MAX_SAFE_INTEGER;
}

export function getHomeProducts(
  section: HomeSection,
  products: Product[] = catalogSnapshot.products,
): Product[] {
  return products
    .filter((product) => product.status === DEFAULT_STATUS && isSelected(product, section))
    .sort((a, b) => orderOf(a, section) - orderOf(b, section));
}

export function getHomeBikes(
  section: "homeNew" | "motosHome",
  snapshot: ProductCatalogSnapshot = catalogSnapshot,
): Bike[] {
  const bikesById = new Map(snapshot.bikes.map((bike) => [bike.id, bike]));
  return getHomeProducts(section, snapshot.products).flatMap((product) => {
    const bike = bikesById.get(product.id);
    return bike ? [bike] : [];
  });
}

export function getHomeParts(
  section: "essentialsHome",
  snapshot: ProductCatalogSnapshot = catalogSnapshot,
): Part[] {
  const partsById = new Map(snapshot.parts.map((part) => [part.id, part]));
  return getHomeProducts(section, snapshot.products).flatMap((product) => {
    const part = partsById.get(product.id);
    return part ? [part] : [];
  });
}

export function useHomeBikes(section: "homeNew" | "motosHome"): Bike[] {
  const snapshot = useProductCatalog();
  return useMemo(() => getHomeBikes(section, snapshot), [section, snapshot]);
}

export function useHomeParts(section: "essentialsHome"): Part[] {
  const snapshot = useProductCatalog();
  return useMemo(() => getHomeParts(section, snapshot), [section, snapshot]);
}

/** Tous les produits du catalogue courant, filtrables par statut et/ou section. */
export function listProducts(options?: { status?: ProductStatus; section?: HomeSection }): Product[] {
  let result = [...catalogSnapshot.products];
  if (options?.status) result = result.filter((product) => product.status === options.status);
  if (options?.section) {
    const section = options.section;
    result = result
      .filter((product) => isSelected(product, section))
      .sort((a, b) => orderOf(a, section) - orderOf(b, section));
  }
  return result;
}

/** Un produit par son id, dans le catalogue courant. */
export function getProductById(id?: string): Product | undefined {
  if (!id) return undefined;
  return catalogSnapshot.products.find((product) => product.id === id);
}

/* ------------------------------------------------------------------ */
/* CRUD via l'API REST (jeton du futur dashboard ou ADMIN_API_KEY)     */
/* ------------------------------------------------------------------ */

export interface ProductRequestOptions {
  accessToken?: string;
  apiKey?: string;
}

async function productRequest<T>(
  path: string,
  init: RequestInit,
  options: ProductRequestOptions = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body) headers.set("Content-Type", "application/json");
  if (options.accessToken) headers.set("Authorization", `Bearer ${options.accessToken}`);
  if (options.apiKey) headers.set("x-api-key", options.apiKey);

  const response = await fetch(apiUrl(path), { ...init, headers });
  if (response.status === 204) return undefined as T;

  const payload = await readApiEnvelope<T>(response);
  return payload.data;
}

/** Ajouter un produit dans MySQL via POST /api/products. */
export async function createProduct(
  input: Product,
  options: ProductRequestOptions = {},
): Promise<Product> {
  const product = await productRequest<Product>(
    "/api/products",
    { method: "POST", body: JSON.stringify(input) },
    options,
  );
  upsertCatalogProduct(product);
  return product;
}

/** Modifier un produit via PATCH /api/products/:id. */
export async function updateProduct(
  id: string,
  patch: Partial<Product>,
  options: ProductRequestOptions = {},
): Promise<Product> {
  const product = await productRequest<Product>(
    `/api/products/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(patch) },
    options,
  );
  upsertCatalogProduct(product);
  return product;
}

/** Supprimer un produit via DELETE /api/products/:id. */
export async function deleteProduct(
  id: string,
  options: ProductRequestOptions = {},
): Promise<boolean> {
  await productRequest<void>(`/api/products/${encodeURIComponent(id)}`, { method: "DELETE" }, options);
  removeCatalogProduct(id);
  return true;
}

/** Publier ou archiver via PATCH /api/products/:id/status. */
export async function setProductStatus(
  id: string,
  status: ProductStatus,
  options: ProductRequestOptions = {},
): Promise<Product> {
  const product = await productRequest<Product>(
    `/api/products/${encodeURIComponent(id)}/status`,
    { method: "PATCH", body: JSON.stringify({ status }) },
    options,
  );
  upsertCatalogProduct(product);
  return product;
}
