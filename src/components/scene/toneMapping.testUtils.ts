/*
 * Miroirs TypeScript de la fin des shaders de la scène (OUTPUT de shaders.ts), pour les tests seulement : décodage
 * sRGB d'une couleur du design system et tone mapping PBR Neutral de three 0.186. Ils vérifient qu'une couleur
 * calculée côté TypeScript sort à l'écran telle qu'attendue (nuit du fond étoilé, disque des étoiles chaudes).
 * Écrits sans three, pour ne pas vérifier three avec lui-même.
 */

export type LinearRgb = [r: number, g: number, b: number];

/** Coude de la compression de Neutral, en linéaire : `StartCompression` = 0,8 − 0,04. */
const START_COMPRESSION = 0.8 - 0.04;
/** `Desaturation` de Neutral. */
const DESATURATION = 0.15;

/** Canal sRGB (de 0 à 1) en linéaire : courbe de transfert de `SRGBToLinear` (three, ColorManagement). */
function srgbChannelToLinear(channel: number): number {
  return channel < 0.04045 ? channel * 0.0773993808 : Math.pow(channel * 0.9478672986 + 0.0521327014, 2.4);
}

/** Couleur « #rrggbb » (sRGB) en linéaire, comme `Color` de three avec la gestion des couleurs active. */
export function srgbHexToLinear(hex: string): LinearRgb {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) throw new RangeError(`Couleur sRGB invalide : ${hex}`);
  const [r, g, b] = [match[1], match[2], match[3]].map((pair) => srgbChannelToLinear(parseInt(pair, 16) / 255));
  return [r, g, b];
}

/** Miroir de `NeutralToneMapping` de three 0.186 (`tonemapping_pars_fragment`), exposition 1, entrée et sortie linéaires. */
export function neutralToneMap(rgb: readonly [number, number, number]): LinearRgb {
  const low = Math.min(rgb[0], rgb[1], rgb[2]);
  const offset = low < 0.08 ? low - 6.25 * low * low : 0.04;
  const [r, g, b] = [rgb[0] - offset, rgb[1] - offset, rgb[2] - offset];
  const peak = Math.max(r, g, b);
  if (peak < START_COMPRESSION) return [r, g, b];
  const d = 1 - START_COMPRESSION;
  const newPeak = 1 - (d * d) / (peak + d - START_COMPRESSION);
  const scale = newPeak / peak;
  const mix = 1 - 1 / (DESATURATION * (peak - newPeak) + 1);
  const toward = (channel: number) => channel * scale + (newPeak - channel * scale) * mix;
  return [toward(r), toward(g), toward(b)];
}
