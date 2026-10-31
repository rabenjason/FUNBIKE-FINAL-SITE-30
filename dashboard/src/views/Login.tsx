import { useState, type FormEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRightToBracket,
  faBoxOpen,
  faEye,
  faEyeSlash,
  faHouse,
  faLock,
  faShieldHalved,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../auth";
import { LOGO_URL, useToast } from "../components/ui";

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await login(email.trim(), password);
      toast.success(`Bonjour ${user.name.split(" ")[0]}`, "Connexion sécurisée établie.");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "La connexion a échoué.";
      setError(message);
      toast.error("Connexion impossible", message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-fb-ink text-white lg:flex lg:flex-col lg:justify-between lg:p-10 xl:p-14">
        <div className="pointer-events-none absolute -left-28 top-1/3 h-96 w-96 rounded-full bg-fb-yellow/18 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-3xl bg-fb-yellow">
            <img src={LOGO_URL} alt="FunBike" className="max-h-11 max-w-11 object-contain" />
          </span>
          <div>
            <p className="font-display text-2xl font-bold leading-none">FunBike</p>
            <p className="mt-1 text-[0.7rem] font-extrabold uppercase tracking-[0.22em] text-white/42">Madagascar</p>
          </div>
        </div>

        <div className="relative max-w-2xl">
          <p className="text-[0.72rem] font-extrabold uppercase tracking-[0.24em] text-fb-yellow">Espace équipe</p>
          <h1 className="font-display mt-4 text-5xl font-bold leading-[0.98] tracking-tight xl:text-6xl">
            Le catalogue FunBike, piloté en toute simplicité.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-white/58">
            Produits, images, publications et sections d’accueil : tout ce que vous modifiez ici est enregistré dans MySQL et reflété sur le site public.
          </p>

          <div className="mt-8 grid max-w-xl gap-3">
            {[
              { icon: faBoxOpen, text: "CRUD produits complet, relié à la même base que le site." },
              { icon: faHouse, text: "Sections d’accueil et ordre d’affichage gérés sans code." },
              { icon: faShieldHalved, text: "Rôles ADMIN et MARKETING vérifiés côté serveur." },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-bold text-white/72">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-fb-yellow text-fb-ink"><FontAwesomeIcon icon={item.icon} /></span>
                {item.text}
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-white/35">Accès réservé à l’équipe FunBike.</p>
      </section>

      <section className="flex items-center justify-center px-4 py-8 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-7 flex items-center gap-3 lg:hidden">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-fb-yellow">
              <img src={LOGO_URL} alt="FunBike" className="max-h-9 max-w-9 object-contain" />
            </span>
            <div>
              <p className="font-display text-xl font-bold leading-none">FunBike</p>
              <p className="mt-1 text-[0.68rem] font-extrabold uppercase tracking-[0.2em] text-fb-ink/42">Dashboard</p>
            </div>
          </div>

          <div className="card p-6 sm:p-8">
            <p className="text-[0.7rem] font-extrabold uppercase tracking-[0.2em] text-fb-yellow-dark">Connexion sécurisée</p>
            <h2 className="font-display mt-2 text-3xl font-bold tracking-tight">Bon retour.</h2>
            <p className="mt-2 text-sm leading-6 text-fb-ink/55">Connectez-vous avec le compte créé par un administrateur FunBike.</p>

            {error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800" role="alert">{error}</div>}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="label" htmlFor="login-email">Email professionnel</label>
                <input id="login-email" className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" placeholder="prenom.nom@funbike.mg" />
              </div>
              <div>
                <label className="label" htmlFor="login-password">Mot de passe</label>
                <div className="relative">
                  <input id="login-password" className="input !pr-12" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" placeholder="Votre mot de passe" />
                  <button type="button" className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-fb-ink/45 transition hover:bg-fb-cream hover:text-fb-ink" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
                    <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                  </button>
                </div>
              </div>

              <button type="submit" className="btn btn-primary w-full !min-h-12" disabled={busy}>
                <FontAwesomeIcon icon={busy ? faLock : faArrowRightToBracket} className={busy ? "fa-pulse" : ""} />
                {busy ? "Connexion en cours…" : "Se connecter"}
              </button>
            </form>

            <div className="mt-6 rounded-2xl bg-fb-cream p-4 text-[0.82rem] leading-5 text-fb-ink/58">
              <p className="flex gap-2"><FontAwesomeIcon icon={faLock} className="mt-0.5 text-fb-yellow-dark" /><span>Session protégée par jeton court et cookie de renouvellement HttpOnly. Après plusieurs échecs, la connexion est temporairement limitée.</span></p>
            </div>
          </div>

          <p className="mt-5 text-center text-xs leading-5 text-fb-ink/42">
            Premier accès ? Un ADMIN doit d’abord créer la base, importer les produits puis créer les comptes avec les commandes du serveur.
          </p>
        </div>
      </section>
    </main>
  );
}
