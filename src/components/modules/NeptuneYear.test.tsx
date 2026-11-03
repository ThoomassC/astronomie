import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NeptuneYear } from "@/components/modules/NeptuneYear";
import { drawnText, renderIn, settle, stubCanvas, stubCanvasWidth, textBox } from "@/components/modules/testUtils";
import type { Locale } from "@/i18n/locales";
import { DAY_MS, YEAR_DAYS } from "@/lib/astro/constants";
import { getClock } from "@/lib/sim/clock";

/** Largeur du canevas sur un téléphone de 375 px (gouttières de la page et de la plaque déduites). */
const PHONE_WIDTH = 280;
/** Date du site : 29 octobre 2026 (1,10 tour de Neptune depuis 1846 ; naissance d'exemple en 2012). */
const NOW = Date.parse("2026-10-29T12:00:00Z");
/** Instant d'une année décimale, à la manière de `decimalYear` (années de 365,25 jours depuis 1970). */
const atYear = (year: number) => (year - 1970) * YEAR_DAYS * DAY_MS;
/** Neptune a fait 1,071 tour, puis 2,031 tours, depuis sa découverte. */
const ONE_TURN_AND_A_BIT = atYear(1846 + 1.071 * 164.79);
const TWO_TURNS_AND_A_BIT = atYear(1846 + 2.031 * 164.79);

interface Expected {
  label: string;
  hint: string;
  canvas: string;
  /** Phrase ajoutée à la description du canevas : tours depuis la découverte (1,10 à la date du site). */
  discovery: string;
  /** Mêmes phrases quand Neptune a fait 1,07 tour, puis 2,03 tours. */
  discovery107: string;
  discovery203: string;
  /** Lecture pour une naissance en 2012, puis annonce pour 1990. */
  readout: string;
  announced1990: string;
  /** Lecture le 1er janvier 2200, pour une naissance en 2012 : plus d'une orbite. */
  overOneOrbit: string;
  /** Lecture quand la date du site précède la naissance. */
  notBorn: string;
  /** Message d'une année refusée, la borne haute étant l'année en cours. */
  error: (thisYear: number) => string;
  drawn: readonly string[];
}

const CASES: readonly (readonly [Locale, Expected])[] = [
  [
    "fr",
    {
      label: "Année de naissance",
      hint: "exemple, modifiable (de 1846 à aujourd'hui)",
      canvas: "Cadran de l'orbite de Neptune de 1846 à 2011",
      discovery: "Depuis sa découverte, Neptune a fait 1,10 tour du Soleil.",
      discovery107: "Depuis sa découverte, Neptune a fait 1,07 tour du Soleil.",
      discovery203: "Depuis sa découverte, Neptune a fait 2,03 tours du Soleil.",
      readout:
        "Depuis 2012, Neptune a parcouru 9,0 % de son orbite. Sur Neptune, vous n'auriez pas encore un an\u00a0: 0,09 année neptunienne. Sur Mars, vous auriez 7,9 ans.",
      announced1990:
        "Depuis 1990, Neptune a parcouru 22,3 % de son orbite. Sur Neptune, vous n'auriez pas encore un an\u00a0: 0,22 année neptunienne. Sur Mars, vous auriez 19,6 ans.",
      overOneOrbit:
        "Depuis 2012, Neptune a fait plus d'un tour du Soleil. Sur Neptune, vous auriez 1,14 année neptunienne. Sur Mars, vous auriez 100,0 ans.",
      notBorn: "La date du site est antérieure à votre naissance.",
      error: (thisYear) => `Indiquez une année entre 1846 et ${thisYear}.`,
      drawn: ["1846, découverte", "2011, un tour complet", "Votre vie", "9,0 % d'une orbite", "Depuis la découverte", "1,10 tour"],
    },
  ],
  [
    "en",
    {
      label: "Year of birth",
      hint: "an example you can change (1846 to today)",
      canvas: "Dial of Neptune's orbit from 1846 to 2011",
      discovery: "Since its discovery, Neptune has completed 1.10 orbits of the Sun.",
      discovery107: "Since its discovery, Neptune has completed 1.07 orbits of the Sun.",
      discovery203: "Since its discovery, Neptune has completed 2.03 orbits of the Sun.",
      readout:
        "Since 2012, Neptune has travelled 9.0% of its orbit. On Neptune, you would not be one year old yet: 0.09 Neptune years. On Mars, you would be 7.9 years old.",
      announced1990:
        "Since 1990, Neptune has travelled 22.3% of its orbit. On Neptune, you would not be one year old yet: 0.22 Neptune years. On Mars, you would be 19.6 years old.",
      overOneOrbit:
        "Since 2012, Neptune has gone round the Sun more than once. On Neptune, you would be 1.14 Neptune years old. On Mars, you would be 100.0 years old.",
      notBorn: "The site's date is before you were born.",
      error: (thisYear) => `Enter a year between 1846 and ${thisYear}.`,
      drawn: ["1846, discovery", "2011, one full orbit", "Your life", "9.0% of an orbit", "Since discovery", "1.10 orbits"],
    },
  ],
  [
    "es",
    {
      label: "Año de nacimiento",
      hint: "un ejemplo que puedes cambiar (de 1846 a hoy)",
      canvas: "Dial de la órbita de Neptuno de 1846 a 2011",
      discovery: "Desde su descubrimiento, Neptuno ha dado 1,10 vueltas al Sol.",
      discovery107: "Desde su descubrimiento, Neptuno ha dado 1,07 vueltas al Sol.",
      discovery203: "Desde su descubrimiento, Neptuno ha dado 2,03 vueltas al Sol.",
      readout:
        "Desde 2012, Neptuno ha recorrido el 9,0 % de su órbita. En Neptuno, aún no tendrías ni un año: 0,09 años neptunianos. En Marte, tendrías 7,9 años.",
      announced1990:
        "Desde 1990, Neptuno ha recorrido el 22,3 % de su órbita. En Neptuno, aún no tendrías ni un año: 0,22 años neptunianos. En Marte, tendrías 19,6 años.",
      overOneOrbit:
        "Desde 2012, Neptuno ha dado más de una vuelta al Sol. En Neptuno, tendrías 1,14 años neptunianos. En Marte, tendrías 100,0 años.",
      notBorn: "La fecha del sitio es anterior a tu nacimiento.",
      error: (thisYear) => `Indica un año entre 1846 y ${thisYear}.`,
      drawn: [
        "1846, descubrimiento",
        "2011, una vuelta completa",
        "Tu vida",
        "9,0 % de una órbita",
        "Desde el descubrimiento",
        "1,10 vueltas",
      ],
    },
  ],
];

