import type { Locale } from "@/i18n/locales";
import type { PluralForms } from "@/i18n/plural";
import { counted, type Count } from "./common.strings";

/**
 * Textes des tailles à l'échelle (Jupiter). Diamètres et rapports arrivent déjà écrits ; planètes et Soleil sont
 * nommés par `bodyName`, « Mercure à Mars » vient de `COMMON_STRINGS`.
 */
export interface PlanetSizesStrings {
  /** Ligne de lecture d'une planète : nom, diamètre en km, rapport au diamètre de la Terre. */
  describe(name: string, km: string, ratio: string): string;
  /** Équivalent textuel du canevas : une planète, avec son rapport à la Terre accordé (sauf pour la Terre). */
  planetEntry(name: string, km: string, earths: Count | null): string;
  /** Équivalent textuel complet : planètes déjà décrites, Soleil (diamètre écrit) s'il est dessiné, Terres alignées. */
  canvasLabel(planets: readonly string[], sunKm: string | null, earthsShown: boolean): string;
  /** Planète détaillée : légende des boutons radio et indication. */
  legend: string;
  pickerHint: string;
  /** Cadrage : nom du groupe, puis ses deux choix. */
  framing: string;
  planets: string;
  withSun: string;
  /** Bouton bascule des Terres alignées, et la lecture qu'il annonce. */
  lineUp: string;
  lineUpReadout: string;
  /** Lecture du cadrage avec le Soleil (diamètre écrit). */
  sunReadout(km: string): string;
}

const EARTHS_FR: PluralForms = { one: "Terre", other: "Terres" };
const EARTHS_EN: PluralForms = { one: "Earth", other: "Earths" };
const EARTHS_ES: PluralForms = { one: "Tierra", other: "Tierras" };

export const PLANET_SIZES_STRINGS: Readonly<Record<Locale, PlanetSizesStrings>> = {
  fr: {
    describe: (name, km, ratio) => `${name} : ${km} km, ${ratio} fois la Terre.`,
    planetEntry: (name, km, earths) =>
      earths ? `${name}, ${km} km (${counted("fr", earths, EARTHS_FR)})` : `${name}, ${km} km`,
    canvasLabel: (planets, sunKm, earthsShown) =>
      `Les huit planètes dessinées à la même échelle : ${planets.join(" ; ")}.` +
      (sunKm ? ` Le Soleil est dessiné à côté : ${sunKm} km, 109 Terres.` : "") +
      (earthsShown ? " 11 Terres sont alignées sur le diamètre de Jupiter." : ""),
    legend: "Planète détaillée",
    pickerHint: "Ou choisissez-la ici ; au clavier, avec les flèches.",
    framing: "Cadrage",
    planets: "Les planètes",
    withSun: "Avec le Soleil",
    lineUp: "Aligner 11 Terres",
    lineUpReadout: "11 Terres côte à côte couvrent presque le diamètre de Jupiter (11,2 exactement).",
    sunReadout: (km) => `Le Soleil mesure ${km} km : 109 Terres, ou presque 10 Jupiter.`,
  },
  en: {
    describe: (name, km, ratio) => `${name}: ${km} km, ${ratio} times Earth's diameter.`,
    planetEntry: (name, km, earths) =>
      earths ? `${name}, ${km} km (${counted("en", earths, EARTHS_EN)})` : `${name}, ${km} km`,
    canvasLabel: (planets, sunKm, earthsShown) =>
      `The eight planets drawn to the same scale: ${planets.join("; ")}.` +
      (sunKm ? ` The Sun is drawn alongside: ${sunKm} km, 109 Earths.` : "") +
      (earthsShown ? " 11 Earths are lined up across Jupiter's diameter." : ""),
    legend: "Planet in detail",
    pickerHint: "Or choose it here; with the keyboard, use the arrow keys.",
    framing: "Framing",
    planets: "The planets",
    withSun: "With the Sun",
    lineUp: "Line up 11 Earths",
    lineUpReadout: "11 Earths side by side almost span Jupiter's diameter (11.2, to be exact).",
    sunReadout: (km) => `The Sun measures ${km} km across: 109 Earths, or almost 10 Jupiters.`,
  },
  es: {
    describe: (name, km, ratio) => `${name}: ${km} km, ${ratio} veces el diámetro de la Tierra.`,
    planetEntry: (name, km, earths) =>
      earths ? `${name}, ${km} km (${counted("es", earths, EARTHS_ES)})` : `${name}, ${km} km`,
    canvasLabel: (planets, sunKm, earthsShown) =>
      `Los ocho planetas dibujados a la misma escala: ${planets.join("; ")}.` +
      (sunKm ? ` El Sol está dibujado al lado: ${sunKm} km, 109 Tierras.` : "") +
      (earthsShown ? " 11 Tierras están alineadas sobre el diámetro de Júpiter." : ""),
    legend: "Planeta en detalle",
    pickerHint: "O elígelo aquí; con el teclado, usa las flechas.",
    framing: "Encuadre",
    planets: "Los planetas",
    withSun: "Con el Sol",
    lineUp: "Alinear 11 Tierras",
    lineUpReadout: "11 Tierras una junto a otra cubren casi el diámetro de Júpiter (11,2 exactamente).",
    sunReadout: (km) => `El Sol mide ${km} km: 109 Tierras, o casi 10 Júpiter.`,
  },
};
