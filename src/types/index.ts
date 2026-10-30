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

export interface Bike {
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
   * Moto favorite de l'accueil : si `true`, la moto est affichée dans la
   * section « Nouveautés / Arrivages ». À gérer uniquement dans `BIKES`
   * (src/data.ts).
   */
  homeFavorite?: boolean;
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

export interface Part {
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
