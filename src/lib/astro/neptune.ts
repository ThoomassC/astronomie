import { DAY_MS, YEAR_DAYS, type ParseResult } from "@/lib/astro/constants";

export const NEPTUNE_YEAR_YEARS = 164.79;
export const NEPTUNE_DISCOVERY_YEAR = 1846;
export const MARS_YEAR_YEARS = 1.8808;

/** Année décimale d'un instant Unix en ms : 1970 + ms / (365,25 × 86 400 000). */
export function decimalYear(ms: number): number {
  return 1970 + ms / (YEAR_DAYS * DAY_MS);
}

/** Nombre d'orbites (fraction possible) parcourues entre deux années pour une période donnée. */
export function orbitFraction(fromYear: number, toYear: number, periodYears: number): number {
  return (toYear - fromYear) / periodYears;
}

/**
 * Lit une année de naissance : entier, espaces ignorés, bornes incluses 1846..maxYear.
 * Erreur en français qui donne la plage attendue.
 */
export function parseBirthYear(raw: string, maxYear: number): ParseResult {
  const text = raw.replace(/\s+/g, "");
  const error = `Indiquez une année entre ${NEPTUNE_DISCOVERY_YEAR} et ${maxYear}.`;
  if (!/^\d{1,4}$/.test(text)) return { ok: false, error };
  const value = Number(text);
  if (value < NEPTUNE_DISCOVERY_YEAR || value > maxYear) return { ok: false, error };
  return { ok: true, value };
}
