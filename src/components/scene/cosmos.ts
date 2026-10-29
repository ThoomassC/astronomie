import {
  BufferAttribute,
  BufferGeometry,
  Group,
  Line,
  LineBasicMaterial,
  Points,
  Sphere,
  Vector3,
  type ShaderMaterial,
} from "three";
import type { Vec3 } from "@/lib/astro/constants";
import { GALACTIC_CENTER_DISTANCE_LY, sceneFromGalacticXYZ } from "@/lib/astro/galactic";
import { GALAXY_SEED, milkyWayCloud } from "@/lib/astro/milkyWay";
import { SUN } from "@/lib/astro/planets";
import { absoluteMagnitude, spectralColor, starPointSize, starPositionLy } from "@/lib/astro/starMap";
import type { NearbyStar } from "@/lib/astro/stars";
import { BRASS_HEX } from "./bodies";
import { rawColor } from "./color";
import type { LayerWeights } from "./layers";
import { createPointCloudMaterial, type Uniform } from "./materials";
import { TAU } from "./math";

/**
 * Ciel profond : les étoiles voisines, le Soleil vu de loin, des cercles de distance et la galaxie. Tout est
 * rangé en années-lumière dans un groupe que le moteur met à l'échelle du zoom cosmique (unitsPerLightYear) :
 * les positions restent petites (moins de 80 000 al, pas de float32 sous 0,01 al), l'échelle passe par la
 * matrice du groupe.
 */

/** Rayons des cercles de distance, en années-lumière, dans le plan de l'écliptique. */
export const DISTANCE_RINGS_LY = [5, 10] as const;

type DistanceRingLy = (typeof DISTANCE_RINGS_LY)[number];

/** Étiquettes du ciel profond : « Vous êtes ici », centre galactique, cercles, et une par étoile (`star:<clé>`). */
export type DeepLabelKey = "here" | "center" | `ring-${DistanceRingLy}` | `star:${string}`;

/** Étiquette du cercle de distance de `radius` al. */
export const ringLabelKey = (radius: DistanceRingLy): DeepLabelKey => `ring-${radius}`;
/** Étiquette de l'étoile de clé `key` (NearbyStar.key). */
export const starLabelKey = (key: string): DeepLabelKey => `star:${key}`;

const RING_LABEL_KEYS: readonly string[] = DISTANCE_RINGS_LY.map(ringLabelKey);

/** Clé d'étiquette du ciel profond lue dans le DOM (`data-deep`). */
export function isDeepLabelKey(value: string | undefined): value is DeepLabelKey {
  if (value === undefined) return false;
  return value === "here" || value === "center" || RING_LABEL_KEYS.includes(value) || value.startsWith("star:");
}

/** Le Soleil vu de loin : un point de 6 px (CSS), de sa couleur. */
export const SUN_POINT_SIZE_PX = 6;
/**
 * Rayon de la sphère englobante de la galaxie, en années-lumière, autour du centre galactique : le disque (50 000 al)
 * et les bras, qui débordent de quelques écarts types, y tiennent. Posée telle quelle : rien à calculer sur 40 000 points.
 */
export const GALAXY_BOUNDING_RADIUS_LY = 60_000;
/** Segments d'un cercle de distance. */
const RING_SEGMENTS = 128;
/** Opacité des cercles de distance, poids des étoiles à 1 (traits d'instrument, discrets). */
const RING_OPACITY = 0.35;

export interface CosmosBody {
  /** Contenu en années-lumière ; échelle = unitsPerLightYear(zoom), posée par le moteur. */
  group: Group;
  stars: Points<BufferGeometry, ShaderMaterial>;
  /** Le Soleil vu de loin, à l'origine. */
  sunPoint: Points<BufferGeometry, ShaderMaterial>;
  rings: readonly Line<BufferGeometry, LineBasicMaterial>[];
  /** Construite à la demande (buildGalaxy) ; null avant. */
  galaxy: Points<BufferGeometry, ShaderMaterial> | null;
  /** Position de chaque étoile (al), par clé : ancres des étiquettes. */
  starPositions: ReadonlyMap<string, Vec3>;
  /** Taille du point de chaque étoile (px CSS), par clé : les étiquettes évitent ces points. */
  starSizes: ReadonlyMap<string, number>;
  /** Rapport de pixels du rendu, partagé par les trois nuages (mis à jour par le moteur à chaque redimensionnement). */
  pixelRatio: Uniform<number>;
  /**
   * Gain de la galaxie sur les valeurs affichées (1 au cadrage de référence) : le moteur l'abaisse quand elle
   * rapetisse à l'écran, pour que ses points serrés ne partent pas au blanc.
   */
  galaxyGain: Uniform<number>;
}

/**
 * Nuage de points : positions (al), couleurs linéaires, tailles (px CSS), matériau commun aux trois nuages. Sa sphère
 * englobante est posée d'emblée (`bounds`), ou calculée tout de suite : jamais à la première image où il paraît.
 */
