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
