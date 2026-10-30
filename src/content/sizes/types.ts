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

/**
 * Textes de la page « Tailles » dans une langue, lus par les composants serveur seulement. Les noms des étoiles, les
 * rayons, les rangs, les distances et la phrase de comparaison, que lisent aussi les composants client, sont dans
 * `sizes.strings.ts`.
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
    /** Bouton vers la plus petite étoile. */
    start: string;
  };
  stars: Readonly<Record<SizeStarKey, SizesStarText>>;
  /** Libellés de la fiche ; `sunDistance` est la distance du Soleil à la Terre, en minutes-lumière. */
  facts: {
    radius: string;
    type: string;
    temperature: string;
    distance: string;
    comparison: string;
    sunDistance: string;
  };
  /** Couleur d'une étoile en mots, selon sa température (accordée à « étoile »). */
  tints: Readonly<Record<TemperatureTint, string>>;
  /** Après la couleur : la température comparée à celle du Soleil ; `reference` sur la plaque du Soleil. */
  vsSun: { cooler: string; hotter: string; reference: string };
  /** Bouts de la réglette des températures. */
  thermo: { cooler: string; hotter: string };
  /** Bouton de la fiche, lien vers la plus petite étoile, mention qui précède les sources de l'étoile. */
  plate: { story: string; restart: string; sources: string };
}
