import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPen,
  faPlus,
  faRefresh,
  faSearch,
  faShieldHalved,
  faTrash,
  faUsersGear,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../auth";
import { fetchUsers, request } from "../api";
import type { User, UserRole } from "../types";
import { ConfirmDialog, EmptyState, RoleBadge, formatDate, useToast } from "../components/ui";

interface UserDraft {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  canDeleteProducts: boolean;
}

const EMPTY_DRAFT: UserDraft = {
  name: "",
  email: "",
  password: "",
  role: "MARKETING",
  canDeleteProducts: false,
};

export default function Users() {
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | UserRole>("ALL");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [draft, setDraft] = useState<UserDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUsers(await fetchUsers());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Les utilisateurs n’ont pas pu être chargés.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("fr");
    return users.filter((user) => {
      if (roleFilter !== "ALL" && user.role !== roleFilter) return false;
      if (!term) return true;
      return user.name.toLocaleLowerCase("fr").includes(term) || user.email.toLocaleLowerCase("fr").includes(term);
    });
  }, [users, search, roleFilter]);

  function openCreate() {
    setEditingUser(null);
    setDraft(EMPTY_DRAFT);
    setEditorOpen(true);
  }

  function openEdit(user: User) {
    setEditingUser(user);
    setDraft({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      canDeleteProducts: user.canDeleteProducts,
    });
    setEditorOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      if (editingUser) {
        const payload: Record<string, unknown> = {
          name: draft.name.trim(),
          email: draft.email.trim(),
          role: draft.role,
          canDeleteProducts: draft.canDeleteProducts,
        };
        if (draft.password) payload.password = draft.password;
        const updated = await request<User>(`/api/users/${editingUser.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setUsers((current) => current.map((user) => (user.id === updated.data.id ? updated.data : user)));
        toast.success("Utilisateur mis à jour", updated.data.name);
      } else {
        const created = await request<User>("/api/users", {
          method: "POST",
          body: JSON.stringify({
            name: draft.name.trim(),
            email: draft.email.trim(),
            password: draft.password,
            role: draft.role,
            canDeleteProducts: draft.canDeleteProducts,
          }),
        });
        setUsers((current) => [created.data, ...current]);
        toast.success("Utilisateur créé", created.data.email);
      }
      setEditorOpen(false);
    } catch (caught) {
      toast.error("Enregistrement impossible", caught instanceof Error ? caught.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!userToDelete) return;
    setDeleting(true);
    try {
      await request<void>(`/api/users/${userToDelete.id}`, { method: "DELETE" });
      setUsers((current) => current.filter((user) => user.id !== userToDelete.id));
      toast.success("Utilisateur supprimé", userToDelete.email);
      setUserToDelete(null);
    } catch (caught) {
      toast.error("Suppression impossible", caught instanceof Error ? caught.message : undefined);
    } finally {
      setDeleting(false);
    }
  }

  const isSelf = editingUser?.id === currentUser?.id;

  return (
    <div className="space-y-5">
      <section className="card space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-bold">Comptes de l’équipe</h2>
            <p className="mt-0.5 max-w-2xl text-sm leading-6 text-fb-ink/55">Seuls les ADMIN peuvent ouvrir cette page. Le backend revérifie ce droit à chaque appel.</p>
          </div>
          <span className="badge w-fit bg-fb-ink/[0.06] text-fb-ink/55">{filtered.length} compte{filtered.length > 1 ? "s" : ""}</span>
        </div>

        <div className="grid gap-2.5 md:grid-cols-[minmax(220px,1fr)_180px_auto_auto]">
          <label className="relative">
            <span className="sr-only">Rechercher un utilisateur</span>
            <FontAwesomeIcon icon={faSearch} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs text-fb-ink/35" />
            <input className="input !pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom ou email…" />
          </label>
          <select className="select" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as "ALL" | UserRole)} aria-label="Filtrer par rôle">
            <option value="ALL">Tous rôles</option>
            <option value="ADMIN">ADMIN</option>
            <option value="MARKETING">MARKETING</option>
          </select>
          <button type="button" className="btn btn-ghost" onClick={() => void loadUsers()}>
            <FontAwesomeIcon icon={faRefresh} className={loading ? "fa-spin" : ""} />
            Actualiser
          </button>
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <FontAwesomeIcon icon={faPlus} />
            Nouvel utilisateur
          </button>
        </div>
      </section>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{error}</div>}

      <section className="card overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-5">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="skeleton h-16 rounded-2xl" />)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={faUsersGear} title="Aucun utilisateur trouvé" text="Créez un compte pour un membre de l’équipe ou modifiez votre recherche." action={<button type="button" className="btn btn-primary" onClick={openCreate}><FontAwesomeIcon icon={faPlus} /> Nouvel utilisateur</button>} />
        ) : (
          <>
            <div className="table-shell hidden md:block">
              <table className="data-table">
                <thead><tr><th>Utilisateur</th><th>Rôle</th><th>Suppression produits</th><th>Créé le</th><th className="!text-right">Actions</th></tr></thead>
                <tbody>
                  {filtered.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-fb-ink font-display text-xs font-bold text-fb-yellow">{user.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>
                          <div><p className="font-extrabold">{user.name}{user.id === currentUser?.id && <span className="ml-2 text-xs text-fb-yellow-dark">(vous)</span>}</p><p className="text-xs text-fb-ink/48">{user.email}</p></div>
                        </div>
                      </td>
                      <td><RoleBadge role={user.role} /></td>
                      <td>{user.role === "ADMIN" || user.canDeleteProducts ? <span className="badge bg-emerald-100 text-emerald-800">Autorisée</span> : <span className="badge bg-stone-200 text-stone-600">Non autorisée</span>}</td>
                      <td>{formatDate(user.createdAt)}</td>
                      <td className="text-right">
                        <span className="inline-flex gap-1.5">
                          <button type="button" className="icon-btn" onClick={() => openEdit(user)} aria-label={`Modifier ${user.name}`}><FontAwesomeIcon icon={faPen} className="text-xs" /></button>
                          <button type="button" className="icon-btn !border-red-200 !bg-red-50 text-red-700" disabled={user.id === currentUser?.id} onClick={() => setUserToDelete(user)} aria-label={`Supprimer ${user.name}`}><FontAwesomeIcon icon={faTrash} className="text-xs" /></button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 p-3 sm:grid-cols-2 md:hidden">
              {filtered.map((user) => (
                <article key={user.id} className="rounded-3xl border border-fb-ink/[0.08] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><h3 className="font-extrabold">{user.name}</h3><p className="break-all text-xs text-fb-ink/50">{user.email}</p></div>
                    <RoleBadge role={user.role} />
                  </div>
                  <p className="mt-3 text-xs text-fb-ink/50">Créé le {formatDate(user.createdAt)} · Suppression produits : {user.role === "ADMIN" || user.canDeleteProducts ? "autorisée" : "non autorisée"}</p>
                  <div className="mt-3 flex gap-2">
                    <button type="button" className="btn btn-ghost flex-1 !min-h-10" onClick={() => openEdit(user)}><FontAwesomeIcon icon={faPen} /> Modifier</button>
                    <button type="button" className="btn btn-danger flex-1 !min-h-10" disabled={user.id === currentUser?.id} onClick={() => setUserToDelete(user)}><FontAwesomeIcon icon={faTrash} /> Supprimer</button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {editorOpen && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-fb-ink/55 p-3 backdrop-blur-sm sm:items-center sm:p-6">
          <form onSubmit={handleSubmit} className="card max-h-[92vh] w-full max-w-xl overflow-y-auto p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-bold">{editingUser ? "Modifier l’utilisateur" : "Nouvel utilisateur"}</h2>
                <p className="mt-1 text-sm text-fb-ink/52">Le mot de passe est hashé côté serveur et n’est jamais affiché.</p>
              </div>
              <button type="button" className="icon-btn shrink-0" onClick={() => setEditorOpen(false)} aria-label="Fermer"><FontAwesomeIcon icon={faXmark} /></button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div><label className="label" htmlFor="user-name">Nom complet</label><input id="user-name" className="input" required value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /></div>
              <div><label className="label" htmlFor="user-email">Email</label><input id="user-email" className="input" type="email" required value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} /></div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="user-password">{editingUser ? "Nouveau mot de passe (facultatif)" : "Mot de passe"}</label>
                <input id="user-password" className="input" type="password" required={!editingUser} minLength={12} value={draft.password} onChange={(event) => setDraft((current) => ({ ...current, password: event.target.value }))} placeholder="12 caractères minimum, lettre + chiffre" />
              </div>
              <div>
                <label className="label" htmlFor="user-role">Rôle</label>
                <select id="user-role" className="select" value={draft.role} disabled={isSelf} onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value as UserRole }))}>
                  <option value="MARKETING">MARKETING</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
                {isSelf && <p className="help">Vous ne pouvez pas modifier votre propre rôle.</p>}
              </div>
              <label className={`flex items-start gap-3 rounded-2xl border p-3.5 ${draft.canDeleteProducts ? "border-fb-yellow bg-fb-yellow/12" : "border-fb-ink/10 bg-white"}`}>
                <button type="button" className="switch mt-0.5" data-checked={draft.canDeleteProducts} disabled={draft.role === "ADMIN" || isSelf} onClick={() => setDraft((current) => ({ ...current, canDeleteProducts: !current.canDeleteProducts }))} aria-pressed={draft.canDeleteProducts} />
                <span><span className="block text-sm font-extrabold">Peut supprimer des produits</span><span className="mt-0.5 block text-xs leading-5 text-fb-ink/50">Permission spéciale MARKETING. Les ADMIN l’ont toujours.</span></span>
              </label>
            </div>

            <div className="mt-5 flex gap-2 rounded-2xl bg-fb-cream p-3.5 text-[0.82rem] leading-5 text-fb-ink/60">
              <FontAwesomeIcon icon={faShieldHalved} className="mt-0.5 text-fb-yellow-dark" />
              <span>Un MARKETING peut gérer les produits et l’accueil, mais ne peut ni gérer les utilisateurs ni s’attribuer un rôle.</span>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" className="btn btn-ghost" onClick={() => setEditorOpen(false)}>Annuler</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Enregistrement…" : editingUser ? "Enregistrer" : "Créer l’utilisateur"}</button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(userToDelete)}
        title="Supprimer cet utilisateur ?"
        text={`Le compte « ${userToDelete?.email ?? ""} » et ses sessions seront supprimés. Cette action est définitive.`}
        confirmLabel="Supprimer l’utilisateur"
        danger
        busy={deleting}
        onCancel={() => setUserToDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
