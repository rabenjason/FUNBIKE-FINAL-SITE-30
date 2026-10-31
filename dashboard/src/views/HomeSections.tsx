import { useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowDown,
  faArrowUp,
  faBoxOpen,
  faEyeSlash,
  faGripVertical,
  faPlus,
  faRefresh,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../auth";
import { resolveApiAssetUrl } from "../api";
import type { HomeSection, Product, Route } from "../types";
import { EmptyState, StatusBadge, useToast } from "../components/ui";

interface SectionDefinition {
  key: HomeSection;
  flag: "homeNew" | "motosHome" | "essentialsHome";
  order: "homeNewOrder" | "motosHomeOrder" | "essentialsHomeOrder";
  title: string;
  description: string;
  preferredType: Product["type"];
  preferredLabel: string;
}

const SECTIONS: SectionDefinition[] = [
  {
    key: "homeNew",
    flag: "homeNew",
    order: "homeNewOrder",
    title: "Nouveautés / Arrivages",
    description: "Les cartes mises en avant dans la section Nouveautés de l’accueil.",
    preferredType: "bike",
    preferredLabel: "Motos recommandées",
  },
  {
    key: "motosHome",
    flag: "motosHome",
    order: "motosHomeOrder",
    title: "Motos de l’accueil",
    description: "Les modèles présentés dans la grande section Motos de l’accueil.",
    preferredType: "bike",
    preferredLabel: "Motos recommandées",
  },
  {
    key: "essentialsHome",
    flag: "essentialsHome",
    order: "essentialsHomeOrder",
    title: "Atelier / Essentiels",
    description: "Les pièces et équipements essentiels proposés sur l’accueil.",
    preferredType: "part",
    preferredLabel: "Pièces & équipements recommandés",
  },
];

function sortedSectionProducts(products: Product[], section: SectionDefinition) {
  return products
    .filter((product) => product[section.flag])
    .sort((a, b) => {
      const orderA = a[section.order] ?? Number.MAX_SAFE_INTEGER;
      const orderB = b[section.order] ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name, "fr");
    });
}

