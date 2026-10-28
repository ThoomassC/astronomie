import { STOP_ORDER, type StopKey } from "@/lib/journey/camera";

/**
 * Cartes photographiques des astres : Solar System Scope, d'après des données de la NASA
 * (CC BY 4.0). Deux résolutions servies depuis `public/textures` : 2K pour les ordinateurs
 * et les tablettes, 1K pour les téléphones.
 */

export type TextureTier = "1k" | "2k";

interface TextureFile {
  file: string;
  /** Escale qui montre la carte de près ; `null` : visible partout (ciel). */
  stop: StopKey | null;
  /** Un seul exemplaire pour les deux résolutions (carte petite à l'écran ou peu détaillée). */
  shared?: true;
}

/** Ordre de déclaration = ordre de chargement au sein d'une même escale. */
const FILES = {
  mercury: { file: "mercury.jpg", stop: "mercury" },
  // Vénus et Uranus n'ont presque aucun détail : la carte 1K suffit à toutes les résolutions.
  venus: { file: "venus.jpg", stop: "venus", shared: true },
  earth: { file: "earth-day.jpg", stop: "earth" },
  earthClouds: { file: "earth-clouds.jpg", stop: "earth" },
  earthNight: { file: "earth-night.jpg", stop: "earth" },
  earthSpecular: { file: "earth-specular.jpg", stop: "earth", shared: true },
  moon: { file: "moon.jpg", stop: "earth", shared: true },
  mars: { file: "mars.jpg", stop: "mars" },
  jupiter: { file: "jupiter.jpg", stop: "jupiter" },
  saturn: { file: "saturn.jpg", stop: "saturn" },
  saturnRing: { file: "saturn-ring.png", stop: "saturn", shared: true },
  uranus: { file: "uranus.jpg", stop: "uranus", shared: true },
  neptune: { file: "neptune.jpg", stop: "neptune" },
  // Le ciel ne lit que la lueur floue de la Voie lactée : une carte de 256 × 128 suffit.
  milkyWay: { file: "milky-way.jpg", stop: null, shared: true },
} as const satisfies Record<string, TextureFile>;

export type TextureKey = keyof typeof FILES;

export const TEXTURE_KEYS = Object.keys(FILES) as TextureKey[];

/** Rayons couverts par la texture des anneaux de Saturne, en rayons équatoriaux (mesurés sur l'image). */
export const SATURN_RING = { inner: 1.159, outer: 2.337 } as const;

export interface DeviceHints {
  /** Pointeur principal tactile. */
  coarsePointer: boolean;
  /** Petit côté de l'écran, en pixels CSS. */
  shortSide: number;
  /** `MAX_TEXTURE_SIZE` du GPU. */
  maxTextureSize: number;
  /** Hauteur du canevas, en pixels physiques. */
  pixelHeight: number;
}

/**
 * 1K pour les téléphones, les GPU modestes et les écrans de moins de 1 000 pixels de haut : une
 * planète y occupe au plus 400 pixels, le plein niveau d'une carte 2K ne serait jamais lu.
 * Quatre fois moins de mémoire graphique.
 */
export function pickTextureTier({ coarsePointer, shortSide, maxTextureSize, pixelHeight }: DeviceHints): TextureTier {
  if (maxTextureSize < 4096 || pixelHeight < 1000) return "1k";
  return coarsePointer && shortSide < 768 ? "1k" : "2k";
}

export function textureUrl(key: TextureKey, tier: TextureTier): string {
  const entry: TextureFile = FILES[key];
  return entry.shared ? `/textures/${entry.file}` : `/textures/${tier}/${entry.file}`;
}

/**
 * Ordre de chargement : d'abord l'escale en cours, puis le ciel, puis les escales par
 * éloignement dans le parcours. Tri stable : l'ordre de déclaration départage.
 */
export function textureLoadOrder(current: StopKey): TextureKey[] {
  const here = STOP_ORDER.indexOf(current);
  const rank = (key: TextureKey) => {
    const stop: StopKey | null = FILES[key].stop;
    return stop === null ? 0.5 : Math.abs(STOP_ORDER.indexOf(stop) - here);
  };
  return [...TEXTURE_KEYS].sort((a, b) => rank(a) - rank(b));
}
