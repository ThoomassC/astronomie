import type { Locale } from "@/i18n/locales";
import type { AboutSectionId } from "./structure";

/** Lien vers la page d'un autre site (une source) : en https, ouvert dans le même onglet. */
export interface AboutLink {
  /** Nom de la page liée, compréhensible hors de son contexte (liste des liens d'un lecteur d'écran). */
  label: string;
  href: `https://${string}`;
  /**
   * Langue du nom quand c'est le titre original de la source, laissé tel quel dans les trois langues (« NASA, Sun Fact
   * Sheet ») ; c'est aussi celle de la page liée. Propriété de la source, la même dans chaque langue : la page marque
   * le titre (`lang`) quand il n'est pas dans sa langue, pour qu'il soit lu avec la bonne prononciation (critère
   * 3.1.2), et dit la langue de la page liée (`hrefLang`).
   */
  lang?: Locale;
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
