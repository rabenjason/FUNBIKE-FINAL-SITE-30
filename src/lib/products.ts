/**
 * Couche d'accès au catalogue produits FunBike.
 *
 * Modèle cible (futur backend Node.js + MySQL) : UNE seule table
 * `products`, un produit enregistré une seule fois, avec :
 * id, nom, marque, catégorie, description, image principale, images
 * supplémentaires, caractéristiques, tarif, statut (PUBLISHED / ARCHIVED)
 * et trois booléens indépendants de sélection pour l'accueil —
 * `homeNew` (Nouveautés / Arrivages), `motosHome` (section Motos),
 * `essentialsHome` (Atelier / Essentiels) — chacun avec son ordre
 * d'affichage (`homeNewOrder`, `motosHomeOrder`, `essentialsHomeOrder`).
 *
 * Aujourd'hui, il n'y a ni backend ni dashboard : ce module normalise les
 * collections existantes de src/data.ts (BIKES, ALL_PARTS) vers le type
 * `Product`, sans recopier aucune donnée, et expose les opérations
 * attendues par le frontend. Le jour du branchement de l'API REST, seul
 * le corps de ces fonctions changera (fetch vers GET/POST/PUT/DELETE
 * /api/products…) — les composants, qui ne connaissent que ces fonctions,
 * n'auront pas à être réécrits.
 */
import { ALL_PARTS, BIKES, partBrandLabel, partFamily } from "../data";
import type { Bike, HomeSection, Part, Product, ProductStatus } from "../types";

/** Statut appliqué quand la fiche locale ne précise rien. */
const DEFAULT_STATUS: ProductStatus = "PUBLISHED";

/* ------------------------------------------------------------------ */
/* Normalisation des collections existantes vers le modèle Product     */
/* (dérivation pure : aucune donnée n'est recopiée)                    */
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
  };
}

function partToProduct(part: Part): Product {
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
  };
}

/**
 * Catalogue unique normalisé : une ligne par produit (motos + pièces +
 * équipements), dérivé des collections sources de src/data.ts.
 * Aucune fiche produit n'existe en double.
 */
export const PRODUCTS: Product[] = [
  ...BIKES.map(bikeToProduct),
  ...ALL_PARTS.map(partToProduct),
];

/* ------------------------------------------------------------------ */
/* Magasin local en mémoire                                            */
/* Simule la table `products` en attendant l'API : les fonctions CRUD  */
/* ci-dessous y lisent/écrivent, avec les signatures du futur REST.    */
/* ------------------------------------------------------------------ */

let store: Product[] = [...PRODUCTS];

/** Fiches d'origine, pour alimenter les cartes existantes (BikeCard, PartCard). */
const bikeById = new Map(BIKES.map((bike) => [bike.id, bike]));
const partById = new Map(ALL_PARTS.map((part) => [part.id, part]));

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

/* ------------------------------------------------------------------ */
/* Lecture (futur GET /api/products…)                                  */
/* ------------------------------------------------------------------ */

/** Tous les produits, filtrables par statut et/ou section d'accueil. */
export function listProducts(options?: { status?: ProductStatus; section?: HomeSection }): Product[] {
  let result = [...store];
  if (options?.status) result = result.filter((product) => product.status === options.status);
  if (options?.section) {
    const section = options.section;
    result = result
      .filter((product) => isSelected(product, section))
      .sort((a, b) => orderOf(a, section) - orderOf(b, section));
  }
  return result;
}

/** Un produit par son id (futur GET /api/products/:id). */
export function getProductById(id?: string): Product | undefined {
  if (!id) return undefined;
  return store.find((product) => product.id === id);
}

/**
 * Produits d'une section de l'accueil : uniquement les PUBLISHED dont le
 * booléen de la section est `true`, triés par l'ordre de la section.
 * C'est la seule règle d'alimentation des sections Nouveautés, Motos et
 * Atelier / Essentiels.
 */
export function getHomeProducts(section: HomeSection): Product[] {
  return store
    .filter((product) => product.status === DEFAULT_STATUS && isSelected(product, section))
    .sort((a, b) => orderOf(a, section) - orderOf(b, section));
}

/** Motos d'une section d'accueil, prêtes pour les cartes existantes. */
export function getHomeBikes(section: "homeNew" | "motosHome"): Bike[] {
  return getHomeProducts(section).flatMap((product) => {
    const bike = bikeById.get(product.id);
    return bike ? [bike] : [];
  });
}

/** Pièces / équipements d'une section d'accueil, prêts pour les cartes existantes. */
export function getHomeParts(section: "essentialsHome"): Part[] {
  return getHomeProducts(section).flatMap((product) => {
    const part = partById.get(product.id);
    return part ? [part] : [];
  });
}

/* ------------------------------------------------------------------ */
/* Écriture (futurs POST / PUT / DELETE /api/products…)                */
/* Préparé pour le CRUD du futur dashboard : aucun écran ne l'utilise  */
/* encore, les fonctions opèrent sur le magasin local en mémoire.     */
/* ------------------------------------------------------------------ */

/** Ajouter un produit (futur POST /api/products). */
export function createProduct(input: Product): Product {
  store = [...store, input];
  return input;
}

/** Modifier un produit (futur PUT /api/products/:id). */
export function updateProduct(id: string, patch: Partial<Product>): Product | undefined {
  const current = getProductById(id);
  if (!current) return undefined;
  const updated = { ...current, ...patch, id: current.id };
  store = store.map((product) => (product.id === id ? updated : product));
  return updated;
}

/** Supprimer un produit (futur DELETE /api/products/:id). */
export function deleteProduct(id: string): boolean {
  const before = store.length;
  store = store.filter((product) => product.id !== id);
  return store.length !== before;
}

/** Publier ou archiver un produit (futur PATCH /api/products/:id avec { status }). */
export function setProductStatus(id: string, status: ProductStatus): Product | undefined {
  return updateProduct(id, { status });
}
