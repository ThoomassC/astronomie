import { AU_PER_LIGHT_YEAR, type Vec3 } from "@/lib/astro/constants";
import { GALACTIC_CENTER_DISTANCE_LY, GALACTIC_DISK_RADIUS_LY, sceneFromGalactic } from "@/lib/astro/galactic";
import { LOCAL_GROUP, galaxyCenterKly, galaxyRadiusKly, type LocalGroupGalaxyKey } from "@/lib/astro/localGroup";
import { MULTIVERSE_SEED, MULTIVERSE_VIEW_DEG, multiverseBubbles, multiverseRadius } from "@/lib/astro/multiverse";
import { SUN, type PlanetKey } from "@/lib/astro/planets";
import { LOCAL_GROUP_MAGNIFICATION, sceneRadius, unitsPerLightYear } from "@/lib/astro/scale";
import { NEARBY_STARS } from "@/lib/astro/stars";
import { OBSERVABLE_UNIVERSE_RADIUS_GLY } from "@/lib/astro/universe";
import type { ScreenBand, ScreenZone } from "@/lib/journey/screen";

const D2R = Math.PI / 180;
const TAU = Math.PI * 2;
const DEFAULTS = { elev: 11, phi: 55, offX: 0.17, offY: 0 };
/** Mise en page mobile : l'astre occupe au plus 90 % de la hauteur de la bande libre… */
const BAND_FILL = 0.9;
/** … et au plus 80 % de la largeur de l'écran, anneaux compris. */
const WIDTH_FILL = 0.8;
/** Grand écran : l'astre occupe au plus 90 % de la largeur de la zone libre, anneaux compris. */
const ZONE_FILL = 0.9;
/** Grand écran : une vue lointaine occupe au plus 80 % de la hauteur, entre la barre haute et le dock. */
const ZONE_HEIGHT_FILL = 0.8;
/**
 * Rayon extérieur des anneaux visibles, en rayons de la planète : cadrage des escales, et approche minimale
 * quand on tourne autour (orbit.ts).
 */
export const RING_EXTENT: Partial<Record<PlanetKey, number>> = { saturn: 2.337, uranus: 2.05 };

