import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlanetSizes } from "@/components/modules/PlanetSizes";
import { elapse, renderIn, settle, stubCanvas, stubMatchMedia, stubVisibleCanvas } from "@/components/modules/testUtils";
import type { Locale } from "@/i18n/locales";

/** Séparateur des milliers en français (Intl) : espace fine insécable, U+202F. */
const NNBSP = "\u202f";

interface Expected {
  /** Équivalent textuel du canevas : les huit planètes, puis les ajouts du Soleil et des Terres alignées. */
  canvas: string;
  canvasSun: string;
  canvasEarths: string;
  legend: string;
  hint: string;
  jupiter: string;
  saturn: string;
  framing: string;
  planets: string;
  withSun: string;
  lineUp: string;
  /** Lectures annoncées : Saturne choisie, cadrage avec le Soleil, Terres alignées. */
  saturnReadout: string;
  sunReadout: string;
  earthsReadout: string;
  jupiterReadout: string;
  /** Textes du canevas au départ (Jupiter détaillée), et nom du Soleil une fois le cadrage élargi. */
  drawn: readonly string[];
  sun: string;
}

const CASES: readonly (readonly [Locale, Expected])[] = [
  [
    "fr",
    {
      canvas:
        `Les huit planètes dessinées à la même échelle\u00a0: Mercure, 4${NNBSP}879 km (0,38 Terre)\u202f; Vénus, 12${NNBSP}104 km (0,95 Terre)\u202f; Terre, 12${NNBSP}756 km\u202f; Mars, 6${NNBSP}792 km (0,53 Terre)\u202f; Jupiter, 142${NNBSP}984 km (11,2 Terres)\u202f; Saturne, 120${NNBSP}536 km (9,4 Terres)\u202f; Uranus, 51${NNBSP}118 km (4,0 Terres)\u202f; Neptune, 49${NNBSP}528 km (3,9 Terres).`,
      canvasSun: ` Le Soleil est dessiné à côté\u00a0: 1${NNBSP}392${NNBSP}700 km, 109 Terres.`,
      canvasEarths: " 11 Terres sont alignées sur le diamètre de Jupiter.",
      legend: "Planète détaillée",
      hint: "Ou choisissez-la ici\u202f; au clavier, avec les flèches.",
      jupiter: "Jupiter",
      saturn: "Saturne",
      framing: "Cadrage",
      planets: "Les planètes",
      withSun: "Avec le Soleil",
      lineUp: "Aligner 11 Terres",
      jupiterReadout: `Jupiter\u00a0: 142${NNBSP}984 km, 11,2 fois la Terre.`,
      saturnReadout: `Saturne\u00a0: 120${NNBSP}536 km, 9,4 fois la Terre.`,
      sunReadout: `Le Soleil mesure 1${NNBSP}392${NNBSP}700 km\u00a0: 109 Terres, ou presque 10 Jupiter.`,
      earthsReadout: "11 Terres côte à côte couvrent presque le diamètre de Jupiter (11,2 exactement).",
      drawn: ["Jupiter", "Saturne", "Uranus", "Neptune", "Mercure à Mars"],
      sun: "Soleil",
    },
  ],
  [
    "en",
    {
      canvas:
        "The eight planets drawn to the same scale: Mercury, 4,879 km (0.38 Earths); Venus, 12,104 km (0.95 Earths); Earth, 12,756 km; Mars, 6,792 km (0.53 Earths); Jupiter, 142,984 km (11.2 Earths); Saturn, 120,536 km (9.4 Earths); Uranus, 51,118 km (4.0 Earths); Neptune, 49,528 km (3.9 Earths).",
      canvasSun: " The Sun is drawn alongside: 1,392,700 km, 109 Earths.",
      canvasEarths: " 11 Earths are lined up across Jupiter's diameter.",
      legend: "Planet in detail",
      hint: "Or choose it here; with the keyboard, use the arrow keys.",
      jupiter: "Jupiter",
      saturn: "Saturn",
      framing: "Framing",
      planets: "The planets",
      withSun: "With the Sun",
      lineUp: "Line up 11 Earths",
      jupiterReadout: "Jupiter: 142,984 km, 11.2 times Earth's diameter.",
      saturnReadout: "Saturn: 120,536 km, 9.4 times Earth's diameter.",
      sunReadout: "The Sun measures 1,392,700 km across: 109 Earths, or almost 10 Jupiters.",
      earthsReadout: "11 Earths side by side almost span Jupiter's diameter (11.2, to be exact).",
      drawn: ["Jupiter", "Saturn", "Uranus", "Neptune", "Mercury to Mars"],
      sun: "Sun",
    },
  ],
  [
    "es",
    {
      canvas:
        "Los ocho planetas dibujados a la misma escala: Mercurio, 4879 km (0,38 Tierras); Venus, 12.104 km (0,95 Tierras); Tierra, 12.756 km; Marte, 6792 km (0,53 Tierras); Júpiter, 142.984 km (11,2 Tierras); Saturno, 120.536 km (9,4 Tierras); Urano, 51.118 km (4,0 Tierras); Neptuno, 49.528 km (3,9 Tierras).",
      canvasSun: " El Sol está dibujado al lado: 1.392.700 km, 109 Tierras.",
      canvasEarths: " 11 Tierras están alineadas sobre el diámetro de Júpiter.",
      legend: "Planeta en detalle",
      hint: "O elígelo aquí; con el teclado, usa las flechas.",
      jupiter: "Júpiter",
      saturn: "Saturno",
      framing: "Encuadre",
      planets: "Los planetas",
      withSun: "Con el Sol",
      lineUp: "Alinear 11 Tierras",
      jupiterReadout: "Júpiter: 142.984 km, 11,2 veces el diámetro de la Tierra.",
      saturnReadout: "Saturno: 120.536 km, 9,4 veces el diámetro de la Tierra.",
      sunReadout: "El Sol mide 1.392.700 km: 109 Tierras, o casi 10 Júpiter.",
      earthsReadout: "11 Tierras una junto a otra cubren casi el diámetro de Júpiter (11,2 exactamente).",
      drawn: ["Júpiter", "Saturno", "Urano", "Neptuno", "De Mercurio a Marte"],
      sun: "Sol",
    },
  ],
];

