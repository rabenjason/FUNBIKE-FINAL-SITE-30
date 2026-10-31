import { useEffect, useState, type ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRightFromBracket,
  faBars,
  faBoxOpen,
  faChevronDown,
  faExternalLinkAlt,
  faGaugeHigh,
  faGear,
  faHouse,
  faPlus,
  faUsersGear,
  faXmark,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../auth";
import type { Route } from "../types";
import { Logo, RoleBadge, initials, publicSiteUrl } from "./ui";

interface NavItem {
  route: Route;
  label: string;
  description: string;
  icon: IconDefinition;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { route: { name: "overview" }, label: "Tableau de bord", description: "Vue d’ensemble", icon: faGaugeHigh },
  { route: { name: "products" }, label: "Produits", description: "Catalogue MySQL", icon: faBoxOpen },
  { route: { name: "home" }, label: "Accueil du site", description: "Sections & ordre", icon: faHouse },
  { route: { name: "users" }, label: "Utilisateurs", description: "Rôles & accès", icon: faUsersGear, adminOnly: true },
  { route: { name: "settings" }, label: "Paramètres", description: "Compte & session", icon: faGear },
];

const PAGE_TITLES: Record<Route["name"], { title: string; subtitle: string }> = {
  overview: { title: "Tableau de bord", subtitle: "Le catalogue FunBike en un coup d’œil." },
  products: { title: "Produits", subtitle: "Ajoutez, modifiez, publiez et organisez le catalogue." },
  "product-new": { title: "Nouveau produit", subtitle: "Créez une fiche reliée directement à MySQL." },
  "product-edit": { title: "Modifier le produit", subtitle: "Les changements enregistrés alimentent le site public." },
  home: { title: "Accueil du site", subtitle: "Choisissez les produits visibles et leur ordre d’affichage." },
  users: { title: "Utilisateurs", subtitle: "Gérez les comptes ADMIN et MARKETING." },
  settings: { title: "Paramètres", subtitle: "Votre profil, votre mot de passe et votre session." },
};

function isActive(route: Route, item: NavItem) {
  if (item.route.name === "products") return route.name === "products" || route.name === "product-new" || route.name === "product-edit";
  return route.name === item.route.name;
}

export default function Layout({
  route,
  navigate,
  health,
  children,
}: {
  route: Route;
  navigate: (route: Route) => void;
  health: { api: boolean; database: boolean };
  children: ReactNode;
}) {
  const { user, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const page = PAGE_TITLES[route.name];
  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === "ADMIN");

  useEffect(() => {
    setDrawerOpen(false);
    setMenuOpen(false);
  }, [route]);

  const sidebar = (
    <div className="flex h-full flex-col bg-fb-ink text-white">
      <div className="flex items-center justify-between px-5 pb-5 pt-6">
        <Logo />
        <button type="button" className="icon-btn border-white/10 bg-white/5 text-white lg:hidden" onClick={() => setDrawerOpen(false)} aria-label="Fermer le menu">
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>

      <div className="px-4">
        <button type="button" className="btn btn-primary w-full" onClick={() => navigate({ name: "product-new" })}>
          <FontAwesomeIcon icon={faPlus} />
          Nouveau produit
        </button>
      </div>

      <nav className="mt-7 flex-1 space-y-1.5 overflow-y-auto px-3" aria-label="Navigation du dashboard">
        {visibleItems.map((item) => {
          const active = isActive(route, item);
          return (
            <button
              key={item.route.name}
              type="button"
              onClick={() => navigate(item.route)}
              className={`group flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition ${
                active ? "bg-fb-yellow text-fb-ink shadow-[0_12px_28px_rgb(255_209_0/0.18)]" : "text-white/68 hover:bg-white/[0.07] hover:text-white"
              }`}
            >
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${active ? "bg-fb-ink text-fb-yellow" : "bg-white/[0.07] text-fb-yellow"}`}>
                <FontAwesomeIcon icon={item.icon} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[0.92rem] font-extrabold">{item.label}</span>
                <span className={`block truncate text-[0.72rem] ${active ? "text-fb-ink/55" : "text-white/38"}`}>{item.description}</span>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="space-y-3 p-4">
        <a href={publicSiteUrl()} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-bold text-white/80 transition hover:border-fb-yellow/60 hover:text-fb-yellow">
          Voir le site public
          <FontAwesomeIcon icon={faExternalLinkAlt} className="text-xs" />
        </a>

        {user && (
          <div className="rounded-2xl bg-white/[0.06] p-3.5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fb-yellow font-display text-sm font-bold text-fb-ink">
                {initials(user.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold text-white">{user.name}</p>
                <p className="truncate text-xs text-white/45">{user.email}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <RoleBadge role={user.role} />
              <button type="button" onClick={() => void logout()} className="inline-flex items-center gap-2 text-xs font-extrabold text-white/60 transition hover:text-fb-yellow">
                <FontAwesomeIcon icon={faArrowRightFromBracket} />
                Déconnexion
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 lg:block">{sidebar}</aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 h-full w-full bg-fb-ink/55 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} aria-label="Fermer le menu" />
          <aside className="absolute inset-y-0 left-0 w-[84vw] max-w-80 shadow-2xl">{sidebar}</aside>
        </div>
      )}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-fb-ink/[0.08] bg-fb-paper/85 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1500px] items-center gap-3 px-4 py-3.5 sm:px-6 lg:px-8">
            <button type="button" className="icon-btn lg:hidden" onClick={() => setDrawerOpen(true)} aria-label="Ouvrir le menu">
              <FontAwesomeIcon icon={faBars} />
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="font-display truncate text-xl font-bold tracking-tight text-fb-ink sm:text-2xl">{page.title}</h1>
              <p className="hidden truncate text-[0.82rem] text-fb-ink/50 sm:block">{page.subtitle}</p>
            </div>

            <div className={`badge hidden md:inline-flex ${health.database ? "bg-emerald-100 text-emerald-800" : health.api ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${health.database ? "bg-emerald-600" : health.api ? "bg-amber-600" : "bg-red-600"}`} />
              {health.database ? "API + MySQL" : health.api ? "API sans MySQL" : "API arrêtée"}
            </div>

            <a href={publicSiteUrl()} target="_blank" rel="noreferrer" className="btn btn-ghost hidden xl:inline-flex">
              Site public
              <FontAwesomeIcon icon={faExternalLinkAlt} className="text-[0.68rem]" />
            </a>

            {user && (
              <div className="relative">
                <button type="button" className="flex items-center gap-2.5 rounded-full border border-fb-ink/10 bg-white py-1.5 pl-1.5 pr-3 shadow-sm transition hover:border-fb-ink/25" onClick={() => setMenuOpen((value) => !value)}>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-fb-ink font-display text-xs font-bold text-fb-yellow">{initials(user.name)}</span>
                  <span className="hidden max-w-36 text-left md:block">
                    <span className="block truncate text-[0.82rem] font-extrabold leading-tight">{user.name}</span>
                    <span className="block text-[0.68rem] font-bold uppercase tracking-wider text-fb-ink/40">{user.role}</span>
                  </span>
                  <FontAwesomeIcon icon={faChevronDown} className="text-[0.65rem] text-fb-ink/40" />
                </button>

                {menuOpen && (
                  <div className="card absolute right-0 top-[calc(100%+0.6rem)] w-64 p-2">
                    <div className="px-3 py-2.5">
                      <p className="truncate text-sm font-extrabold">{user.name}</p>
                      <p className="truncate text-xs text-fb-ink/50">{user.email}</p>
                      <div className="mt-2"><RoleBadge role={user.role} /></div>
                    </div>
                    <button type="button" className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-bold hover:bg-fb-cream" onClick={() => navigate({ name: "settings" })}>
                      <FontAwesomeIcon icon={faGear} className="text-fb-yellow-dark" />
                      Paramètres du compte
                    </button>
                    <button type="button" className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-red-700 hover:bg-red-50" onClick={() => void logout()}>
                      <FontAwesomeIcon icon={faArrowRightFromBracket} />
                      Déconnexion
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1500px] px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-10">{children}</main>
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 rounded-full border border-fb-ink/10 bg-fb-ink/[0.97] p-1.5 text-white shadow-2xl backdrop-blur lg:hidden" aria-label="Navigation mobile">
        {[
          { route: { name: "overview" } as Route, label: "Accueil", icon: faGaugeHigh },
          { route: { name: "products" } as Route, label: "Produits", icon: faBoxOpen },
          { route: { name: "home" } as Route, label: "Site", icon: faHouse },
          user?.role === "ADMIN"
            ? { route: { name: "users" } as Route, label: "Équipe", icon: faUsersGear }
            : { route: { name: "settings" } as Route, label: "Compte", icon: faGear },
        ].map((item) => {
          const active = route.name === item.route.name || (item.route.name === "products" && (route.name === "product-new" || route.name === "product-edit"));
          return (
            <button key={item.label} type="button" onClick={() => navigate(item.route)} className={`flex flex-col items-center gap-1 rounded-full px-2 py-2 text-[0.65rem] font-extrabold ${active ? "bg-fb-yellow text-fb-ink" : "text-white/65"}`}>
              <FontAwesomeIcon icon={item.icon} />
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
