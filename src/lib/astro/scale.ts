import { AU_PER_LIGHT_YEAR, type Vec3 } from "@/lib/astro/constants";

/** Unités de scène par UA en échelle réelle (Neptune tombe au même rayon qu'en échelle compressée). */
export const LINEAR_UNITS_PER_AU = 4.41;

/** Réduction des planètes en échelle réelle : chacune y deviendrait plus petite qu'un pixel. */
export const REAL_SCALE_PLANET_SHRINK = 0.012;
/** Réduction du Soleil en échelle réelle. */
export const REAL_SCALE_SUN_SHRINK = 0.05;

/**
 * Grossissement des galaxies au Groupe local : les distances restent à l'échelle, les tailles sont multipliées par 6.
 * À l'échelle, Andromède n'y ferait que 14 px de rayon sur grand écran et 7 sur téléphone, la Voie lactée 9 et 5, les
 * Nuages de Magellan un ou deux : quelques points épars, aucune forme. Grossies 6 fois, elles se lisent (spirales,
 * taches), la Voie lactée comprise, et restent petites devant leurs écarts : Andromède grossie (456 000 al de rayon)
 * est encore 5 fois plus petite que sa distance, et ne touche pas le Triangle à l'écran.
 */
export const LOCAL_GROUP_MAGNIFICATION = 6;

/** Rayon de scène en échelle compressée : 12 + 22·√r (r en UA). */
export function compressedRadius(au: number): number {
  return 12 + 22 * Math.sqrt(Math.max(0, au));
}

/**
 * Rayon de scène pour une distance au Soleil `au`, en interpolant linéairement entre
 * l'échelle compressée (`realScale` = 0) et l'échelle réelle `LINEAR_UNITS_PER_AU · au` (`realScale` = 1).
 */
export function sceneRadius(au: number, realScale: number): number {
  const compressed = compressedRadius(au);
  return compressed + (LINEAR_UNITS_PER_AU * au - compressed) * realScale;
}

/**
 * Convertit une position écliptique (UA) en coordonnées de scène Three.js :
 * on garde la direction, on remplace la norme par `sceneRadius(norme, realScale)`,
 * et on passe au repère Y vers le haut : scène = (x, z, −y).
 * Écrit dans `out` s'il est fourni et le renvoie.
 */
export function toScene(v: Vec3, realScale: number, out: Vec3 = { x: 0, y: 0, z: 0 }): Vec3 {
  const { x, y, z } = v;
  const r = Math.hypot(x, y, z);
  const k = r > 0 ? sceneRadius(r, realScale) / r : 0;
  out.x = x * k;
  out.y = z * k;
  out.z = -y * k;
  return out;
}

/**
 * Direction écliptique (en UA ou unitaire) rangée dans les axes de scène (x, z, −y), sans changer
 * sa norme : contrairement à `toScene`, aucune compression des distances. `out` peut être `v` lui-même.
 */
export function sceneAxes(v: Vec3, out: Vec3 = { x: 0, y: 0, z: 0 }): Vec3 {
  const { x, y, z } = v;
  out.x = x;
  out.y = z;
  out.z = -y;
  return out;
}

/**
 * Facteur d'échelle du système solaire au zoom cosmique `zoom` : 10^−zoom. Le zoom est l'exposant
 * de la réduction : 0 aux escales du système solaire (1), 4,6 aux étoiles voisines, 8 à la Voie lactée.
 */
export function zoomScale(zoom: number): number {
  return 10 ** -zoom;
}

/**
 * Unités de scène par année-lumière au zoom cosmique `zoom` : LINEAR_UNITS_PER_AU × AU_PER_LIGHT_YEAR
 * × 10^−zoom. Soit 278 893,15 au zoom 0, 7,005 au zoom 4,6 (20 al tiennent dans 140 unités) et
 * 0,002 789 au zoom 8 (le disque de la Galaxie aussi). Prolonge l'échelle réelle du système solaire,
 * réduite par `zoomScale` : les deux échelles coïncident à tout zoom.
 */
export function unitsPerLightYear(zoom: number): number {
  return LINEAR_UNITS_PER_AU * AU_PER_LIGHT_YEAR * zoomScale(zoom);
}
