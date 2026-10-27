import type { Vec3 } from "@/lib/astro/constants";

/** Unités de scène par UA en échelle réelle (Neptune tombe au même rayon qu'en échelle compressée). */
export const LINEAR_UNITS_PER_AU = 4.41;

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
