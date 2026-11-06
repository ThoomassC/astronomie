import type { Vec3 } from "./constants";
import { sceneFromEquatorial } from "./galactic";
import type { NearbyStar } from "./stars";

/** Années-lumière par parsec (UAI : 1 pc = 648 000 / π UA). */
export const LY_PER_PARSEC = 3.261_56;

/** Classes spectrales de Harvard, de la plus chaude (O) à la plus froide (M). */
export type SpectralClass = "O" | "B" | "A" | "F" | "G" | "K" | "M";

/**
 * Couleur de chaque classe, en sRGB : la teinte du corps noir à sa température (Charity, « What color
 * are the stars? »). Vues de près, les étoiles paraissent presque blanches ; les naines rouges, orangées.
 */
const SPECTRAL_COLORS: Readonly<Record<SpectralClass, string>> = {
  O: "#9BB0FF",
  B: "#AABFFF",
  A: "#CAD7FF",
  F: "#F8F7FF",
  G: "#FFF4EA",
  K: "#FFD2A1",
  M: "#FFB56C",
};

/** Couleur d'une classe inconnue (naine blanche « DA2 », type absent) : celle des étoiles F, blanche. */
const DEFAULT_STAR_COLOR = SPECTRAL_COLORS.F;

const isSpectralClass = (letter: string): letter is SpectralClass => Object.hasOwn(SPECTRAL_COLORS, letter);

/**
 * Taille du cœur du point de l'étoile la plus lumineuse et de la plus faible, en px CSS : à 2 px, les naines rouges
 * disparaissaient dans le noir.
 */
const STAR_POINT_MAX_PX = 10;
const STAR_POINT_MIN_PX = 3.5;

/** Classe spectrale d'un type (« M5.5Ve » → M), lue sur sa première lettre sans tenir compte de la casse ; `null` si inconnue. */
export function spectralClass(spectralType: string): SpectralClass | null {
  const letter = spectralType.charAt(0).toUpperCase();
  return isSpectralClass(letter) ? letter : null;
}

/**
 * Position héliocentrique de l'étoile, en années-lumière, dans les axes de scène :
 * sceneFromEquatorial(α, δ) × distance. Écrit dans `out` s'il est fourni et le renvoie.
 */
export function starPositionLy(
  star: Pick<NearbyStar, "raDeg" | "decDeg" | "distanceLy">,
  out: Vec3 = { x: 0, y: 0, z: 0 },
): Vec3 {
  sceneFromEquatorial(star.raDeg, star.decDeg, out);
  out.x *= star.distanceLy;
  out.y *= star.distanceLy;
  out.z *= star.distanceLy;
  return out;
}

/** Magnitude absolue : M = m − 5 log10(d / 10 pc), avec d = distanceLy / LY_PER_PARSEC. */
export function absoluteMagnitude(apparentMag: number, distanceLy: number): number {
  return apparentMag - 5 * Math.log10(distanceLy / LY_PER_PARSEC / 10);
}

/**
 * Taille du cœur du point d'une étoile, en px CSS : clamp(10 − 0,5 × (M − 1), 3,5, 10). Plus l'étoile est lumineuse
 * en réalité, plus le point est gros : Sirius (M ≈ 1,4) ≈ 9,8 px, l'étoile de Barnard (M ≈ 13,2) 3,9 px, Proxima du
 * Centaure (M ≈ 15,6) 3,5 px. La scène l'entoure d'un halo de sa couleur.
 */
export function starPointSize(absoluteMag: number): number {
  return Math.min(STAR_POINT_MAX_PX, Math.max(STAR_POINT_MIN_PX, STAR_POINT_MAX_PX - 0.5 * (absoluteMag - 1)));
}

/**
 * Couleur sRGB « #RRGGBB » de la classe spectrale (première lettre du type, insensible à la casse) :
 * O #9BB0FF, B #AABFFF, A #CAD7FF, F #F8F7FF, G #FFF4EA, K #FFD2A1, M #FFB56C ; inconnue → #F8F7FF.
 * Prise telle quelle par la scène (`rawColor`), comme les autres couleurs du dépôt.
 */
export function spectralColor(spectralType: string): string {
  const spectral = spectralClass(spectralType);
  return spectral ? SPECTRAL_COLORS[spectral] : DEFAULT_STAR_COLOR;
}
