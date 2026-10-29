import type { Locale } from "@/i18n/locales";

/**
 * Textes de la course de la lumière (Soleil). Durées et accélérations arrivent déjà écrites ; les planètes sont
 * nommées par `bodyName` ; pause, reprise et relance viennent de `COMMON_STRINGS`.
 */
export interface LightRaceStrings {
  /** Description du canevas pour les lecteurs d'écran. */
  canvasLabel: string;
  /** Commande de départ. */
  start: string;
  /** Groupe des accélérations (×100, ×1 000, ×10 000). */
  speedGroup: string;
  /** Ligne de lecture avant le départ, à l'accélération par défaut (×1 000), rédigée à la main. */
  initialReadout: string;
  /** Avant le départ, à l'accélération choisie : durée réelle du trajet jusqu'à Neptune. */
  ready(speed: string, duration: string): string;
  /** Pendant la course : dernière planète atteinte et temps de trajet de la lumière jusqu'à elle. */
  reached(planet: string, duration: string): string;
  /** Arrivée à Neptune. */
  arrival: string;
  /** Canevas : temps écoulé depuis le départ. */
  elapsed(duration: string): string;
  /** Canevas : étendue de la piste entière. */
  scale: string;
  /** Canevas : étendue de la piste zoomée. */
  zoom: string;
}

export const LIGHT_RACE_STRINGS: Readonly<Record<Locale, LightRaceStrings>> = {
  fr: {
    canvasLabel: "Piste à l'échelle du Soleil à Neptune, avec un zoom sur les planètes intérieures",
    start: "Lancer l'éclair",
    speedGroup: "Accélération",
    initialReadout: "Prêt. À ×1 000, l'éclair atteint Neptune en 15 secondes.",
    ready: (speed, duration) => `Prêt. À ×${speed}, l'éclair atteint Neptune en ${duration}.`,
    reached: (planet, duration) => `${planet} atteinte après ${duration} de trajet.`,
    arrival:
      "Neptune atteinte après 4 h 10 min. Les quatre premières planètes tiennent dans les 5 premiers pour cent du trajet.",
    elapsed: (duration) => `Temps écoulé : ${duration}`,
    scale: "0 à 30 UA, à l'échelle",
    zoom: "Zoom sur les 1,6 premières UA",
  },
  en: {
    canvasLabel: "To-scale track from the Sun to Neptune, with a close-up of the inner planets",
    start: "Send the flash",
    speedGroup: "Speed-up",
    initialReadout: "Ready. At ×1,000, the flash reaches Neptune in 15 seconds.",
    ready: (speed, duration) => `Ready. At ×${speed}, the flash reaches Neptune in ${duration}.`,
    reached: (planet, duration) => `Reached ${planet} after ${duration}.`,
    arrival:
      "Reached Neptune after 4 h 10 min. The first four planets lie within the first 5 per cent of the journey.",
    elapsed: (duration) => `Time elapsed: ${duration}`,
    scale: "0 to 30 AU, to scale",
    zoom: "Close-up of the first 1.6 AU",
  },
  es: {
    canvasLabel: "Pista a escala del Sol a Neptuno, con un zoom sobre los planetas interiores",
    start: "Lanzar el destello",
    speedGroup: "Aceleración",
    initialReadout: "Listo. A ×1000, el destello llega a Neptuno en 15 segundos.",
    ready: (speed, duration) => `Listo. A ×${speed}, el destello llega a Neptuno en ${duration}.`,
    reached: (planet, duration) => `Llega a ${planet} tras ${duration} de viaje.`,
    arrival: "Llega a Neptuno tras 4 h 10 min. Los cuatro primeros planetas caben en el primer 5 % del trayecto.",
    elapsed: (duration) => `Tiempo transcurrido: ${duration}`,
    scale: "De 0 a 30 UA, a escala",
    zoom: "Zoom sobre las primeras 1,6 UA",
  },
};
