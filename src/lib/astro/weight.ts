import { EARTH_G, type ParseResult } from "@/lib/astro/constants";

export interface GravityEntry {
  key: string;
  name: string;
  /** Gravité de surface (sommet des nuages pour les géantes), en m/s². */
  g: number;
  color: string;
}

export const SURFACE_GRAVITY: readonly GravityEntry[] = [
  { key: "mercury", name: "Mercure", g: 3.7, color: "#B5ADA3" },
  { key: "venus", name: "Vénus", g: 8.87, color: "#E6CB94" },
  { key: "earth", name: "Terre", g: 9.81, color: "#5B9BE6" },
  { key: "moon", name: "Lune", g: 1.62, color: "#BDB9B2" },
  { key: "mars", name: "Mars", g: 3.71, color: "#DA6A43" },
  { key: "jupiter", name: "Jupiter", g: 24.79, color: "#D8A878" },
  { key: "saturn", name: "Saturne", g: 10.44, color: "#E2C98F" },
  { key: "uranus", name: "Uranus", g: 8.87, color: "#9ED9DE" },
  { key: "neptune", name: "Neptune", g: 11.15, color: "#5878E8" },
];

export const MASS_MIN_KG = 1;
export const MASS_MAX_KG = 300;

const RANGE_ERROR = `Indiquez une masse entre ${MASS_MIN_KG} et ${MASS_MAX_KG} kg, par exemple 40 ou 62,5.`;

/** Valeur qu'afficherait une balance réglée sur Terre : masse × g / 9,81. */
export function scaleReadingKg(massKg: number, g: number): number {
  return (massKg * g) / EARTH_G;
}

/**
 * Lit une masse saisie au clavier : espaces ignorés, virgule ou point décimal,
 * bornes incluses MASS_MIN_KG..MASS_MAX_KG.
 * Erreur (en français, dit quoi saisir) si vide, non numérique ou hors bornes.
 */
export function parseMassKg(raw: string): ParseResult {
  const text = raw.replace(/\s+/g, "").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(text)) return { ok: false, error: RANGE_ERROR };
  const value = Number(text);
  if (value < MASS_MIN_KG || value > MASS_MAX_KG) return { ok: false, error: RANGE_ERROR };
  return { ok: true, value };
}
