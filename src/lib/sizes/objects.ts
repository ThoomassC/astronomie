import { COMPARED_BLACK_HOLES, type BlackHoleKey, type ComparedBlackHole } from "@/lib/astro/blackHoles";
import { SHADOW_RADIUS_RS } from "@/lib/astro/schwarzschild";
import { COMPARED_STARS, type ComparedStar, type SizeStarKey } from "@/lib/astro/starSizes";

/*
 * Seul lieu qui dit ce que l'onglet « Tailles » compare, et dans quel ordre : dix étoiles par leur rayon, quatre trous
 * noirs par le rayon de leur ombre. Un trou noir n'a pas de surface ; ce qu'on en voit, c'est son ombre, le disque noir
 * que dessine la lumière déviée, √27/2 ≈ 2,6 fois plus large que son horizon (rayon de Schwarzschild). L'horizon reste
 * une donnée de sa fiche. Un second rayon, l'encombrement, borne ce que la scène dessine de lumineux autour de lui
 * (disque, jet, lumière déviée) : il sert à l'espacement, au cadrage et aux étiquettes, jamais à la comparaison.
 */

export type SizeObjectKey = SizeStarKey | BlackHoleKey;
export type ComparedObject = ComparedStar | ComparedBlackHole;

/**
 * Encombrement de chaque trou noir, en rayons d'horizon (r_s) : ce que son aspect éclaire y tient (requiredExtentRs, tests
 * de la scène). 10 r_s pour le disque de Cygnus X-1, le jet de M87* et la lumière déviée autour du Fer à cheval
 * cosmique ; 3,2 r_s pour l'anneau ténu de Sagittarius A*, concentré au bord de son ombre (2,6 r_s), dont l'image
 * déviée ne dépasse pas 3 r_s. Plus large, il éloignerait ses voisines sans rien montrer de plus.
 */
export const BLACK_HOLE_EXTENT_RS: Readonly<Record<BlackHoleKey, number>> = {
  "cygnus-x-1": 10,
  "sagittarius-a-star": 3.2,
  "m87-star": 10,
  "cosmic-horseshoe": 10,
};

/** Taille comparée, en R☉ (ordre, règle, étiquettes, échelle, textes) : rayon d'une étoile, ombre d'un trou noir. */
export function comparedRadiusSolar(object: ComparedObject): number {
  return object.kind === "star" ? object.radiusSolar : SHADOW_RADIUS_RS * object.radiusSolar;
}

/** Rayon d'encombrement, en R☉ : rayon d'une étoile, r_s × BLACK_HOLE_EXTENT_RS d'un trou noir. */
export function extentSolar(object: ComparedObject): number {
  return object.kind === "star" ? object.radiusSolar : object.radiusSolar * BLACK_HOLE_EXTENT_RS[object.key];
}

/** Les quatorze astres, par taille comparée strictement croissante : l'ordre des escales. */
export const COMPARED_OBJECTS: readonly ComparedObject[] = [...COMPARED_STARS, ...COMPARED_BLACK_HOLES].sort(
  (a, b) => comparedRadiusSolar(a) - comparedRadiusSolar(b),
);

/** Astres comparés, par clé. */
export const COMPARED_OBJECT_BY_KEY = Object.fromEntries(
  COMPARED_OBJECTS.map((object) => [object.key, object]),
) as Readonly<Record<SizeObjectKey, ComparedObject>>;

export function isSizeObjectKey(value: string | undefined): value is SizeObjectKey {
  return value !== undefined && Object.hasOwn(COMPARED_OBJECT_BY_KEY, value);
}

/** Ce que la disposition lit d'un astre : sa clé, sa taille comparée et son encombrement, en R☉. */
export function layoutInput(object: ComparedObject): { key: SizeObjectKey; radiusSolar: number; extentSolar: number } {
  return { key: object.key, radiusSolar: comparedRadiusSolar(object), extentSolar: extentSolar(object) };
}