function pointCloud(
  positions: Float32Array,
  colors: Float32Array,
  sizes: Float32Array,
  pixelRatio: Uniform<number>,
  gain?: Uniform<number>,
  bounds?: Sphere,
): Points<BufferGeometry, ShaderMaterial> {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  geometry.setAttribute("size", new BufferAttribute(sizes, 1));
  if (bounds) geometry.boundingSphere = bounds;
  else geometry.computeBoundingSphere();
  const points = new Points(geometry, createPointCloudMaterial(pixelRatio, gain).material);
  // Rien n'est dessiné avant que le moteur ne pèse la couche.
  points.visible = false;
  return points;
}

/** Cercle de `radius` al autour du Soleil, dans le plan de l'écliptique (y = 0 dans la scène). */
function distanceRing(radius: number): Line<BufferGeometry, LineBasicMaterial> {
  const positions = new Float32Array((RING_SEGMENTS + 1) * 3);
  for (let i = 0; i <= RING_SEGMENTS; i++) {
    const angle = (i / RING_SEGMENTS) * TAU;
    positions[i * 3] = radius * Math.cos(angle);
    positions[i * 3 + 2] = radius * Math.sin(angle);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  const ring = new Line(
    geometry,
    new LineBasicMaterial({
      color: rawColor(BRASS_HEX),
      transparent: true,
      opacity: RING_OPACITY,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  ring.visible = false;
  return ring;
}

/**
 * Étoiles voisines (couleur de leur classe spectrale, taille tirée de leur magnitude absolue), Soleil vu de loin
 * et cercles de distance (5 et 10 al, dans le plan des orbites qui viennent de se réduire au Soleil). Invisible
 * tant que `weighCosmos` ne lui a pas donné de poids ; la galaxie viendra plus tard (buildGalaxy).
 */
export function createCosmos(stars: readonly NearbyStar[]): CosmosBody {
  const pixelRatio: Uniform<number> = { value: 1 };
  const positions = new Float32Array(stars.length * 3);
  const colors = new Float32Array(stars.length * 3);
  const sizes = new Float32Array(stars.length);
  const starPositions = new Map<string, Vec3>();
  const starSizes = new Map<string, number>();
  stars.forEach((star, i) => {
    const position = starPositionLy(star);
    starPositions.set(star.key, position);
    positions.set([position.x, position.y, position.z], i * 3);
    const color = rawColor(spectralColor(star.spectralType));
    colors.set([color.r, color.g, color.b], i * 3);
    sizes[i] = starPointSize(absoluteMagnitude(star.apparentMag, star.distanceLy));
    starSizes.set(star.key, sizes[i]);
  });
  const sunColor = rawColor(SUN.color);

  const group = new Group();
  const cosmos: CosmosBody = {
    group,
    stars: pointCloud(positions, colors, sizes, pixelRatio),
    sunPoint: pointCloud(
      new Float32Array(3),
      new Float32Array([sunColor.r, sunColor.g, sunColor.b]),
      new Float32Array([SUN_POINT_SIZE_PX]),
      pixelRatio,
    ),
    rings: DISTANCE_RINGS_LY.map(distanceRing),
    galaxy: null,
    starPositions,
    starSizes,
    pixelRatio,
    galaxyGain: { value: 1 },
  };
  group.add(cosmos.stars, cosmos.sunPoint, ...cosmos.rings);
  return cosmos;
}

/**
 * Crée la galaxie (milkyWayCloud(count, GALAXY_SEED), même nuage à chaque visite) et l'ajoute au groupe ;
 * sans effet si elle existe déjà. Invisible jusqu'à la prochaine pesée. Sa sphère englobante entoure le centre
 * galactique (GALAXY_BOUNDING_RADIUS_LY) : le découpage par le champ de la caméra n'a rien à mesurer.
 */
export function buildGalaxy(cosmos: CosmosBody, count: number): void {
  if (cosmos.galaxy) return;
  const cloud = milkyWayCloud(count, GALAXY_SEED);
  const center = sceneFromGalacticXYZ(GALACTIC_CENTER_DISTANCE_LY, 0, 0);
  const bounds = new Sphere(new Vector3(center.x, center.y, center.z), GALAXY_BOUNDING_RADIUS_LY);
  const galaxy = pointCloud(cloud.positions, cloud.colors, cloud.sizes, cosmos.pixelRatio, cosmos.galaxyGain, bounds);
  cosmos.group.add(galaxy);
  cosmos.galaxy = galaxy;
}

/** Fondu d'un nuage : opacité = poids ; à poids nul, plus aucun appel de dessin. */
function weighPoints(points: Points<BufferGeometry, ShaderMaterial>, weight: number): void {
  points.material.uniforms.uOpacity.value = weight;
  points.visible = weight > 0;
}

/**
 * Opacités et visibilités selon les poids des couches : étoiles et cercles (opacité 0,35 × poids) suivent
 * `stars`, le point-Soleil `sunPoint`, la galaxie `galaxy`. Poids nul ⇒ `visible = false`.
 */
export function weighCosmos(cosmos: CosmosBody, weights: LayerWeights): void {
  weighPoints(cosmos.stars, weights.stars);
  weighPoints(cosmos.sunPoint, weights.sunPoint);
  if (cosmos.galaxy) weighPoints(cosmos.galaxy, weights.galaxy);
  for (const ring of cosmos.rings) {
    ring.material.opacity = RING_OPACITY * weights.stars;
    ring.visible = weights.stars > 0;
  }
}
