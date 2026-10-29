import type { AboutSectionId } from "./structure";

/** Lien vers la page d'un autre site (source, crédit, code) : en https, ouvert dans le même onglet. */
export interface AboutLink {
  /** Nom de la page liée, compréhensible hors de son contexte (liste des liens d'un lecteur d'écran). */
  label: string;
  href: `https://${string}`;
  /** Ce que le site en tire, écrit sous le nom (licences en toutes lettres). */
  description: string;
}

/** Couple terme / définition (section Accessibilité). */
export interface AboutEntry {
  term: string;
  text: string;
}

/** Une section de la page sous son titre de niveau 2 ; ordre de rendu : encart, paragraphes, définitions, liens. */
export interface AboutSection {
  /** Ancre de la section, la même dans les trois langues (`ABOUT_SECTION_IDS`). */
  id: AboutSectionId;
  heading: string;
  /** Encart mis en avant sous le titre (Confidentialité). */
  note?: string;
  paragraphs: readonly string[];
  /** Liste de définitions (Accessibilité). */
  entries?: readonly AboutEntry[];
  /** Liste filetée de liens vers d'autres sites (Sources, Crédits, Code source). */
  links?: readonly AboutLink[];
}

/** Textes de la page À propos dans une langue (`getAboutContent`). Côté serveur seulement (ADR 0003). */
export interface AboutContent {
  /** Titre de la page (h1), le nom de l'onglet. */
  title: string;
  /** Accroche, sous le titre. */
  intro: string;
  /** Nom du sommaire. */
  toc: string;
  /** Précision lue après le nom de chaque lien vers un autre site, derrière une virgule : « site externe ». */
  external: string;
  sections: readonly AboutSection[];
}
