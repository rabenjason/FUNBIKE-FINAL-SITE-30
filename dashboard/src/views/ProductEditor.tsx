import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowDown,
  faArrowLeft,
  faArrowUp,
  faImage,
  faLink,
  faPlus,
  faSave,
  faStar,
  faTrash,
  faUpload,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../auth";
import { resolveApiAssetUrl, uploadProductImage } from "../api";
import type { HomeCard, Product, ProductSpec, ProductStatus, Route } from "../types";
import { StatusBadge, useToast } from "../components/ui";

const BIKE_CATEGORIES = ["Off-road", "Urbain", "3 roues"];
const PART_CATEGORIES = ["Casques", "Blousons", "Gants", "Bottes", "Pièces", "Pneus", "Freinage", "Transmission", "Filtration", "Pièces moteur", "Consommables"];
const BRAND_SUGGESTIONS = ["Sherco", "Fantic", "TVS", "Funbike", "Troy Lee Designs", "Gaerne", "MT Helmets", "Bihr", "Galfer"];
const PART_KINDS = [
  { value: "piece", label: "Pièce détachée" },
  { value: "tvs", label: "Équipement TVS" },
  { value: "tld", label: "Troy Lee Designs" },
  { value: "gaerne", label: "Gaerne" },
  { value: "mt", label: "MT Helmets" },
];
const COMPATIBLE_BRANDS = ["Universal", "TVS", "Sherco", "Fantic"];
const PART_TYPES = ["Pneus", "Freinage", "Transmission", "Filtration", "Pièces moteur", "Consommables"];
const DEMO_IMAGE = "https://funbike.mg/wp-content/uploads/2026/02/01-250-SEF-FACTORY-2026-3679x2456-1-1920x1080-1.jpg";

interface Draft {
  id: string;
  type: Product["type"];
  name: string;
  brand: string;
  category: string;
  description: string;
  alt: string;
  price: string;
  status: ProductStatus;
  homeNew: boolean;
  motosHome: boolean;
  essentialsHome: boolean;
  homeNewOrder: string;
  motosHomeOrder: string;
  essentialsHomeOrder: string;
  tag: string;
  partKind: string;
  metadataCategory: string;
  compatibleBrand: string;
  partType: string;
  sourceUrl: string;
}

const EMPTY_CARD: HomeCard = { surTitre: "", titre: "", description: "", points: [], alt: "" };

function metadataString(product: Product | undefined, key: string) {
  const value = product?.metadata?.[key];
  return typeof value === "string" ? value : "";
}

