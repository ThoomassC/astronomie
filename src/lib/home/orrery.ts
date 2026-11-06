import { eclipticLongitudeDeg, heliocentric } from "@/lib/astro/ephemeris";
import { PLANETS, PLANET_BY_KEY, type PlanetKey } from "@/lib/astro/planets";
import { compressedRadius } from "@/lib/astro/scale";

/** Une planète du planétaire de l'accueil, à une date. */
export interface OrreryPlanet {
  key: PlanetKey;
  /** Position dans [−1, 1]², vue du nord de l'écliptique, y vers le haut. */
  x: number;
  y: number;
  /** Rayon dessiné de l'orbite, dans ]0, 1]. */
  orbit: number;
  /** Longitude héliocentrique écliptique, en degrés, dans [0, 360[. */
  longitudeDeg: number;
}

/** Demi-côté du dessin, en unités du viewBox (« -110 -110 220 220 ») : l'orbite de Neptune et sa marge. */
export const ORRERY_HALF_SIZE = 110;

/** Rayon dessiné d'une orbite de rayon 1 (Neptune), en unités du viewBox. */
export const ORRERY_ORBIT_UNITS = 100;

/** Disque du Soleil et rayon de sa lueur, en unités du viewBox. */
export const ORRERY_SUN = { radius: 5, glow: 11 } as const;

/**
 * Rayon dessiné de chaque planète, en unités du viewBox : l'ordre des tailles est respecté, pas leur rapport
 * (Jupiter ferait 11 fois la Terre) ; la note sous le dessin le dit.
 */
export const ORRERY_PLANET_RADIUS: Readonly<Record<PlanetKey, number>> = {
  mercury: 1.6,
  venus: 2.2,
  earth: 2.3,
  mars: 1.9,
  jupiter: 4.2,
  saturn: 3.6,
  uranus: 3.0,
  neptune: 2.9,
};

/**
 * Anneau de Saturne, en unités du viewBox, incliné à l'écran : une forme, donc un second repère, qui la distingue de
 * Vénus (couleurs presque identiques) sans compter sur la couleur.
 */
export const SATURN_RING = { rx: 6.4, ry: 2, tiltDeg: -20 } as const;

/** Anneau « Vous êtes ici » de la Terre : 2,2 unités au-delà du disque (3,4 px à 343 px, 5,4 px à 544 px). */
export const EARTH_HALO_RADIUS = ORRERY_PLANET_RADIUS.earth + 2.2;

/** Rayon compressé de l'orbite de Neptune, la plus grande : il devient le bord du schéma. */
const NEPTUNE_RADIUS = compressedRadius(PLANET_BY_KEY.neptune.elements[0]);

/**
 * Rayon dessiné : (12 + 22 √a) / (12 + 22 √a_Neptune) — la compression de la scène, Neptune à 1.
 * Mercure tombe à 0,19, la Terre à 0,26, Jupiter à 0,47 ; a = 0 donne 0,09, le bord du Soleil de la scène.
 */
export function orreryOrbit(semiMajorAxisAu: number): number {
  return compressedRadius(semiMajorAxisAu) / NEPTUNE_RADIUS;
}

/**
 * Les huit planètes au jour julien `jd`, dans l'ordre depuis le Soleil : angle = atan2(y, x) des positions
 * héliocentriques JPL (ephemeris.ts), rayon = orreryOrbit(a) avec le demi-grand axe J2000. Chaque orbite est donc
 * un cercle fixe, et la planète est posée dessus dans sa vraie direction ; l'excentricité (Mercure : 0,31 à 0,47 UA)
 * et l'inclinaison ne se voient pas à cette échelle.
 */
export function orreryPlanets(jd: number): OrreryPlanet[] {
  return PLANETS.map((planet) => {
    const position = heliocentric(planet, jd);
    const orbit = orreryOrbit(planet.elements[0]);
    const angle = Math.atan2(position.y, position.x);
    return {
      key: planet.key,
      x: orbit * Math.cos(angle),
      y: orbit * Math.sin(angle),
      orbit,
      longitudeDeg: eclipticLongitudeDeg(position),
    };
  });
}

/**
 * Heure d'un cadran d'horloge (midi en haut, 3 h à droite) qui pointe dans la direction d'une longitude dessinée sur le
 * planétaire (0° à droite, sens inverse des aiguilles) : 0° → 3, 90° → 12, 180° → 9, 270° → 6. Arrondie à l'heure
 * (30°), de 1 à 12. Elle dit aux lecteurs d'écran où est chaque planète autour du Soleil.
 */
export function clockHour(longitudeDeg: number): number {
  const hour = ((Math.round(3 - longitudeDeg / 30) % 12) + 12) % 12;
  return hour === 0 ? 12 : hour;
}

/**
 * Longitude d'arrivée d'une planète qui glisse sur son orbite de `fromDeg` à `toDeg`, écrite à partir de celle du
 * départ : une transition CSS de `rotate()` passe alors par l'orbite dans le sens du temps, vers l'avant (sens direct,
 * longitude croissante) quand il avance, vers l'arrière quand il recule. Moins d'un tour : les tours entiers ne se
 * voient pas, l'écart est pris modulo 360°.
 */
export function glideLongitude(fromDeg: number, toDeg: number, forward: boolean): number {
  const ahead = (((toDeg - fromDeg) % 360) + 360) % 360;
  if (forward || ahead === 0) return fromDeg + ahead;
  return fromDeg + ahead - 360;
}