beforeEach(() => {
  vi.useFakeTimers();
  stubMatchMedia({ reduced: false });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Ligne de lecture visible (non annoncée), distincte de la région d'annonce. */
const readout = () => document.getElementById("sizes-readout");
const button = (name: string) => screen.getByRole("button", { name });

describe.each(CASES)("PlanetSizes (%s)", (locale, expected) => {
  it("devrait décrire les huit planètes et détailler Jupiter quand le module s'affiche", () => {
    stubCanvas();
    renderIn(locale, <PlanetSizes />);
    expect(screen.getByRole("img")).toHaveAccessibleName(expected.canvas);
    const picker = screen.getByRole("group", { name: expected.legend });
    expect(picker).toHaveAccessibleDescription(expected.hint);
    expect(screen.getByRole("radio", { name: expected.jupiter })).toBeChecked();
    expect(readout()?.textContent).toBe(expected.jupiterReadout);
  });

  it("devrait nommer le cadrage et ses deux choix, et le bouton des Terres alignées", () => {
    stubCanvas();
    renderIn(locale, <PlanetSizes />);
    expect(screen.getByRole("group", { name: expected.framing })).toBeInTheDocument();
    expect(button(expected.planets)).toHaveAttribute("aria-pressed", "true");
    expect(button(expected.withSun)).toHaveAttribute("aria-pressed", "false");
    expect(button(expected.lineUp)).toBeEnabled();
  });

  it("devrait lire et annoncer la planète choisie quand on coche Saturne", () => {
    stubCanvas();
    renderIn(locale, <PlanetSizes />);
    fireEvent.click(screen.getByRole("radio", { name: expected.saturn }));
    expect(readout()?.textContent).toBe(expected.saturnReadout);
    settle();
    expect(screen.getByRole("status").textContent).toBe(expected.saturnReadout);
  });

  it("devrait annoncer la taille du Soleil et l'ajouter à la description quand on élargit le cadrage", () => {
    stubCanvas();
    renderIn(locale, <PlanetSizes />);
    fireEvent.click(button(expected.withSun));
    expect(button(expected.lineUp)).toBeDisabled();
    expect(screen.getByRole("img")).toHaveAccessibleName(`${expected.canvas}${expected.canvasSun}`);
    settle();
    expect(screen.getByRole("status").textContent).toBe(expected.sunReadout);
  });

  it("devrait annoncer les Terres alignées et l'ajouter à la description quand on les demande", () => {
    stubCanvas();
    renderIn(locale, <PlanetSizes />);
    fireEvent.click(button(expected.lineUp));
    expect(screen.getByRole("img")).toHaveAccessibleName(`${expected.canvas}${expected.canvasEarths}`);
    settle();
    expect(screen.getByRole("status").textContent).toBe(expected.earthsReadout);
  });

  it("devrait écrire sur le canevas le nom des planètes, puis celui du Soleil quand il entre dans le cadrage", () => {
    const canvas = stubCanvas();
    stubVisibleCanvas();
    renderIn(locale, <PlanetSizes />);
    expect(canvas.texts()).toEqual(expect.arrayContaining([...expected.drawn]));
    fireEvent.click(button(expected.withSun));
    elapse(1000);
    expect(canvas.texts()).toContain(expected.sun);
  });
});
