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

/**
 * Comparaison parlante d'un trou noir, par son ombre (ce que l'on voit de lui), déjà arrondie comme elle s'affiche :
 * - `km` : ombre plus petite que la Terre, son diamètre en kilomètres, à deux chiffres significatifs ;
 * - `insideOrbit` : ombre mise à la place du Soleil, la planète la plus proche du Soleil dont l'orbite la contiendrait ;
 * - `beyondNeptune` : ombre plus grande que l'orbite de Neptune, combien de fois son rayon, à l'unité.
 */
export type BlackHoleComparison =
  | { kind: "km"; diameterKm: number }
  | { kind: "insideOrbit"; planet: PlanetKey }
  | { kind: "beyondNeptune"; times: number };

/**
 * Comparaison montrée pour une ombre de rayon `radiusSolar` (R☉) : Cygnus X-1 → 330 km ; Sagittarius A* → orbite de
 * Mercure ; M87* → 11 fois l'orbite de Neptune ; Fer à cheval cosmique → 61 fois.
 */
export function pickBlackHoleComparison(radiusSolar: number): BlackHoleComparison {
  const km = radiusKm(radiusSolar);
  if (km < EARTH_EQUATORIAL_RADIUS_KM) return { kind: "km", diameterKm: roundSignificant(2 * km, 2) };
  const reach = radiusAu(radiusSolar);
  let inside: PlanetKey | null = null;
  let nearest = Infinity;
  let farthest = 0;
  for (const planet of PLANETS) {
    const semiMajorAxis = planet.elements[0];
    farthest = Math.max(farthest, semiMajorAxis);
    if (semiMajorAxis >= reach && semiMajorAxis < nearest) {
      inside = planet.key;
      nearest = semiMajorAxis;
    }
  }
  return inside ? { kind: "insideOrbit", planet: inside } : { kind: "beyondNeptune", times: Math.round(reach / farthest) };
}
