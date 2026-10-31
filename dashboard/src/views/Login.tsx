import { useState, type FormEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../auth";
import { Logo } from "../components/ui";

export default function Login() {
  const { login } = useAuth();
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
      await login(email.trim(), password);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "La connexion a échoué.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f6f4] px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-[0_8px_30px_rgba(23,24,22,0.06)] sm:p-7" aria-labelledby="login-title">
          <h1 id="login-title" className="font-display text-center text-2xl font-bold tracking-tight text-fb-ink">
            Connexion
          </h1>
          <p className="mt-1 text-center text-sm text-fb-ink/55">Accédez au dashboard FunBike.</p>

          {error && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="label" htmlFor="login-email">Email</label>
              <input
                id="login-email"
                className="input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                autoFocus
                placeholder="vous@funbike.mg"
              />
            </div>

            <div>
              <label className="label" htmlFor="login-password">Mot de passe</label>
              <div className="relative">
                <input
                  id="login-password"
                  className="input !pr-12"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Votre mot de passe"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-fb-ink/45 transition hover:bg-fb-cream hover:text-fb-ink"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full !min-h-11" disabled={busy}>
              {busy ? "Connexion…" : "Se connecter"}
            </button>
          </form>
        </section>

        <p className="mt-5 text-center text-xs text-fb-ink/45">Accès réservé à l’équipe FunBike.</p>
      </div>
    </main>
  );
}