function toDraft(product?: Product): Draft {
  return {
    id: product?.id ?? "",
    type: product?.type ?? "bike",
    name: product?.name ?? "",
    brand: product?.brand ?? "",
    category: product?.category ?? "Off-road",
    description: product?.description ?? "",
    alt: product?.alt ?? "",
    price: product?.price ?? "Sur devis",
    status: product?.status ?? "ARCHIVED",
    homeNew: product?.homeNew ?? false,
    motosHome: product?.motosHome ?? false,
    essentialsHome: product?.essentialsHome ?? false,
    homeNewOrder: product?.homeNewOrder?.toString() ?? "",
    motosHomeOrder: product?.motosHomeOrder?.toString() ?? "",
    essentialsHomeOrder: product?.essentialsHomeOrder?.toString() ?? "",
    tag: metadataString(product, "tag"),
    partKind: metadataString(product, "kind") || "piece",
    metadataCategory: metadataString(product, "category"),
    compatibleBrand: metadataString(product, "compatibleBrand"),
    partType: metadataString(product, "partType"),
    sourceUrl: metadataString(product, "sourceUrl"),
  };
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function parseOrder(value: string) {
  if (!value.trim()) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

export default function ProductEditor({
  product,
  products,
  navigate,
  onSave,
}: {
  product?: Product;
  products: Product[];
  navigate: (route: Route) => void;
  onSave: (product: Product, mode: "create" | "update") => Promise<Product>;
}) {
  const { hasPermission } = useAuth();
  const toast = useToast();
  const isEditing = Boolean(product);
  const [draft, setDraft] = useState<Draft>(() => toDraft(product));
  const [idTouched, setIdTouched] = useState(isEditing);
  const [images, setImages] = useState<string[]>(() => (product ? [...product.images] : []));
  const [newImageUrl, setNewImageUrl] = useState("");
  const [specs, setSpecs] = useState<ProductSpec[]>(() => (product ? [...product.specs] : []));
  const [homeCard, setHomeCard] = useState<HomeCard>(() => product?.homeCard ?? EMPTY_CARD);
  const [pointsText, setPointsText] = useState(() => (product?.homeCard?.points ?? []).join("\n"));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const duplicateId = useMemo(
    () => !isEditing && draft.id.trim() !== "" && products.some((item) => item.id === draft.id.trim()),
    [draft.id, isEditing, products],
  );

  const canSave = isEditing ? hasPermission("products:update") : hasPermission("products:create");

  function updateDraft<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => {
      const next = { ...current, [key]: value };
      if (key === "name" && !isEditing && !idTouched) next.id = slugify(String(value));
      if (key === "type") {
        next.category = value === "bike" ? "Off-road" : "Pièces";
        if (value === "part" && !next.metadataCategory) next.metadataCategory = "Pièces";
      }
      return next;
    });
  }

  async function handleImageFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    setUploading(true);
    try {
      for (const file of files) {
        if (!file.type.startsWith("image/")) throw new Error(`« ${file.name} » n’est pas une image.`);
        if (file.size > 5 * 1024 * 1024) throw new Error(`« ${file.name} » dépasse la taille maximale de 5 Mo.`);
        const uploaded = await uploadProductImage(file);
        setImages((current) => (current.includes(uploaded.imageUrl) ? current : [...current, uploaded.imageUrl]));
      }
      toast.success(files.length > 1 ? "Images ajoutées" : "Image ajoutée", "Elle est maintenant dans la galerie du produit.");
    } catch (caught) {
      toast.error("Téléversement impossible", caught instanceof Error ? caught.message : undefined);
    } finally {
      setUploading(false);
    }
  }

  function addImage(url = newImageUrl) {
    const cleaned = url.trim();
    if (!cleaned) return;
    setImages((current) => (current.includes(cleaned) ? current : [...current, cleaned]));
    setNewImageUrl("");
  }

  function moveImage(index: number, direction: -1 | 1) {
    setImages((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function makeMain(index: number) {
    setImages((current) => {
      if (index <= 0) return current;
      const next = [...current];
      const [selected] = next.splice(index, 1);
      return [selected, ...next];
    });
  }

  function validate(): string | null {
    if (!draft.id.trim() || !/^[A-Za-z0-9_-]+$/.test(draft.id.trim())) return "La référence produit doit contenir uniquement des lettres, chiffres, tirets ou underscores.";
    if (duplicateId) return "Un produit avec cette référence existe déjà. Choisissez une autre référence.";
    if (!draft.name.trim()) return "Le nom du produit est obligatoire.";
    if (!draft.brand.trim()) return "La marque est obligatoire.";
    if (!draft.category.trim()) return "La catégorie est obligatoire.";
    if (!draft.price.trim()) return "Le prix est obligatoire. Vous pouvez indiquer « Sur devis ».";
    if (images.length === 0) return "Ajoutez au moins une image au produit.";
    if (specs.some((spec) => !spec.label.trim() || !spec.value.trim())) return "Chaque caractéristique doit avoir un libellé et une valeur, ou être supprimée.";
    return null;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      toast.error("Fiche incomplète", validationError);
      return;
    }

    // Conserver les métadonnées existantes non affichées dans ce formulaire,
    // puis appliquer uniquement les champs métier gérés par l'éditeur.
    const metadata: Record<string, unknown> = { ...(product?.metadata ?? {}) };
    if (draft.type === "bike") {
      if (draft.tag.trim()) metadata.tag = draft.tag.trim();
      else delete metadata.tag;
    } else {
      metadata.kind = draft.partKind;
      if (draft.metadataCategory.trim()) metadata.category = draft.metadataCategory.trim();
      else delete metadata.category;
      if (draft.compatibleBrand) metadata.compatibleBrand = draft.compatibleBrand;
      else delete metadata.compatibleBrand;
      if (draft.partType) metadata.partType = draft.partType;
      else delete metadata.partType;
      if (draft.sourceUrl.trim()) metadata.sourceUrl = draft.sourceUrl.trim();
      else delete metadata.sourceUrl;
    }

    const points = pointsText.split("\n").map((point) => point.trim()).filter(Boolean);
    const cardIsUsed = draft.type === "bike" && [homeCard.surTitre, homeCard.titre, homeCard.description, homeCard.alt].some((value) => value.trim()) || points.length > 0;

    const payload: Product = {
      id: draft.id.trim(),
      type: draft.type,
      name: draft.name.trim(),
      brand: draft.brand.trim(),
      category: draft.category.trim(),
      description: draft.description.trim(),
      image: images[0],
      images,
      alt: draft.alt.trim() || draft.name.trim(),
      specs: specs.map((spec) => ({ label: spec.label.trim(), value: spec.value.trim() })),
      price: draft.price.trim(),
      status: draft.status,
      homeNew: draft.homeNew,
      motosHome: draft.motosHome,
      essentialsHome: draft.essentialsHome,
      homeNewOrder: parseOrder(draft.homeNewOrder),
      motosHomeOrder: parseOrder(draft.motosHomeOrder),
      essentialsHomeOrder: parseOrder(draft.essentialsHomeOrder),
      ...(cardIsUsed ? { homeCard: { ...homeCard, points } } : {}),
      ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
    };

    setSaving(true);
    setError(null);
    try {
      const saved = await onSave(payload, isEditing ? "update" : "create");
      toast.success(isEditing ? "Produit mis à jour" : "Produit ajouté", saved.name);
      navigate({ name: "products" });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "L’enregistrement a échoué.";
      setError(message);
      toast.error("Enregistrement impossible", message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <section className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
        <button type="button" className="btn btn-ghost shrink-0" onClick={() => navigate({ name: "products" })}>
          <FontAwesomeIcon icon={faArrowLeft} />
          Catalogue
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="font-display truncate text-xl font-bold">{isEditing ? draft.name || product?.name : "Créer une fiche produit"}</h2>
          <p className="text-sm text-fb-ink/50">{isEditing ? `Référence ${product?.id}` : "La fiche sera enregistrée dans MySQL via le backend."}</p>
        </div>
        <StatusBadge status={draft.status} />
        <button type="submit" className="btn btn-primary shrink-0" disabled={saving || !canSave}>
          <FontAwesomeIcon icon={faSave} />
          {saving ? "Enregistrement…" : isEditing ? "Enregistrer" : "Ajouter le produit"}
        </button>
      </section>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{error}</div>}
      {!canSave && <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">Votre rôle permet de consulter cette fiche, mais pas de l’enregistrer.</div>}

      <div className="grid items-start gap-5 xl:grid-cols-[1.55fr_0.85fr]">
        <div className="space-y-5">
          <section className="card p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-bold">Informations principales</h3>
                <p className="text-sm text-fb-ink/50">Les informations visibles dans le catalogue et sur la fiche publique.</p>
              </div>
              <span className="badge bg-fb-yellow text-fb-ink">{draft.type === "bike" ? "Moto" : "Pièce / équipement"}</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="product-type">Type de produit</label>
                <select id="product-type" className="select" value={draft.type} onChange={(event) => updateDraft("type", event.target.value as Product["type"])} disabled={isEditing}>
                  <option value="bike">Moto</option>
                  <option value="part">Pièce / équipement</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="product-id">Référence unique</label>
                <input
                  id="product-id"
                  className="input"
                  value={draft.id}
                  disabled={isEditing}
                  onChange={(event) => {
                    setIdTouched(true);
                    updateDraft("id", event.target.value);
                  }}
                  placeholder="ex : tvs-apache-rtr-200"
                />
                {duplicateId ? <p className="help font-bold text-red-700">Cette référence existe déjà.</p> : <p className="help">Générée depuis le nom, modifiable avant création.</p>}
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="product-name">Nom du produit *</label>
                <input id="product-name" className="input" value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} placeholder="Nom commercial du produit" />
              </div>
              <div>
                <label className="label" htmlFor="product-brand">Marque *</label>
                <input id="product-brand" className="input" list="brand-suggestions" value={draft.brand} onChange={(event) => updateDraft("brand", event.target.value)} placeholder="Sherco, TVS…" />
                <datalist id="brand-suggestions">{BRAND_SUGGESTIONS.map((brand) => <option key={brand} value={brand} />)}</datalist>
              </div>
              <div>
                <label className="label" htmlFor="product-category">Catégorie *</label>
                <input id="product-category" className="input" list="category-suggestions" value={draft.category} onChange={(event) => updateDraft("category", event.target.value)} placeholder="Catégorie affichée" />
                <datalist id="category-suggestions">{(draft.type === "bike" ? BIKE_CATEGORIES : PART_CATEGORIES).map((category) => <option key={category} value={category} />)}</datalist>
              </div>
              <div>
                <label className="label" htmlFor="product-price">Prix *</label>
                <input id="product-price" className="input" value={draft.price} onChange={(event) => updateDraft("price", event.target.value)} placeholder="Sur devis ou 12 500 000 Ar" />
              </div>
              <div>
                <label className="label" htmlFor="product-alt">Texte alternatif de l’image</label>
                <input id="product-alt" className="input" value={draft.alt} onChange={(event) => updateDraft("alt", event.target.value)} placeholder="Description courte de l’image principale" />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="product-description">Description</label>
                <textarea id="product-description" className="textarea" value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} placeholder="Présentation claire du produit, de ses usages et de ses points forts…" />
              </div>
            </div>
          </section>

          <section className="card p-5 sm:p-6">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-bold">Images du produit</h3>
                <p className="text-sm text-fb-ink/50">Téléversez une image ou ajoutez-la par URL, choisissez l’image principale et organisez la galerie.</p>
              </div>
              <span className="badge bg-fb-ink/[0.06] text-fb-ink/55">{images.length} image{images.length > 1 ? "s" : ""}</span>
            </div>

            {images[0] ? (
              <div className="relative overflow-hidden rounded-3xl bg-fb-ink">
                <img src={resolveApiAssetUrl(images[0])} alt={draft.alt || draft.name} className="aspect-[16/8] w-full object-cover" />
                <span className="badge absolute left-3 top-3 bg-fb-yellow text-fb-ink"><FontAwesomeIcon icon={faStar} /> Principale</span>
              </div>
            ) : (
              <div className="flex aspect-[16/7] flex-col items-center justify-center rounded-3xl border border-dashed border-fb-ink/20 bg-fb-cream px-6 text-center">
                <FontAwesomeIcon icon={faImage} className="text-3xl text-fb-yellow-dark" />
                <p className="mt-3 font-extrabold">Aucune image pour le moment</p>
                <p className="mt-1 max-w-md text-sm text-fb-ink/50">Collez l’adresse d’une image hébergée, par exemple depuis le site FunBike ou votre bibliothèque média.</p>
                <button type="button" className="btn btn-ghost mt-4 !min-h-10" onClick={() => addImage(DEMO_IMAGE)}>Essayer avec une image FunBike</button>
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" multiple className="hidden" onChange={(event) => void handleImageFiles(event)} />
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button type="button" className="btn btn-primary shrink-0" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <FontAwesomeIcon icon={faUpload} />
                {uploading ? "Envoi en cours…" : "Depuis cet appareil"}
              </button>
              <label className="relative flex-1">
                <span className="sr-only">Adresse d’une image</span>
                <FontAwesomeIcon icon={faLink} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs text-fb-ink/35" />
                <input className="input !pl-10" value={newImageUrl} onChange={(event) => setNewImageUrl(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addImage(); } }} placeholder="https://…/image-produit.jpg" />
              </label>
              <button type="button" className="btn btn-dark shrink-0" onClick={() => addImage()}>
                <FontAwesomeIcon icon={faPlus} />
                Ajouter l’image
              </button>
            </div>

            {images.length > 0 && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {images.map((image, index) => (
                  <article key={`${image}-${index}`} className="overflow-hidden rounded-2xl border border-fb-ink/[0.09] bg-white">
                    <img src={resolveApiAssetUrl(image)} alt="" className="aspect-[16/9] w-full object-cover" loading="lazy" />
                    <div className="p-3">
                      <p className="truncate text-xs text-fb-ink/50" title={image}>{image}</p>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        {index === 0 ? <span className="badge bg-fb-yellow text-fb-ink">Principale</span> : <button type="button" className="text-xs font-extrabold text-fb-yellow-dark hover:underline" onClick={() => makeMain(index)}>Définir principale</button>}
                        <span className="flex gap-1.5">
                          <button type="button" className="icon-btn !h-9 !w-9" disabled={index === 0} onClick={() => moveImage(index, -1)} aria-label="Monter l’image"><FontAwesomeIcon icon={faArrowUp} className="text-xs" /></button>
                          <button type="button" className="icon-btn !h-9 !w-9" disabled={index === images.length - 1} onClick={() => moveImage(index, 1)} aria-label="Descendre l’image"><FontAwesomeIcon icon={faArrowDown} className="text-xs" /></button>
                          <button type="button" className="icon-btn !h-9 !w-9 !border-red-200 !bg-red-50 text-red-700" onClick={() => setImages((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label="Retirer l’image"><FontAwesomeIcon icon={faTrash} className="text-xs" /></button>
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="card p-5 sm:p-6">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-bold">Caractéristiques</h3>
                <p className="text-sm text-fb-ink/50">Exemples : Cylindrée — 250 cc, Poids — 105 kg, Taille — L.</p>
              </div>
              <button type="button" className="btn btn-ghost !min-h-10" onClick={() => setSpecs((current) => [...current, { label: "", value: "" }])}>
                <FontAwesomeIcon icon={faPlus} />
                Ajouter
              </button>
            </div>

            {specs.length === 0 ? (
              <p className="rounded-2xl bg-fb-cream px-4 py-3 text-sm text-fb-ink/55">Aucune caractéristique. Ce champ est facultatif.</p>
            ) : (
              <div className="space-y-2.5">
                {specs.map((spec, index) => (
                  <div key={index} className="grid gap-2 sm:grid-cols-[0.8fr_1.2fr_auto]">
                    <input className="input" value={spec.label} onChange={(event) => setSpecs((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))} placeholder="Libellé" aria-label={`Libellé de la caractéristique ${index + 1}`} />
                    <input className="input" value={spec.value} onChange={(event) => setSpecs((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, value: event.target.value } : item))} placeholder="Valeur" aria-label={`Valeur de la caractéristique ${index + 1}`} />
                    <button type="button" className="icon-btn !border-red-200 !bg-red-50 text-red-700" onClick={() => setSpecs((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label="Supprimer la caractéristique"><FontAwesomeIcon icon={faTrash} className="text-xs" /></button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-5">
          <section className="card p-5 sm:p-6">
            <h3 className="font-display text-lg font-bold">Publication</h3>
            <p className="mt-1 text-sm leading-6 text-fb-ink/50">Seuls les produits publiés apparaissent sur le site public.</p>
            <div className="mt-4">
              <label className="label" htmlFor="product-status">Statut</label>
              <select id="product-status" className="select" value={draft.status} onChange={(event) => updateDraft("status", event.target.value as ProductStatus)}>
                <option value="PUBLISHED">Publié — visible sur le site</option>
                <option value="ARCHIVED">Archivé — masqué du site</option>
              </select>
            </div>

            <div className="mt-6 space-y-3">
              <SectionToggle
                title="Nouveautés / Arrivages"
                description="Cartes Nouveautés de l’accueil, surtout pour les motos."
                checked={draft.homeNew}
                order={draft.homeNewOrder}
                onChecked={(checked) => updateDraft("homeNew", checked)}
                onOrder={(order) => updateDraft("homeNewOrder", order)}
              />
              <SectionToggle
                title="Motos de l’accueil"
                description="Grande section motos de la page d’accueil."
                checked={draft.motosHome}
                order={draft.motosHomeOrder}
                onChecked={(checked) => updateDraft("motosHome", checked)}
                onOrder={(order) => updateDraft("motosHomeOrder", order)}
              />
              <SectionToggle
                title="Atelier / Essentiels"
                description="Pièces et équipements mis en avant sur l’accueil."
                checked={draft.essentialsHome}
                order={draft.essentialsHomeOrder}
                onChecked={(checked) => updateDraft("essentialsHome", checked)}
                onOrder={(order) => updateDraft("essentialsHomeOrder", order)}
              />
            </div>
          </section>

          <section className="card p-5 sm:p-6">
            <h3 className="font-display text-lg font-bold">Classement dans le site</h3>
            <p className="mt-1 text-sm leading-6 text-fb-ink/50">Ces réglages permettent au site de placer le produit dans les bons filtres, sans modifier le code.</p>

            {draft.type === "bike" ? (
              <div className="mt-4">
                <label className="label" htmlFor="bike-tag">Badge moto facultatif</label>
                <input id="bike-tag" className="input" value={draft.tag} onChange={(event) => updateDraft("tag", event.target.value)} placeholder="Ex : Nouveauté, Factory…" />
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="label" htmlFor="part-kind">Famille d’accessoire</label>
                  <select id="part-kind" className="select" value={draft.partKind} onChange={(event) => updateDraft("partKind", event.target.value)}>
                    {PART_KINDS.map((kind) => <option key={kind.value} value={kind.value}>{kind.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="metadata-category">Catégorie d’équipement</label>
                  <input id="metadata-category" className="input" list="part-category-suggestions" value={draft.metadataCategory} onChange={(event) => updateDraft("metadataCategory", event.target.value)} placeholder="Casques, Blousons, Pièces…" />
                  <datalist id="part-category-suggestions">{PART_CATEGORIES.map((category) => <option key={category} value={category} />)}</datalist>
                </div>
                <div>
                  <label className="label" htmlFor="compatible-brand">Compatibilité</label>
                  <select id="compatible-brand" className="select" value={draft.compatibleBrand} onChange={(event) => updateDraft("compatibleBrand", event.target.value)}>
                    <option value="">Non précisée</option>
                    {COMPATIBLE_BRANDS.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="part-type">Type de pièce</label>
                  <select id="part-type" className="select" value={draft.partType} onChange={(event) => updateDraft("partType", event.target.value)}>
                    <option value="">Non précisé</option>
                    {PART_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="source-url">Lien source facultatif</label>
                  <input id="source-url" className="input" value={draft.sourceUrl} onChange={(event) => updateDraft("sourceUrl", event.target.value)} placeholder="https://…" />
                </div>
              </div>
            )}
          </section>

          {draft.type === "bike" && (
            <section className="card p-5 sm:p-6">
              <h3 className="font-display text-lg font-bold">Carte Nouveautés</h3>
              <p className="mt-1 text-sm leading-6 text-fb-ink/50">Texte court utilisé uniquement si la moto est sélectionnée dans Nouveautés / Arrivages.</p>
              <div className="mt-4 space-y-4">
                <div><label className="label">Sur-titre</label><input className="input" value={homeCard.surTitre} onChange={(event) => setHomeCard((current) => ({ ...current, surTitre: event.target.value }))} placeholder="Nouveauté Sherco" /></div>
                <div><label className="label">Titre court</label><input className="input" value={homeCard.titre} onChange={(event) => setHomeCard((current) => ({ ...current, titre: event.target.value }))} placeholder="SEF 250 Factory" /></div>
                <div><label className="label">Description courte</label><textarea className="textarea !min-h-24" value={homeCard.description} onChange={(event) => setHomeCard((current) => ({ ...current, description: event.target.value }))} placeholder="Une phrase courte et vendeuse…" /></div>
                <div><label className="label">Points forts</label><textarea className="textarea !min-h-24" value={pointsText} onChange={(event) => setPointsText(event.target.value)} placeholder={"Un point par ligne\nSuspensions KYB\nPrête pour la compétition"} /><p className="help">Un point fort par ligne, idéalement trois maximum.</p></div>
                <div><label className="label">Texte alternatif de la carte</label><input className="input" value={homeCard.alt} onChange={(event) => setHomeCard((current) => ({ ...current, alt: event.target.value }))} /></div>
              </div>
            </section>
          )}

          <div className="card flex flex-col gap-2 p-4 sm:flex-row xl:flex-col">
            <button type="submit" className="btn btn-primary flex-1" disabled={saving || !canSave}>
              <FontAwesomeIcon icon={faSave} />
              {saving ? "Enregistrement…" : isEditing ? "Enregistrer les modifications" : "Ajouter au catalogue"}
            </button>
            <button type="button" className="btn btn-ghost flex-1" onClick={() => navigate({ name: "products" })}>Retour au catalogue</button>
          </div>
        </div>
      </div>
    </form>
  );
}

function SectionToggle({
  title,
  description,
  checked,
  order,
  onChecked,
  onOrder,
}: {
  title: string;
  description: string;
  checked: boolean;
  order: string;
  onChecked: (checked: boolean) => void;
  onOrder: (order: string) => void;
}) {
  return (
    <div className={`rounded-2xl border p-3.5 transition ${checked ? "border-fb-yellow bg-fb-yellow/12" : "border-fb-ink/[0.09] bg-white"}`}>
      <div className="flex items-start gap-3">
        <button type="button" className="switch mt-0.5" data-checked={checked} onClick={() => onChecked(!checked)} aria-pressed={checked} aria-label={`Afficher dans ${title}`} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold">{title}</p>
          <p className="mt-0.5 text-xs leading-5 text-fb-ink/50">{description}</p>
        </div>
      </div>
      {checked && (
        <div className="mt-3 pl-[3.7rem]">
          <label className="label" htmlFor={`order-${title}`}>Ordre d’affichage</label>
          <input id={`order-${title}`} className="input !w-28" type="number" min="0" step="1" value={order} onChange={(event) => onOrder(event.target.value)} placeholder="Auto" />
        </div>
      )}
    </div>
  );
}
