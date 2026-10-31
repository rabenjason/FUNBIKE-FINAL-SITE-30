import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArchive,
  faBoxOpen,
  faCheckCircle,
  faHouse,
  faMotorcycle,
  faPlus,
  faPuzzlePiece,
  faRefresh,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../auth";
import { resolveApiAssetUrl } from "../api";
import type { Product, Route } from "../types";
import { EmptyState, StatusBadge } from "../components/ui";

interface Stat {
  label: string;
  value: number;
  detail: string;
  icon: IconDefinition;
  tone: string;
}

export default function Overview({
  products,
  loading,
  error,
  navigate,
  onRefresh,
}: {
  products: Product[];
  loading: boolean;
  error: string | null;
  navigate: (route: Route) => void;
  onRefresh: () => void;
}) {
  const { user } = useAuth();
  const published = products.filter((product) => product.status === "PUBLISHED");
  const stats: Stat[] = [
    {
      label: "Produits au catalogue",
      value: products.length,
      detail: "Motos, pièces et équipements",
      icon: faBoxOpen,
      tone: "bg-fb-yellow text-fb-ink",
    },
    {
      label: "Produits publiés",
      value: published.length,
      detail: "Visibles sur le site public",
      icon: faCheckCircle,
      tone: "bg-emerald-100 text-emerald-700",
    },
    {
      label: "Produits archivés",
      value: products.length - published.length,
      detail: "Masqués du site public",
      icon: faArchive,
      tone: "bg-stone-200 text-stone-700",
    },
    {
      label: "Motos",
      value: products.filter((product) => product.type === "bike").length,
      detail: `${products.filter((product) => product.type === "part").length} pièces & équipements`,
      icon: faMotorcycle,
      tone: "bg-sky-100 text-sky-700",
    },
  ];

  const homeSelections = [
    { label: "Nouveautés / Arrivages", count: products.filter((p) => p.homeNew).length },
    { label: "Motos de l’accueil", count: products.filter((p) => p.motosHome).length },
    { label: "Atelier / Essentiels", count: products.filter((p) => p.essentialsHome).length },
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[1.7rem] bg-fb-ink text-white shadow-[0_24px_55px_rgb(23_24_22/0.18)]">
        <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.35fr_0.65fr] lg:p-10">
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-fb-yellow/20 blur-3xl" />
          <div className="relative">
            <p className="text-[0.72rem] font-extrabold uppercase tracking-[0.22em] text-fb-yellow">FunBike Madagascar</p>
            <h2 className="font-display mt-3 max-w-2xl text-3xl font-bold leading-[1.02] tracking-tight sm:text-5xl">
              Bonjour {user?.name.split(" ")[0] ?? ""}, votre catalogue est entre de bonnes mains.
            </h2>
            <p className="mt-4 max-w-xl text-[0.95rem] leading-6 text-white/58">
              Chaque produit enregistré ici est stocké dans MySQL. Dès qu’il est publié, le site public l’affiche automatiquement dans les sections choisies.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <button type="button" className="btn btn-primary" onClick={() => navigate({ name: "product-new" })}>
                <FontAwesomeIcon icon={faPlus} />
                Ajouter un produit
              </button>
              <button type="button" className="btn border-white/15 bg-white/[0.07] text-white hover:bg-white/[0.12]" onClick={() => navigate({ name: "home" })}>
                <FontAwesomeIcon icon={faHouse} />
                Organiser l’accueil
              </button>
            </div>
          </div>

          <div className="relative rounded-3xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
            <p className="text-[0.72rem] font-extrabold uppercase tracking-[0.18em] text-white/40">Sélections de l’accueil</p>
            <div className="mt-4 space-y-3">
              {homeSelections.map((selection) => (
                <div key={selection.label} className="flex items-center justify-between gap-3 rounded-2xl bg-black/20 px-4 py-3">
                  <span className="text-sm font-bold text-white/75">{selection.label}</span>
                  <span className="font-display text-xl font-bold text-fb-yellow">{selection.count}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs leading-5 text-white/42">Les produits archivés restent masqués, même s’ils sont sélectionnés.</p>
          </div>
        </div>
      </section>

      {error && (
        <div className="card flex flex-col gap-3 border-red-200 bg-red-50 p-4 text-red-950 sm:flex-row sm:items-center">
          <p className="flex-1 text-sm font-bold">Le catalogue n’a pas pu être chargé : {error}</p>
          <button type="button" className="btn btn-ghost" onClick={onRefresh}>
            <FontAwesomeIcon icon={faRefresh} />
            Réessayer
          </button>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Statistiques du catalogue">
        {stats.map((stat) => (
          <article key={stat.label} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[0.78rem] font-extrabold uppercase tracking-[0.08em] text-fb-ink/45">{stat.label}</p>
                <p className="font-display mt-2 text-4xl font-bold tracking-tight">{loading ? "—" : stat.value}</p>
                <p className="mt-1 text-[0.82rem] text-fb-ink/50">{stat.detail}</p>
              </div>
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${stat.tone}`}>
                <FontAwesomeIcon icon={stat.icon} />
              </span>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.5fr_0.75fr]">
        <article className="card overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-fb-ink/[0.07] px-5 py-4">
            <div>
              <h3 className="font-display text-lg font-bold">Catalogue</h3>
              <p className="text-[0.82rem] text-fb-ink/48">Aperçu rapide des fiches actuellement enregistrées.</p>
            </div>
            <button type="button" className="btn btn-ghost !min-h-10 !px-3.5 text-[0.8rem]" onClick={() => navigate({ name: "products" })}>
              Tout voir
            </button>
          </div>

          {loading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="skeleton h-16 rounded-2xl" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <EmptyState
              icon={faPuzzlePiece}
              title="Aucun produit chargé"
              text="Ajoutez votre premier produit ou vérifiez que MySQL est démarré et que le seed a été importé."
              action={
                <button type="button" className="btn btn-primary" onClick={() => navigate({ name: "product-new" })}>
                  <FontAwesomeIcon icon={faPlus} />
                  Ajouter un produit
                </button>
              }
            />
          ) : (
            <div className="divide-y divide-fb-ink/[0.06]">
              {products.slice(0, 6).map((product) => (
                <button
                  key={product.id}
                  type="button"
                  className="flex w-full items-center gap-3.5 px-5 py-3.5 text-left transition hover:bg-fb-cream"
                  onClick={() => navigate({ name: "product-edit", id: product.id })}
                >
                  <img src={resolveApiAssetUrl(product.image)} alt="" className="h-12 w-14 shrink-0 rounded-xl object-cover" loading="lazy" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-extrabold">{product.name}</span>
                    <span className="block truncate text-xs text-fb-ink/48">
                      {product.brand} · {product.category}
                    </span>
                  </span>
                  <StatusBadge status={product.status} />
                </button>
              ))}
            </div>
          )}
        </article>

        <aside className="space-y-6">
          <article className="card p-5">
            <h3 className="font-display text-lg font-bold">Actions rapides</h3>
            <div className="mt-4 grid gap-2.5">
              <button type="button" className="btn btn-dark w-full justify-start" onClick={() => navigate({ name: "product-new" })}>
                <FontAwesomeIcon icon={faPlus} />
                Nouveau produit
              </button>
              <button type="button" className="btn btn-ghost w-full justify-start" onClick={() => navigate({ name: "products" })}>
                <FontAwesomeIcon icon={faBoxOpen} />
                Rechercher dans le catalogue
              </button>
              <button type="button" className="btn btn-ghost w-full justify-start" onClick={() => navigate({ name: "home" })}>
                <FontAwesomeIcon icon={faHouse} />
                Modifier les sections d’accueil
              </button>
              <button type="button" className="btn btn-ghost w-full justify-start" onClick={onRefresh}>
                <FontAwesomeIcon icon={faRefresh} />
                Actualiser les données
              </button>
            </div>
          </article>

          <article className="rounded-[1.25rem] border border-fb-yellow/50 bg-fb-yellow/15 p-5">
            <p className="text-[0.72rem] font-extrabold uppercase tracking-[0.16em] text-fb-yellow-dark">Règle de publication</p>
            <p className="mt-2 text-sm leading-6 text-fb-ink/68">
              Un produit <strong>publié</strong> peut apparaître sur le site. Un produit <strong>archivé</strong> ou supprimé disparaît du catalogue public après rechargement.
            </p>
          </article>
        </aside>
      </section>
    </div>
  );
}
