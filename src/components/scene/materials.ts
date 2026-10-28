import {
  AdditiveBlending,
  BackSide,
  Color,
  DataTexture,
  DoubleSide,
  ShaderMaterial,
  Vector2,
  Vector3,
  type Texture,
} from "three";
import {
  ATMOSPHERE_FRAGMENT,
  ATMOSPHERE_VERTEX,
  CORONA_FRAGMENT,
  CORONA_VERTEX,
  RING_FRAGMENT,
  RING_VERTEX,
  SKY_FRAGMENT,
  SKY_VERTEX,
  SUN_FRAGMENT,
  SUN_VERTEX,
  SURFACE_FRAGMENT,
  SURFACE_VERTEX,
} from "./shaders";
import { SATURN_RING } from "./textureSet";

/** Matériaux de la scène : shaders de shaders.ts et uniformes typés, modifiés en place par le moteur. */

export interface Uniform<T> {
  value: T;
}

/** Texture blanche 1×1 : occupe les échantillonneurs tant que les cartes ne sont pas arrivées. */
export function createPlaceholderTexture(): DataTexture {
  const texture = new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  texture.needsUpdate = true;
  return texture;
}

export type Lighting = "airless" | "gas" | "rocky" | "venus" | "earth";

/**
 * Uniformes d'une surface. Toutes les variantes portent les mêmes champs (un programme ignore
 * ceux qu'il ne déclare pas) ; les champs `uRing*` et `uPlanet*` sont partagés avec les anneaux.
 */
export interface SurfaceUniforms {
  uMap: Uniform<Texture>;
  /** Passage de la couleur unie à la carte, de 0 à 1. */
  uMapMix: Uniform<number>;
  uBaseColor: Uniform<Color>;
  uHazeColor: Uniform<Color>;
  uMinnaert: Uniform<number>;
  uNight: Uniform<Texture>;
  uNightMix: Uniform<number>;
  uClouds: Uniform<Texture>;
  uCloudsMix: Uniform<number>;
  uSpecular: Uniform<Texture>;
  uSpecularMix: Uniform<number>;
  /** Dérive des nuages, en fraction de tour. */
  uCloudDrift: Uniform<number>;
  uRingMap: Uniform<Texture>;
  uRingMix: Uniform<number>;
  /** Rayons intérieur et extérieur couverts par la texture des anneaux, en rayons de la planète. */
  uRingRadii: Uniform<Vector2>;
  /** Centre (monde), pôle nord (monde, unitaire) et rayon équatorial (monde) de la planète. */
  uPlanetCenter: Uniform<Vector3>;
  uPlanetPole: Uniform<Vector3>;
  uPlanetRadius: Uniform<number>;
}

export interface SurfaceOptions {
  lighting: Lighting;
  /** Exposant de Minnaert : 1 = Lambert, au-delà le bord s'assombrit. */
  minnaert: number;
  /** Couleur unie avant l'arrivée de la carte (linéaire). */
  baseColor: Color;
  /** Brume du bord (linéaire, intensité comprise) ; noire = aucune. */
  haze: Color;
  ringShadow: boolean;
}

export function createSurfaceMaterial(
  options: SurfaceOptions,
  placeholder: Texture,
): { material: ShaderMaterial; uniforms: SurfaceUniforms } {
  const uniforms: SurfaceUniforms = {
    uMap: { value: placeholder },
    uMapMix: { value: 0 },
    uBaseColor: { value: options.baseColor },
    uHazeColor: { value: options.haze },
    uMinnaert: { value: options.minnaert },
    uNight: { value: placeholder },
    uNightMix: { value: 0 },
    uClouds: { value: placeholder },
    uCloudsMix: { value: 0 },
    uSpecular: { value: placeholder },
    uSpecularMix: { value: 0 },
    uCloudDrift: { value: 0 },
    uRingMap: { value: placeholder },
    uRingMix: { value: 0 },
    uRingRadii: { value: new Vector2(SATURN_RING.inner, SATURN_RING.outer) },
    uPlanetCenter: { value: new Vector3() },
    uPlanetPole: { value: new Vector3(0, 1, 0) },
    uPlanetRadius: { value: 1 },
  };
  const defines: Record<string, string> = {};
  if (options.lighting === "airless") defines.LIGHTING_AIRLESS = "";
  if (options.lighting === "venus") defines.LIGHTING_VENUS = "";
  if (options.lighting === "earth") defines.EARTH = "";
  if (options.ringShadow) defines.RING_SHADOW = "";
  const material = new ShaderMaterial({
    uniforms: { ...uniforms },
    defines,
    vertexShader: SURFACE_VERTEX,
    fragmentShader: SURFACE_FRAGMENT,
  });
  return { material, uniforms };
}

