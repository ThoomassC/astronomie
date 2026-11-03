import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Seasons } from "@/components/modules/Seasons";
import { drawnText, renderIn, settle, stubCanvas, stubCanvasWidth, textBox } from "@/components/modules/testUtils";
import type { Locale } from "@/i18n/locales";
import { getClock } from "@/lib/sim/clock";

/** Largeur du canevas dans la mise en page large (taille de référence des modules). */
const WIDE_WIDTH = 560;
/** Date du site : 29 octobre 2026 à midi UTC (même jour civil dans tous les fuseaux habités). */
const NOW = Date.parse("2026-10-29T12:00:00Z");
/** Position du curseur de la Terre : 200ᵉ jour de 2026, le 20 juillet. */
const JULY_20 = 200;

interface Expected {
  canvas: string;
  follow: string;
  range: string;
  /** Valeur lue du curseur à la date du site. */
  valueText: string;
  initial: string;
  /** Lecture après le déplacement du curseur (20 juillet sur Terre, 2070 sur Uranus). */
  moved: string;
  movedValueText: string;
  drawn: readonly string[];
}

const EARTH: readonly (readonly [Locale, Expected])[] = [
  [
    "fr",
    {
      canvas: "Orbite de la Terre et éclairement selon la date",
      follow: "Suivre la date du site",
      range: "Date",
      valueText: "29 octobre",
      initial:
        "29 octobre\u00a0: automne dans l'hémisphère nord. Durée du jour à Paris\u00a0: 10 h 04. Soleil à midi\u00a0: 28° au-dessus de l’horizon.",
      moved:
        "20 juillet\u00a0: été dans l'hémisphère nord. Durée du jour à Paris\u00a0: 15 h 38. Soleil à midi\u00a0: 62° au-dessus de l’horizon.",
      movedValueText: "20 juillet",
      drawn: ["20 mars", "21 juin", "22 sept.", "21 déc.", "N", "Vue du dessus", "Lumière du Soleil", "Paris", "Vue de côté"],
    },
  ],
  [
    "en",
    {
      canvas: "Earth's orbit and how it is lit, by date",
      follow: "Follow the site's date",
      range: "Date",
      valueText: "29 October",
      initial:
        "29 October: autumn in the northern hemisphere. Day length in Paris: 10 h 04 min. Sun at noon: 28° above the horizon.",
      moved:
        "20 July: summer in the northern hemisphere. Day length in Paris: 15 h 38 min. Sun at noon: 62° above the horizon.",
      movedValueText: "20 July",
      drawn: ["20 Mar", "21 Jun", "22 Sept", "21 Dec", "N", "Top view", "Sunlight", "Paris", "Side view"],
    },
  ],
  [
    "es",
    {
      canvas: "Órbita de la Tierra e iluminación según la fecha",
      follow: "Seguir la fecha del sitio",
      range: "Fecha",
      valueText: "29 de octubre",
      initial:
        "29 de octubre: otoño en el hemisferio norte. Duración del día en París: 10 h 04 min. Sol al mediodía: 28° sobre el horizonte.",
      moved:
        "20 de julio: verano en el hemisferio norte. Duración del día en París: 15 h 38 min. Sol al mediodía: 62° sobre el horizonte.",
      movedValueText: "20 de julio",
      drawn: ["20 mar", "21 jun", "22 sept", "21 dic", "N", "Vista desde arriba", "Luz del Sol", "París", "Vista lateral"],
    },
  ],
];

