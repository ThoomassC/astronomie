import type { Vec3 } from "./constants";
import { seededRandom } from "./milkyWay";
import { OBSERVABLE_UNIVERSE_RADIUS_GLY } from "./universe";

/**
 * Multivers : rendu artistique d'une hypothèse, jamais observée et débattue (inflation éternelle, « univers-bulles »).
 * Rien ici n'est mesuré : les bulles, leurs tailles et leurs places sont inventées pour l'image, à partir d'une
 * graine fixe. Seule la nôtre a une taille connue, celle de l'Univers observable. Unités : milliards d'al (Gal).
 */

/** Graine du multivers : les mêmes bulles à chaque visite. */
export const MULTIVERSE_SEED = 20_261_031;
/** Bulles dessinées, la nôtre comprise. */
export const MULTIVERSE_BUBBLE_COUNT = 15;

export interface Bubble {
  /** Centre, en Gal ; la nôtre est à l'origine. */
  center: Vec3;
  /** Rayon, en Gal. */
  radius: number;
  /** Teinte, en fraction de tour (Color.setHSL) ; celle de la nôtre n'est pas dessinée (le fond diffus la remplace). */
  hue: number;
}

/** Rayons des autres bulles, en multiples du nôtre (tirés uniformément en logarithme). */
const RADIUS_RANGE = { min: 0.45, max: 1.6 } as const;
/** Les centres restent à moins de 9 fois notre rayon, les bulles entières à moins de 9,5 fois (moins de 450 Gal). */
const CENTER_LIMIT = 9;
const OUTER_LIMIT = 9.5;
/** Écart minimal entre deux centres, en part de la somme des rayons : de légers contacts sont permis, voulus. */
const MIN_GAP = 0.92;
/**
 * Direction de la caméra de l'escale « Le multivers », vue de notre bulle (azimut et élévation de la scène, en
 * degrés, comme STOP_CAMERA) : celle de l'Univers observable. Aucune autre bulle ne se projette sur la nôtre vue
 * de là (CLEAR_SIGHT).
 */
export const MULTIVERSE_VIEW_DEG = { azimuth: 206, elevation: 20 } as const;
/**
 * Distance minimale entre le centre d'une autre bulle et l'axe de visée de l'escale, en part de la somme de son
 * rayon et du nôtre : 1,25, marge comprise pour la perspective (une bulle plus proche de la caméra paraît plus grosse).
 */
const CLEAR_SIGHT = 1.25;
/** Teintes des autres bulles, du turquoise au violet ; la nôtre, chaude comme la toile cosmique. */
const HUE_RANGE = { min: 0.42, max: 0.8 } as const;
const OUR_HUE = 0.08;
/** Essais pour placer une bulle avant de la réduire de 10 %, et nombre de réductions avant d'abandonner. */
const MAX_DRAWS = 200;
const MAX_SHRINKS = 20;

const length = (v: Vec3) => Math.hypot(v.x, v.y, v.z);
const distance = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

/** Axe de visée de l'escale : vecteur unitaire de notre bulle vers la caméra. */
const VIEW_AXIS: Readonly<Vec3> = (() => {
  const azimuth = (MULTIVERSE_VIEW_DEG.azimuth * Math.PI) / 180;
  const elevation = (MULTIVERSE_VIEW_DEG.elevation * Math.PI) / 180;
  return { x: Math.cos(elevation) * Math.cos(azimuth), y: Math.sin(elevation), z: Math.cos(elevation) * Math.sin(azimuth) };
})();

/** Distance d'un point à l'axe de visée (droite passant par notre bulle). */
function offAxis(p: Vec3): number {
  const along = p.x * VIEW_AXIS.x + p.y * VIEW_AXIS.y + p.z * VIEW_AXIS.z;
  return Math.hypot(p.x - along * VIEW_AXIS.x, p.y - along * VIEW_AXIS.y, p.z - along * VIEW_AXIS.z);
}

/**
 * Bulles du multivers, la nôtre en premier (origine, rayon de l'Univers observable). Pour chacune des 14 autres :
 * rayon de 0,45 à 1,6 fois le nôtre ; direction uniforme ; distance au centre uniforme entre le contact avec la
 * nôtre et sa limite (centre à moins de 9 fois notre rayon, bulle entière à moins de 9,5 fois), ce qui serre les
 * bulles autour de la nôtre plus qu'un tirage uniforme en volume ; écart à toutes les précédentes d'au moins
 * 0,92 × la somme des rayons ; hors de l'axe de visée de l'escale (CLEAR_SIGHT). Après 200 essais sans place, le
 * rayon est réduit de 10 % (sans passer sous le minimum), au plus 20 fois. Déterministe pour une graine donnée.
 */
export function multiverseBubbles(seed: number): Bubble[] {
  const random = seededRandom(seed);
  const ours = OBSERVABLE_UNIVERSE_RADIUS_GLY;
  const bubbles: Bubble[] = [{ center: { x: 0, y: 0, z: 0 }, radius: ours, hue: OUR_HUE }];
  const fits = (candidate: Bubble) =>
    offAxis(candidate.center) >= CLEAR_SIGHT * (ours + candidate.radius) &&
    bubbles.every((bubble) => distance(bubble.center, candidate.center) >= MIN_GAP * (bubble.radius + candidate.radius));

  while (bubbles.length < MULTIVERSE_BUBBLE_COUNT) {
    let radius = ours * RADIUS_RANGE.min * (RADIUS_RANGE.max / RADIUS_RANGE.min) ** random();
    const hue = HUE_RANGE.min + random() * (HUE_RANGE.max - HUE_RANGE.min);
    let placed: Bubble | null = null;
    for (let shrinks = 0; !placed; shrinks++) {
      // Inatteignable en pratique (14 bulles occupent moins de 2 % du volume) : plutôt une erreur qu'une boucle sans fin.
      if (shrinks > MAX_SHRINKS) throw new Error(`Multivers : aucune place pour la bulle n° ${bubbles.length + 1}`);
      for (let attempt = 0; attempt < MAX_DRAWS && !placed; attempt++) {
        const nearest = MIN_GAP * (ours + radius);
        const farthest = Math.min(CENTER_LIMIT * ours, OUTER_LIMIT * ours - radius);
        const d = nearest + random() * (farthest - nearest);
        const cosPolar = 2 * random() - 1;
        const sinPolar = Math.sqrt(1 - cosPolar * cosPolar);
        const azimuth = 2 * Math.PI * random();
        const candidate: Bubble = {
          center: { x: d * sinPolar * Math.cos(azimuth), y: d * cosPolar, z: d * sinPolar * Math.sin(azimuth) },
          radius,
          hue,
        };
        if (fits(candidate)) placed = candidate;
      }
      radius = Math.max(RADIUS_RANGE.min * ours, radius * 0.9);
    }
    bubbles.push(placed);
  }
  return bubbles;
}

/** Rayon du multivers dessiné, en Gal : la plus grande distance entre nous et le bord d'une bulle, max(|centre| + rayon). */
export function multiverseRadius(bubbles: readonly Bubble[]): number {
  return Math.max(...bubbles.map((bubble) => length(bubble.center) + bubble.radius));
}
