import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckCircle,
  faCircleExclamation,
  faInfoCircle,
  faXmark,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import type { ProductStatus, UserRole } from "../types";

export const LOGO_URL = "https://funbike.mg/wp-content/themes/funbike/images/logo-funbike.png";

export function publicSiteUrl() {
  const configured = import.meta.env.VITE_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");

  if (typeof window !== "undefined" && /^\d+-[^.]+\.e2b\.app$/.test(window.location.hostname)) {
    return `${window.location.protocol}//${window.location.hostname.replace(/^\d+/, "5173")}`;
  }

  return "http://localhost:5173";
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-fb-yellow shadow-[0_10px_24px_rgb(255_209_0/0.25)]">
        <img src={LOGO_URL} alt="FunBike" className="max-h-9 max-w-9 object-contain" />
      </span>
      {!compact && (
        <span className="min-w-0">
          <span className="font-display block truncate text-[1.05rem] font-bold leading-none tracking-tight text-white">
            FunBike
          </span>
          <span className="mt-1 block text-[0.68rem] font-bold uppercase tracking-[0.18em] text-white/45">
            Dashboard
          </span>
        </span>
      )}
    </span>
  );
}

export function StatusBadge({ status }: { status: ProductStatus }) {
  return status === "PUBLISHED" ? (
    <span className="badge bg-emerald-100 text-emerald-800">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
      Publié
    </span>
  ) : (
    <span className="badge bg-stone-200 text-stone-700">
      <span className="h-1.5 w-1.5 rounded-full bg-stone-500" />
      Archivé
    </span>
  );
}

export function RoleBadge({ role }: { role: UserRole }) {
  return role === "ADMIN" ? (
    <span className="badge bg-fb-yellow text-fb-ink">Admin</span>
  ) : (
    <span className="badge bg-sky-100 text-sky-800">Marketing</span>
  );
}

export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: IconDefinition;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-fb-yellow/25 text-fb-yellow-dark">
        <FontAwesomeIcon icon={icon} className="text-xl" />
      </span>
      <h3 className="font-display mt-4 text-lg font-bold text-fb-ink">{title}</h3>
      <p className="mt-1 max-w-md text-sm leading-6 text-fb-ink/55">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  text: string;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  title,
  text,
  confirmLabel,
  danger = false,
  busy = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-fb-ink/55 p-4 backdrop-blur-sm sm:items-center">
      <div className="card w-full max-w-md p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-fb-ink/60">{text}</p>
          </div>
          <button type="button" className="icon-btn shrink-0" onClick={onCancel} aria-label="Fermer">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
            Annuler
          </button>
          <button type="button" className={danger ? "btn btn-danger" : "btn btn-primary"} onClick={onConfirm} disabled={busy}>
            {busy ? "Traitement…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

type ToastKind = "success" | "error" | "info";

interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
}

interface ToastContextValue {
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_ICONS: Record<ToastKind, IconDefinition> = {
  success: faCheckCircle,
  error: faCircleExclamation,
  info: faInfoCircle,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, title: string, message?: string) => {
      const id = nextId.current++;
      setToasts((current) => [...current.slice(-3), { id, kind, title, message }]);
      window.setTimeout(() => dismiss(id), 5200);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (title, message) => push("success", title, message),
      error: (title, message) => push("error", title, message),
      info: (title, message) => push("info", title, message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 sm:bottom-6 sm:right-6">
        {toasts.map((toast) => (
          <article
            key={toast.id}
            className={`toast-in pointer-events-auto flex gap-3 rounded-2xl border p-4 shadow-xl backdrop-blur ${
              toast.kind === "error"
                ? "border-red-200 bg-red-50/95 text-red-950"
                : toast.kind === "success"
                  ? "border-emerald-200 bg-emerald-50/95 text-emerald-950"
                  : "border-fb-yellow/50 bg-white/95 text-fb-ink"
            }`}
            role="status"
          >
            <FontAwesomeIcon
              icon={TOAST_ICONS[toast.kind]}
              className={`mt-0.5 text-lg ${toast.kind === "error" ? "text-red-600" : toast.kind === "success" ? "text-emerald-600" : "text-fb-yellow-dark"}`}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold">{toast.title}</p>
              {toast.message && <p className="mt-0.5 break-words text-[0.82rem] leading-5 opacity-70">{toast.message}</p>}
            </div>
            <button type="button" className="text-current opacity-50 transition hover:opacity-100" onClick={() => dismiss(toast.id)} aria-label="Fermer la notification">
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </article>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast doit être utilisé dans ToastProvider.");
  return context;
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date);
}
