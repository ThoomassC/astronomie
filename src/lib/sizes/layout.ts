import type { SizeObjectKey } from "@/lib/sizes/objects";

/*
 * Écart bord à bord entre deux astres voisins, pris entre leurs encombrements (sizes/objects.ts) : assez large pour que
 * l'astre suivant reste hors champ quand la caméra est au repos sur le précédent (invariant de non-apparition, testé
 * sur les vues de référence dans `sizesCamera.test.ts`). gᵢ = max(SIZE_GAP_RATIO × min(eᵢ₋₁, eᵢ),
 * SIZE_GAP_REST_RATIO × eᵢ₋₁, SIZE_GAP_NEXT_RATIO × eᵢ), e = encombrement.
 */

/**
 * Voisins de tailles proches, en encombrements du plus petit des deux. La vue la plus exigeante est le téléphone en
 * paysage (844 × 390) : le plus petit, cadré seul par la hauteur, laisse beaucoup de largeur, et la silhouette d'un
 * voisin bien plus grand et proche de la caméra déborde de son bord. Entre étoiles, il y faut au moins 3,62 rayons
 * (Proxima du Centaure, puis le Soleil) ; 4 garde l'astre suivant à près de 3 % de la largeur hors de l'écran. Entre
 * deux étoiles, ce terme l'emporte toujours : leurs écarts ne changent pas avec l'arrivée des trous noirs.
 */
export const SIZE_GAP_RATIO = 4;
/** Astre au repos qui encombre bien plus que le suivant, en encombrements du premier : la caméra, qui le cadre, n'en approche pas le suivant. */
export const SIZE_GAP_REST_RATIO = 2;
/**
 * Suivant immense (Cygnus X-1 puis Proxima du Centaure, VY Canis Majoris puis M87*), en encombrements du suivant : la
 * caméra, qui recule pour lui pendant le vol, reste hors de lui et de ce qu'il éclaire.
 */
export const SIZE_GAP_NEXT_RATIO = 0.35;

/** Astre posé dans la scène des tailles, dont l'unité de longueur est le rayon solaire (R☉). */
export interface PlacedObject {
  key: SizeObjectKey;
  /** Taille comparée, en R☉ (étiquettes, échelle) : rayon d'une étoile, ombre d'un trou noir. */
  radius: number;
  /** Rayon d'encombrement, en R☉ (au moins `radius`) : espacement, cadrage, étiquettes, invariants. */
  extent: number;
  /** Centre sur l'axe x (y = z = 0), en R☉. */
  x: number;
}

/**
 * Aligne les astres sur l'axe x, du plus petit, à l'origine (là où la précision float32 est la meilleure, pour les
 * astres minuscules), vers les x négatifs : chacun apparaît à gauche du précédent. x₀ = 0 ;
 * xᵢ = xᵢ₋₁ − (eᵢ₋₁ + gᵢ + eᵢ), gᵢ l'écart ci-dessus. Les positions restent de l'ordre de quelques encombrements du
 * plus grand : les écarts leur sont proportionnels. Lève une RangeError si une taille comparée n'est pas un nombre fini
 * strictement positif, si un encombrement ne la contient pas ou n'est pas fini, ou si les tailles comparées ne
 * croissent pas strictement ; les encombrements, eux, peuvent décroître.
 */
export function placeObjects(
  objects: readonly { key: SizeObjectKey; radiusSolar: number; extentSolar: number }[],
): PlacedObject[] {
  const placed: PlacedObject[] = [];
  let previous: PlacedObject | undefined;
  for (const { key, radiusSolar: radius, extentSolar: extent } of objects) {
    if (!Number.isFinite(radius) || radius <= 0) {
      throw new RangeError(`Taille invalide pour ${key} : ${radius} R☉`);
    }
    if (!Number.isFinite(extent) || extent < radius) {
      throw new RangeError(`Encombrement invalide pour ${key} : ${extent} R☉ pour une taille de ${radius} R☉`);
    }
    if (previous && radius <= previous.radius) {
      throw new RangeError(`Tailles non strictement croissantes : ${key} (${radius} R☉) après ${previous.key} (${previous.radius} R☉)`);
    }
    let x = 0;
    if (previous) {
      const gap = Math.max(
        SIZE_GAP_RATIO * Math.min(previous.extent, extent),
        SIZE_GAP_REST_RATIO * previous.extent,
        SIZE_GAP_NEXT_RATIO * extent,
      );
      x = previous.x - (previous.extent + gap + extent);
    }
    previous = { key, radius, extent, x };
    placed.push(previous);
  }
  return placed;
}
