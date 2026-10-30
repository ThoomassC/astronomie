import { AdditiveBlending, Color, Group, Mesh, PlaneGeometry, ShaderMaterial, SphereGeometry } from "three";
import type { Uniform } from "@/components/scene/materials";
import { clamp, lerp, smoothstep } from "@/components/scene/math";
import {
  SUN_SURFACE,
  createStarSurfaceMaterial,
  placeStarspots,
  type StarSurfaceOptions,
  type StarSurfaceUniforms,
} from "@/components/scene/starSurface";
import type { ComparedStar, SizeStarKey } from "@/lib/astro/starSizes";
import type { PlacedStar } from "@/lib/sizes/layout";
import { haloOpacity, visibleStarCount } from "@/lib/sizes/sizesCamera";

/*
 * Seul module de la page « Tailles » qui lit le matériau d'étoile de la scène (starSurface) : il l'adapte aux étoiles
 * du comparateur. Couleur de la plaque (corps noir à la température effective) au centre du disque, plus lumineuse
 * que le blanc ; cellules de convection d'autant plus grandes que l'étoile l'est ; taches pour le Soleil seulement.
 */

/** Éclat du centre du disque (HDR) : le tone mapping de la scène l'adoucit en blanc teinté. */
const STAR_BRIGHTNESS = 1.6;
/** Cellules de convection par rayon d'étoile : 60 pour le Soleil (comme au Voyage), × r^−0,35, de 4 à 80. */
const SUN_GRANULATION = 60;
const GRANULATION_EXPONENT = -0.35;
const GRANULATION_RANGE = [4, 80] as const;
/**
 * Contraste de la granulation : celui du Soleil pour les étoiles froides, presque rien au-delà de 9 500 K (Sirius A,
 * Rigel), dont l'enveloppe extérieure ne brasse presque plus.
 */
const CONTRAST_COOL = SUN_SURFACE.granulationContrast;
const CONTRAST_HOT = 0.025;
const HOT_RANGE_K = [6500, 9500] as const;
/** Halo : disque additif de 1,25 rayon autour de l'étoile, qui luit de son limbe vers l'extérieur. */
const HALO_EXTENT = 1.25;
/** Éclat du halo à son plus fort, en fraction de la couleur de l'étoile. */
const HALO_GAIN = 0.55;
/** Groupes de taches du Soleil : ceux d'un écran tactile au Voyage (taches plus rares, plus lisibles de loin). */
const SUN_SPOT_GROUPS = 8;

/** Étoile 3D de la page : sphère de rayon 1 mise à l'échelle, halo, et ce qui se règle à chaque image. */
export interface SizesStarMesh {
  key: SizeStarKey;
  body: Mesh<SphereGeometry, ShaderMaterial>;
  halo: Mesh<PlaneGeometry, ShaderMaterial>;
  /** Opacité du halo, de 0 à 1 (`haloOpacity` du vol). */
  haloOpacity: Uniform<number>;
  surface: StarSurfaceUniforms;
}

/** Activité du jour pour les taches du Soleil : de 0 à 1, latitude moyenne des taches en radians. */
export interface SunSpots {
  activity: number;
  latitude: number;
}

/** Réglages de surface d'une étoile du comparateur (ceux de `StarSurfaceOptions`, sans le temps ni les taches). */
export type StarLook = Required<Pick<StarSurfaceOptions, "temperature" | "color" | "granulation" | "granulationContrast" | "limbDarkening">>;

/** Réglages de surface d'une étoile du comparateur. */
export function starLook(star: ComparedStar): StarLook {
  const [fewest, most] = GRANULATION_RANGE;
  return {
    temperature: star.temperatureK,
    color: new Color(star.color).multiplyScalar(STAR_BRIGHTNESS),
    granulation: clamp(SUN_GRANULATION * star.radiusSolar ** GRANULATION_EXPONENT, fewest, most),
    granulationContrast: lerp(CONTRAST_COOL, CONTRAST_HOT, smoothstep(HOT_RANGE_K[0], HOT_RANGE_K[1], star.temperatureK)),
    limbDarkening: SUN_SURFACE.limbDarkening,
  };
}

