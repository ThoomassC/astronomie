import type { AboutSectionId } from "./structure";

/** Lien vers la page d'un autre site (une source) : en https, ouvert dans le même onglet. */
export interface AboutLink {
  /** Nom de la page liée, compréhensible hors de son contexte (liste des liens d'un lecteur d'écran). */
  label: string;
  href: `https://${string}`;
  /** Ce que le site en tire, écrit sous le nom. */
  description: string;
}

/** Une section de la page sous son titre de niveau 2 : ses paragraphes, puis ses liens (Sources). */
export interface AboutSection {
  /** Ancre de la section, la même dans les trois langues (`ABOUT_SECTION_IDS`). */
  id: AboutSectionId;
  heading: string;
  paragraphs: readonly string[];
  /** Liste filetée de liens vers d'autres sites (Sources). */
  links?: readonly AboutLink[];
}

/** Textes de la page À propos dans une langue (`getAboutContent`). Côté serveur seulement (ADR 0003). */
export interface AboutContent {
  /** Titre de la page (h1), le nom de l'onglet. */
  title: string;
  /** Accroche, sous le titre. */
  intro: string;
  /** Précision lue après le nom de chaque lien vers un autre site, derrière une virgule : « site externe ». */
  external: string;
  /** Pourquoi ce site, puis ses sources (`ABOUT_SECTION_IDS`). */
  sections: readonly AboutSection[];
}
