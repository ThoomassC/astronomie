import type { Locale } from "@/i18n/locales";

/** Textes de la loi des aires (Mercure) ; vitesses (« 59,0 km/s ») et distances arrivent déjà écrites. */
export interface KeplerStrings {
  /** Description du canevas pour les lecteurs d'écran. */
  canvasLabel: string;
  /** Commande de l'animation, à l'arrêt puis en cours. */
  play: string;
  pause: string;
  /** Bouton bascule des secteurs. */
  areas: string;
  /** Ligne de lecture : vitesse, puis distance au Soleil en millions de km. */
  readout(speed: string, distance: string): string;
  /** Canevas : repères de l'orbite, au périhélie puis à l'aphélie. */
  perihelion: string;
  perihelionValues: string;
  aphelion: string;
  aphelionValues: string;
  /** Canevas : distance au Soleil, en millions de km, après la vitesse. */
  distance(distance: string): string;
}

export const KEPLER_STRINGS: Readonly<Record<Locale, KeplerStrings>> = {
  fr: {
    canvasLabel:
      "Orbite de Mercure découpée en 11 secteurs de même aire, parcourus chacun en 8 jours. Au périhélie, à 46 millions de km du Soleil, Mercure file à 59 km/s ; à l'aphélie, à 70 millions de km, elle ne va plus qu'à 39 km/s.",
    play: "Lancer l'animation",
    pause: "Mettre en pause",
    areas: "Afficher les aires",
    readout: (speed, distance) => `Vitesse : ${speed}. Distance au Soleil : ${distance} millions de km.`,
    perihelion: "Périhélie",
    perihelionValues: "46 millions de km, 59 km/s",
    aphelion: "Aphélie",
    aphelionValues: "70 millions de km, 39 km/s",
    distance: (distance) => `à ${distance} millions de km du Soleil`,
  },
  en: {
    canvasLabel:
      "Mercury's orbit cut into 11 sectors of equal area, each one covered in 8 days. At perihelion, 46 million km from the Sun, Mercury races along at 59 km/s; at aphelion, 70 million km away, it slows to just 39 km/s.",
    play: "Start the animation",
    pause: "Pause",
    areas: "Show the areas",
    readout: (speed, distance) => `Speed: ${speed}. Distance from the Sun: ${distance} million km.`,
    perihelion: "Perihelion",
    perihelionValues: "46 million km, 59 km/s",
    aphelion: "Aphelion",
    aphelionValues: "70 million km, 39 km/s",
    distance: (distance) => `${distance} million km from the Sun`,
  },
  es: {
    canvasLabel:
      "Órbita de Mercurio dividida en 11 sectores de igual área, que recorre en 8 días cada uno. En el perihelio, a 46 millones de km del Sol, Mercurio va a 59 km/s; en el afelio, a 70 millones de km, ya solo va a 39 km/s.",
    play: "Iniciar la animación",
    pause: "Pausar",
    areas: "Mostrar las áreas",
    readout: (speed, distance) => `Velocidad: ${speed}. Distancia al Sol: ${distance} millones de km.`,
    perihelion: "Perihelio",
    perihelionValues: "46 millones de km, 59 km/s",
    aphelion: "Afelio",
    aphelionValues: "70 millones de km, 39 km/s",
    distance: (distance) => `a ${distance} millones de km del Sol`,
  },
};
