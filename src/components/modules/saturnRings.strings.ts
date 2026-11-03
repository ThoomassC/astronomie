import type { Locale } from "@/i18n/locales";

/** Textes des anneaux de Saturne ; années écrites telles quelles, angle (degrés compris) déjà écrit. */
export interface SaturnRingsStrings {
  /** Description du canevas pour les lecteurs d'écran. */
  canvasLabel: string;
  /** Commande du défilement automatique ; la pause vient de `COMMON_STRINGS`. */
  play: string;
  /** Curseur des années. */
  year: string;
  /** Canevas : passage des anneaux par la tranche, sur la frise. */
  edgeOn: string;
  /** Ligne de lecture : anneaux par la tranche, ou ouverts d'un angle, vus par la face nord ou sud. */
  edgeOnReadout(year: number): string;
  openReadout(year: number, angle: string, north: boolean): string;
}

export const SATURN_RINGS_STRINGS: Readonly<Record<Locale, SaturnRingsStrings>> = {
  fr: {
    canvasLabel:
      "Saturne et l'ouverture de ses anneaux selon l'année, de 2010 à 2050. Les anneaux sont vus par la tranche en 2025, puis en 2039-2040 ; entre ces passages, ils s'ouvrent jusqu'à environ 27°.",
    play: "Faire défiler les années",
    year: "Année",
    edgeOn: "par la tranche",
    edgeOnReadout: (year) => `${year} : anneaux vus par la tranche, presque invisibles.`,
    openReadout: (year, angle, north) =>
      `${year} : anneaux ouverts d'environ ${angle}, vus ${north ? "par-dessus (face nord)" : "par-dessous (face sud)"}.`,
  },
  en: {
    canvasLabel:
      "Saturn and how far its rings open, year by year, from 2010 to 2050. The rings are seen edge-on in 2025, then again in 2039–2040; in between, they open up to about 27°.",
    play: "Run through the years",
    year: "Year",
    edgeOn: "edge-on",
    edgeOnReadout: (year) => `${year}: rings seen edge-on, almost invisible.`,
    openReadout: (year, angle, north) =>
      `${year}: rings open by about ${angle}, seen from ${north ? "above (north face)" : "below (south face)"}.`,
  },
  es: {
    canvasLabel:
      "Saturno y la apertura de sus anillos según el año, de 2010 a 2050. Los anillos se ven de canto en 2025 y de nuevo en 2039-2040; entre esos pasos, se abren hasta unos 27°.",
    play: "Recorrer los años",
    year: "Año",
    edgeOn: "de canto",
    edgeOnReadout: (year) => `${year}: anillos vistos de canto, casi invisibles.`,
    openReadout: (year, angle, north) =>
      `${year}: anillos con una apertura de unos ${angle}, vistos ${north ? "desde arriba (cara norte)" : "desde abajo (cara sur)"}.`,
  },
};
