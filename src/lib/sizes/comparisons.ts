import { AU_KM } from "@/lib/astro/constants";
import { PLANETS, type PlanetKey } from "@/lib/astro/planets";
import { SOLAR_RADIUS_KM } from "@/lib/astro/starSizes";

/** Rayon équatorial de la Terre (WGS 84), en km. */
const EARTH_EQUATORIAL_RADIUS_KM = 6_378.137;

/** Rayon en kilomètres d'un rayon en R☉ nominaux (× 695 700). */
export function radiusKm(radiusSolar: number): number {
  return radiusSolar * SOLAR_RADIUS_KM;
}

/** Rayon en unités astronomiques (× 695 700 / 149 597 870,7) : 1 420 R☉ → 6,60 UA. */
export function radiusAu(radiusSolar: number): number {
  return radiusKm(radiusSolar) / AU_KM;
}

/** Nombre de Terres alignées sur le diamètre de l'étoile (695 700 / 6 378,137 × r) : 109,08 pour le Soleil. */
export function earthDiameters(radiusSolar: number): number {
  return radiusKm(radiusSolar) / EARTH_EQUATORIAL_RADIUS_KM;
}

/** Nombre de Soleils que contiendrait le volume de l'étoile (r³). */
export function sunVolumes(radiusSolar: number): number {
  return radiusSolar ** 3;
}

/**
 * Plus lointaine des planètes dont l'orbite tiendrait dans l'étoile mise à la place du Soleil : demi-grand axe
 * (éléments J2000 du JPL) au plus égal au rayon de l'étoile ; null si elle n'atteint même pas Mercure.
 */
export function orbitReached(radiusSolar: number): PlanetKey | null {
  const reach = radiusAu(radiusSolar);
  let reached: PlanetKey | null = null;
  let farthest = 0;
  for (const planet of PLANETS) {
    const semiMajorAxis = planet.elements[0];
    if (semiMajorAxis <= reach && semiMajorAxis > farthest) {
      reached = planet.key;
      farthest = semiMajorAxis;
    }
  }
  return reached;
}

/** Valeur arrondie à `digits` chiffres significatifs, pour les grandeurs dites « environ » : 405 224 → 410 000 à 2. */
export function roundSignificant(value: number, digits: number): number {
  return Number(value.toPrecision(digits));
}

/**
 * Comparaison parlante d'une étoile, déjà arrondie comme elle s'affiche :
 * - `orbit` : la plus lointaine des orbites qu'elle engloutirait à la place du Soleil ;
 * - `earths` : nombre de Terres alignées sur son diamètre, à l'unité ;
 * - `suns` : nombre de Soleils que contiendrait son volume, à deux chiffres significatifs.
 */
export type SizeComparison =
  | { kind: "orbit"; planet: PlanetKey }
  | { kind: "earths"; count: number }
  | { kind: "suns"; count: number };

/**
 * Comparaison montrée pour une étoile : l'orbite engloutie si elle en atteint une ; sinon les Terres alignées sur son
 * diamètre si elle n'est pas plus grande que le Soleil ; sinon les Soleils que contiendrait son volume.
 */
export function pickComparison(radiusSolar: number): SizeComparison {
  const planet = orbitReached(radiusSolar);
  if (planet) return { kind: "orbit", planet };
  if (radiusSolar <= 1) return { kind: "earths", count: Math.round(earthDiameters(radiusSolar)) };
  return { kind: "suns", count: roundSignificant(sunVolumes(radiusSolar), 2) };
}