interface StopCameraConfig {
  dist?: number;
  k?: number;
  elev?: number;
  azim?: number;
  phi?: number;
  offX?: number;
  offY?: number;
  /** Zoom cosmique de l'escale (0 par défaut). */
  zoom?: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const emptyCam = (): CamState => ({
  tx: 0, ty: 0, tz: 0, dist: 1, azim: 0, elev: 0, offX: 0, offY: 0, planet: false, zoom: 0,
});

/** Escales au-delà du système solaire, vues au zoom cosmique, de la plus proche à la plus lointaine. */
export const COSMIC_STOPS = ["stars", "galaxy", "localGroup", "universe", "multiverse"] as const;

export type CosmicStopKey = (typeof COSMIC_STOPS)[number];

/** Escales du voyage, dans l'ordre de la page. */
export type StopKey = "hero" | "sun" | PlanetKey | "belt" | "beyond" | CosmicStopKey;

export const STOP_ORDER: readonly StopKey[] = [
  "hero", "sun", "mercury", "venus", "earth", "mars", "belt", "jupiter", "saturn", "uranus", "neptune", "beyond",
  ...COSMIC_STOPS,
];

/** Escale au-delà du système solaire (des étoiles voisines au multivers), où tout est déjà à l'échelle. */
export function isCosmicStop(key: StopKey): key is CosmicStopKey {
  return (COSMIC_STOPS as readonly StopKey[]).includes(key);
}

/**
 * État de caméra : cible (tx, ty, tz), distance, azimut et élévation (radians), décalage d'écran (fraction de la vue),
 * zoom cosmique.
 */
export interface CamState {
  tx: number;
  ty: number;
  tz: number;
  dist: number;
  azim: number;
  elev: number;
  /** La cible est à 0,5 + offX de la largeur (positif = vers la droite). */
  offX: number;
  /** La cible est à 0,5 + offY de la hauteur (négatif = vers le haut). */
  offY: number;
  /** La cible est un astre en orbite (planète ou ceinture), pas le centre du système. */
  planet: boolean;
  /**
   * Exposant du zoom cosmique : log10 du facteur de réduction du système solaire.
   * 0 aux escales du système solaire, 4,6 aux étoiles voisines, 8 à la Voie lactée.
   */
  zoom: number;
}

export interface StopCameraContext {
  /** Position de scène actuelle de la planète. */
  planetPosition(key: PlanetKey): Vec3;
  /** Rayon affiché de la planète (unités de scène). */
  planetRadius(key: PlanetKey): number;
  /** 0 = distances compressées, 1 = réelles. */
  realScale: number;
  /** Écran en portrait (largeur / hauteur < 0,9). */
  portrait: boolean;
  /** Largeur / hauteur de la vue. */
  aspect: number;
  /** Champ vertical de la caméra, en degrés. */
  fov: number;
  /**
   * Mise en page mobile seulement : bande libre au-dessus de la plaque compacte de l'escale,
   * mesurée dans la page. Le Soleil et les planètes y sont cadrés, la vue d'ensemble de l'au-delà
   * y est centrée. `null` ou absente ailleurs.
   */
  band?(key: StopKey): ScreenBand | null;
  /**
   * Grand écran seulement : zone libre entre la plaque (à gauche) et la règle des distances
   * (à droite), mesurée dans la page. Le Soleil et les planètes y sont centrés, et reculés
   * s'ils n'y tiennent pas. `null` ou absente ailleurs.
   */
  zone?(key: StopKey): ScreenZone | null;
}

/** Zoom cosmique du Groupe local : ses galaxies (milliers d'années-lumière) tiennent en quelques centaines d'unités. */
const LOCAL_GROUP_ZOOM = 9.7;

/**
 * Cible du Groupe local : la moitié du chemin vers Andromède, à l'échelle de son zoom (≈ (50,96 ; 37,93 ; −26,93)
 * unités de scène). Calculée une fois, au chargement du module, comme celle de la Voie lactée.
 */
const LOCAL_GROUP_TARGET: Readonly<Vec3> = (() => {
  const andromeda = LOCAL_GROUP.find((galaxy) => galaxy.key === "andromeda");
  if (!andromeda) throw new Error("Andromède absente du Groupe local");
  const center = galaxyCenterKly(andromeda);
  const length = 0.5 * 1000 * unitsPerLightYear(LOCAL_GROUP_ZOOM);
  return { x: center.x * length, y: center.y * length, z: center.z * length };
})();

/**
 * Azimut de la caméra du Groupe local, en degrés : perpendiculaire à l'axe Voie lactée–Andromède projeté à
 * l'horizontale, atan2(tz, tx) − 90° (≈ −117,85°). Les deux grandes galaxies s'étalent de part et d'autre de l'écran.
 */
const LOCAL_GROUP_AZIM_DEG = (Math.atan2(LOCAL_GROUP_TARGET.z, LOCAL_GROUP_TARGET.x) * 180) / Math.PI - 90;

/**
 * Réglages par escale. `dist` absolue, ou `k` × rayon de la planète ; angles en degrés ; zoom cosmique (0 par défaut).
 * Valeurs par défaut : elev 11, phi 55, offX 0,17, offY 0.
 * Étoiles voisines : l'azimut de l'accueil et de l'au-delà, plus bas sur l'écliptique.
 * Voie lactée : le pôle nord galactique est, dans la scène, à 179,98° d'azimut et 29,81° d'élévation ;
 * monter de 30° sur ce méridien montre le disque à 30° de sa face (latitude galactique ≈ 59,8°), vu du
 * nord (rotation horaire à l'écran), son grand axe horizontal.
 * Groupe local : de côté (LOCAL_GROUP_AZIM_DEG), 25° au-dessus. Univers observable et multivers : la direction où
 * le multivers garde notre bulle dégagée (MULTIVERSE_VIEW_DEG) ; de l'un à l'autre, la caméra ne fait que reculer.
 */
export const STOP_CAMERA = {
  hero: { dist: 420, elev: 24, azim: 206, offX: 0.23, offY: 0.05 },
  sun: { dist: 46, elev: 8, azim: 226, offX: 0.17 },
  mercury: { k: 9 },
  venus: { k: 7.5 },
  earth: { k: 8 },
  mars: { k: 8.5 },
  belt: { dist: 82, elev: 38, phi: 30 },
  jupiter: { k: 6.6 },
  saturn: { k: 9.8, elev: 17 },
  uranus: { k: 7.8 },
  neptune: { k: 7.8 },
  beyond: { dist: 640, elev: 62, azim: 206, offX: 0.14, offY: 0 },
  stars: { dist: 640, elev: 35, azim: 206, offX: 0.14, offY: 0, zoom: 4.6 },
  galaxy: { dist: 640, elev: 60, azim: 180, offX: 0.14, offY: 0, zoom: 8 },
  localGroup: { dist: 640, elev: 25, azim: LOCAL_GROUP_AZIM_DEG, offX: 0.14, offY: 0, zoom: LOCAL_GROUP_ZOOM },
  universe: {
    dist: 640, elev: MULTIVERSE_VIEW_DEG.elevation, azim: MULTIVERSE_VIEW_DEG.azimuth, offX: 0.14, offY: 0, zoom: 14,
  },
  multiverse: {
    dist: 640, elev: MULTIVERSE_VIEW_DEG.elevation, azim: MULTIVERSE_VIEW_DEG.azimuth, offX: 0.14, offY: 0, zoom: 15,
  },
} as const satisfies Record<StopKey, StopCameraConfig>;

/**
 * Cible de l'escale « galaxy » : le centre galactique, à GALACTIC_CENTER_DISTANCE_LY du Soleil, à l'échelle
 * de son zoom (≈ (−4,132 ; −7,265 ; 74,836) unités de scène). Calculée une fois, au chargement du module.
 */
const GALAXY_TARGET: Readonly<Vec3> = (() => {
  const target = sceneFromGalactic(0, 0);
  const length = GALACTIC_CENTER_DISTANCE_LY * unitsPerLightYear(STOP_CAMERA.galaxy.zoom);
  return { x: target.x * length, y: target.y * length, z: target.z * length };
})();

/** Escale dont la caméra cadre un astre (le Soleil ou une planète) : la bande et la zone libres règlent sa distance. */
function isFramedBody(key: StopKey): key is "sun" | PlanetKey {
  return key !== "hero" && key !== "belt" && key !== "beyond" && !isCosmicStop(key);
}

/** Galaxies que cadre l'escale du Groupe local, grossies ; les naines lointaines (WLM, NGC 6822…) peuvent en sortir. */
const LOCAL_GROUP_FRAMED: readonly LocalGroupGalaxyKey[] = [
  "milky-way", "large-magellanic-cloud", "small-magellanic-cloud", "andromeda", "triangulum",
];

/**
 * Rayon de la sphère cadrée au Groupe local, en kly : la plus grande distance entre sa cible et le bord d'une des
 * cinq galaxies principales, grossies (LOCAL_GROUP_MAGNIFICATION) : ≈ 1 756 kly, le Triangle. Cadrer les treize
 * galaxies, WLM à 3 Mal comprise, rapetisserait toutes les galaxies d'un tiers.
 */
const LOCAL_GROUP_FRAME_KLY = (() => {
  const kly = 1000 * unitsPerLightYear(LOCAL_GROUP_ZOOM);
  const target = { x: LOCAL_GROUP_TARGET.x / kly, y: LOCAL_GROUP_TARGET.y / kly, z: LOCAL_GROUP_TARGET.z / kly };
  const reach = LOCAL_GROUP.filter((galaxy) => LOCAL_GROUP_FRAMED.includes(galaxy.key)).map((galaxy) => {
    const center = galaxyCenterKly(galaxy);
    const radius = LOCAL_GROUP_MAGNIFICATION * galaxyRadiusKly(galaxy);
    return Math.hypot(center.x - target.x, center.y - target.y, center.z - target.z) + radius;
  });
  return Math.max(...reach);
})();

/**
 * Ce que cadrent les escales lointaines, centré sur leur cible, en unités de scène au zoom de l'escale :
 * - stars (disque) : 17 al, un peu au-delà d'Altaïr (16,7 al), la plus lointaine des étoiles de la carte, dans le
 *   plan de l'écliptique, celui des cercles de distance ;
 * - galaxy (disque) : le disque de la Voie lactée (50 000 al), dans le plan galactique ;
 * - localGroup (sphère) : les cinq galaxies principales (LOCAL_GROUP_FRAME_KLY) ;
 * - universe (sphère) : l'Univers observable (46 milliards d'al) ;
 * - multiverse (sphère) : le multivers dessiné, max(|centre| + rayon) des bulles.
 */
const COSMIC_FRAME: Readonly<Record<CosmicStopKey, { shape: "disk" | "sphere"; radius: number }>> = {
  stars: { shape: "disk", radius: 17 * unitsPerLightYear(STOP_CAMERA.stars.zoom) },
  galaxy: { shape: "disk", radius: GALACTIC_DISK_RADIUS_LY * unitsPerLightYear(STOP_CAMERA.galaxy.zoom) },
  localGroup: { shape: "sphere", radius: LOCAL_GROUP_FRAME_KLY * 1000 * unitsPerLightYear(LOCAL_GROUP_ZOOM) },
  universe: {
    shape: "sphere",
    radius: OBSERVABLE_UNIVERSE_RADIUS_GLY * 1e9 * unitsPerLightYear(STOP_CAMERA.universe.zoom),
  },
  multiverse: {
    shape: "sphere",
    radius: multiverseRadius(multiverseBubbles(MULTIVERSE_SEED)) * 1e9 * unitsPerLightYear(STOP_CAMERA.multiverse.zoom),
  },
};

/**
 * Distance qui fait tenir un disque de rayon `radius`, centré sur la cible et vu `elev` au-dessus de son plan
 * (radians), dans un cadre de demi-largeur `tanWidth` et de demi-hauteur `tanHeight` (tangentes des demi-angles).
 * Le disque se projette en ellipse raccourcie en hauteur ; la perspective grossit son côté proche, en bas de l'écran :
 * - bords gauche et droit : r / √(d² − (r cos elev)²) ≤ tanWidth ;
 * - bord proche : r sin elev / (d − r cos elev) ≤ tanHeight.
 */
function diskDistance(radius: number, elev: number, tanWidth: number, tanHeight: number): number {
  const depth = radius * Math.cos(elev);
  return Math.max(Math.hypot(radius / tanWidth, depth), (radius * Math.sin(elev)) / tanHeight + depth);
}

/**
 * Distance qui fait tenir une sphère de rayon `radius`, centrée sur la cible, dans le même cadre : vue sous un
 * demi-angle asin(r / d), elle tient quand tan(asin(r / d)) ≤ min(tanWidth, tanHeight), soit d = r / sin(atan(tan)).
 */
function sphereDistance(radius: number, tanWidth: number, tanHeight: number): number {
  return Math.max(radius / Math.sin(Math.atan(tanWidth)), radius / Math.sin(Math.atan(tanHeight)));
}

/** Distance qui fait tenir le cadre d'une escale lointaine (disque vu à `elev`, ou sphère). */
function cosmicDistance(key: CosmicStopKey, elev: number, tanWidth: number, tanHeight: number): number {
  const { shape, radius } = COSMIC_FRAME[key];
  return shape === "disk"
    ? diskDistance(radius, elev, tanWidth, tanHeight)
    : sphereDistance(radius, tanWidth, tanHeight);
}

/** Rayon affiché du Soleil ou d'une planète, et rayon de ses anneaux visibles s'il en a. */
function bodySize(key: "sun" | PlanetKey, ctx: StopCameraContext): { radius: number; extent: number } {
  if (key === "sun") return { radius: SUN.displayRadius, extent: SUN.displayRadius };
  const radius = ctx.planetRadius(key);
  return { radius, extent: radius * (RING_EXTENT[key] ?? 1) };
}

/**
 * Distance à laquelle un astre, anneaux compris (`extent`), occupe au plus ZONE_FILL de la largeur
 * de la zone. Même relation que pour la bande, appliquée à la largeur.
 */
function zoneDistance(extent: number, zone: ScreenZone, ctx: StopCameraContext): number {
  const tanHalf = Math.tan((ctx.fov * D2R) / 2);
  const tanWidth = ZONE_FILL * (zone.right - zone.left) * ctx.aspect * tanHalf;
  return extent / Math.sin(Math.atan(tanWidth));
}

/**
 * Distance qui fait tenir un astre de rayon `radius` (anneaux jusqu'à `extent`) dans la bande :
 * au plus BAND_FILL de sa hauteur et WIDTH_FILL de la largeur d'écran, la plus contraignante gagne.
 * Diamètre apparent en fraction de la hauteur : tan(asin(r / d)) / tan(champ / 2).
 */
function bandDistance(radius: number, extent: number, band: ScreenBand, ctx: StopCameraContext): number {
  const tanHalf = Math.tan((ctx.fov * D2R) / 2);
  const tanHeight = BAND_FILL * (band.bottom - band.top) * tanHalf;
  const tanWidth = WIDTH_FILL * ctx.aspect * tanHalf;
  return Math.max(radius / Math.sin(Math.atan(tanHeight)), extent / Math.sin(Math.atan(tanWidth)));
}

/**
 * Caméra au repos sur une escale. Règles (angles convertis en radians) :
 * - elev = elev de l'escale, 11° par défaut ; zoom = zoom de l'escale, 0 par défaut.
 * - hero, beyond, stars, universe, multiverse : cible (0,0,0), dist × (portrait ? 1,75 : 1), azim fixe, planet = false.
 * - galaxy, localGroup : de même, mais la cible est le centre galactique (GALAXY_TARGET), ou la moitié du chemin vers
 *   Andromède (LOCAL_GROUP_TARGET), à l'échelle de leur zoom.
 * - sun : cible (0,0,0), dist × (portrait ? 1,45 : 1), azim fixe, planet = false.
 * - belt : θ = atan2(mars.z, mars.x) − 0,55 ; R = sceneRadius(2,7, realScale) ; cible (R cos θ, 0, R sin θ) ;
 *   dist × (portrait ? 1,3 : 1) ; azim = θ + π + phi ; planet = true.
 * - planète : cible = sa position ; θ = atan2(z, x) ; dist = k × rayon × (portrait ? 1,4 : 1) ;
 *   azim = θ + π + phi (55° par défaut) ; planet = true.
 * - offX = portrait ? 0 : offX de l'escale (0,17 par défaut).
 * - offY = portrait ? (hero : −0,29 ; beyond et escales lointaines : −0,1 ; autres : −0,21) : offY de l'escale (0 par
 *   défaut).
 * - Mise en page mobile (bande fournie), toutes les escales sauf hero et belt : offX = 0, offY = milieu de la bande − 0,5 ;
 *   astre cadré (Soleil ou planète) : dist = bandDistance (rayon du Soleil : SUN.displayRadius ; anneaux : RING_EXTENT) ;
 *   escales lointaines : dist = distance de leur cadre (COSMIC_FRAME : disque vu à elev, ou sphère), dans 80 % de la
 *   largeur de l'écran et 90 % de la hauteur de la bande ; beyond garde sa distance.
 * - Grand écran (zone fournie, pas de bande) :
 *   astre cadré : offX = milieu de la zone − 0,5, dist = max(dist, zoneDistance) : l'astre ne recule que s'il déborde ;
 *   escales lointaines : offX = milieu de la zone − 0,5, dist = distance de leur cadre dans 90 % de la largeur de la
 *   zone et 80 % de la hauteur de l'écran ; beyond, hero, belt : rien ne change.
 */
export function cameraFor(key: StopKey, ctx: StopCameraContext, out: CamState = emptyCam()): CamState {
  const cfg: StopCameraConfig = STOP_CAMERA[key];
  const portrait = ctx.portrait;
  out.tx = 0;
  out.ty = 0;
  out.tz = 0;
  out.elev = (cfg.elev ?? DEFAULTS.elev) * D2R;
  out.planet = false;
  out.zoom = cfg.zoom ?? 0;
  if (key === "hero" || key === "beyond" || key === "sun" || isCosmicStop(key)) {
    const factor = key === "sun" ? 1.45 : 1.75;
    out.dist = (cfg.dist ?? 1) * (portrait ? factor : 1);
    out.azim = (cfg.azim ?? 0) * D2R;
    const target = key === "galaxy" ? GALAXY_TARGET : key === "localGroup" ? LOCAL_GROUP_TARGET : null;
    if (target) {
      out.tx = target.x;
      out.ty = target.y;
      out.tz = target.z;
    }
  } else if (key === "belt") {
    const mars = ctx.planetPosition("mars");
    const theta = Math.atan2(mars.z, mars.x) - 0.55;
    const radius = sceneRadius(2.7, ctx.realScale);
    out.tx = radius * Math.cos(theta);
    out.tz = radius * Math.sin(theta);
    out.dist = (cfg.dist ?? 1) * (portrait ? 1.3 : 1);
    out.azim = theta + Math.PI + (cfg.phi ?? DEFAULTS.phi) * D2R;
    out.planet = true;
  } else {
    const p = ctx.planetPosition(key);
    const theta = Math.atan2(p.z, p.x);
    out.tx = p.x;
    out.ty = p.y;
    out.tz = p.z;
    out.dist = (cfg.k ?? 8) * ctx.planetRadius(key) * (portrait ? 1.4 : 1);
    out.azim = theta + Math.PI + (cfg.phi ?? DEFAULTS.phi) * D2R;
    out.planet = true;
  }
  out.offX = portrait ? 0 : (cfg.offX ?? DEFAULTS.offX);
  out.offY = portrait
    ? key === "hero"
      ? -0.29
      : key === "beyond" || isCosmicStop(key)
        ? -0.1
        : -0.21
    : (cfg.offY ?? DEFAULTS.offY);

  if (key === "hero" || key === "belt") return out;
  const tanHalf = Math.tan((ctx.fov * D2R) / 2);
  const band = ctx.band?.(key);
  if (band) {
    out.offX = 0;
    out.offY = (band.top + band.bottom) / 2 - 0.5;
    if (isFramedBody(key)) {
      const { radius, extent } = bodySize(key, ctx);
      out.dist = bandDistance(radius, extent, band, ctx);
    } else if (isCosmicStop(key)) {
      const tanWidth = WIDTH_FILL * ctx.aspect * tanHalf;
      const tanHeight = BAND_FILL * (band.bottom - band.top) * tanHalf;
      out.dist = cosmicDistance(key, out.elev, tanWidth, tanHeight);
    }
    return out;
  }
  if (isCosmicStop(key)) {
    const zone = ctx.zone?.(key);
    if (zone) {
      out.offX = (zone.left + zone.right) / 2 - 0.5;
      const tanWidth = ZONE_FILL * (zone.right - zone.left) * ctx.aspect * tanHalf;
      out.dist = cosmicDistance(key, out.elev, tanWidth, ZONE_HEIGHT_FILL * tanHalf);
    }
    return out;
  }
  if (!isFramedBody(key)) return out;
  const zone = ctx.zone?.(key);
  if (zone) {
    out.offX = (zone.left + zone.right) / 2 - 0.5;
    out.dist = Math.max(out.dist, zoneDistance(bodySize(key, ctx).extent, zone, ctx));
  }
  return out;
}

/** Plus court écart angulaire signé de a vers b, dans ]−π, π]. */
export function angleDiff(a: number, b: number): number {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  else if (d <= -Math.PI) d += TAU;
  return d;
}

/**
 * Interpolation de vol entre deux caméras (t déjà lissé par l'appelant).
 * - Cible en coordonnées cylindriques autour du Soleil : rayon et y linéaires, angle par le plus court chemin ;
 *   une cible de rayon < 0,01 prend l'angle de l'autre (pas de tour sur soi-même au départ du centre).
 * - hop = (a.planet && b.planet) ? clamp(|Δθ| / π + 0,15, 0, 1) : 0,2 ; arc = sin(π t).
 * - dist = exp(lerp(ln a.dist, ln b.dist, t)) × (1 + 2,2 · hop · arc)  (recul en milieu de vol).
 * - azim par le plus court chemin ; elev = lerp + 0,32 · hop · arc ; offX, offY linéaires.
 * - planet = t < 0,5 ? a.planet : b.planet.
 * - zoom linéaire en t (exponentiel à l'écran : chaque pas multiplie la réduction par le même facteur).
 *   Entre les étoiles voisines et la Voie lactée, la cible glisse donc en ligne droite, en unités de scène,
 *   pendant que tout se réduit : le Soleil reste dans le champ.
 */
export function blendCameras(a: CamState, b: CamState, t: number, out: CamState = emptyCam()): CamState {
  const rA = Math.hypot(a.tx, a.tz);
  const rB = Math.hypot(b.tx, b.tz);
  let thA = Math.atan2(a.tz, a.tx);
  let thB = Math.atan2(b.tz, b.tx);
  if (rA < 0.01) thA = thB;
  if (rB < 0.01) thB = thA;
  const dTheta = angleDiff(thA, thB);
  const theta = thA + dTheta * t;
  const radius = lerp(rA, rB, t);
  const hop = a.planet && b.planet ? clamp(Math.abs(dTheta) / Math.PI + 0.15, 0, 1) : 0.2;
  const arc = Math.sin(Math.PI * t);
  const ty = lerp(a.ty, b.ty, t);
  const dist = Math.exp(lerp(Math.log(a.dist), Math.log(b.dist), t)) * (1 + 2.2 * hop * arc);
  const azim = a.azim + angleDiff(a.azim, b.azim) * t;
  const elev = lerp(a.elev, b.elev, t) + 0.32 * hop * arc;
  const offX = lerp(a.offX, b.offX, t);
  const offY = lerp(a.offY, b.offY, t);
  const planet = t < 0.5 ? a.planet : b.planet;
  const zoom = lerp(a.zoom, b.zoom, t);
  out.tx = radius * Math.cos(theta);
  out.ty = ty;
  out.tz = radius * Math.sin(theta);
  out.dist = dist;
  out.azim = azim;
  out.elev = elev;
  out.offX = offX;
  out.offY = offY;
  out.planet = planet;
  out.zoom = zoom;
  return out;
}

/**
 * Fondu entre deux caméras, sans recul ni arc : entrée et sortie de l'exploration (t déjà lissé par l'appelant).
 * Contrairement au vol (blendCameras), la cible va en ligne droite et la caméra ne tourne pas autour du Soleil :
 * - cible linéaire, en coordonnées cartésiennes ;
 * - dist = exp(lerp(ln a.dist, ln b.dist, t)) : moyenne géométrique à mi-chemin, jamais au-delà des deux ;
 * - azim par le plus court chemin ; elev, offX, offY et zoom linéaires ;
 * - planet = t < 0,5 ? a.planet : b.planet.
 * `out` peut être `a` ou `b` : tout est calculé avant d'y écrire.
 */
export function mixCameras(a: CamState, b: CamState, t: number, out: CamState = emptyCam()): CamState {
  const tx = lerp(a.tx, b.tx, t);
  const ty = lerp(a.ty, b.ty, t);
  const tz = lerp(a.tz, b.tz, t);
  const dist = Math.exp(lerp(Math.log(a.dist), Math.log(b.dist), t));
  const azim = a.azim + angleDiff(a.azim, b.azim) * t;
  const elev = lerp(a.elev, b.elev, t);
  const offX = lerp(a.offX, b.offX, t);
  const offY = lerp(a.offY, b.offY, t);
  const zoom = lerp(a.zoom, b.zoom, t);
  const planet = t < 0.5 ? a.planet : b.planet;
  out.tx = tx;
  out.ty = ty;
  out.tz = tz;
  out.dist = dist;
  out.azim = azim;
  out.elev = elev;
  out.offX = offX;
  out.offY = offY;
  out.planet = planet;
  out.zoom = zoom;
  return out;
}

/**
 * Repères de la règle des distances (UA). « hero » se place comme le Soleil. Étoiles voisines : la plus proche,
 * Proxima du Centaure (4,2465 al) ; Voie lactée : son centre (GALACTIC_CENTER_DISTANCE_LY) ; Groupe local : Andromède ;
 * Univers observable : son rayon ; multivers : à l'infini, hors échelle (RAIL_OFF_SCALE).
 */
export const RAIL_STOPS: readonly { key: StopKey; au: number }[] = [
  { key: "sun", au: 0 }, { key: "mercury", au: 0.387 }, { key: "venus", au: 0.723 }, { key: "earth", au: 1 },
  { key: "mars", au: 1.524 }, { key: "belt", au: 2.7 }, { key: "jupiter", au: 5.2 }, { key: "saturn", au: 9.54 },
  { key: "uranus", au: 19.19 }, { key: "neptune", au: 30.07 }, { key: "beyond", au: 45 },
  { key: "stars", au: NEARBY_STARS[0].distanceLy * AU_PER_LIGHT_YEAR },
  { key: "galaxy", au: GALACTIC_CENTER_DISTANCE_LY * AU_PER_LIGHT_YEAR },
  {
    key: "localGroup",
    au: (LOCAL_GROUP.find((galaxy) => galaxy.key === "andromeda")?.distanceMly ?? Number.NaN) * 1e6 * AU_PER_LIGHT_YEAR,
  },
  { key: "universe", au: OBSERVABLE_UNIVERSE_RADIUS_GLY * 1e9 * AU_PER_LIGHT_YEAR },
  { key: "multiverse", au: Infinity },
];

/**
 * Rupture de la règle : l'axe s'interrompt entre ces deux pourcentages, signe « ≈ » au milieu. Elle sépare
 * le système solaire (au-delà : 84,35 %) des étoiles voisines (89,51 %), où l'échelle change d'unité.
 */
export const RAIL_BREAK = { from: 87, to: 88.5 } as const;

/** Fin de l'axe dessiné (10¹¹ al) ; au-delà, le repère du multivers est hors échelle. */
export const RAIL_AXIS_END = 98;

/** Position du repère hors échelle (distance infinie : le multivers). */
export const RAIL_OFF_SCALE = 99.4;

/** 50 UA : fin de l'échelle du système solaire sur la règle. */
const RAIL_SOLAR_LIMIT_AU = 50;
/** 10¹¹ al : au-delà de l'Univers observable (46 milliards d'al) ; la règle s'y arrête, à 98 %. */
const RAIL_COSMIC_LIMIT_LY = 1e11;

/**
 * Position verticale sur la règle (pourcentage), continue et croissante, en trois segments logarithmiques :
 * - 0 UA → 2 ;
 * - ]0 ; 50 UA] → 6 + 80 × ln(au / 0,3) / ln(50 / 0,3) : les planètes ;
 * - ]50 UA ; 1 al] → 86 + 3 × ln(au / 50) / ln(1 al / 50 UA) : le grand vide, fortement comprimé (rupture) ;
 * - ]1 al ; 10¹¹ al] → min(98, 89 + 9 × ln(d / 1 al) / ln(10¹¹)) : des étoiles voisines à l'Univers observable ;
 * - distance non finie (le multivers) → RAIL_OFF_SCALE.
 */
export function railPercent(au: number): number {
  if (!Number.isFinite(au)) return RAIL_OFF_SCALE;
  if (au <= 0) return 2;
  if (au <= RAIL_SOLAR_LIMIT_AU) return 6 + (80 * Math.log(au / 0.3)) / Math.log(RAIL_SOLAR_LIMIT_AU / 0.3);
  if (au <= AU_PER_LIGHT_YEAR) {
    return 86 + (3 * Math.log(au / RAIL_SOLAR_LIMIT_AU)) / Math.log(AU_PER_LIGHT_YEAR / RAIL_SOLAR_LIMIT_AU);
  }
  return Math.min(RAIL_AXIS_END, 89 + (9 * Math.log(au / AU_PER_LIGHT_YEAR)) / Math.log(RAIL_COSMIC_LIMIT_LY));
}
