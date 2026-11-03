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
import type { PlacedObject } from "@/lib/sizes/layout";
import { haloOpacity, visibleObjectCount } from "@/lib/sizes/sizesCamera";

/*
 * Seul module de la page « Tailles » qui lit le matériau d'étoile de la scène (starSurface) : il l'adapte aux étoiles
 * du comparateur. Couleur de la plaque (corps noir à la température effective) au centre du disque, plus lumineuse
 * que le blanc ; cellules de convection d'autant plus grandes que l'étoile l'est ; taches pour le Soleil seulement.
 *
 * Étoiles chaudes (Sirius A, Rigel), par une même transition de 6 500 à 9 500 K : leur couleur HDR, dominée par le bleu,
 * passait au-delà du coude du tone mapping PBR Neutral, qui écrase le centre du disque plus que le bord, et leur
 * assombrissement centre-bord en température, déjà faible (la courbe du corps noir s'aplatit dans le visible),
 * disparaissait : disque pâle et plat. Elles ont un éclat moindre, un assombrissement en intensité (dans la fourchette
 * des coefficients linéaires publiés en bande V vers 10 000 à 12 000 K), un grain fin et peu contrasté, un halo plus
 * large et bleuté.
 */

/** Éclat du centre du disque (HDR) : le tone mapping de la scène l'adoucit en blanc teinté. Étoiles chaudes : 1,2. */
const STAR_BRIGHTNESS = 1.6;
const STAR_BRIGHTNESS_HOT = 1.2;
/** Assombrissement centre-bord en intensité des étoiles chaudes (u de la loi linéaire) ; 0 pour les froides. */
const LIMB_INTENSITY_HOT = 0.35;
/** Cellules de convection par rayon d'étoile : 60 pour le Soleil (comme au Voyage), × r^−0,35, de 4 à 80. */
const SUN_GRANULATION = 60;
const GRANULATION_EXPONENT = -0.35;
const GRANULATION_RANGE = [4, 80] as const;
/** Cellules des étoiles chaudes, en multiple : un grain fin plutôt que de grandes cellules invisibles. */
const GRANULATION_HOT_FACTOR = 1.5;
/**
 * Contraste de la granulation : celui du Soleil pour les étoiles froides, faible au-delà de 9 500 K (Sirius A, Rigel),
 * dont l'enveloppe extérieure ne brasse presque plus : un grain à peine visible plutôt que rien.
 */
const CONTRAST_COOL = SUN_SURFACE.granulationContrast;
const CONTRAST_HOT = 0.045;
const HOT_RANGE_K = [6500, 9500] as const;
/** Halo : disque additif autour de l'étoile, qui luit de son limbe vers l'extérieur : 1,25 rayon, 1,7 pour les chaudes. */
const HALO_EXTENT = 1.25;
const HALO_EXTENT_HOT = 1.7;
/** Éclat du halo à son plus fort, en fraction de la couleur de l'étoile : 0,55, 0,85 pour les chaudes. */
const HALO_GAIN = 0.55;
const HALO_GAIN_HOT = 0.85;
/** Halo des étoiles chaudes : teinte mêlée à 35 % de la couleur de la classe O du design system. */
const HALO_TINT_HOT = "#9bb0ff";
const HALO_TINT_SHARE = 0.35;
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
export type StarLook = Required<
  Pick<StarSurfaceOptions, "temperature" | "color" | "granulation" | "granulationContrast" | "limbDarkening" | "limbIntensity">
>;

/** Part « chaude » d'une étoile, de 0 (6 500 K et moins) à 1 (9 500 K et plus) : smoothstep de la transition. */
const hotness = (star: ComparedStar) => smoothstep(HOT_RANGE_K[0], HOT_RANGE_K[1], star.temperatureK);

/** Réglages de surface d'une étoile du comparateur. */
export function starLook(star: ComparedStar): StarLook {
  const [fewest, most] = GRANULATION_RANGE;
  const hot = hotness(star);
  const cells = clamp(SUN_GRANULATION * star.radiusSolar ** GRANULATION_EXPONENT, fewest, most);
  return {
    temperature: star.temperatureK,
    color: new Color(star.color).multiplyScalar(lerp(STAR_BRIGHTNESS, STAR_BRIGHTNESS_HOT, hot)),
    granulation: Math.min(most, cells * lerp(1, GRANULATION_HOT_FACTOR, hot)),
    granulationContrast: lerp(CONTRAST_COOL, CONTRAST_HOT, hot),
    limbDarkening: SUN_SURFACE.limbDarkening,
    limbIntensity: LIMB_INTENSITY_HOT * hot,
  };
}

/** Halo d'une étoile : étendue, en rayons, et couleur linéaire à son plus fort (gain compris). */
export interface HaloLook {
  extent: number;
  color: Color;
}

/** Halo d'une étoile du comparateur : 1,25 rayon à 0,55 de sa couleur ; 1,7 rayon, 0,85 et bleuté pour les chaudes. */
export function haloLook(star: ComparedStar): HaloLook {
  const hot = hotness(star);
  const color = new Color(star.color).lerp(new Color(HALO_TINT_HOT), HALO_TINT_SHARE * hot);
  return { extent: lerp(HALO_EXTENT, HALO_EXTENT_HOT, hot), color: color.multiplyScalar(lerp(HALO_GAIN, HALO_GAIN_HOT, hot)) };
}

/**
 * Halo tracé face à la caméra : le carré unité, mis à l'échelle de son étendue (en rayons), se pose en espace vue
 * autour du centre de l'étoile. La sphère cache sa partie centrale ; il luit de son limbe (uInner = 1 / étendue : 0,8
 * pour 1,25 rayon) vers son bord (1).
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
uniform float uInner;
varying vec2 vOffset;
void main() {
  float glow = 1.0 - smoothstep(uInner, 1.0, length(vOffset));
  gl_FragColor = vec4(uColor * glow * glow * uOpacity, 1.0);
}
`;

function createHaloMaterial(look: HaloLook, opacity: Uniform<number>): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { uColor: { value: look.color.clone() }, uOpacity: opacity, uInner: { value: 1 / look.extent } },
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
  placed: readonly PlacedObject[],
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
    const glow = haloLook(star);
    const halo = new Mesh(square, createHaloMaterial(glow, opacity));
    halo.position.x = place.x;
    halo.scale.setScalar(glow.extent * place.radius);
    // Disque orienté dans le shader : sa sphère englobante ne dit rien de ce qu'il couvre à l'écran.
    halo.frustumCulled = false;
    group.add(body, halo);
    return { key: star.key, body, halo, haloOpacity: opacity, surface };
  });
  showStars(meshes, 0, 0, 0);
  return { group, meshes };
}

/**
 * Étoiles dessinées pendant le vol `fromIndex` → `toIndex` à l'avancement `t` (visibleObjectCount) et opacité de leur
 * halo (haloOpacity) ; un halo éteint n'est pas dessiné.
 */
export function showStars(meshes: readonly SizesStarMesh[], fromIndex: number, toIndex: number, t: number): void {
  const count = visibleObjectCount(fromIndex, toIndex, t);
  meshes.forEach((star, i) => {
    const visible = i < count;
    star.body.visible = visible;
    star.haloOpacity.value = visible ? haloOpacity(i, fromIndex, toIndex, t) : 0;
    star.halo.visible = star.haloOpacity.value > 0;
  });
}
