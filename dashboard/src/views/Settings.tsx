import { useState, type FormEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRightFromBracket,
  faCheckCircle,
  faEnvelope,
  faKey,
  faSave,
  faShieldHalved,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../auth";
import { request } from "../api";
import { RoleBadge, initials, publicSiteUrl, useToast } from "../components/ui";

const PERMISSION_LABELS: Record<string, string> = {
  "catalog:read": "Consulter tout le catalogue",
  "products:create": "Ajouter des produits",
  "products:update": "Modifier les produits et images",
  "products:publish": "Publier, archiver et organiser l’accueil",
  "products:delete": "Supprimer des produits",
  "users:manage": "Gérer les utilisateurs et rôles",
};

export default function Settings() {
  const { user, logout, refreshUser } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [profileBusy, setProfileBusy] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);

  if (!user) return null;

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setProfileBusy(true);
    try {
      await request("/api/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      await refreshUser();
      toast.success("Profil mis à jour", "Vos informations ont été enregistrées.");
    } catch (caught) {
      toast.error("Profil non mis à jour", caught instanceof Error ? caught.message : undefined);
    } finally {
      setProfileBusy(false);
    }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Confirmation différente", "Les deux nouveaux mots de passe doivent être identiques.");
      return;
    }

    setPasswordBusy(true);
    try {
      await request("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      toast.success("Mot de passe modifié", "Toutes les sessions ont été fermées. Reconnectez-vous.");
      await logout();
    } catch (caught) {
      toast.error("Mot de passe non modifié", caught instanceof Error ? caught.message : undefined);
    } finally {
      setPasswordBusy(false);
    }
  }

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[0.85fr_1.15fr]">
      <section className="overflow-hidden rounded-[1.25rem] bg-fb-ink text-white shadow-[0_18px_42px_rgb(23_24_22/0.16)]">
        <div className="p-6">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-fb-yellow font-display text-lg font-bold text-fb-ink">{initials(user.name)}</span>
            <div className="min-w-0">
              <h2 className="font-display truncate text-2xl font-bold">{user.name}</h2>
              <p className="truncate text-sm text-white/50">{user.email}</p>
              <div className="mt-2"><RoleBadge role={user.role} /></div>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.05] p-4">
            <p className="flex items-center gap-2 text-sm font-extrabold"><FontAwesomeIcon icon={faShieldHalved} className="text-fb-yellow" /> Permissions vérifiées par le serveur</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {user.permissions.map((permission) => (
                <span key={permission} className="badge bg-white/[0.08] text-white/72 normal-case tracking-normal">
                  <FontAwesomeIcon icon={faCheckCircle} className="text-fb-yellow" />
                  {PERMISSION_LABELS[permission] ?? permission}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-2.5">
            <a href={publicSiteUrl()} target="_blank" rel="noreferrer" className="btn border-white/12 bg-white/[0.06] text-white hover:bg-white/[0.1]">
              Ouvrir le site public
            </a>
            <button type="button" className="btn bg-red-500/12 text-red-200 hover:bg-red-500/20" onClick={() => void logout()}>
              <FontAwesomeIcon icon={faArrowRightFromBracket} />
              Déconnexion
            </button>
          </div>
        </div>
      </section>

      <div className="space-y-5">
        <form onSubmit={saveProfile} className="card p-5 sm:p-6">
          <h3 className="font-display flex items-center gap-2 text-lg font-bold"><FontAwesomeIcon icon={faUser} className="text-fb-yellow-dark" /> Profil personnel</h3>
          <p className="mt-1 text-sm text-fb-ink/52">Votre rôle et vos permissions ne peuvent pas être modifiés depuis cet écran.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="profile-name">Nom</label><input id="profile-name" className="input" value={name} onChange={(event) => setName(event.target.value)} required /></div>
            <div><label className="label" htmlFor="profile-email">Email</label><input id="profile-email" className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
          </div>
          <button type="submit" className="btn btn-primary mt-5" disabled={profileBusy}><FontAwesomeIcon icon={faSave} />{profileBusy ? "Enregistrement…" : "Enregistrer le profil"}</button>
        </form>

        <form onSubmit={changePassword} className="card p-5 sm:p-6">
          <h3 className="font-display flex items-center gap-2 text-lg font-bold"><FontAwesomeIcon icon={faKey} className="text-fb-yellow-dark" /> Changer le mot de passe</h3>
          <p className="mt-1 text-sm leading-6 text-fb-ink/52">Après le changement, toutes les sessions seront fermées et une nouvelle connexion sera demandée.</p>
          <div className="mt-5 grid gap-4">
            <div><label className="label" htmlFor="current-password">Mot de passe actuel</label><input id="current-password" className="input" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required autoComplete="current-password" /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label" htmlFor="new-password">Nouveau mot de passe</label><input id="new-password" className="input" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required minLength={12} autoComplete="new-password" placeholder="12 caractères, lettre + chiffre" /></div>
              <div><label className="label" htmlFor="confirm-password">Confirmer</label><input id="confirm-password" className="input" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required autoComplete="new-password" /></div>
            </div>
          </div>
          <button type="submit" className="btn btn-dark mt-5" disabled={passwordBusy}><FontAwesomeIcon icon={faKey} />{passwordBusy ? "Modification…" : "Modifier et se reconnecter"}</button>
        </form>

        <section className="rounded-[1.25rem] border border-fb-yellow/50 bg-fb-yellow/12 p-5 text-sm leading-6 text-fb-ink/65">
          <p className="flex items-center gap-2 font-extrabold text-fb-ink"><FontAwesomeIcon icon={faEnvelope} className="text-fb-yellow-dark" /> Besoin d’un accès ?</p>
          <p className="mt-1">Demandez à un ADMIN FunBike de créer votre compte ou de modifier vos permissions. Aucun mot de passe administrateur n’est codé dans l’application.</p>
        </section>
      </div>
    </div>
  );
}
