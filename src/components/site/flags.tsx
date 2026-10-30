import type { ReactNode } from "react";
import type { Locale } from "@/i18n/locales";
import styles from "./SiteHeader.module.css";

/** Dessin d'un drapeau : son repère (`viewBox`, au rapport 3:2) et ses formes, aux couleurs officielles. */
interface FlagArt {
  viewBox: string;
  shapes: ReactNode;
}

/**
 * Drapeaux des trois langues, dessinés en SVG plutôt qu'en emoji, que Windows n'affiche pas en drapeaux :
 * - France : bleu, blanc, rouge, en trois bandes égales ;
 * - Royaume-Uni, car le site écrit l'anglais britannique (`en-GB`) : l'Union Jack redessiné au rapport 3:2, diagonales
 *   d'un coin à l'autre, largeurs réglées sur la hauteur comme l'original (croix blanche d'un tiers, rouge d'un
 *   cinquième ; sautoir blanc d'un cinquième, rouge d'un quinzième, contre-changé : le rouge longe chaque diagonale
 *   d'un seul côté, dessous côté hampe, dessus côté battant, le blanc large de l'autre) ;
 * - Espagne : le drapeau civil, sans armoiries, rouge, jaune, rouge en bandes 1:2:1.
 */
const FLAGS: Readonly<Record<Locale, FlagArt>> = {
  fr: {
    viewBox: "0 0 3 2",
    shapes: (
      <>
        <path fill="#0055A4" d="M0 0h1v2H0z" />
        <path fill="#FFFFFF" d="M1 0h1v2H1z" />
        <path fill="#EF4135" d="M2 0h1v2H2z" />
      </>
    ),
  },
  en: {
    viewBox: "0 0 30 20",
    shapes: (
      <>
        <path fill="#012169" d="M0 0h30v20H0z" />
        {/* Sautoir blanc, coupé aux bords par le cadre du dessin. */}
        <path fill="none" stroke="#FFFFFF" strokeWidth="4" d="M0 0l30 20M30 0 0 20" />
        {/* Sautoir rouge, d'un seul côté de chaque diagonale : sous elle côté hampe, au-dessus côté battant. */}
        <path
          fill="#C8102E"
          d="M0 0l15 10h-2.404L0 1.602zm30 20L15 10h2.404L30 18.398zM30 0 15 10V8.398L27.596 0zM0 20l15-10v1.602L2.404 20z"
        />
        <path fill="none" stroke="#FFFFFF" strokeWidth="6.667" d="M15 0v20M0 10h30" />
        <path fill="none" stroke="#C8102E" strokeWidth="4" d="M15 0v20M0 10h30" />
      </>
    ),
  },
  es: {
    viewBox: "0 0 3 2",
    shapes: (
      <>
        <path fill="#AA151B" d="M0 0h3v2H0z" />
        <path fill="#F1BF00" d="M0 .5h3v1H0z" />
      </>
    ),
  },
};

/**
 * Drapeau de la langue, 21 × 14 px, purement décoratif (`aria-hidden`) : les langues ne sont pas des pays, et le
 * texte voisin (« FR », « Français ») reste le libellé et le nom accessible. Composant sans état : la barre, ses
 * listes et ses liens directs sans JavaScript le partagent.
 */
export function Flag({ locale }: { locale: Locale }) {
  const { viewBox, shapes } = FLAGS[locale];
  return (
    <svg className={styles.flag} width="21" height="14" viewBox={viewBox} aria-hidden="true" focusable="false">
      {shapes}
    </svg>
  );
}
