import { LIGHT_SECONDS_PER_AU } from "@/lib/astro/constants";
import { pad2 } from "@/lib/format";

/** Temps de trajet de la lumière pour une distance en UA, en secondes. */
export function lightSeconds(au: number): number {
  return au * LIGHT_SECONDS_PER_AU;
}

/**
 * Durée lisible, valeurs tronquées (jamais arrondies au supérieur) :
 * moins d'une minute → "15 s" ; moins d'une heure → "8 min 19 s" (secondes sur 2 chiffres) ;
 * au-delà → "4 h 10 min" (minutes sur 2 chiffres). Entrée négative ou NaN → "0 s".
 */
export function formatDuration(seconds: number): string {
  if (!(seconds > 0)) return "0 s";
  const s = Math.floor(seconds);
  if (s < 60) return `${s} s`;
  if (s < 3600) return `${Math.floor(s / 60)} min ${pad2(s % 60)} s`;
  return `${Math.floor(s / 3600)} h ${pad2(Math.floor((s % 3600) / 60))} min`;
}
