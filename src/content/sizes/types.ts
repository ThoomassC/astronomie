import type { SizeStarKey } from "@/lib/astro/starSizes";

/** Textes d'une étoile, sur sa plaque. */
export interface SizesStarText {
  /** Catégorie, au-dessus du nom : « Naine rouge ». */
  rank: string;
  /** Accroche, sous le nom. */
  hook: string;
  /** Présentation, en tête de la fiche. */
  lede: string;
  /** Mise en garde sous la fiche : seulement pour les rayons débattus, ceux qui ont une fourchette publiée. */
  caveat?: string;
}

/**
 * Textes de la page « Tailles » dans une langue, lus par les composants serveur seulement. Les noms des étoiles, les
 * rayons et la phrase de comparaison, que lisent aussi les composants client, sont dans `sizes.strings.ts`.
 */
export interface SizesContent {
  intro: {
    /** Surtitre, au-dessus du titre. */
    rank: string;
    /** Titre de la page (h1). */
    title: string;
    text: string;
    /** Ce que montre la scène 3D décorative, lu par les lecteurs d'écran. */
    sceneDescription: string;
    /** Bouton vers la première étoile. */
    start: string;
  };
  stars: Readonly<Record<SizeStarKey, SizesStarText>>;
  /** Libellés de la fiche ; `sunDistance` est la distance du Soleil à la Terre, en minutes-lumière. */
  facts: {
    radius: string;
    radiusKm: string;
    temperature: string;
    distance: string;
    type: string;
    comparison: string;
    sunDistance: string;
  };
  /** Bouton de la fiche, lien vers la première étoile, mention qui précède les sources de l'étoile. */
  plate: { story: string; restart: string; sources: string };
}
