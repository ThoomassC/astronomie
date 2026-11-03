import { AU_KM, type Vec3 } from "@/lib/astro/constants";
import { heliocentric } from "@/lib/astro/ephemeris";
import { PLANET_BY_KEY, type PlanetKey } from "@/lib/astro/planets";
import { sceneAxes } from "@/lib/astro/scale";

/** Planètes qu'on regarde depuis la Terre : toutes sauf elle. */
export type EarthViewTarget = Exclude<PlanetKey, "earth">;

export const EARTH_VIEW_TARGETS: readonly EarthViewTarget[] = [
  "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune",
];

/** Prend une chaîne, pas une escale : lib/astro ne dépend pas de lib/journey. */
export function isEarthViewTarget(key: string): key is EarthViewTarget {
  return (EARTH_VIEW_TARGETS as readonly string[]).includes(key);
}

export type Visibility = "too-close" | "evening-west" | "morning-east" | "all-night" | "evening" | "late-night";
export type Instrument = "eye" | "binoculars" | "telescope";

/** Sous cette élongation (degrés), la planète est encore sous l'horizon, ou trop basse, quand le ciel devient sombre. */
export const TOO_CLOSE_DEG = 15;
/** Sous cette élongation, la planète ne se voit que bas sur l'horizon, au crépuscule ou à l'aube. */
export const LOW_TWILIGHT_DEG = 60;
/** À partir de cette élongation, la planète est levée presque toute la nuit (près de l'opposition). */
export const ALL_NIGHT_DEG = 150;
export const ARCSEC_PER_RADIAN = 206_264.806;

export interface EarthView {
  /** Direction planète → Terre, unitaire, axes de scène (x, z, −y de l'écliptique J2000). */
  toEarth: Vec3;
  /** Distances en UA : Soleil–planète (r), Terre–planète (Δ), Soleil–Terre (R). */
  sunDistance: number;
  earthDistance: number;
  earthSunDistance: number;
  /** Angle de phase i (Soleil–planète–Terre), en degrés : cos i = (r² + Δ² − R²) / (2rΔ). */
  phaseAngleDeg: number;
  /** Fraction éclairée du disque, de 0 à 1 : (1 + cos i) / 2. */
  illuminated: number;
  /** Diamètre apparent équatorial : ARCSEC_PER_RADIAN × diamètre (km) / (Δ × AU_KM), en secondes d'arc. */
  diameterArcsec: number;
  /** Séparation angulaire Soleil–planète vue de la Terre, de 0 à 180° : cos E = (R² + Δ² − r²) / (2RΔ). */
  elongationDeg: number;
  /** east si λ_géo(planète) − λ_géo(Soleil), ramené dans ]−180, 180], est positif (ciel du soir). */
  side: "east" | "west";
  visibility: Visibility;
  instrument: Instrument;
}

const R2D = 180 / Math.PI;

/** Angle (degrés) dont le cosinus vaut `cosine`, borné à [−1, 1] contre les arrondis. */
const acosDeg = (cosine: number) => Math.acos(Math.min(1, Math.max(-1, cosine))) * R2D;

/** Angle ramené dans ]−180, 180]. */
function wrapDeg(angle: number): number {
  const wrapped = angle % 360;
  if (wrapped > 180) return wrapped - 360;
  if (wrapped <= -180) return wrapped + 360;
  return wrapped;
}

/**
 * Vue de la planète depuis la Terre au jour julien `jd` : positions héliocentriques des éléments JPL, sans temps de
 * lumière ni position de l'observateur sur la Terre.
 * L'élongation est la séparation angulaire vraie (latitudes comprises) : celle des almanachs. Le côté vient de la
 * différence des longitudes géocentriques, λ_géo(Soleil) = λ(Terre héliocentrique) + 180°.
 */
export function viewFromEarth(key: EarthViewTarget, jd: number): EarthView {
  const planet = heliocentric(PLANET_BY_KEY[key], jd);
  const earth = heliocentric(PLANET_BY_KEY.earth, jd);
  // Vecteur géocentrique Terre → planète.
  const gx = planet.x - earth.x;
  const gy = planet.y - earth.y;
  const gz = planet.z - earth.z;
  const r = Math.hypot(planet.x, planet.y, planet.z);
  const delta = Math.hypot(gx, gy, gz);
  const big = Math.hypot(earth.x, earth.y, earth.z);
  const cosPhase = Math.min(1, Math.max(-1, (r * r + delta * delta - big * big) / (2 * r * delta)));
  const elongationDeg = acosDeg((big * big + delta * delta - r * r) / (2 * big * delta));
  const planetLongitude = Math.atan2(gy, gx) * R2D;
  const sunLongitude = Math.atan2(earth.y, earth.x) * R2D + 180;
  const side = wrapDeg(planetLongitude - sunLongitude) > 0 ? "east" : "west";
  return {
    toEarth: sceneAxes({ x: -gx / delta, y: -gy / delta, z: -gz / delta }),
    sunDistance: r,
    earthDistance: delta,
    earthSunDistance: big,
    phaseAngleDeg: Math.acos(cosPhase) * R2D,
    illuminated: (1 + cosPhase) / 2,
    diameterArcsec: (ARCSEC_PER_RADIAN * PLANET_BY_KEY[key].diameterKm) / (delta * AU_KM),
    elongationDeg,
    side,
    visibility: visibilityOf(elongationDeg, side),
    instrument: instrumentFor(key),
  };
}

/**
 * Quand regarder (règle identique pour les sept planètes ; Mercure et Vénus ne dépassent jamais 48°) :
 * E < TOO_CLOSE_DEG : trop près du Soleil ; E ≥ ALL_NIGHT_DEG : toute la nuit ;
 * à l'est : E < LOW_TWILIGHT_DEG, le soir à l'ouest après le coucher du Soleil, sinon en soirée ;
 * à l'ouest : E < LOW_TWILIGHT_DEG, le matin à l'est avant le lever du Soleil, sinon en fin de nuit.
 */
export function visibilityOf(elongationDeg: number, side: "east" | "west"): Visibility {
  if (elongationDeg < TOO_CLOSE_DEG) return "too-close";
  if (elongationDeg >= ALL_NIGHT_DEG) return "all-night";
  if (side === "east") return elongationDeg < LOW_TWILIGHT_DEG ? "evening-west" : "evening";
  return elongationDeg < LOW_TWILIGHT_DEG ? "morning-east" : "late-night";
}

/** Uranus : aux jumelles ; Neptune : au télescope ; les autres : à l'œil nu. */
export function instrumentFor(key: EarthViewTarget): Instrument {
  if (key === "uranus") return "binoculars";
  if (key === "neptune") return "telescope";
  return "eye";
}
