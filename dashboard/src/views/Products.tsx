import { useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArchive,
  faBoxOpen,
  faEye,
  faFilter,
  faPen,
  faPlus,
  faRefresh,
  faSearch,
  faTrash,
  faUpload,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../auth";
import { resolveApiAssetUrl } from "../api";
import type { Product, ProductStatus, Route } from "../types";
import { ConfirmDialog, EmptyState, StatusBadge, useToast } from "../components/ui";

const PAGE_SIZE = 10;

type StatusFilter = ProductStatus | "ALL";
type TypeFilter = Product["type"] | "ALL";
type SectionFilter = "ALL" | "homeNew" | "motosHome" | "essentialsHome" | "NONE";

export default function Products({
  products,
  loading,
  error,
  navigate,
  onRefresh,
  onStatusChange,
  onDelete,
}: {
  products: Product[];
  loading: boolean;
  error: string | null;
  navigate: (route: Route) => void;
  onRefresh: () => void;
  onStatusChange: (product: Product, status: ProductStatus) => Promise<void>;
  onDelete: (product: Product) => Promise<void>;
}) {
  const { hasPermission } = useAuth();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [type, setType] = useState<TypeFilter>("ALL");
  const [section, setSection] = useState<SectionFilter>("ALL");
  const [brand, setBrand] = useState("ALL");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const brands = useMemo(() => Array.from(new Set(products.map((product) => product.brand))).sort((a, b) => a.localeCompare(b, "fr")), [products]);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("fr");
    return products.filter((product) => {
      if (status !== "ALL" && product.status !== status) return false;
      if (type !== "ALL" && product.type !== type) return false;
      if (brand !== "ALL" && product.brand !== brand) return false;
      if (section === "homeNew" && !product.homeNew) return false;
      if (section === "motosHome" && !product.motosHome) return false;
      if (section === "essentialsHome" && !product.essentialsHome) return false;
      if (section === "NONE" && (product.homeNew || product.motosHome || product.essentialsHome)) return false;
      if (!term) return true;
      return [product.id, product.name, product.brand, product.category].some((value) => value.toLocaleLowerCase("fr").includes(term));
    });
  }, [products, search, status, type, section, brand]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const resetPage = () => setPage(1);

  async function toggleStatus(product: Product) {
    const nextStatus = product.status === "PUBLISHED" ? "ARCHIVED" : "PUBLISHED";
    setBusyId(product.id);
    try {
      await onStatusChange(product, nextStatus);
      toast.success(nextStatus === "PUBLISHED" ? "Produit publié" : "Produit archivé", product.name);
    } catch (caught) {
      toast.error("Action impossible", caught instanceof Error ? caught.message : undefined);
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!productToDelete) return;
    setBusyId(productToDelete.id);
    try {
      await onDelete(productToDelete);
      toast.success("Produit supprimé", productToDelete.name);
      setProductToDelete(null);
    } catch (caught) {
      toast.error("Suppression impossible", caught instanceof Error ? caught.message : undefined);
    } finally {
      setBusyId(null);
    }
  }

  const canCreate = hasPermission("products:create");
  const canUpdate = hasPermission("products:update");
  const canPublish = hasPermission("products:publish");
  const canDelete = hasPermission("products:delete");

  return (
    <div className="space-y-5">
      <section className="card p-4 sm:p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Rechercher un produit</span>
            <FontAwesomeIcon icon={faSearch} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-fb-ink/35" />
            <input
              className="input !pl-11"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                resetPage();
              }}
              placeholder="Rechercher par nom, référence, marque ou catégorie…"
            />
          </label>

          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 xl:w-[620px]">
            <select className="select" value={status} onChange={(event) => { setStatus(event.target.value as StatusFilter); resetPage(); }} aria-label="Filtrer par statut">
              <option value="ALL">Tous statuts</option>
              <option value="PUBLISHED">Publiés</option>
              <option value="ARCHIVED">Archivés</option>
            </select>
            <select className="select" value={type} onChange={(event) => { setType(event.target.value as TypeFilter); resetPage(); }} aria-label="Filtrer par type">
              <option value="ALL">Tous types</option>
              <option value="bike">Motos</option>
              <option value="part">Pièces & équipements</option>
            </select>
            <select className="select" value={brand} onChange={(event) => { setBrand(event.target.value); resetPage(); }} aria-label="Filtrer par marque">
              <option value="ALL">Toutes marques</option>
              {brands.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <select className="select" value={section} onChange={(event) => { setSection(event.target.value as SectionFilter); resetPage(); }} aria-label="Filtrer par section d’accueil">
              <option value="ALL">Toutes sections</option>
              <option value="homeNew">Nouveautés</option>
              <option value="motosHome">Motos accueil</option>
              <option value="essentialsHome">Essentiels</option>
              <option value="NONE">Aucune section</option>
            </select>
          </div>

          {canCreate && (
            <button type="button" className="btn btn-primary shrink-0" onClick={() => navigate({ name: "product-new" })}>
              <FontAwesomeIcon icon={faPlus} />
              Ajouter
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-[0.8rem] text-fb-ink/50">
          <FontAwesomeIcon icon={faFilter} className="text-fb-yellow-dark" />
          <span><strong className="text-fb-ink">{filtered.length}</strong> produit{filtered.length > 1 ? "s" : ""} trouvé{filtered.length > 1 ? "s" : ""}</span>
          <span aria-hidden="true">·</span>
          <button type="button" className="inline-flex items-center gap-1.5 font-bold text-fb-ink transition hover:text-fb-yellow-dark" onClick={onRefresh}>
            <FontAwesomeIcon icon={faRefresh} className={loading ? "fa-spin" : ""} />
            Actualiser
          </button>
          {error && <span className="font-bold text-red-700">{error}</span>}
        </div>
      </section>

      <section className="card overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="skeleton h-[4.5rem] rounded-2xl" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={faBoxOpen}
            title="Aucun produit ne correspond"
            text="Essayez une autre recherche, réinitialisez les filtres ou ajoutez un nouveau produit au catalogue."
            action={
              canCreate ? (
                <button type="button" className="btn btn-primary" onClick={() => navigate({ name: "product-new" })}>
                  <FontAwesomeIcon icon={faPlus} />
                  Ajouter un produit
                </button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="table-shell hidden xl:block">
              <table className="data-table products-table">
                <colgroup><col className="w-[25%]" /><col className="w-[13%]" /><col className="w-[16%]" /><col className="w-[10%]" /><col className="w-[9%]" /><col className="w-[12%]" /><col className="w-[15%]" /></colgroup>
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th>Type</th>
                    <th>Marque / catégorie</th>
                    <th>Prix</th>
                    <th>Accueil</th>
                    <th>Statut</th>
                    <th className="!text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((product) => (
                    <ProductRow
                      key={product.id}
                      product={product}
                      busy={busyId === product.id}
                      canUpdate={canUpdate}
                      canPublish={canPublish}
                      canDelete={canDelete}
                      onEdit={() => navigate({ name: "product-edit", id: product.id })}
                      onToggleStatus={() => void toggleStatus(product)}
                      onDelete={() => setProductToDelete(product)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 p-3 sm:grid-cols-2 xl:hidden">
              {visible.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  busy={busyId === product.id}
                  canUpdate={canUpdate}
                  canPublish={canPublish}
                  canDelete={canDelete}
                  onEdit={() => navigate({ name: "product-edit", id: product.id })}
                  onToggleStatus={() => void toggleStatus(product)}
                  onDelete={() => setProductToDelete(product)}
                />
              ))}
            </div>
          </>
        )}

        {filtered.length > PAGE_SIZE && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-fb-ink/[0.07] px-5 py-4 sm:flex-row">
            <p className="text-sm text-fb-ink/50">Page {safePage} sur {totalPages}</p>
            <div className="flex gap-2">
              <button type="button" className="btn btn-ghost !min-h-10" disabled={safePage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Précédent</button>
              <button type="button" className="btn btn-ghost !min-h-10" disabled={safePage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Suivant</button>
            </div>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(productToDelete)}
        title="Supprimer ce produit ?"
        text={`« ${productToDelete?.name ?? ""} » sera définitivement retiré de MySQL et ne pourra plus apparaître sur le site public.`}
        confirmLabel="Supprimer définitivement"
        danger
        busy={Boolean(productToDelete && busyId === productToDelete.id)}
        onCancel={() => setProductToDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}

function SectionDots({ product }: { product: Product }) {
  const items = [
    { label: "Nouveautés", active: product.homeNew, short: "N" },
    { label: "Motos accueil", active: product.motosHome, short: "M" },
    { label: "Essentiels", active: product.essentialsHome, short: "E" },
  ];
  return (
    <span className="inline-flex gap-1">
      {items.map((item) => (
        <span key={item.label} title={`${item.label} : ${item.active ? "sélectionné" : "non sélectionné"}`} className={`flex h-6 w-6 items-center justify-center rounded-full text-[0.65rem] font-extrabold ${item.active ? "bg-fb-ink text-fb-yellow" : "bg-fb-ink/[0.06] text-fb-ink/35"}`}>
          {item.short}
        </span>
      ))}
    </span>
  );
}

interface RowProps {
  product: Product;
  busy: boolean;
  canUpdate: boolean;
  canPublish: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}

function Actions({ product, busy, canUpdate, canPublish, canDelete, onEdit, onToggleStatus, onDelete }: RowProps) {
  return (
    <span className="inline-flex items-center justify-end gap-1.5">
      {canUpdate && (
        <button type="button" className="icon-btn !h-9 !w-9" onClick={onEdit} title="Modifier" aria-label={`Modifier ${product.name}`}>
          <FontAwesomeIcon icon={faPen} className="text-[0.8rem]" />
        </button>
      )}
      {canPublish && (
        <button type="button" className="icon-btn !h-9 !w-9" onClick={onToggleStatus} disabled={busy} title={product.status === "PUBLISHED" ? "Archiver" : "Publier"} aria-label={`${product.status === "PUBLISHED" ? "Archiver" : "Publier"} ${product.name}`}>
          <FontAwesomeIcon icon={product.status === "PUBLISHED" ? faArchive : faUpload} className="text-[0.8rem]" />
        </button>
      )}
      {canDelete && (
        <button type="button" className="icon-btn !h-9 !w-9 !border-red-200 !bg-red-50 text-red-700 hover:!bg-red-700 hover:text-white" onClick={onDelete} disabled={busy} title="Supprimer" aria-label={`Supprimer ${product.name}`}>
          <FontAwesomeIcon icon={faTrash} className="text-[0.8rem]" />
        </button>
      )}
      {!canUpdate && !canPublish && !canDelete && <FontAwesomeIcon icon={faEye} className="text-fb-ink/30" title="Lecture seule" />}
    </span>
  );
}

function ProductRow(props: RowProps) {
  const { product } = props;
  return (
    <tr>
      <td>
        <div className="flex min-w-0 items-center gap-3">
          <img src={resolveApiAssetUrl(product.image)} alt="" className="h-12 w-14 shrink-0 rounded-xl object-cover" loading="lazy" />
          <div className="min-w-0">
            <p className="truncate font-extrabold">{product.name}</p>
            <p className="truncate text-xs text-fb-ink/45">{product.id}</p>
          </div>
        </div>
      </td>
      <td><span className="badge bg-fb-ink/[0.06] text-fb-ink/60">{product.type === "bike" ? "Moto" : "Pièce / équip."}</span></td>
      <td>
        <p className="font-bold">{product.brand}</p>
        <p className="text-xs text-fb-ink/48">{product.category}</p>
      </td>
      <td className="whitespace-nowrap font-bold">{product.price}</td>
      <td><SectionDots product={product} /></td>
      <td><StatusBadge status={product.status} /></td>
      <td className="text-right"><Actions {...props} /></td>
    </tr>
  );
}

function ProductCard(props: RowProps) {
  const { product } = props;
  return (
    <article className="rounded-3xl border border-fb-ink/[0.08] bg-white p-3">
      <div className="flex gap-3">
        <img src={resolveApiAssetUrl(product.image)} alt="" className="h-20 w-24 shrink-0 rounded-2xl object-cover" loading="lazy" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 text-sm font-extrabold leading-snug">{product.name}</h3>
            <StatusBadge status={product.status} />
          </div>
          <p className="mt-1 truncate text-xs text-fb-ink/48">{product.brand} · {product.category}</p>
          <p className="mt-1.5 text-sm font-extrabold">{product.price}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-fb-ink/[0.07] pt-3">
        <SectionDots product={product} />
        <Actions {...props} />
      </div>
    </article>
  );
}
