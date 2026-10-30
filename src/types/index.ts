/**
 * Types des données dynamiques FunBike.
 *
 * Ces interfaces décrivent uniquement la structure des contenus susceptibles
 * d'évoluer (catalogue, marques, catégories, revendeurs, bannières, blog).
 * Elles ne créent ni API, ni backend, ni base de données.
 */
import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";

export interface Brand {
  name: string;
  src: string;
}

export interface Category {
  title: string;
  desc: string;
  src: string;
  to: string;
  brand?: string;
}

export interface BikeSpec {
  label: string;
  value: string;
}

export type BikeFamily = "Off-road" | "Urbain" | "3 roues";

/** Statut de publication d'un produit (future colonne `status` de la table `products`). */
export type ProductStatus = "PUBLISHED" | "ARCHIVED";

/** Sections de la page d'accueil alimentées par le catalogue produits. */
export type HomeSection = "homeNew" | "motosHome" | "essentialsHome";

/**
 * Champs de gestion d'un produit, communs à toutes les fiches (motos,
 * pièces, équipements) — ils préparent la future table MySQL `products` :
 * un statut de publication, trois booléens indépendants de sélection pour
 * l'accueil (`homeNew`, `motosHome`, `essentialsHome`) et un ordre
 * d'affichage propre à chaque section. Tous optionnels dans les données
 * locales : valeurs par défaut `PUBLISHED` et `false` (voir src/lib/products.ts).
 */
export interface ProductManagement {
  status?: ProductStatus;
  homeNew?: boolean;
  motosHome?: boolean;
  essentialsHome?: boolean;
  homeNewOrder?: number;
  motosHomeOrder?: number;
  essentialsHomeOrder?: number;
}

/**
 * Présentation d'une moto dans la section « Nouveautés / Arrivages » de
 * l'accueil (sur-titre, titre court, description courte, points forts).
 * Elle fait partie de la fiche de la moto dans `BIKES` (src/data.ts) :
 * ce n'est pas une copie de la moto, juste son habillage pour la carte
 * d'accueil, conservé au même endroit que ses autres informations.
 */
export interface BikeHomeCard {
  surTitre: string;
  titre: string;
  description: string;
  points: string[];
  alt: string;
}

export interface Bike extends ProductManagement {
  id: string;
  name: string;
  brand: string;
  family: BikeFamily;
  price: string;
  tag?: string;
  alt: string;
  image: string;
  gallery?: string[];
  specs: BikeSpec[];
  desc: string;
  /**
   * Textes de la carte d'accueil (rendu court : sur-titre, titre court,
   * description courte, 3 points forts). Rangés dans cette fiche, jamais
   * dans content.ts. Si absent, la carte est générée depuis `brand`,
   * `family`, `name`, `desc` et `specs` de la fiche.
   */
  homeCard?: BikeHomeCard;
}

/** Alias explicite pour les futurs usages métier. */
export type Motorcycle = Bike;

export type AccessoryCategory = "Casques" | "Blousons" | "Gants" | "Bottes" | "Pièces";
export type PartType = "Pneus" | "Freinage" | "Transmission" | "Filtration" | "Pièces moteur" | "Consommables";
export type AccessoryKind = "piece" | "tld" | "gaerne" | "mt" | "tvs";
export type CompatibleBrand = "Universal" | "TVS" | "Sherco" | "Fantic";

export interface Part extends ProductManagement {
  id: string;
  name: string;
  price: string;
  image: string;
  kind: AccessoryKind;
  category?: AccessoryCategory;
  compatibleBrand?: CompatibleBrand;
  partType?: PartType;
  sourceUrl?: string;
  /** Galerie optionnelle — si absente, la fiche détail utilise [image]. */
  gallery?: string[];
  /** Courte description — sinon générée automatiquement dans la fiche. */
  desc?: string;
  /** Caractéristiques — sinon générées automatiquement dans la fiche. */
  specs?: BikeSpec[];
}

/** Alias explicite pour les équipements et pièces. */
export type AccessoryProduct = Part;

/**
 * Produit unique du catalogue — aligné sur la future table MySQL
 * `products` (une seule ligne par produit, jamais dupliqué) :
 * id, nom (`name`), marque (`brand`), catégorie (`category`),
 * description, image principale (`image`), images supplémentaires
 * (`images`), caractéristiques (`specs`), tarif (`price`),
 * statut (`status` : PUBLISHED / ARCHIVED) et sélection accueil
 * (`homeNew`, `motosHome`, `essentialsHome` + ordre par section).
 * En attendant le backend, ce type est produit par normalisation des
 * collections existantes dans src/lib/products.ts — les composants ne
 * liront que ce modèle le jour du branchement de l'API REST.
 */
export interface Product {
  id: string;
  /** Origine de la fiche dans le catalogue actuel (discriminateur interne). */
  type: "bike" | "part";
  name: string;
  brand: string;
  category: string;
  description: string;
  /** Image principale. */
  image: string;
  /** Toutes les images, principale en premier. */
  images: string[];
  /** Texte alternatif de l'image principale. */
  alt: string;
  specs: BikeSpec[];
  price: string;
  status: ProductStatus;
  homeNew: boolean;
  motosHome: boolean;
  essentialsHome: boolean;
  homeNewOrder: number | null;
  motosHomeOrder: number | null;
  essentialsHomeOrder: number | null;
  /** Textes courts de la carte « Nouveautés / Arrivages » (motos uniquement). */
  homeCard?: BikeHomeCard;
}

export interface ExclusiveBrand {
  key: string;
  name: string;
  tagline: string;
  image: string;
}

export type AccessoryBrandKey = "tld" | "gaerne" | "mt" | "tvs" | "bihr";

export interface AccessoryBrand {
  key: AccessoryBrandKey;
  name: string;
  logo?: string;
  icon?: IconDefinition;
  alt: string;
}

export interface FeaturedBike {
  id: string;
  short: string;
  brand: string;
  tag: string;
  image: string;
  alt: string;
}

export interface Dealer {
  key: string;
  city: string;
  name: string;
  kind: string;
  address: string;
  hours: string;
  phone: string;
  email: string;
  desc: string;
  lat: number;
  lon: number;
  services: string[];
  /** Image du point de vente (URL) — laisser vide si aucun visuel. Gérée dans `REVENDEURS` (src/data.ts). */
  image?: string;
  /** Logo du revendeur (URL) — laisser vide si aucun logo. Géré dans `REVENDEURS` (src/data.ts). */
  logo?: string;
}

export interface Banner {
  id: string;
  eyebrow?: string;
  title: string;
  description?: string;
  image: string;
  alt: string;
  targetPage: string;
  targetId?: string;
}

export interface Promotion extends Banner {
  badge?: string;
}

export interface BlogArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string;
  coverAlt: string;
  publishedAt: string;
  category?: string;
  tags?: string[];
}