const URANUS: readonly (readonly [Locale, Expected])[] = [
  [
    "fr",
    {
      canvas: "Orbite d'Uranus et éclairement selon l'année",
      follow: "Suivre la date du site",
      range: "Année",
      valueText: "En 2026",
      initial:
        "En 2026\u00a0: printemps dans l'hémisphère nord. À 49° nord\u00a0: Soleil permanent, il ne se couche pas. Soleil à midi\u00a0: 65° au-dessus de l’horizon.",
      moved:
        "En 2070\u00a0: hiver dans l'hémisphère nord. À 49° nord\u00a0: nuit permanente, le Soleil ne se lève pas. Soleil à midi\u00a0: sous l’horizon.",
      movedValueText: "En 2070",
      drawn: ["2007", "2028", "2049", "2070", "N", "Vue du dessus", "Lumière du Soleil", "49° N", "Vue de côté"],
    },
  ],
  [
    "en",
    {
      canvas: "Uranus's orbit and how it is lit, by year",
      follow: "Follow the site's date",
      range: "Year",
      valueText: "In 2026",
      initial:
        "In 2026: spring in the northern hemisphere. At 49° north: constant daylight, the Sun never sets. Sun at noon: 65° above the horizon.",
      moved:
        "In 2070: winter in the northern hemisphere. At 49° north: constant night, the Sun never rises. Sun at noon: below the horizon.",
      movedValueText: "In 2070",
      drawn: ["2007", "2028", "2049", "2070", "N", "Top view", "Sunlight", "49° N", "Side view"],
    },
  ],
  [
    "es",
    {
      canvas: "Órbita de Urano e iluminación según el año",
      follow: "Seguir la fecha del sitio",
      range: "Año",
      valueText: "En 2026",
      initial:
        "En 2026: primavera en el hemisferio norte. A 49° norte: día permanente, el Sol no se pone. Sol al mediodía: 65° sobre el horizonte.",
      moved:
        "En 2070: invierno en el hemisferio norte. A 49° norte: noche permanente, el Sol no sale. Sol al mediodía: bajo el horizonte.",
      movedValueText: "En 2070",
      drawn: ["2007", "2028", "2049", "2070", "N", "Vista desde arriba", "Luz del Sol", "49° N", "Vista lateral"],
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

describe.each([
  ["earth", EARTH, JULY_20],
  ["uranus", URANUS, 2070],
] as const)("Seasons, planète %s", (planet, cases, movedTo) => {
  const readout = () => document.getElementById(`seasons-${planet}-readout`);

  describe.each(cases)("(%s)", (locale, expected) => {
    it("devrait décrire le canevas et lire la date du site quand le module s'affiche", () => {
      stubCanvas();
      renderIn(locale, <Seasons planet={planet} />);
      expect(screen.getByRole("img")).toHaveAccessibleName(expected.canvas);
      expect(screen.getByRole("button", { name: expected.follow })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("slider", { name: expected.range })).toHaveAttribute("aria-valuetext", expected.valueText);
      expect(readout()?.textContent).toBe(expected.initial);
    });

    it("devrait lire et annoncer la nouvelle position quand on déplace le curseur", () => {
      stubCanvas();
      renderIn(locale, <Seasons planet={planet} />);
      const range = screen.getByRole("slider", { name: expected.range });
      fireEvent.change(range, { target: { value: String(movedTo) } });
      expect(range).toHaveAttribute("aria-valuetext", expected.movedValueText);
      expect(screen.getByRole("button", { name: expected.follow })).toHaveAttribute("aria-pressed", "false");
      expect(readout()?.textContent).toBe(expected.moved);
      settle();
      expect(screen.getByRole("status").textContent).toBe(expected.moved);
    });

    it("devrait annoncer la lecture quand on cesse de suivre la date du site", () => {
      stubCanvas();
      renderIn(locale, <Seasons planet={planet} />);
      fireEvent.click(screen.getByRole("button", { name: expected.follow }));
      settle();
      expect(screen.getByRole("status").textContent).toBe(expected.initial);
    });

    it("devrait écrire sur le canevas les repères de l'orbite, les deux vues et la latitude", () => {
      const canvas = stubCanvas();
      renderIn(locale, <Seasons planet={planet} />);
      expect(canvas.texts()).toEqual(expect.arrayContaining([...expected.drawn]));
    });

    it("devrait garder les titres des deux vues dans leur moitié, sans chevauchement, sur un canevas large", () => {
      const canvas = stubCanvas();
      stubCanvasWidth(WIDE_WIDTH);
      renderIn(locale, <Seasons planet={planet} />);
      const [, , , , , topView, , , sideView] = expected.drawn;
      const top = textBox(drawnText(canvas.drawn(), topView), "center");
      const side = textBox(drawnText(canvas.drawn(), sideView), "center");
      expect(top.left).toBeGreaterThanOrEqual(0);
      expect(top.right).toBeLessThanOrEqual(side.left);
      expect(side.right).toBeLessThanOrEqual(WIDE_WIDTH);
    });
  });
});
