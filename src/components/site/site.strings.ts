import type { Locale } from "@/i18n/locales";
import type { PageKey } from "@/i18n/routes";

/** Nom du site, le même dans les trois langues : marque de la barre, suffixe des titres, `og:site_name`. */
export const SITE_NAME = "Astronomie";

/** Textes de la barre commune, du menu replié, du plan du site et du lien d'évitement. */
export interface SiteStrings {
  /** Nom accessible de la marque, son texte visible en tête (critère 2.5.3) : « Astronomie, accueil ». */
  brandHome: string;
  /** Groupe des onglets (repère de navigation, titre de groupe) : « Rubriques ». */
  tabsLabel: string;
  /** Libellés des onglets. */
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
  /** Plan du site, en pied de page : « Plan du site ». */
  siteMap: string;
  /** Lien d'évitement vers le contenu : « Aller au contenu ». */
  skipToContent: string;
}

export const SITE_STRINGS: Readonly<Record<Locale, SiteStrings>> = {
  fr: {
    brandHome: `${SITE_NAME}, accueil`,
    tabsLabel: "Rubriques",
    tabs: { home: "Accueil", voyage: "Voyage", sizes: "Tailles", about: "À propos" },
    menu: "Menu",
    language: "Langue",
    currentLanguage: "langue : français",
    siteMap: "Plan du site",
    skipToContent: "Aller au contenu",
  },
  en: {
    brandHome: `${SITE_NAME}, home`,
    tabsLabel: "Sections",
    tabs: { home: "Home", voyage: "Journey", sizes: "Sizes", about: "About" },
    menu: "Menu",
    language: "Language",
    currentLanguage: "language: English",
    siteMap: "Site map",
    skipToContent: "Skip to content",
  },
  es: {
    brandHome: `${SITE_NAME}, inicio`,
    tabsLabel: "Secciones",
    tabs: { home: "Inicio", voyage: "Viaje", sizes: "Tamaños", about: "Acerca de" },
    menu: "Menú",
    language: "Idioma",
    currentLanguage: "idioma: español",
    siteMap: "Mapa del sitio",
    skipToContent: "Ir al contenido",
  },
};
