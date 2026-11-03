import { ClampToEdgeWrapping, DataTexture, LinearFilter, NoColorSpace, RGFormat, RepeatWrapping, UnsignedByteType } from "three";
import type { Vec3 } from "@/lib/astro/constants";
import { TAU, clamp, lerp } from "./math";

/**
 * Champ de la couronne du Soleil, cuit une fois dans une petite texture au lieu d'être tiré à chaque pixel. Les jets
 * (deux octaves, 3,2 et 7,5 par rayon) et les sites des protubérances (4 par rayon) ne dépendent que de la direction n,
 * dans le repère du Soleil : la couronne les lit dans une carte équirectangulaire de 256 × 128 texels (longitude autour
 * du pôle, distance au pôle), une lecture filtrée au lieu de trois bruits de valeur de huit hachages chacun ; sa
 * rotation propre n'y est qu'un décalage en longitude. Bruit du shader (NOISE_GLSL), en flottants 32 bits comme le
 * GPU. Écart au bruit calculé par pixel, filtrage et 8 bits compris : 0,0015 en moyenne, 0,010 au plus pour les jets
 * (qui vont de 0,06 à 0,92) ; une carte de 128 × 64 s'en écartait de 0,043.
 */

/** Taille de la carte : environ cinq texels par maille du bruit le plus fin (7,5 par rayon) à l'équateur. */
export const CORONA_FIELD_WIDTH = 256;
export const CORONA_FIELD_HEIGHT = 128;

const f32 = Math.fround;
const HASH_SCALE = f32(0.3183099);
const HASH_OFFSET = f32(0.1);

/** Partie fractionnaire en simple précision (la soustraction y est exacte). */
const fract = (value: number) => f32(value - Math.floor(value));

/** Hachage du bruit du shader (hs) au nœud entier (x, y, z), en simple précision comme le GPU. */
function hash(x: number, y: number, z: number): number {
  const px = f32(fract(f32(x * HASH_SCALE + HASH_OFFSET)) * 17);
  const py = f32(fract(f32(y * HASH_SCALE + HASH_OFFSET)) * 17);
  const pz = f32(fract(f32(z * HASH_SCALE + HASH_OFFSET)) * 17);
  return fract(f32(f32(f32(px * py) * pz) * f32(f32(px + py) + pz)));
}

/** Poids d'Hermite du bruit : f² (3 − 2f). */
const fade = (t: number) => t * t * (3 - 2 * t);

/** Interpolation trilinéaire lissée des huit nœuds qui entourent (x, y, z) ; `node` donne la valeur d'un nœud. */
function interpolate(x: number, y: number, z: number, node: (i: number, j: number, k: number) => number): number {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const k = Math.floor(z);
  const fx = fade(x - i);
  const fy = fade(y - j);
  const fz = fade(z - k);
  const near = lerp(lerp(node(i, j, k), node(i + 1, j, k), fx), lerp(node(i, j + 1, k), node(i + 1, j + 1, k), fx), fy);
  const far = lerp(
    lerp(node(i, j, k + 1), node(i + 1, j, k + 1), fx),
    lerp(node(i, j + 1, k + 1), node(i + 1, j + 1, k + 1), fx),
    fy,
  );
  return lerp(near, far, fz);
}

/** Bruit de valeur 3D du shader (vn) : de 0 à 1, moyenne 0,5. */
export function valueNoise(x: number, y: number, z: number): number {
  return interpolate(x, y, z, hash);
}

/**
 * Bruit de valeur de la sphère unité vue à la fréquence `frequency`, décalée de `offset` sur x : vn(n × fréquence +
 * (offset, 0, 0)). Les hachages des nœuds qui l'entourent sont tirés une fois, pour toute la carte.
 */
