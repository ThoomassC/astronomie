import type { Locale } from "@/i18n/locales";
import { lightSeconds } from "@/lib/astro/light";
import { PLANET_BY_KEY, SUN } from "@/lib/astro/planets";
import { NEARBY_STARS } from "@/lib/astro/stars";
import { formatNumber } from "@/lib/format";

/**
 * Chiffres clés de l'accueil, du plus proche au plus lointain : la largeur du Soleil, le trajet de sa lumière,
 * l'étoile la plus proche, la plus grande étoile bien mesurée. Ce que chaque nombre mesure, et son unité en mots,
 * vivent dans `src/content/home` ; les sources détaillées, dans la page À propos.
 */
export const KEY_FIGURES = ["sunWidth", "sunlight", "proxima", "largestStar"] as const;

export type KeyFigureKey = (typeof KEY_FIGURES)[number];

/**
 * Couleur du repère posé au départ de chaque chiffre : l'astre dont il parle (MASTER) — le Soleil, la Terre qui reçoit
 * sa lumière, les étoiles voisines (couleur de l'escale), VY Canis Majoris (corps noir à 3 500 K, `donnees-v2.md`).
 * Seul usage de la couleur : le sens est dans le texte.
 */
export const KEY_FIGURE_COLORS: Readonly<Record<KeyFigureKey, string>> = {
  sunWidth: SUN.color,
  sunlight: PLANET_BY_KEY.earth.color,
  proxima: "#CFDCFF",
  largestStar: "#FFC987",
};

/**
 * Rayon de VY Canis Majoris, en rayons solaires : 1 420 ± 120 (Wittkowski et al. 2012, VLTI/AMBER, distance par
 * parallaxe de masers). La plus grande des étoiles dont le diamètre est mesuré directement et la distance géométrique.
 */
export const LARGEST_STAR_RADIUS_SOLAR = 1420;

/** Diamètre équatorial de la Terre, en km (NASA). */
const EARTH_DIAMETER_KM = PLANET_BY_KEY.earth.diameterKm;

/** Distance de l'étoile la plus proche du Soleil (Proxima du Centaure), en années-lumière. */
const NEAREST_STAR_LY = Math.min(...NEARBY_STARS.map((star) => star.distanceLy));

/** Morceau d'une valeur : un nombre, ou le symbole d'une unité du SI, écrit plus petit sur la même ligne de base. */
export interface KeyFigurePart {
  kind: "number" | "symbol";
  text: string;
}

/**
 * Nombres de chaque chiffre clé, tirés des données du site et écrits selon la langue (formatNumber) :
 * - sunWidth : Terres alignées dans la largeur du Soleil, arrondi (NASA : 1 392 700 / 12 756 km) → « 109 » ;
 * - sunlight : trajet de la lumière sur 1 UA, 499 s → « 8 » « min » « 19 » « s » (symboles du SI, les mêmes partout) ;
 * - proxima : l'étoile la plus proche du Soleil (NEARBY_STARS), une décimale → « 4,2 », « 4.2 » ;
 * - largestStar : → « 1 420 », « 1,420 », « 1420 » (l'espagnol ne groupe pas quatre chiffres).
 */
export function keyFigureParts(key: KeyFigureKey, locale: Locale): KeyFigurePart[] {
  switch (key) {
    case "sunWidth":
      return [{ kind: "number", text: formatNumber(Math.round(SUN.diameterKm / EARTH_DIAMETER_KM), 0, locale) }];
    case "sunlight": {
      const seconds = Math.floor(lightSeconds(1));
      return [
        { kind: "number", text: formatNumber(Math.floor(seconds / 60), 0, locale) },
        { kind: "symbol", text: "min" },
        { kind: "number", text: formatNumber(seconds % 60, 0, locale) },
        { kind: "symbol", text: "s" },
      ];
    }
    case "proxima":
      return [{ kind: "number", text: formatNumber(NEAREST_STAR_LY, 1, locale) }];
    case "largestStar":
      return [{ kind: "number", text: formatNumber(LARGEST_STAR_RADIUS_SOLAR, 0, locale) }];
  }
}
