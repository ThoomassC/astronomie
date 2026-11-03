import { SOLAR_RADIUS_KM } from "@/lib/astro/starSizes";

/*
 * Trou noir sans rotation (Schwarzschild) : rayon de l'horizon r_s = 2GM/c², calculé depuis la masse et jamais saisi,
 * et rayon de l'ombre, ce que l'on voit de loin. L'onglet « Tailles » compare les trous noirs aux étoiles par le rayon
 * de leur ombre ; celui de l'horizon reste une donnée de leur fiche. Les distances des rendus sont en r_s.
 */

/** Paramètre gravitationnel du Soleil, valeur nominale (UAI 2015, résolution B3), en m³/s². */
export const SOLAR_GM_M3_S2 = 1.3271244e20;
/** Vitesse de la lumière dans le vide, en m/s (valeur exacte). */
export const SPEED_OF_LIGHT_M_S = 299_792_458;
/** Rayon de Schwarzschild d'une masse solaire, 2GM☉/c², en km : 2,953 25 km. */
export const SCHWARZSCHILD_KM_PER_SOLAR_MASS = (2 * SOLAR_GM_M3_S2) / SPEED_OF_LIGHT_M_S ** 2 / 1000;
/**
 * Rayon de l'ombre vue de loin, en r_s : paramètre d'impact critique des photons, √27 GM/c² = 3√3/2 r_s ≈ 2,598
 * (EHT 2019, article I). C'est la taille comparée d'un trou noir.
 */
export const SHADOW_RADIUS_RS = (3 * Math.sqrt(3)) / 2;
/** Sphère des photons, en r_s. */
export const PHOTON_SPHERE_RS = 1.5;
/** Dernière orbite circulaire stable d'un trou noir sans rotation (ISCO), en r_s. */
export const ISCO_RS = 3;

function checkMass(massSolar: number): void {
  if (!Number.isFinite(massSolar) || massSolar <= 0) {
    throw new RangeError(`Masse de trou noir invalide : ${massSolar} M☉`);
  }
}

/** r_s = 2GM/c² d'une masse en M☉, en km. Lève une RangeError si la masse n'est pas un nombre fini strictement positif. */
export function schwarzschildRadiusKm(massSolar: number): number {
  checkMass(massSolar);
  return massSolar * SCHWARZSCHILD_KM_PER_SOLAR_MASS;
}

/** Même rayon, en R☉ nominaux (÷ SOLAR_RADIUS_KM). */
export function schwarzschildRadiusSolar(massSolar: number): number {
  return schwarzschildRadiusKm(massSolar) / SOLAR_RADIUS_KM;
}

/** Rayon de l'ombre, SHADOW_RADIUS_RS × r_s, en R☉ nominaux : la taille qu'on compare à celle des étoiles. */
export function shadowRadiusSolar(massSolar: number): number {
  return SHADOW_RADIUS_RS * schwarzschildRadiusSolar(massSolar);
}
