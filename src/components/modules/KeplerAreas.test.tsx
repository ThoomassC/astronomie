import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KeplerAreas } from "@/components/modules/KeplerAreas";
import {
  drawnText,
  renderIn,
  stubCanvas,
  stubCanvasWidth,
  stubMatchMedia,
  textBox,
} from "@/components/modules/testUtils";
import type { Locale } from "@/i18n/locales";

/** Largeur du canevas sur un téléphone de 375 px (gouttières de la page et de la plaque déduites). */
const PHONE_WIDTH = 280;

interface Expected {
  canvas: string;
  play: string;
  pause: string;
  areas: string;
  /** Lecture au départ : Mercure au périhélie. */
  initial: string;
  /** Textes du canevas au départ. */
  drawn: readonly string[];
}

const CASES: readonly (readonly [Locale, Expected])[] = [
  [
    "fr",
    {
      canvas:
        "Orbite de Mercure découpée en 11 secteurs de même aire, parcourus chacun en 8 jours. Au périhélie, à 46 millions de km du Soleil, Mercure file à 59 km/s\u202f; à l'aphélie, à 70 millions de km, elle ne va plus qu'à 39 km/s.",
      play: "Lancer l'animation",
      pause: "Mettre en pause",
      areas: "Afficher les aires",
      initial: "Vitesse\u00a0: 59,0 km/s. Distance au Soleil\u00a0: 46,0 millions de km.",
      drawn: [
        "Périhélie",
        "46 millions de km, 59 km/s",
        "Aphélie",
        "70 millions de km, 39 km/s",
        "59,0 km/s",
        "à 46,0 millions de km du Soleil",
      ],
    },
  ],
  [
    "en",
    {
      canvas:
        "Mercury's orbit cut into 11 sectors of equal area, each one covered in 8 days. At perihelion, 46 million km from the Sun, Mercury races along at 59 km/s; at aphelion, 70 million km away, it slows to just 39 km/s.",
      play: "Start the animation",
      pause: "Pause",
      areas: "Show the areas",
      initial: "Speed: 59.0 km/s. Distance from the Sun: 46.0 million km.",
      drawn: [
        "Perihelion",
        "46 million km, 59 km/s",
        "Aphelion",
        "70 million km, 39 km/s",
        "59.0 km/s",
        "46.0 million km from the Sun",
      ],
    },
  ],
  [
    "es",
    {
      canvas:
        "Órbita de Mercurio dividida en 11 sectores de igual área, que recorre en 8 días cada uno. En el perihelio, a 46 millones de km del Sol, Mercurio va a 59 km/s; en el afelio, a 70 millones de km, ya solo va a 39 km/s.",
      play: "Iniciar la animación",
      pause: "Pausar",
      areas: "Mostrar las áreas",
      initial: "Velocidad: 59,0 km/s. Distancia al Sol: 46,0 millones de km.",
      drawn: [
        "Perihelio",
        "46 millones de km, 59 km/s",
        "Afelio",
        "70 millones de km, 39 km/s",
        "59,0 km/s",
        "a 46,0 millones de km del Sol",
      ],
    },
  ],
];

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const button = (name: string) => screen.getByRole("button", { name });

describe.each(CASES)("KeplerAreas (%s)", (locale, expected) => {
  it("devrait décrire l'orbite et donner la vitesse au périhélie quand le module s'affiche", () => {
    stubCanvas();
    stubMatchMedia({ reduced: false });
    renderIn(locale, <KeplerAreas />);
    expect(screen.getByRole("img")).toHaveAccessibleName(expected.canvas);
    expect(document.getElementById("kepler-readout")?.textContent).toBe(expected.initial);
  });

  it("devrait proposer de lancer l'animation, puis la pause, quand la personne demande moins de mouvement", () => {
    stubCanvas();
    stubMatchMedia({ reduced: true });
    renderIn(locale, <KeplerAreas />);
    fireEvent.click(button(expected.play));
    expect(button(expected.pause)).toBeInTheDocument();
  });

  it("devrait afficher les aires par défaut et le dire par un bouton enfoncé", () => {
    stubCanvas();
    stubMatchMedia({ reduced: false });
    renderIn(locale, <KeplerAreas />);
    expect(button(expected.areas)).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(button(expected.areas));
    expect(button(expected.areas)).toHaveAttribute("aria-pressed", "false");
  });

  it("devrait écrire sur le canevas le périhélie, l'aphélie, la vitesse et la distance", () => {
    const canvas = stubCanvas();
    stubMatchMedia({ reduced: false });
    renderIn(locale, <KeplerAreas />);
    expect(canvas.texts()).toEqual(expect.arrayContaining([...expected.drawn]));
  });

  it("devrait laisser au périhélie et à l'aphélie chacun sa moitié de ligne, sur un téléphone", () => {
    const canvas = stubCanvas();
    stubMatchMedia({ reduced: false });
    stubCanvasWidth(PHONE_WIDTH);
    renderIn(locale, <KeplerAreas />);
    const [perihelion, perihelionValues, aphelion, aphelionValues, , distance] = expected.drawn;
    const box = (text: string, align: "left" | "right") => textBox(drawnText(canvas.drawn(), text), align);
    for (const [left, right] of [
      [box(aphelion, "left"), box(perihelion, "right")],
      [box(aphelionValues, "left"), box(perihelionValues, "right")],
    ]) {
      expect(left.left).toBeGreaterThanOrEqual(0);
      expect(left.right).toBeLessThanOrEqual(right.left);
      expect(right.right).toBeLessThanOrEqual(PHONE_WIDTH);
    }
    expect(box(distance, "left").right).toBeLessThanOrEqual(PHONE_WIDTH);
  });
});
