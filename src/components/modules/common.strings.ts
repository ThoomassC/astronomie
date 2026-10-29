import type { Locale } from "@/i18n/locales";
import { plural, type PluralForms } from "@/i18n/plural";

/** Nombre à accorder : sa valeur, que lisent les règles de pluriel, et son écriture déjà formatée (« 1,07 »). */
export interface Count {
  value: number;
  text: string;
}

/**
 * Nombre écrit suivi du mot accordé selon la langue : « 1,07 tour », « 2,03 tours », « 1.07 orbits ». La valeur lue
 * est celle du calcul, pas l'écriture arrondie : en français, 1,996 reste au singulier même écrit « 2,00 », comme le
 * voulait déjà la règle des modules (singulier sous 2).
 */
export function counted(locale: Locale, count: Count, forms: PluralForms): string {
  return `${count.text} ${plural(locale, count.value, forms)}`;
}

/** Textes partagés par les modules explicatifs. */
export interface CommonStrings {
  /** Repli du canevas quand rien ne peut y être dessiné. */
  unavailable: string;
  /** Commande d'une course en cours, en pause, puis terminée ; le départ est propre à chaque module. */
  pause: string;
  resume: string;
  restart: string;
  /** Indication liée à un champ prérempli : la valeur est un exemple, à changer entre `min` et `max` (déjà écrits). */
  example(min: string, max: string): string;
  /** Mercure, Vénus, la Terre et Mars, trop petites à l'échelle pour porter chacune une étiquette. */
  innerPlanets: string;
}

export const COMMON_STRINGS: Readonly<Record<Locale, CommonStrings>> = {
  fr: {
    unavailable: "Animation indisponible.",
    pause: "Pause",
    resume: "Reprendre",
    restart: "Relancer",
    example: (min, max) => `exemple, modifiable (de ${min} à ${max})`,
    innerPlanets: "Mercure à Mars",
  },
  en: {
    unavailable: "Animation unavailable.",
    pause: "Pause",
    resume: "Resume",
    restart: "Run again",
    example: (min, max) => `an example you can change (${min} to ${max})`,
    innerPlanets: "Mercury to Mars",
  },
  es: {
    unavailable: "Animación no disponible.",
    pause: "Pausa",
    resume: "Reanudar",
    restart: "Repetir",
    example: (min, max) => `un ejemplo que puedes cambiar (de ${min} a ${max})`,
    innerPlanets: "De Mercurio a Marte",
  },
};
