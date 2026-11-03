import { SOLAR_RADIUS_KM } from "@/lib/astro/starSizes";

const D2R = Math.PI / 180;

/** Suite 1-2-5 de `from` à `to` (inclus) : 2, 5, 10, 20, 50… */
function oneTwoFive(from: number, to: number): number[] {
  const values: number[] = [];
  for (let decade = 1; decade <= to; decade *= 10) {
    for (const step of [1, 2, 5]) {
      const value = step * decade;
      if (value >= from && value <= to) values.push(value);
    }
  }
  return values;
}

/** Longueurs possibles de l'échelle graphique en Soleils posés côte à côte : 2, 5, 10 … 1 000 000. */
const SCALE_BAR_SUNS = oneTwoFive(2, 1_000_000);
/** Longueurs possibles en kilomètres : 1, 2, 5 … 5 000 000 (1 km pour l'ombre de Cygnus X-1, 163 km de rayon). */
const SCALE_BAR_KM = oneTwoFive(1, 5_000_000);
/** Au-dessus de ce diamètre à l'écran, en px, le Soleil se voit assez lui-même : l'échelle compte en kilomètres. */
const SCALE_BAR_SUN_MAX_PX = 24;
/** Diamètre à l'écran, en px, sous lequel le Soleil de l'échelle n'est plus un disque, mais un point dans un anneau. */
const SCALE_BAR_DISC_MIN_PX = 4;
/** Air entre le bas des astres et l'échelle graphique posée dessous, en px. */
const SCALE_BAR_GAP_PX = 16;
/** Marge minimale entre l'échelle graphique et le bas de la vue, en px. */
const SCALE_BAR_BOTTOM_MARGIN_PX = 24;

/** Échelle graphique : `count` Soleils côte à côte, ou `count` km, sur `lengthPx` px. */
export type ScaleBar = { unit: "suns"; count: number; lengthPx: number } | { unit: "km"; count: number; lengthPx: number };

/**
 * Pixels par rayon solaire au plan de la cible, où sont les centres de tous les astres :
 * hauteur de vue / (2 × dist × tan(champ / 2)), dist en R☉.
 */
export function pixelsPerSolarRadius(viewHeight: number, dist: number, fovDeg: number): number {
  return viewHeight / (2 * dist * Math.tan((fovDeg * D2R) / 2));
}

/** Le plus grand nombre de la suite dont la longueur (nombre × px par unité) tient dans `maxPx` ; à défaut, le premier. */
function longestFitting(counts: readonly number[], pxPerUnit: number, maxPx: number): { count: number; lengthPx: number } {
  let count = counts[0];
  for (const candidate of counts) if (candidate * pxPerUnit <= maxPx) count = candidate;
  return { count, lengthPx: count * pxPerUnit };
}

/**
 * Échelle graphique pour `pxPerSolarRadius` px par R☉, sur `maxPx` px au plus (240 sur grand écran, 112 en mise en page
 * compacte) : en Soleils côte à côte (suite 1-2-5 de 2 à 1 000 000, n × 2 × px par R☉) quand le Soleil fait 24 px ou
 * moins à l'écran ; sinon en kilomètres (suite 1-2-5 de 1 à 5 000 000 km). Le plus grand nombre qui tient ; si aucun ne
 * tient, le plus petit de la suite. Jamais absente : aux plus petites tailles, la règle en kilomètres prend le relais.
 */
export function scaleBarFor(pxPerSolarRadius: number, maxPx: number): ScaleBar {
  if (2 * pxPerSolarRadius <= SCALE_BAR_SUN_MAX_PX) {
    return { unit: "suns", ...longestFitting(SCALE_BAR_SUNS, 2 * pxPerSolarRadius, maxPx) };
  }
  return { unit: "km", ...longestFitting(SCALE_BAR_KM, pxPerSolarRadius / SOLAR_RADIUS_KM, maxPx) };
}

/** Soleil dessiné au bout de l'échelle : disque à l'échelle de 4 à 24 px de diamètre, sinon un point dans un anneau. */
export function scaleBarSun(sunDiameterPx: number): "disc" | "ring" {
  return sunDiameterPx >= SCALE_BAR_DISC_MIN_PX ? "disc" : "ring";
}

/**
 * Coin haut gauche (px) de l'échelle graphique sur grand écran, sous les astres : centrée sur la zone libre (`zone`, en
 * px), 16 px sous le point le plus bas des disques qui passent au-dessus d'elle, et au moins 16 px sous la ligne des
 * centres (le milieu de la vue) ; jamais à moins de 24 px du bas de la vue. Le point le plus bas d'un disque est pris
 * au-dessus de la seule largeur de l'échelle : il varie continûment quand un astre entre par le côté, et l'échelle ne
 * saute pas.
 */
export function scaleBarPlacement(
  discs: readonly { x: number; y: number; radius: number }[],
  zone: { left: number; right: number },
  size: { width: number; height: number },
  view: { width: number; height: number },
): { left: number; top: number } {
  const left = (zone.left + zone.right) / 2 - size.width / 2;
  const right = left + size.width;
  let lowest = view.height / 2;
  for (const { x, y, radius } of discs) {
    const offset = x < left ? left - x : x > right ? x - right : 0;
    if (!(offset < radius)) continue;
    lowest = Math.max(lowest, Number.isFinite(radius) ? y + Math.sqrt(radius * radius - offset * offset) : Infinity);
  }
  const top = Math.min(lowest + SCALE_BAR_GAP_PX, view.height - SCALE_BAR_BOTTOM_MARGIN_PX - size.height);
  return { left, top: Math.max(0, top) };
}