export interface AtmosphereUniforms {
  uPlanetCenter: Uniform<Vector3>;
  uPlanetRadius: Uniform<number>;
  /** Épaisseur de la couche, en rayons de la planète. */
  uThickness: Uniform<number>;
  uDayColor: Uniform<Color>;
  uTwilightColor: Uniform<Color>;
  uStrength: Uniform<number>;
}

export interface AtmosphereOptions {
  thickness: number;
  day: Color;
  twilight: Color;
  strength: number;
}

export function createAtmosphereMaterial(options: AtmosphereOptions): {
  material: ShaderMaterial;
  uniforms: AtmosphereUniforms;
} {
  const uniforms: AtmosphereUniforms = {
    uPlanetCenter: { value: new Vector3() },
    uPlanetRadius: { value: 1 },
    uThickness: { value: options.thickness },
    uDayColor: { value: options.day },
    uTwilightColor: { value: options.twilight },
    uStrength: { value: options.strength },
  };
  const material = new ShaderMaterial({
    uniforms: { ...uniforms },
    vertexShader: ATMOSPHERE_VERTEX,
    fragmentShader: ATMOSPHERE_FRAGMENT,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
    // La couche frôle la surface : sans décalage, la précision du tampon de profondeur la ferait clignoter de loin.
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -8,
  });
  return { material, uniforms };
}

/** Anneaux de Saturne : la texture, son mélange et le repère de la planète viennent de la surface. */
export function createRingMaterial(surface: SurfaceUniforms, localRadius: number, polarRatio: number): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uRingMap: surface.uRingMap,
      uRingMix: surface.uRingMix,
      uRingRadii: surface.uRingRadii,
      uPlanetCenter: surface.uPlanetCenter,
      uPlanetPole: surface.uPlanetPole,
      uPlanetRadius: surface.uPlanetRadius,
      uLocalRadius: { value: localRadius },
      uPolarRatio: { value: polarRatio },
    },
    vertexShader: RING_VERTEX,
    fragmentShader: RING_FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    // Anneau plat : une seule face visible à la fois, une passe suffit (Three en ferait deux).
    forceSinglePass: true,
  });
}

export interface SkyUniforms {
  uMap: Uniform<Texture>;
  uMapMix: Uniform<number>;
  /** Niveau de mipmap lu : assez flou pour fondre les étoiles de la carte, garder la lueur. */
  uLod: Uniform<number>;
  uIntensity: Uniform<number>;
}

export function createSkyMaterial(
  placeholder: Texture,
  lod: number,
  intensity: number,
): { material: ShaderMaterial; uniforms: SkyUniforms } {
  const uniforms: SkyUniforms = {
    uMap: { value: placeholder },
    uMapMix: { value: 0 },
    uLod: { value: lod },
    uIntensity: { value: intensity },
  };
  const material = new ShaderMaterial({
    // Fond de la page (--nuit) : le ciel le recouvre entièrement.
    uniforms: { ...uniforms, uBase: { value: new Color(0x060b18) } },
    vertexShader: SKY_VERTEX,
    fragmentShader: SKY_FRAGMENT,
    side: BackSide,
    depthWrite: false,
    // Valeurs faibles, rendues telles quelles : le fond reste exactement --nuit.
    toneMapped: false,
  });
  return { material, uniforms };
}

export function createSunMaterial(time: Uniform<number>): ShaderMaterial {
  return new ShaderMaterial({ uniforms: { uTime: time }, vertexShader: SUN_VERTEX, fragmentShader: SUN_FRAGMENT });
}

export interface CoronaUniforms {
  /** Demi-côté du panneau, en unités de scène. */
  uSize: Uniform<number>;
  uSunRadius: Uniform<number>;
  /** Intensité de l'éblouissement autour du disque. */
  uGlare: Uniform<number>;
}

export function createCoronaMaterial(
  time: Uniform<number>,
  size: number,
  sunRadius: number,
): { material: ShaderMaterial; uniforms: CoronaUniforms } {
  const uniforms: CoronaUniforms = { uSize: { value: size }, uSunRadius: { value: sunRadius }, uGlare: { value: 0.1 } };
  const material = new ShaderMaterial({
    uniforms: { ...uniforms, uTime: time },
    vertexShader: CORONA_VERTEX,
    fragmentShader: CORONA_FRAGMENT,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
  return { material, uniforms };
}
