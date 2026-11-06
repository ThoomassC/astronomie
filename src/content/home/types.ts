import type { PageKey } from "@/i18n/routes";
import type { KeyFigureKey } from "@/lib/home/keyFigures";

/**
 * Pages vers lesquelles l'accueil ouvre une carte : toutes, sauf lui-même et les notes de version, que l'onglet suffit
 * à trouver (les trois portes restent celles du site).
 */
export type HomeCardPage = Exclude<PageKey, "home" | "releases">;

/** Texte d'une carte : titre (le nom de l'onglet, et celui du lien), présentation, ligne d'action. */
export interface HomeCardTexts {
  title: string;
  text: string;
  /** Ligne d'action au bas de la carte (« Commencer le voyage ») : signal visuel, le lien est le titre. */
  action: string;
}

/** Texte d'un chiffre clé ; le nombre vient des données (`keyFigureParts`). */
export interface KeyFigureTexts {
  /** Unité écrite en mots sur la ligne du nombre, s'il en faut une : « années-lumière ». */
  unit?: string;
  /** Suite de la valeur, qu'elle prolonge comme une phrase : « Terres côte à côte pour égaler… ». */
  caption: string;
  /** Valeur lue à voix haute quand la forme visible a des symboles : « 8 minutes et 19 secondes ». */
  spoken?: string;
}

/** Textes de l'accueil, rendus par le serveur (ceux du planétaire, composant client, sont dans `home.strings.ts`). */
export interface HomeContent {
  intro: {
    /** Titre de la page (h1). */
    title: string;
    text: string;
    /** Seul bouton plein de la page, vers le voyage. */
    start: string;
  };
  cards: {
    /** Titre de la section, masqué à l'œil : les cartes se suffisent. */
    title: string;
    items: Readonly<Record<HomeCardPage, HomeCardTexts>>;
  };
  figures: {
    title: string;
    items: Readonly<Record<KeyFigureKey, KeyFigureTexts>>;
    /** Ligne sous les chiffres : « Valeurs arrondies. Sources détaillées dans » + lien vers À propos + « . ». */
    note: { before: string; link: string; after: string };
  };
}
