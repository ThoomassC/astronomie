import type { BlackHoleKey } from "@/lib/astro/blackHoles";
import type { SizeStarKey } from "@/lib/astro/starSizes";
import type { TemperatureTint } from "@/lib/sizes/temperature";

/** Textes d'une étoile, sur sa plaque. */
export interface SizesStarText {
  /** Catégorie, en minuscules : « naine rouge », « supergéante rouge » ; dans le rang et dans la fiche. */
  kind: string;
  /** Accroche, sous le nom : la comparaison qui frappe, visible même plaque repliée. */
  hook: string;
  /** Présentation, en tête de la fiche. */
  lede: string;
  /** Mise en garde sous la fiche : seulement pour les rayons débattus, ceux qui ont une fourchette publiée. */
  caveat?: string;
}

/** Textes d'un trou noir, sur sa plaque. Chaque nombre écrit vient des données (tests de content.test.ts). */
export interface SizesBlackHoleText {
  /** Catégorie, en minuscules : « trou noir stellaire » ; dans le rang et dans la fiche. */
  kind: string;
  /** Accroche, sous le nom : ce qui frappe, visible même plaque repliée. */
  hook: string;
  /** Présentation, en tête de la fiche. */
  lede: string;
  /**
   * Ce que la vue simplifie, ligne discrète sous la fiche : elle commence par « Rendu calculé », jamais par un mot qui
   * donnerait l'image pour observée ; elle dit les fausses couleurs d'un anneau vu en ondes radio.
   */
  simplification: string;
  /** Mise en garde sous la fiche : seulement pour les masses débattues, celles qui ont une fourchette publiée. */
  caveat?: string;
}

/**
 * Textes de la page « Tailles » dans une langue, lus par les composants serveur seulement. Les noms des astres, les
 * tailles, les masses, les rangs, les distances et la phrase de comparaison, que lisent aussi les composants client,
 * sont dans `sizes.strings.ts`.
 */
export interface SizesContent {
  intro: {
    /** Titre de la page (h1). */
    title: string;
    text: string;
    /** Ligne discrète sous le texte : ce qui est à l'échelle, et ce qui ne l'est pas. */
    note: string;
    /** Ce que montre la scène 3D décorative, lu par les lecteurs d'écran. */
    sceneDescription: string;
    /** Bouton vers le plus petit astre. */
    start: string;
  };
  stars: Readonly<Record<SizeStarKey, SizesStarText>>;
  blackHoles: Readonly<Record<BlackHoleKey, SizesBlackHoleText>>;
  /**
   * Libellés de la fiche ; `sunDistance` est la distance du Soleil à la Terre, en minutes-lumière. Trous noirs : rayon de
   * l'ombre (la taille comparée), rayon de l'horizon, masse, et leur type (celui des étoiles dit « Star type » en anglais).
   */
  facts: {
    radius: string;
    type: string;
    temperature: string;
    distance: string;
    comparison: string;
    sunDistance: string;
    shadow: string;
    horizon: string;
    mass: string;
    blackHoleType: string;
  };
  /** Couleur d'une étoile en mots, selon sa température (accordée à « étoile »). */
  tints: Readonly<Record<TemperatureTint, string>>;
  /** Après la couleur : la température comparée à celle du Soleil ; `reference` sur la plaque du Soleil. */
  vsSun: { cooler: string; hotter: string; reference: string };
  /** Bouts de la réglette des températures. */
  thermo: { cooler: string; hotter: string };
  /** Bouton de la fiche, lien vers le plus petit astre, mention qui précède les sources de l'astre. */
  plate: { story: string; restart: string; sources: string };
}