function sphereNoise(frequency: number, offset: number): (n: Vec3) => number {
  const min = { x: Math.floor(offset - frequency), y: Math.floor(-frequency), z: Math.floor(-frequency) };
  const size = { x: Math.ceil(offset + frequency) - min.x + 2, y: Math.ceil(frequency) - min.y + 2 };
  const depth = Math.ceil(frequency) - min.z + 2;
  const nodes = new Float64Array(size.x * size.y * depth);
  for (let k = 0; k < depth; k++) {
    for (let j = 0; j < size.y; j++) {
      for (let i = 0; i < size.x; i++) nodes[(k * size.y + j) * size.x + i] = hash(min.x + i, min.y + j, min.z + k);
    }
  }
  const node = (i: number, j: number, k: number) => nodes[((k - min.z) * size.y + (j - min.y)) * size.x + (i - min.x)];
  return (n) => interpolate(n.x * frequency + offset, n.y * frequency, n.z * frequency, node);
}

/** Les deux octaves des jets, et celle des sites des protubérances (CORONA_FRAGMENT). */
const jetsBroad = sphereNoise(3.2, 11);
const jetsFine = sphereNoise(7.5, 23);
const sites = sphereNoise(4, 7.3);

/** Motif des jets dans la direction n (unitaire, repère du Soleil) : 0,6 vn(n × 3,2 + (11, 0, 0)) + 0,4 vn(n × 7,5 + (23, 0, 0)). */
export function coronaJets(n: Vec3): number {
  return 0.6 * jetsBroad(n) + 0.4 * jetsFine(n);
}

/** Sites des protubérances dans la direction n : vn(n × 4 + (7,3, 0, 0)), seuillé ensuite selon l'activité. */
export function prominenceSites(n: Vec3): number {
  return sites(n);
}

/**
 * Direction unitaire (repère du Soleil, pôle sur y) du point (u, v) de la carte : u la longitude, de −π (u = 0) à π
 * (u = 1), comptée comme atan(z, x) ; v la distance au pôle nord, de 0 (pôle nord) à π (pôle sud).
 */
export function fieldDirection(u: number, v: number, out: Vec3 = { x: 0, y: 0, z: 0 }): Vec3 {
  const longitude = (u - 0.5) * TAU;
  const polar = v * Math.PI;
  const ring = Math.sin(polar);
  out.x = ring * Math.cos(longitude);
  out.y = Math.cos(polar);
  out.z = ring * Math.sin(longitude);
  return out;
}

/** Coordonnées de la direction n dans la carte, comme les calcule la couronne (rotation propre exclue). */
export function fieldCoordinates(n: Vec3): { u: number; v: number } {
  return { u: Math.atan2(n.z, n.x) / TAU + 0.5, v: Math.acos(clamp(n.y, -1, 1)) / Math.PI };
}

/** Carte cuite, gardée pour toute la visite : une scène reconstruite (retour sur le Voyage) la reprend. */
let fieldData: Uint8Array | null = null;

/**
 * Carte du champ, deux canaux de 8 bits par texel, ligne par ligne depuis le pôle nord : jets (r), sites des
 * protubérances (g), pris au centre de chaque texel. Cuite au premier appel (quelques millisecondes), puis reprise.
 */
export function coronaFieldData(): Uint8Array {
  if (fieldData) return fieldData;
  const data = new Uint8Array(CORONA_FIELD_WIDTH * CORONA_FIELD_HEIGHT * 2);
  const n: Vec3 = { x: 0, y: 0, z: 0 };
  for (let j = 0; j < CORONA_FIELD_HEIGHT; j++) {
    for (let i = 0; i < CORONA_FIELD_WIDTH; i++) {
      fieldDirection((i + 0.5) / CORONA_FIELD_WIDTH, (j + 0.5) / CORONA_FIELD_HEIGHT, n);
      const texel = (j * CORONA_FIELD_WIDTH + i) * 2;
      data[texel] = Math.round(255 * coronaJets(n));
      data[texel + 1] = Math.round(255 * prominenceSites(n));
    }
  }
  fieldData = data;
  return data;
}

/**
 * Texture du champ, une par scène et libérée avec elle (les données, elles, sont partagées) : filtrage bilinéaire sans
 * mipmap, répétée en longitude (la carte se referme), bornée aux pôles. Donnée brute, sans espace de couleur.
 */
export function createCoronaFieldTexture(): DataTexture {
  const texture = new DataTexture(coronaFieldData(), CORONA_FIELD_WIDTH, CORONA_FIELD_HEIGHT, RGFormat, UnsignedByteType);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}
