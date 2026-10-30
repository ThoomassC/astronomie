import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VenusRace } from "@/components/modules/VenusRace";
import {
  drawnText,
  elapse,
  renderIn,
  settle,
  stubCanvas,
  stubCanvasWidth,
  stubVisibleCanvas,
  textBox,
} from "@/components/modules/testUtils";
import type { Locale } from "@/i18n/locales";

/** Largeur du canevas sur un téléphone de 375 px (gouttières de la page et de la plaque déduites). */
const PHONE_WIDTH = 280;

interface Expected {
  canvas: string;
  start: string;
  pause: string;
  resume: string;
  restart: string;
  initial: string;
  /** Annonce à la pause : jour atteint et part de chaque tour (valeurs selon les images jouées). */
  paused: RegExp;
  /** Lecture une fois l'année bouclée, avant la fin de la rotation. */
  year: string;
  /** Étiquette du canevas quand l'année est bouclée. */
  yearDone: string;
  rotation: string;
  /** Textes du canevas au départ. */
  drawn: readonly string[];
}

const CASES: readonly (readonly [Locale, Expected])[] = [
  [
    "fr",
    {
      canvas: "Deux cadrans\u00a0: l'année de Vénus et sa rotation",
      start: "Lancer la course",
      pause: "Pause",
      resume: "Reprendre",
      restart: "Relancer",
      initial: "Jour 0.",
      paused: /^Jour \d+\u00a0: \d+ % du tour du Soleil, \d+ % du tour sur elle-même\.$/,
      year: "Jour 224,7\u00a0: l'année de Vénus est bouclée. Sa rotation n'en est qu'à 92 %.",
      yearDone: "Année bouclée",
      rotation:
        "Jour 243\u00a0: Vénus a enfin fait un tour sur elle-même. Son jour sidéral dure plus longtemps que son année. Du lever au lever du Soleil, il s'écoule 117 jours.",
      drawn: ["Jour 0", "Un tour du Soleil", "224,7 jours", "Un tour sur elle-même", "243 jours, dans l’autre sens", "0 %"],
    },
  ],
  [
    "en",
    {
      canvas: "Two dials: Venus's year and its rotation",
      start: "Start the race",
      pause: "Pause",
      resume: "Resume",
      restart: "Run again",
      initial: "Day 0.",
      paused: /^Day \d+: \d+% of an orbit of the Sun, \d+% of a turn on its axis\.$/,
      year: "Day 224.7: Venus has completed its year. Its rotation is only 92% done.",
      yearDone: "Year complete",
      rotation:
        "Day 243: Venus has finally turned once on its axis. Its sidereal day is longer than its year. From one sunrise to the next, 117 days go by.",
      drawn: ["Day 0", "One orbit of the Sun", "224.7 days", "One turn on its axis", "243 days, the other way round", "0%"],
    },
  ],
  [
    "es",
    {
      canvas: "Dos diales: el año de Venus y su rotación",
      start: "Empezar la carrera",
      pause: "Pausa",
      resume: "Reanudar",
      restart: "Repetir",
      initial: "Día 0.",
      paused: /^Día \d+: \d+ % de la vuelta al Sol, \d+ % de la vuelta sobre su eje\.$/,
      year: "Día 224,7: Venus ha completado su año. Su rotación solo va por el 92 %.",
      yearDone: "Año completado",
      rotation:
        "Día 243: Venus por fin ha dado una vuelta sobre su eje. Su día sideral dura más que su año. De un amanecer al siguiente pasan 117 días.",
      drawn: ["Día 0", "Una vuelta al Sol", "224,7 días", "Una vuelta sobre su eje", "243 días, en sentido contrario", "0 %"],
    },
  ],
];

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Ligne de lecture visible (non annoncée), distincte de la région d'annonce. */
const readout = () => document.getElementById("venus-race-readout");
const button = (name: string) => screen.getByRole("button", { name });

describe.each(CASES)("VenusRace (%s)", (locale, expected) => {
  it("devrait décrire les deux cadrans et proposer le départ au jour 0", () => {
    stubCanvas();
    renderIn(locale, <VenusRace />);
    expect(screen.getByRole("img")).toHaveAccessibleName(expected.canvas);
    expect(button(expected.start)).toBeInTheDocument();
    expect(readout()?.textContent).toBe(expected.initial);
  });

  it("devrait proposer la pause pendant la course, puis la reprise en annonçant où en sont les deux tours", () => {
    stubCanvas();
    stubVisibleCanvas();
    renderIn(locale, <VenusRace />);
    fireEvent.click(button(expected.start));
    elapse(500);
    fireEvent.click(button(expected.pause));
    expect(button(expected.resume)).toBeInTheDocument();
    settle();
    expect(screen.getByRole("status").textContent).toMatch(expected.paused);
  });

  it("devrait signaler l'année bouclée, sur le canevas et dans la lecture, avant la fin de la rotation", () => {
    const canvas = stubCanvas();
    stubVisibleCanvas();
    renderIn(locale, <VenusRace />);
    fireEvent.click(button(expected.start));
    elapse(8300);
    expect(readout()?.textContent).toBe(expected.year);
    expect(canvas.texts()).toContain(expected.yearDone);
  });

  it("devrait proposer de relancer et annoncer la fin de la rotation quand Vénus a fait un tour sur elle-même", () => {
    stubCanvas();
    stubVisibleCanvas();
    renderIn(locale, <VenusRace />);
    fireEvent.click(button(expected.start));
    elapse(9500);
    expect(button(expected.restart)).toBeInTheDocument();
    expect(readout()?.textContent).toBe(expected.rotation);
    settle();
    expect(screen.getByRole("status").textContent).toBe(expected.rotation);
  });

  it("devrait écrire sur le canevas le jour, les deux cadrans et leur avancement", () => {
    const canvas = stubCanvas();
    renderIn(locale, <VenusRace />);
    expect(canvas.texts()).toEqual(expect.arrayContaining([...expected.drawn]));
  });

  it("devrait garder les libellés des deux cadrans dans le canevas, sans chevauchement, sur un téléphone", () => {
    const canvas = stubCanvas();
    stubCanvasWidth(PHONE_WIDTH);
    renderIn(locale, <VenusRace />);
    const [, orbit, orbitDays, spin, spinDays] = expected.drawn.map((text) =>
      textBox(drawnText(canvas.drawn(), text), "center"),
    );
    for (const box of [orbit, orbitDays, spin, spinDays]) {
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(PHONE_WIDTH);
    }
    expect(orbit.right).toBeLessThanOrEqual(spin.left);
    expect(orbitDays.right).toBeLessThanOrEqual(spinDays.left);
  });
});
