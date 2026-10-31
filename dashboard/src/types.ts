export type UserRole = "ADMIN" | "MARKETING";
export type ProductStatus = "PUBLISHED" | "ARCHIVED";
export type ProductType = "bike" | "part";
export type HomeSection = "homeNew" | "motosHome" | "essentialsHome";

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  canDeleteProducts: boolean;
  permissions: string[];
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ProductSpec {
  label: string;
  value: string;
}

export interface HomeCard {
  surTitre: string;
  titre: string;
  description: string;
  points: string[];
  alt: string;
}

export interface Product {
  id: string;
  type: ProductType;
  name: string;
  brand: string;
  category: string;
  description: string;
  image: string;
  images: string[];
  alt: string;
  specs: ProductSpec[];
  price: string;
  status: ProductStatus;
  homeNew: boolean;
  motosHome: boolean;
  essentialsHome: boolean;
  homeNewOrder: number | null;
  motosHomeOrder: number | null;
  essentialsHomeOrder: number | null;
  homeCard?: HomeCard;
  metadata?: Record<string, unknown>;
}

export interface Pagination {
  total: number;
  limit: number;
  offset: number;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  pagination?: Pagination;
  error?: {
    code?: string;
    message?: string;
    details?: string[];
  };
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

export type Route =
  | { name: "overview" }
  | { name: "products" }
  | { name: "product-new" }
  | { name: "product-edit"; id: string }
  | { name: "home" }
  | { name: "users" }
  | { name: "settings" };
