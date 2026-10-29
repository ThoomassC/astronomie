import type { SizeStarKey } from "@/lib/astro/starSizes";

/**
 * Écart bord à bord entre deux étoiles voisines, en rayons de la plus petite des deux : assez large pour que
 * l'étoile suivante reste hors champ quand la caméra est au repos sur la précédente (invariant de
 * non-apparition, testé sur les vues de référence dans `sizesCamera.test.ts`).
 * La vue la plus exigeante est le téléphone en paysage (844 × 390, sans bande ni zone) : la plus petite étoile,
 * cadrée seule par la hauteur, laisse beaucoup de largeur, et la silhouette d'une voisine bien plus grande et
 * proche de la caméra déborde de son bord. Il y faut au moins 3,62 rayons (Proxima du Centaure, puis le Soleil) ;
 * 4 garde l'étoile suivante à plus de 3 % de la largeur hors de l'écran.
 */
export const SIZE_GAP_RATIO = 4;

/** Étoile posée dans la scène des tailles, dont l'unité de longueur est le rayon solaire (R☉). */
export interface PlacedStar {
  key: SizeStarKey;
  /** Rayon, en R☉. */
  radius: number;
  /** Centre sur l'axe x (y = z = 0), en R☉. */
  x: number;
}

/**
 * Aligne les étoiles sur l'axe x, de la plus petite, à l'origine (là où la précision float32 est la meilleure,
 * pour les astres minuscules), vers les x négatifs : chaque étoile apparaît à gauche de la précédente.
 * x₀ = 0 ; xᵢ = xᵢ₋₁ − (rᵢ₋₁ × (1 + SIZE_GAP_RATIO) + rᵢ), soit SIZE_GAP_RATIO × rᵢ₋₁ de vide entre leurs bords.
 * Lève une RangeError si un rayon n'est pas un nombre fini strictement positif, ou si les rayons ne croissent
 * pas strictement.
 */
export function placeStars(stars: readonly { key: SizeStarKey; radiusSolar: number }[]): PlacedStar[] {
  const placed: PlacedStar[] = [];
  let previous: PlacedStar | undefined;
  for (const { key, radiusSolar: radius } of stars) {
    if (!Number.isFinite(radius) || radius <= 0) {
      throw new RangeError(`Rayon invalide pour ${key} : ${radius} R☉`);
    }
    if (previous && radius <= previous.radius) {
      throw new RangeError(`Rayons non strictement croissants : ${key} (${radius} R☉) après ${previous.key} (${previous.radius} R☉)`);
    }
    const x = previous ? previous.x - (previous.radius * (1 + SIZE_GAP_RATIO) + radius) : 0;
    previous = { key, radius, x };
    placed.push(previous);
  }
  return placed;
}
