import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SaturnRings } from "@/components/modules/SaturnRings";
import { elapse, renderIn, settle, stubCanvas, stubVisibleCanvas } from "@/components/modules/testUtils";
import type { Locale } from "@/i18n/locales";
import { getClock } from "@/lib/sim/clock";

/** Date du site : 29 octobre 2026, anneaux ouverts d'environ 9°, face sud visible. */
const NOW = Date.parse("2026-10-29T12:00:00Z");

interface Expected {
  canvas: string;
  play: string;
  pause: string;
  year: string;
  initial: string;
  /** Lecture en 2025, anneaux par la tranche. */
  edgeOn: string;
  /** Annonce à la pause, quelle que soit l'année atteinte. */
  paused: RegExp;
  drawn: readonly string[];
}

const CASES: readonly (readonly [Locale, Expected])[] = [
  [
    "fr",
    {
      canvas:
        "Saturne et l'ouverture de ses anneaux selon l'année, de 2010 à 2050. Les anneaux sont vus par la tranche en 2025, puis en 2039-2040 ; entre ces passages, ils s'ouvrent jusqu'à environ 27°.",
      play: "Faire défiler les années",
      pause: "Pause",
      year: "Année",
      initial: "2026 : anneaux ouverts d'environ 9°, vus par-dessous (face sud).",
      edgeOn: "2025 : anneaux vus par la tranche, presque invisibles.",
      paused: /^20\d\d : anneaux (ouverts d'environ \d+°, vus par-dess(us|ous) \(face (nord|sud)\)|vus par la tranche, presque invisibles)\.$/,
      drawn: ["2010", "2020", "2030", "2040", "2050", "par la tranche", "2026"],
    },
  ],
  [
    "en",
    {
      canvas:
        "Saturn and how far its rings open, year by year, from 2010 to 2050. The rings are seen edge-on in 2025, then again in 2039–2040; in between, they open up to about 27°.",
      play: "Run through the years",
      pause: "Pause",
      year: "Year",
      initial: "2026: rings open by about 9°, seen from below (south face).",
      edgeOn: "2025: rings seen edge-on, almost invisible.",
      paused: /^20\d\d: rings (open by about \d+°, seen from (above|below) \((north|south) face\)|seen edge-on, almost invisible)\.$/,
      drawn: ["2010", "2020", "2030", "2040", "2050", "edge-on", "2026"],
    },
  ],
  [
    "es",
    {
      canvas:
        "Saturno y la apertura de sus anillos según el año, de 2010 a 2050. Los anillos se ven de canto en 2025 y de nuevo en 2039-2040; entre esos pasos, se abren hasta unos 27°.",
      play: "Recorrer los años",
      pause: "Pausa",
      year: "Año",
      initial: "2026: anillos con una apertura de unos 9°, vistos desde abajo (cara sur).",
      edgeOn: "2025: anillos vistos de canto, casi invisibles.",
      paused:
        /^20\d\d: anillos (con una apertura de unos \d+°, vistos desde (arriba|abajo) \(cara (norte|sur)\)|vistos de canto, casi invisibles)\.$/,
      drawn: ["2010", "2020", "2030", "2040", "2050", "de canto", "2026"],
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
const readout = () => document.getElementById("saturn-rings-readout");
const button = (name: string) => screen.getByRole("button", { name });

describe.each(CASES)("SaturnRings (%s)", (locale, expected) => {
  it("devrait décrire les anneaux et lire leur ouverture à l'année du site quand le module s'affiche", () => {
    stubCanvas();
    renderIn(locale, <SaturnRings />);
    expect(screen.getByRole("img")).toHaveAccessibleName(expected.canvas);
    expect(button(expected.play)).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: expected.year })).toHaveValue("2026");
    expect(readout()?.textContent).toBe(expected.initial);
  });

  it("devrait lire et annoncer les anneaux par la tranche quand on choisit 2025", () => {
    stubCanvas();
    renderIn(locale, <SaturnRings />);
    fireEvent.change(screen.getByRole("slider", { name: expected.year }), { target: { value: "2025" } });
    expect(readout()?.textContent).toBe(expected.edgeOn);
    settle();
    expect(screen.getByRole("status").textContent).toBe(expected.edgeOn);
  });

  it("devrait proposer la pause pendant le défilement, puis annoncer l'année atteinte", () => {
    stubCanvas();
    stubVisibleCanvas();
    renderIn(locale, <SaturnRings />);
    fireEvent.click(button(expected.play));
    elapse(1000);
    fireEvent.click(button(expected.pause));
    expect(button(expected.play)).toBeInTheDocument();
    settle();
    expect(screen.getByRole("status").textContent).toMatch(expected.paused);
  });

  it("devrait écrire sur le canevas les décennies, le passage par la tranche et l'année affichée", () => {
    const canvas = stubCanvas();
    renderIn(locale, <SaturnRings />);
    expect(canvas.texts()).toEqual(expect.arrayContaining([...expected.drawn]));
  });
});
