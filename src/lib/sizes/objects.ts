import { COMPARED_BLACK_HOLES, type BlackHoleKey, type ComparedBlackHole } from "@/lib/astro/blackHoles";
import { SHADOW_RADIUS_RS } from "@/lib/astro/schwarzschild";
import { COMPARED_STARS, type ComparedStar, type SizeStarKey } from "@/lib/astro/starSizes";

/*
 * Seul lieu qui dit ce que l'onglet « Tailles » compare, et dans quel ordre : dix étoiles par leur rayon, quatre trous
 * noirs par le rayon de leur ombre. Un trou noir n'a pas de surface ; ce qu'on en voit, c'est son ombre, le disque noir
 * que dessine la lumière déviée, √27/2 ≈ 2,6 fois plus large que son horizon (rayon de Schwarzschild). L'horizon reste
 * une donnée de sa fiche. Un second rayon, l'encombrement, borne ce que la scène dessine de lumineux autour de lui
 * (disque, pied du jet, lumière déviée) : il sert à l'espacement, au cadrage et à la réserve des étiquettes, jamais à la
 * comparaison. Son étiquette se pose plus près, à ce qui se voit de lui (BLACK_HOLE_VISIBLE_RS).
 */

export type SizeObjectKey = SizeStarKey | BlackHoleKey;
export type ComparedObject = ComparedStar | ComparedBlackHole;

/**
 * Encombrement de chaque trou noir, en rayons d'horizon (r_s) : ce que son aspect éclaire y tient (requiredExtentRs, tests
 * de la scène), le jet excepté. 10 r_s pour le disque de Cygnus X-1, le pied du jet de M87* (long de 40 r_s, réservé à
 * part pour les étiquettes) et la lumière déviée autour du Fer à cheval cosmique ; 3,2 r_s pour l'anneau ténu de
 * Sagittarius A*, concentré au bord de son ombre (2,6 r_s), dont l'image déviée ne dépasse pas 3 r_s. Plus large, il
 * éloignerait ses voisines sans rien montrer de plus.
 */
export const BLACK_HOLE_EXTENT_RS: Readonly<Record<BlackHoleKey, number>> = {
  "cygnus-x-1": 10,
  "sagittarius-a-star": 3.2,
  "m87-star": 10,
  "cosmic-horseshoe": 10,
};

/**
 * Ce qui se voit de chaque trou noir au-dessus (`up`) et au-dessous (`down`) de son centre, en r_s de rayon apparent :
 * son étiquette se pose juste au-delà, sans couper ni l'ombre ni ce qui brille, et non au bord de l'encombrement.
 * Cygnus X-1 : l'image déviée de son disque, vu presque par la tranche, qui passe par-dessus et par-dessous l'ombre,
 * au plus haut vue de loin (5,35 et 4,3 r_s ; 4,9 et 4,0 à 35 r_s, la caméra la plus proche) ;
 * Sagittarius A* et M87* : leur anneau, b(r) = r / √(1 − 1/r) au bord extérieur du gaz (2,2 et 3 r_s) ; Fer à cheval
 * cosmique : l'ombre et son anneau de photons. N'y comptent pas la couronne ténue de Cygnus X-1 ni la lueur diffuse du
 * Fer à cheval, que l'étiquette peut voiler, ni le jet de M87*, réservé à part (labelJetOf). blackHole.ts n'exporte pas
 * ces valeurs : ce sont celles de l'onglet, vérifiées sur les aspects et le modèle de la lumière (sizesObjects.test.ts).
 */
export const BLACK_HOLE_VISIBLE_RS: Readonly<Record<BlackHoleKey, { up: number; down: number }>> = {
  "cygnus-x-1": { up: 5.4, down: 4.3 },
  "sagittarius-a-star": { up: 3, down: 3 },
  "m87-star": { up: 3.7, down: 3.7 },
  "cosmic-horseshoe": { up: 2.8, down: 2.8 },
};

/** Ce qui se voit d'un astre au-dessus et au-dessous de son centre, en part de son encombrement : tout, pour une étoile. */
export function visibleShare(object: ComparedObject): { up: number; down: number } {
  if (object.kind === "star") return { up: 1, down: 1 };
  const extent = BLACK_HOLE_EXTENT_RS[object.key];
  const { up, down } = BLACK_HOLE_VISIBLE_RS[object.key];
  return { up: up / extent, down: down / extent };
}

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