beforeEach(() => {
  vi.useFakeTimers();
  act(() => getClock().reset(NOW));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Ligne de lecture visible (non annoncée), distincte de la région d'annonce. */
const readout = () => document.getElementById("neptune-year-readout");
/** Déplace la date du site (machine à remonter le temps). */
const setSiteDate = (ms: number) => act(() => getClock().reset(ms));

describe.each(CASES)("NeptuneYear (%s)", (locale, expected) => {
  const input = () => screen.getByRole("textbox", { name: expected.label });

  it("devrait décrire le cadran, son exemple de naissance et la part d'orbite parcourue depuis", () => {
    stubCanvas();
    renderIn(locale, <NeptuneYear />);
    expect(screen.getByRole("img")).toHaveAccessibleName(`${expected.canvas}. ${expected.discovery}`);
    expect(input()).toHaveAccessibleDescription(expected.hint);
    expect(readout()?.textContent).toBe(expected.readout);
  });

  it("devrait accorder les tours de Neptune au nombre quand la date du site change", () => {
    stubCanvas();
    renderIn(locale, <NeptuneYear />);
    setSiteDate(ONE_TURN_AND_A_BIT);
    expect(screen.getByRole("img")).toHaveAccessibleName(`${expected.canvas}. ${expected.discovery107}`);
    setSiteDate(TWO_TURNS_AND_A_BIT);
    expect(screen.getByRole("img")).toHaveAccessibleName(`${expected.canvas}. ${expected.discovery203}`);
  });

  it("devrait compter en années neptuniennes au-delà d'une orbite, et le dire quand on n'est pas encore né", () => {
    stubCanvas();
    renderIn(locale, <NeptuneYear />);
    setSiteDate(Date.parse("2200-01-01T00:00:00Z"));
    expect(readout()?.textContent).toBe(expected.overOneOrbit);
    setSiteDate(Date.parse("2000-06-01T00:00:00Z"));
    expect(readout()?.textContent).toBe(expected.notBorn);
  });

  it("devrait annoncer la part d'orbite, après le calme, quand on saisit une année valide", () => {
    stubCanvas();
    renderIn(locale, <NeptuneYear />);
    fireEvent.change(input(), { target: { value: "1990" } });
    settle();
    expect(screen.getByRole("status").textContent).toBe(expected.announced1990);
  });

  it("devrait relier au champ un message d'erreur dans la langue quand on le quitte sur une année refusée", () => {
    stubCanvas();
    renderIn(locale, <NeptuneYear />);
    fireEvent.change(input(), { target: { value: "1800" } });
    fireEvent.blur(input());
    expect(input()).toHaveAttribute("aria-invalid", "true");
    const thisYear = new Date().getFullYear();
    expect(input()).toHaveAccessibleDescription(`${expected.error(thisYear)} ${expected.hint}`);
  });

  it("devrait écrire sur le canevas les repères du cadran, la part de votre vie et les tours depuis la découverte", () => {
    const canvas = stubCanvas();
    renderIn(locale, <NeptuneYear />);
    expect(canvas.texts()).toEqual(expect.arrayContaining([...expected.drawn]));
  });

  it("devrait arrêter chaque texte du canevas avant le bord droit, quelle que soit sa longueur, sur un téléphone", () => {
    const canvas = stubCanvas();
    stubCanvasWidth(PHONE_WIDTH);
    renderIn(locale, <NeptuneYear />);
    for (const text of expected.drawn) {
      expect(textBox(drawnText(canvas.drawn(), text), "left").right).toBeLessThanOrEqual(PHONE_WIDTH);
    }
  });
});
