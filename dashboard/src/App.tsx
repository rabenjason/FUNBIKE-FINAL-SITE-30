import { useCallback, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBoxOpen, faRefresh, faShieldHalved } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "./auth";
import { checkApiHealth, fetchProducts, request } from "./api";
import Layout from "./components/Layout";
import { EmptyState, LOGO_URL } from "./components/ui";
import type { Product, ProductStatus, Route } from "./types";
import HomeSections from "./views/HomeSections";
import Login from "./views/Login";
import Overview from "./views/Overview";
import ProductEditor from "./views/ProductEditor";
import Products from "./views/Products";
import Settings from "./views/Settings";
import Users from "./views/Users";

function parseRoute(): Route {
  const hash = window.location.hash.replace(/^#\/?/, "");
  const [page, id] = hash.split("/");

  if (page === "produits" && id === "nouveau") return { name: "product-new" };
  if (page === "produits" && id) return { name: "product-edit", id: decodeURIComponent(id) };
  if (page === "produits") return { name: "products" };
  if (page === "accueil") return { name: "home" };
  if (page === "utilisateurs") return { name: "users" };
  if (page === "parametres") return { name: "settings" };
  return { name: "overview" };
}

function routeHash(route: Route) {
  switch (route.name) {
    case "products":
      return "#/produits";
    case "product-new":
      return "#/produits/nouveau";
    case "product-edit":
      return `#/produits/${encodeURIComponent(route.id)}`;
    case "home":
      return "#/accueil";
    case "users":
      return "#/utilisateurs";
    case "settings":
      return "#/parametres";
    default:
      return "#/tableau-de-bord";
  }
}

export default function App() {
  const { user, status } = useAuth();

  if (status === "loading") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-fb-ink px-6 text-center text-white">
        <span className="flex h-20 w-20 items-center justify-center rounded-[1.7rem] bg-fb-yellow shadow-[0_24px_50px_rgb(255_209_0/0.25)]">
          <img src={LOGO_URL} alt="FunBike" className="max-h-14 max-w-14 object-contain" />
        </span>
        <p className="font-display mt-5 text-2xl font-bold">FunBike Dashboard</p>
        <p className="mt-2 text-sm text-white/50">Vérification de votre session sécurisée…</p>
        <span className="mt-6 h-1.5 w-44 overflow-hidden rounded-full bg-white/10">
          <span className="block h-full w-1/2 animate-pulse rounded-full bg-fb-yellow" />
        </span>
      </main>
    );
  }

  if (!user) return <Login />;

  return <DashboardShell />;
}

function DashboardShell() {
  const { user } = useAuth();
  const [route, setRoute] = useState<Route>(() => parseRoute());
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [health, setHealth] = useState({ api: false, database: false });

  const navigate = useCallback((nextRoute: Route) => {
    const hash = routeHash(nextRoute);
    if (window.location.hash === hash) {
      setRoute(nextRoute);
    } else {
      window.location.hash = hash;
    }
  }, []);

  useEffect(() => {
    const onHashChange = () => setRoute(parseRoute());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    setProductsError(null);
    try {
      const loaded = await fetchProducts();
      setProducts(loaded);
    } catch (caught) {
      setProductsError(caught instanceof Error ? caught.message : "Le catalogue n’a pas pu être chargé.");
    } finally {
      setProductsLoading(false);
    }
  }, []);

  const refreshHealth = useCallback(async () => {
    setHealth(await checkApiHealth());
  }, []);

  useEffect(() => {
    void loadProducts();
    void refreshHealth();
    const interval = window.setInterval(() => void refreshHealth(), 30000);
    return () => window.clearInterval(interval);
  }, [loadProducts, refreshHealth]);

  const replaceProduct = useCallback((updated: Product) => {
    setProducts((current) => {
      const exists = current.some((product) => product.id === updated.id);
      if (!exists) return [updated, ...current];
      return current.map((product) => (product.id === updated.id ? updated : product));
    });
  }, []);

  const saveProduct = useCallback(
    async (product: Product, mode: "create" | "update") => {
      const payload =
        mode === "create"
          ? await request<Product>("/api/products", { method: "POST", body: JSON.stringify(product) })
          : await request<Product>(`/api/products/${encodeURIComponent(product.id)}`, {
              method: "PATCH",
              body: JSON.stringify(product),
            });
      replaceProduct(payload.data);
      return payload.data;
    },
    [replaceProduct],
  );

  const patchProduct = useCallback(
    async (id: string, patch: Partial<Product>) => {
      const payload = await request<Product>(`/api/products/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      replaceProduct(payload.data);
      return payload.data;
    },
    [replaceProduct],
  );

  const changeProductStatus = useCallback(
    async (product: Product, nextStatus: ProductStatus) => {
      const payload = await request<Product>(`/api/products/${encodeURIComponent(product.id)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      replaceProduct(payload.data);
    },
    [replaceProduct],
  );

  const deleteProduct = useCallback(async (product: Product) => {
    await request<void>(`/api/products/${encodeURIComponent(product.id)}`, { method: "DELETE" });
    setProducts((current) => current.filter((item) => item.id !== product.id));
  }, []);

  const editedProduct = useMemo(
    () => (route.name === "product-edit" ? products.find((product) => product.id === route.id) : undefined),
    [products, route],
  );

  return (
    <Layout route={route} navigate={navigate} health={health}>
      {route.name === "overview" && (
        <Overview products={products} loading={productsLoading} error={productsError} navigate={navigate} onRefresh={() => void loadProducts()} />
      )}

      {route.name === "products" && (
        <Products
          products={products}
          loading={productsLoading}
          error={productsError}
          navigate={navigate}
          onRefresh={() => void loadProducts()}
          onStatusChange={changeProductStatus}
          onDelete={deleteProduct}
        />
      )}

      {route.name === "product-new" && (
        <ProductEditor products={products} navigate={navigate} onSave={saveProduct} />
      )}

      {route.name === "product-edit" &&
        (editedProduct ? (
          <ProductEditor key={editedProduct.id} product={editedProduct} products={products} navigate={navigate} onSave={saveProduct} />
        ) : productsLoading ? (
          <div className="card space-y-3 p-5">
            <div className="skeleton h-10 rounded-2xl" />
            <div className="skeleton h-64 rounded-2xl" />
          </div>
        ) : (
          <section className="card">
            <EmptyState
              icon={faBoxOpen}
              title="Produit introuvable"
              text="Ce produit a peut-être été supprimé, ou le catalogue n’a pas encore été chargé depuis MySQL."
              action={
                <button type="button" className="btn btn-primary" onClick={() => void loadProducts()}>
                  <FontAwesomeIcon icon={faRefresh} />
                  Recharger le catalogue
                </button>
              }
            />
          </section>
        ))}

      {route.name === "home" && (
        <HomeSections products={products} loading={productsLoading} navigate={navigate} onRefresh={() => void loadProducts()} onPatchProduct={patchProduct} />
      )}

      {route.name === "users" &&
        (user?.role === "ADMIN" ? (
          <Users />
        ) : (
          <section className="card">
            <EmptyState
              icon={faShieldHalved}
              title="Accès réservé aux ADMIN"
              text="La gestion des utilisateurs et des rôles est réservée aux administrateurs. Le backend refuserait également ces appels avec votre compte MARKETING."
              action={<button type="button" className="btn btn-primary" onClick={() => navigate({ name: "overview" })}>Retour au tableau de bord</button>}
            />
          </section>
        ))}

      {route.name === "settings" && <Settings />}
    </Layout>
  );
}
