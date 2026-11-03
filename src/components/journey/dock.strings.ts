import type { Locale } from "@/i18n/locales";
import type { SpeedId } from "@/lib/sim/clock";

/** Libellés d'une vitesse du temps. */
export interface SpeedLabels {
  /** Texte de son bouton : « 1 semaine/s ». */
  label: string;
  /** Texte du bouton qui fait défiler les vitesses dans le dock compact : « 1 sem/s ». */
  short: string;
  /** Nom accessible, qui commence par le texte visible : « 1 semaine par seconde ». */
  spoken: string;
}

/**
 * Textes de la machine à remonter le temps. Les dates viennent d'Intl (SimDate) : longue, courte, en chiffres, et
 * l'écart avec aujourd'hui (« dans 5 jours », « 3 months ago », « hace 3 meses »), sauf le jour même.
 */
export interface DockStrings {
  /** Nom de la région du dock. */
  label: string;
  /** Bouton de lecture : son nom dit ce qu'il fait, selon que le temps passe ou non. */
  pause: string;
  resume: string;
  /** Nom du groupe des vitesses. */
  speedGroup: string;
  speeds: Readonly<Record<SpeedId, SpeedLabels>>;
  /** Description du bouton qui fait défiler les vitesses (dock compact). */
  speedHint: string;
  /** Retour à aujourd'hui : texte visible, puis nom accessible, qui le contient. */
  today: string;
  backToToday: string;
  /** Annonce une fois l'horloge remise à l'heure, date déjà écrite : « Retour au 29 octobre 2026 ». */
  backTo(date: string): string;
  /**
   * Écart nul, sous la date simulée. Écrit ici plutôt que par Intl, qui donnerait en français « aujourd’hui »
   * (apostrophe typographique) à côté du bouton « Aujourd'hui ».
   */
  relativeToday: string;
  /** Bascule des distances réelles : texte visible et nom. */
  realDistances: string;
}

export const DOCK_STRINGS: Readonly<Record<Locale, DockStrings>> = {
  fr: {
    label: "Machine à remonter le temps",
    pause: "Mettre le temps en pause",
    resume: "Relancer le temps",
    speedGroup: "Vitesse du temps",
    speeds: {
      day: { label: "1 jour/s", short: "1 j/s", spoken: "1 jour par seconde" },
      week: { label: "1 semaine/s", short: "1 sem/s", spoken: "1 semaine par seconde" },
      month: { label: "1 mois/s", short: "1 mois/s", spoken: "1 mois par seconde" },
      year: { label: "1 an/s", short: "1 an/s", spoken: "1 an par seconde" },
    },
    speedHint: "Changer la vitesse du temps",
    today: "Aujourd'hui",
    backToToday: "Revenir à aujourd'hui",
    backTo: (date) => `Retour au ${date}`,
    relativeToday: "aujourd'hui",
    realDistances: "Distances réelles",
  },
  en: {
    label: "Time machine",
    pause: "Pause time",
    resume: "Resume time",
    speedGroup: "Speed of time",
    speeds: {
      day: { label: "1 day/s", short: "1 d/s", spoken: "1 day per second" },
      week: { label: "1 week/s", short: "1 wk/s", spoken: "1 week per second" },
      month: { label: "1 month/s", short: "1 mo/s", spoken: "1 month per second" },
      year: { label: "1 year/s", short: "1 yr/s", spoken: "1 year per second" },
    },
    speedHint: "Change the speed of time",
    today: "Today",
    backToToday: "Back to today",
    backTo: (date) => `Back to ${date}`,
    relativeToday: "today",
    realDistances: "Real distances",
  },
  es: {
    label: "Máquina del tiempo",
    pause: "Pausar el tiempo",
    resume: "Reanudar el tiempo",
    speedGroup: "Velocidad del tiempo",
    speeds: {
      day: { label: "1 día/s", short: "1 d/s", spoken: "1 día por segundo" },
      week: { label: "1 semana/s", short: "1 sem/s", spoken: "1 semana por segundo" },
      month: { label: "1 mes/s", short: "1 mes/s", spoken: "1 mes por segundo" },
      year: { label: "1 año/s", short: "1 año/s", spoken: "1 año por segundo" },
    },
    speedHint: "Cambiar la velocidad del tiempo",
    today: "Hoy",
    backToToday: "Volver al día de hoy",
    backTo: (date) => `De vuelta al ${date}`,
    relativeToday: "hoy",
    realDistances: "Distancias reales",
  },
};
