import type { Locale } from "@/i18n/locales";
import type { PageKey } from "@/i18n/routes";
import { AUTHOR } from "./author";

/** Nom du site, le même dans les trois langues : marque de la barre, suffixe des titres, `og:site_name`. */
export const SITE_NAME = "Astronomie";

/** Textes de la barre commune, du menu replié, du pied de page commun et du lien d'évitement. */
export interface SiteStrings {
  /** Nom accessible de la marque, son texte visible en tête (critère 2.5.3) : « Astronomie, accueil ». */
  brandHome: string;
  /** Groupe des onglets (repère de navigation, titre de groupe) : « Rubriques ». */
  tabsLabel: string;
  /**
   * Libellés des onglets, aussi ceux du menu replié. Celui des notes de version est court (« Versions ») : cinq onglets
   * tiennent ainsi sur une ligne de 861 à 1 440 px dans les trois langues ; le nom complet est le titre de la page.
   */
  tabs: Readonly<Record<PageKey, string>>;
  /** Bouton du menu replié, à 860 px et moins : « Menu ». */
  menu: string;
  /** Groupe des langues (repère de navigation, titre de groupe) : « Langue ». */
  language: string;
  /**
   * Suite du nom accessible du bouton des langues, après le code visible (« FR ») : « FR, langue : français ». Le nom
   * de la langue suit l'usage de chacune : minuscule en français et en espagnol, majuscule en anglais.
   */
  currentLanguage: string;
  /**
   * Signature du pied de page commun : « Astronomie — un site de Thomas Caron ». Une espace insécable avant le tiret
   * le garde sur la ligne du nom du site.
   */
  signature: string;
  /** Précision lue après le nom d'un lien vers un autre site, derrière une virgule : « site externe ». */
  externalSite: string;
  /** Lien d'évitement vers le contenu : « Aller au contenu ». */
  skipToContent: string;
}

export const SITE_STRINGS: Readonly<Record<Locale, SiteStrings>> = {
  fr: {
    brandHome: `${SITE_NAME}, accueil`,
    tabsLabel: "Rubriques",
    tabs: { home: "Accueil", voyage: "Voyage", sizes: "Tailles", about: "À propos", releases: "Versions" },
    menu: "Menu",
    language: "Langue",
    currentLanguage: "langue : français",
    signature: `${SITE_NAME}\u00a0— un site de ${AUTHOR.name}`,
    externalSite: "site externe",
    skipToContent: "Aller au contenu",
  },
  en: {
    brandHome: `${SITE_NAME}, home`,
    tabsLabel: "Sections",
    tabs: { home: "Home", voyage: "Journey", sizes: "Sizes", about: "About", releases: "Releases" },
    menu: "Menu",
    language: "Language",
    currentLanguage: "language: English",
    signature: `${SITE_NAME}\u00a0— a site by ${AUTHOR.name}`,
    externalSite: "external site",
    skipToContent: "Skip to content",
  },
  es: {
    brandHome: `${SITE_NAME}, inicio`,
    tabsLabel: "Secciones",
    tabs: { home: "Inicio", voyage: "Viaje", sizes: "Tamaños", about: "Acerca de", releases: "Versiones" },
    menu: "Menú",
    language: "Idioma",
    currentLanguage: "idioma: español",
    signature: `${SITE_NAME}\u00a0— un sitio de ${AUTHOR.name}`,
    externalSite: "sitio externo",
    skipToContent: "Ir al contenido",
  },
};
