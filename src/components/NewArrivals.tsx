import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faCheck } from "@fortawesome/free-solid-svg-icons";
import { motion, type Variants } from "framer-motion";
import { BIKES } from "../data";
import SmartImage from "./SmartImage";

type NewItem = {
  id: string;
  badge: string;
  eyebrow: string;
  title: string;
  desc: string;
  image: string;
  alt: string;
  bullets: string[];
  price: string;
};

const bike = (id: string) => BIKES.find((item) => item.id === id)!;

const ITEMS: NewItem[] = [
  {
    id: "sherco-sef-250-factory-2026",
    badge: "Nouveauté 2026",
    eyebrow: "Sherco / Enduro",
    title: "SEF 250 Factory",
    desc: "La nouvelle génération Factory arrive chez Funbike : suspensions KYB, châssis affûté et moteur 250 cc.",
    image: bike("sherco-sef-250-factory-2026").image,
    alt: "Sherco SEF 250 Factory 2026 sur piste",
    bullets: ["Suspensions KYB", "Deux cartographies", "Freinage Galfer"],
    price: "Sur devis",
  },
  {
    id: "tvs-200-4v",
    badge: "Arrivage",
    eyebrow: "TVS / Urbain sportif",
    title: "Apache 200 4V",
    desc: "Une sportive urbaine pensée pour le quotidien : moteur 200 cc, ABS et plusieurs modes de conduite.",
    image: bike("tvs-200-4v").image,
    alt: "TVS Apache 200 4V",
    bullets: ["ABS", "Modes de conduite", "Tableau de bord digital"],
    price: "Sur devis",
  },
  {
    id: "tld",
    badge: "Collection 2026",
    eyebrow: "Troy Lee Designs / Pilote",
    title: "Casques GP Pro",
    desc: "Les nouveaux graphismes Pulse, Slides et Segment viennent renouveler la gamme de casques pilote.",
    image: "https://troyleedesigns.eu/cdn/shop/files/TLD_M26D2_GPPRO_PULSE_BLACK_01.jpg?v=1785777688&width=533",
    alt: "Casque Troy Lee Designs GP Pro Pulse Black",
    bullets: ["Coque légère", "Ventilation travaillée", "Graphismes inédits"],
    price: "Sur devis",
  },
];

const list: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const itemMotion: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
};

export default function NewArrivals({ go }: { go: (p: string, id?: string) => void }) {
  return (
    <section className="bg-white py-10 dark:bg-[#141513] sm:py-12 lg:py-14">
      <div className="mx-auto w-full max-w-(--container-site) px-4 sm:px-7 lg:px-10">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-t border-black/15 pt-4 dark:border-white/15 sm:mb-10">
          <div>
            <p className="fluid-eyebrow mb-2 font-bold uppercase text-[#98741b] dark:text-[#ffd100]">
              Nouveautés / Arrivages
            </p>
            <h2 className="fluid-h2 font-display font-semibold text-[#171816] dark:text-[#f2f0ea]">
              Frais de l'atelier.
            </h2>
          </div>
          <p className="fluid-body max-w-sm text-black/55 dark:text-white/55">
            Trois nouveautés sélectionnées par l'équipe Funbike. Disponibilités sur demande.
          </p>
        </div>

        <motion.div
          variants={list}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.12 }}
          className="grid gap-x-5 gap-y-8 sm:grid-cols-2 md:grid-cols-3 md:gap-x-6 lg:gap-x-8"
        >
          {ITEMS.map((product) => (
            <motion.article
              key={product.title}
              variants={itemMotion}
              whileHover={{ y: -5 }}
              className="fb-card group flex min-w-0 flex-col p-2.5 sm:p-3"
            >
              <button
                onClick={() => go(product.id === "tld" ? "equipements" : "product", product.id)}
                className="fb-stage-white relative block aspect-[16/10] overflow-hidden text-left"
                aria-label={`Découvrir ${product.title}`}
              >
                <SmartImage
                  src={product.image}
                  alt={product.alt}
                  className="absolute inset-0"
                  imgClassName="object-contain p-2 transition-transform duration-500 group-hover:scale-[1.035]"
                />

              </button>

              <div className="flex flex-1 flex-col pt-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-black/50 dark:text-white/55">
                  {product.eyebrow}
                </p>
                <h3 className="fluid-h3 mt-1 font-display font-semibold text-[#171816] dark:text-[#f2f0ea]">
                  {product.title}
                </h3>
                <p className="mt-2 text-xs leading-5 text-black/55 dark:text-white/55">{product.desc}</p>

                <ul className="mt-4 grid grid-cols-1 gap-y-1.5">
                  {product.bullets.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-[11px] text-black/70 dark:text-white/70">
                      <FontAwesomeIcon icon={faCheck} className="text-[9px] text-black/45 dark:text-white/55" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="mt-5 flex items-center justify-between border-t border-black/15 pt-3 dark:border-white/15">
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.14em] text-black/45 dark:text-white/45">Tarif</p>
                    <p className="mt-0.5 text-xs font-semibold text-[#171816] dark:text-[#f2f0ea]">{product.price}</p>
                  </div>
                  <button
                    onClick={() => go(product.id === "tld" ? "equipements" : "product", product.id)}
                    className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#171816] transition hover:text-black/60 dark:text-[#f2f0ea] dark:hover:text-white/70"
                  >
                    Voir le produit
                    <FontAwesomeIcon icon={faArrowRight} className="transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            </motion.article>
          ))}
        </motion.div>

        <button
          onClick={() => go("catalogue")}
          className="mt-8 inline-flex items-center gap-2 border-b border-[#171816] pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#171816] transition hover:border-[#98741b] hover:text-[#98741b] dark:border-[#f2f0ea] dark:text-[#f2f0ea] dark:hover:text-[#ffd100]"
        >
          Parcourir le catalogue <FontAwesomeIcon icon={faArrowRight} />
        </button>
      </div>
    </section>
  );
}