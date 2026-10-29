import type { Locale } from "@/i18n/locales";
import { withUnit } from "@/i18n/units";
import { formatDuration, lightSeconds } from "@/lib/astro/light";
import { PLANET_BY_KEY, SUN } from "@/lib/astro/planets";
import { NEARBY_STARS } from "@/lib/astro/stars";
import { formatNumber } from "@/lib/format";

/**
 * Ce qui, dans la page À propos, ne dépend pas de la langue : l'ordre et les ancres des sections, les adresses des
 * liens. Les fichiers de langue (`fr.ts`, `en.ts`, `es.ts`) n'y ajoutent que du texte.
 */

/**
 * Ancres des sections, dans l'ordre de la page. Comme celles des escales (ADR 0003), elles sont les mêmes dans les
 * trois langues : un lien vers `#accessibilite` reste juste après un changement de langue.
 */
export const ABOUT_SECTION_IDS = [
  "pourquoi",
  "pour-qui",
  "demarche",
  "sources",
  "credits",
  "accessibilite",
  "confidentialite",
  "langues",
  "code-source",
] as const;

export type AboutSectionId = (typeof ABOUT_SECTION_IDS)[number];

/** Section qui reçoit, sous ses paragraphes, les liens vers cette page dans chaque langue. */
export const LANGUAGES_SECTION_ID = "langues" satisfies AboutSectionId;

/**
 * Adresses des pages citées, communes aux trois langues, toutes en https. Les sources sont celles que citent les
 * plaques, le pied de page, les chiffres clés de l'accueil et les données du site (README, `stars.ts`,
 * `localGroup.ts`, `universe.ts`). RECONS n'a pas d'adresse https valide : il est nommé sans lien, avec Gaia DR3.
 */
export const ABOUT_URLS = {
  /** Rayons du Soleil et de la Terre, rapport 109,2 : les 109 Terres de l'accueil. */
  nasaSunFactSheet: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html",
  nasaFactSheet: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/",
  /**
   * Résolutions de l'UAI, dont la B2 de 2012 : l'unité astronomique vaut 149 597 870 700 m, que la lumière parcourt
   * en 8 min 19 s. La page de l'UAI plutôt que ses fichiers, rangés sur un service tiers.
   */
  iauResolutions: "https://www.iau.org/IAU/Iau/Publications/List-of-Resolutions.aspx",
  jplApproximatePositions: "https://ssd.jpl.nasa.gov/planets/approx_pos.html",
  gaiaDr3: "https://www.cosmos.esa.int/web/gaia/dr3",
  simbad: "https://simbad.cds.unistra.fr/simbad/",
  /** Rayon de VY Canis Majoris par interférométrie (VLTI/AMBER), A&A 540, L12. */
  wittkowski2012: "https://arxiv.org/abs/1203.5194",
  /** Distance du Soleil au centre galactique (8 277 pc, soit 27 000 al), A&A 657, L12. */
  gravity2022: "https://arxiv.org/abs/2112.07478",
  /** Bras spiraux de la Voie lactée, ApJ 885, 131. */
  reid2019: "https://arxiv.org/abs/1910.03357",
  /** Galaxies du Groupe local, AJ 144, 4. */
  mcConnachie2012: "https://arxiv.org/abs/1204.1562",
  /** Planck 2018 results VI, A&A 641, A6 : âge et paramètres d'où vient la taille de l'Univers observable. */
  planck2018: "https://arxiv.org/abs/1807.06209",
  solarSystemScope: "https://www.solarsystemscope.com/textures/",
  bodoniModa: "https://fonts.google.com/specimen/Bodoni+Moda",
  atkinsonHyperlegibleNext: "https://www.brailleinstitute.org/freefont/",
  threeJs: "https://threejs.org/",
  nextJs: "https://nextjs.org/",
  repository: "https://github.com/ThoomassC/astronomie",
  issues: "https://github.com/ThoomassC/astronomie/issues",
} as const satisfies Readonly<Record<string, `https://${string}`>>;

/** Résumé de la licence CC BY 4.0 des cartes, dans la langue de la page : deed.fr, deed.en, deed.es. */
export function ccByUrl(locale: Locale): `https://${string}` {
  return `https://creativecommons.org/licenses/by/4.0/deed.${locale}`;
}

/**
 * Le diamètre du Soleil, écrit comme le site l'écrit dans une langue : 1 392 700 km, 1,392,700 km, 1.392.700 km.
 * Exemple de la section des langues, tiré des formateurs du site pour ne jamais s'en écarter.
 */
export function numberSample(locale: Locale): string {
  return withUnit(formatNumber(SUN.diameterKm, 0, locale), "km", locale);
}

/** Rayon de VY Canis Majoris, en rayons solaires : 1 420 ± 120 (Wittkowski et al. 2012), celui de l'accueil. */
const VY_CANIS_MAJORIS_RADIUS_SOLAR = 1420;

/** Les quatre chiffres clés de l'accueil, écrits dans une langue, pour les poser à côté de leurs sources. */
export interface SourcedFigures {
  /** Terres alignées dans la largeur du Soleil : « 109 ». */
  sunInEarths: string;
  /** Trajet de la lumière du Soleil sur une unité astronomique : « 8 min 19 s ». */
  sunlight: string;
  /** Distance de l'étoile la plus proche, Proxima du Centaure : « 4,2 al », « 4.2 ly ». */
  nearestStar: string;
  /** Rayon de VY Canis Majoris : « 1 420 R☉ », « 1,420 R☉ », « 1420 R☉ ». */
  vyCanisMajoris: string;
}

/**
 * Chiffres clés de l'accueil tirés des mêmes données et des mêmes formateurs que lui, pour que la section des sources
 * dise exactement ce que l'accueil affiche (l'espagnol ne groupe pas quatre chiffres : « 1420 R☉ »).
 */
export function sourcedFigures(locale: Locale): SourcedFigures {
  const nearestLy = Math.min(...NEARBY_STARS.map((star) => star.distanceLy));
  return {
    sunInEarths: formatNumber(Math.round(SUN.diameterKm / PLANET_BY_KEY.earth.diameterKm), 0, locale),
    sunlight: formatDuration(lightSeconds(1)),
    nearestStar: withUnit(formatNumber(nearestLy, 1, locale), "ly", locale),
    vyCanisMajoris: withUnit(formatNumber(VY_CANIS_MAJORIS_RADIUS_SOLAR, 0, locale), "solarRadius", locale),
  };
}