/**
 * Halo tracé face à la caméra : le carré unité, mis à l'échelle de 1,25 rayon, se pose en espace vue autour du
 * centre de l'étoile. La sphère cache sa partie centrale ; il luit de son limbe (0,8) vers son bord (1).
 */
const HALO_VERTEX = /* glsl */ `
varying vec2 vOffset;
void main() {
  vOffset = position.xy;
  vec4 center = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  float scale = length(modelMatrix[0].xyz);
  gl_Position = projectionMatrix * (center + vec4(position.xy * scale, 0.0, 0.0));
}
`;

const HALO_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying vec2 vOffset;
void main() {
  float glow = 1.0 - smoothstep(0.8, 1.0, length(vOffset));
  gl_FragColor = vec4(uColor * glow * glow * uOpacity, 1.0);
}
`;

function createHaloMaterial(color: Color, opacity: Uniform<number>): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { uColor: { value: color.clone().multiplyScalar(HALO_GAIN) }, uOpacity: opacity },
    vertexShader: HALO_VERTEX,
    fragmentShader: HALO_FRAGMENT,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
}

/**
 * Étoiles du comparateur, alignées comme `placed` (même ordre que `stars`) : une sphère de rayon 1 mise à l'échelle
 * du rayon (en R☉, l'unité de la scène), un halo de 1,25 rayon, la surface au temps partagé `time`. Le Soleil porte
 * les taches de l'activité du jour si `sunSpots` est donné. Au départ, seule la plus petite est dessinée.
 */
export function createStarMeshes(
  stars: readonly ComparedStar[],
  placed: readonly PlacedStar[],
  { time, lite, sunSpots }: { time: Uniform<number>; lite: boolean; sunSpots: SunSpots | null },
): { group: Group; meshes: SizesStarMesh[] } {
  const group = new Group();
  // Une sphère et un carré partagés par toutes les étoiles : seuls les matériaux diffèrent.
  const sphere = new SphereGeometry(1, 96, 64);
  const square = new PlaneGeometry(2, 2);
  const meshes = placed.map((place, i) => {
    const star = stars[i];
    const spots = star.key === "sun" && sunSpots !== null;
    const { material, uniforms: surface } = createStarSurfaceMaterial({
      ...starLook(star),
      spotGroups: spots ? SUN_SPOT_GROUPS : 0,
      activity: spots ? sunSpots.activity : 0,
      time,
      lite,
    });
    const body = new Mesh(sphere, material);
    if (spots) {
      // Taches au temps affiché, recalculées juste avant le dessin du Soleil, seulement si ce temps a avancé.
      const field = { time: Number.NaN, activity: sunSpots.activity, latitude: sunSpots.latitude, spin: () => SUN_SURFACE.spin };
      const placeSpots = () => {
        if (field.time === time.value) return;
        field.time = time.value;
        placeStarspots(surface, field);
      };
      placeSpots();
      body.onBeforeRender = placeSpots;
    }
    body.position.x = place.x;
    body.scale.setScalar(place.radius);
    const opacity: Uniform<number> = { value: 1 };
    const halo = new Mesh(square, createHaloMaterial(new Color(star.color), opacity));
    halo.position.x = place.x;
    halo.scale.setScalar(HALO_EXTENT * place.radius);
    // Disque orienté dans le shader : sa sphère englobante ne dit rien de ce qu'il couvre à l'écran.
    halo.frustumCulled = false;
    group.add(body, halo);
    return { key: place.key, body, halo, haloOpacity: opacity, surface };
  });
  showStars(meshes, 0, 0, 0);
  return { group, meshes };
}

/**
 * Étoiles dessinées pendant le vol `fromIndex` → `toIndex` à l'avancement `t` (visibleStarCount) et opacité de leur
 * halo (haloOpacity) ; un halo éteint n'est pas dessiné.
 */
export function showStars(meshes: readonly SizesStarMesh[], fromIndex: number, toIndex: number, t: number): void {
  const count = visibleStarCount(fromIndex, toIndex, t);
  meshes.forEach((star, i) => {
    const visible = i < count;
    star.body.visible = visible;
    star.haloOpacity.value = visible ? haloOpacity(i, fromIndex, toIndex, t) : 0;
    star.halo.visible = star.haloOpacity.value > 0;
  });
}