export default function HomeSections({
  products,
  loading,
  navigate,
  onRefresh,
  onPatchProduct,
}: {
  products: Product[];
  loading: boolean;
  navigate: (route: Route) => void;
  onRefresh: () => void;
  onPatchProduct: (id: string, patch: Partial<Product>) => Promise<Product>;
}) {
  const { hasPermission } = useAuth();
  const toast = useToast();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const canPublish = hasPermission("products:publish");
  const canUpdate = hasPermission("products:update");
  const canManage = canPublish || canUpdate;

  async function run(key: string, action: () => Promise<void>, successTitle: string, successMessage?: string) {
    setBusyKey(key);
    try {
      await action();
      toast.success(successTitle, successMessage);
    } catch (caught) {
      toast.error("Modification impossible", caught instanceof Error ? caught.message : undefined);
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="space-y-5">
      <section className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
        <div className="flex-1">
          <h2 className="font-display text-lg font-bold">Sections publiques de l’accueil</h2>
          <p className="mt-0.5 max-w-3xl text-sm leading-6 text-fb-ink/55">
            Le site public affiche uniquement les produits <strong>publiés</strong> sélectionnés ici, dans l’ordre indiqué. Les changements sont enregistrés dans MySQL.
          </p>
        </div>
        <button type="button" className="btn btn-ghost shrink-0" onClick={onRefresh}>
          <FontAwesomeIcon icon={faRefresh} className={loading ? "fa-spin" : ""} />
          Actualiser
        </button>
      </section>

      {!canManage && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
          Votre compte peut consulter ces sections, mais la permission de publication ou de modification est nécessaire pour les changer.
        </div>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-3">
        {SECTIONS.map((section) => (
          <SectionPanel
            key={section.key}
            section={section}
            products={products}
            loading={loading}
            busyKey={busyKey}
            canManage={canManage}
            navigate={navigate}
            onRun={run}
            onPatchProduct={onPatchProduct}
          />
        ))}
      </div>
    </div>
  );
}

function SectionPanel({
  section,
  products,
  loading,
  busyKey,
  canManage,
  navigate,
  onRun,
  onPatchProduct,
}: {
  section: SectionDefinition;
  products: Product[];
  loading: boolean;
  busyKey: string | null;
  canManage: boolean;
  navigate: (route: Route) => void;
  onRun: (key: string, action: () => Promise<void>, successTitle: string, successMessage?: string) => Promise<void>;
  onPatchProduct: (id: string, patch: Partial<Product>) => Promise<Product>;
}) {
  const selected = useMemo(() => sortedSectionProducts(products, section), [products, section]);
  const [candidateId, setCandidateId] = useState("");

  const candidates = useMemo(
    () =>
      products
        .filter((product) => !product[section.flag])
        .sort((a, b) => {
          if (a.type !== b.type) return a.type === section.preferredType ? -1 : 1;
          if (a.status !== b.status) return a.status === "PUBLISHED" ? -1 : 1;
          return a.name.localeCompare(b.name, "fr");
        }),
    [products, section],
  );

  async function addCandidate() {
    const candidate = candidates.find((product) => product.id === candidateId);
    if (!candidate) return;
    const order = selected.length + 1;
    await onRun(`add-${section.key}-${candidate.id}`, async () => {
      await onPatchProduct(candidate.id, { [section.flag]: true, [section.order]: order } as Partial<Product>);
      setCandidateId("");
    }, "Produit ajouté à la section", candidate.name);
  }

  async function remove(product: Product) {
    await onRun(`remove-${section.key}-${product.id}`, async () => {
      await onPatchProduct(product.id, { [section.flag]: false, [section.order]: null } as Partial<Product>);
    }, "Produit retiré de la section", product.name);
  }

  async function move(product: Product, direction: -1 | 1) {
    const index = selected.findIndex((item) => item.id === product.id);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= selected.length) return;
    const other = selected[targetIndex];

    await onRun(`move-${section.key}-${product.id}`, async () => {
      await onPatchProduct(product.id, { [section.order]: targetIndex + 1 } as Partial<Product>);
      await onPatchProduct(other.id, { [section.order]: index + 1 } as Partial<Product>);
    }, "Ordre mis à jour", section.title);
  }

  async function saveOrder(product: Product, value: string) {
    const order = value.trim() ? Number.parseInt(value, 10) : null;
    if (order !== null && (!Number.isInteger(order) || order < 0)) return;
    if (order === product[section.order]) return;

    await onRun(`order-${section.key}-${product.id}`, async () => {
      await onPatchProduct(product.id, { [section.order]: order } as Partial<Product>);
    }, "Ordre enregistré", product.name);
  }

  return (
    <article className="card overflow-hidden">
      <header className="border-b border-fb-ink/[0.07] bg-fb-cream/70 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold leading-tight">{section.title}</h3>
            <p className="mt-1 text-[0.82rem] leading-5 text-fb-ink/52">{section.description}</p>
          </div>
          <span className="badge bg-fb-ink text-fb-yellow">{selected.length}</span>
        </div>
      </header>

      <div className="space-y-2.5 p-3.5">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => <div key={index} className="skeleton h-[4.4rem] rounded-2xl" />)
        ) : selected.length === 0 ? (
          <EmptyState icon={faBoxOpen} title="Aucun produit" text="Ajoutez un produit publié ci-dessous pour alimenter cette section." />
        ) : (
          selected.map((product, index) => {
            const busy = busyKey?.includes(product.id);
            return (
              <article key={product.id} className="rounded-2xl border border-fb-ink/[0.08] bg-white p-3">
                <div className="flex gap-3">
                  <span className="flex w-6 shrink-0 flex-col items-center pt-1 text-fb-ink/30">
                    <FontAwesomeIcon icon={faGripVertical} />
                    <span className="font-display mt-1 text-sm font-bold text-fb-ink/55">{index + 1}</span>
                  </span>
                  <img src={resolveApiAssetUrl(product.image)} alt="" className="h-14 w-[4.5rem] shrink-0 rounded-xl object-cover" loading="lazy" />
                  <div className="min-w-0 flex-1">
                    <button type="button" className="block max-w-full truncate text-left text-sm font-extrabold hover:text-fb-yellow-dark" onClick={() => navigate({ name: "product-edit", id: product.id })}>
                      {product.name}
                    </button>
                    <p className="truncate text-xs text-fb-ink/48">{product.brand} · {product.category}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={product.status} />
                      {product.status === "ARCHIVED" && <span className="badge bg-red-100 text-red-700"><FontAwesomeIcon icon={faEyeSlash} /> Non visible</span>}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 border-t border-fb-ink/[0.07] pt-3">
                  <label className="flex items-center gap-2 text-xs font-extrabold text-fb-ink/50">
                    Ordre
                    <input
                      key={`${product.id}-${product[section.order] ?? "auto"}`}
                      className="input !w-[4.4rem] !px-2.5 !py-2 text-center"
                      type="number"
                      min="0"
                      step="1"
                      defaultValue={product[section.order] ?? ""}
                      disabled={!canManage || busy}
                      onBlur={(event) => void saveOrder(product, event.target.value)}
                      onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
                      aria-label={`Ordre de ${product.name} dans ${section.title}`}
                    />
                  </label>
                  <span className="flex gap-1.5">
                    <button type="button" className="icon-btn !h-9 !w-9" disabled={!canManage || busy || index === 0} onClick={() => void move(product, -1)} aria-label="Monter"><FontAwesomeIcon icon={faArrowUp} className="text-xs" /></button>
                    <button type="button" className="icon-btn !h-9 !w-9" disabled={!canManage || busy || index === selected.length - 1} onClick={() => void move(product, 1)} aria-label="Descendre"><FontAwesomeIcon icon={faArrowDown} className="text-xs" /></button>
                    <button type="button" className="icon-btn !h-9 !w-9 !border-red-200 !bg-red-50 text-red-700" disabled={!canManage || busy} onClick={() => void remove(product)} aria-label="Retirer de la section"><FontAwesomeIcon icon={faTrash} className="text-xs" /></button>
                  </span>
                </div>
              </article>
            );
          })
        )}
      </div>

      <footer className="border-t border-fb-ink/[0.07] p-3.5">
        <label className="label" htmlFor={`add-${section.key}`}>Ajouter un produit</label>
        <div className="flex gap-2">
          <select id={`add-${section.key}`} className="select min-w-0 flex-1" value={candidateId} onChange={(event) => setCandidateId(event.target.value)} disabled={!canManage || candidates.length === 0}>
            <option value="">{candidates.length ? "Choisir un produit…" : "Aucun autre produit"}</option>
            {candidates.map((product) => (
              <option key={product.id} value={product.id}>
                {product.type === section.preferredType ? "★ " : ""}{product.name} — {product.status === "PUBLISHED" ? "Publié" : "Archivé"}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-dark shrink-0 !px-3.5" disabled={!canManage || !candidateId || Boolean(busyKey)} onClick={() => void addCandidate()}>
            <FontAwesomeIcon icon={faPlus} />
            <span className="hidden sm:inline">Ajouter</span>
          </button>
        </div>
        <p className="help">★ {section.preferredLabel}. Un produit archivé peut être préparé ici, mais il restera invisible jusqu’à publication.</p>
      </footer>
    </article>
  );
}
