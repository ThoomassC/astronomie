import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LightRace } from "@/components/modules/LightRace";
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
/** Largeur du canevas dans la mise en page large (taille de référence des modules). */
const WIDE_WIDTH = 560;
/** Séparateur des milliers en français (Intl) : espace fine insécable, U+202F. */
const NNBSP = "\u202f";

interface Expected {
  canvas: string;
  start: string;
  pause: string;
  resume: string;
  restart: string;
  group: string;
  /** Accélérations ×100, ×1 000 et ×10 000, telles que les écrit Intl (espace fine insécable en français). */
  speeds: readonly [string, string, string];
  initial: string;
  /** Lecture annoncée après le choix de ×100. */
  ready100: string;
  /** Dernière planète atteinte après une seconde de course à ×1 000 : Mars. */
  mars: string;
  arrival: string;
  /** Textes du canevas au départ. */
  drawn: readonly string[];
}

const CASES: readonly (readonly [Locale, Expected])[] = [
  [
    "fr",
    {
      canvas: "Piste à l'échelle du Soleil à Neptune, avec un zoom sur les planètes intérieures",
      start: "Lancer l'éclair",
      pause: "Pause",
      resume: "Reprendre",
      restart: "Relancer",
      group: "Accélération",
      speeds: ["×100", `×1${NNBSP}000`, `×10${NNBSP}000`],
      // Lecture de départ rédigée à la main : espace ordinaire, contrairement aux boutons écrits par Intl.
      initial: "Prêt. À ×1\u202f000, l'éclair atteint Neptune en 15 secondes.",
      ready100: "Prêt. À ×100, l'éclair atteint Neptune en 2 min 30 s.",
      mars: "Mars atteinte après 12 min 40 s de trajet.",
      arrival:
        "Neptune atteinte après 4 h 10 min. Les quatre premières planètes tiennent dans les 5 premiers pour cent du trajet.",
      drawn: [
        "Temps écoulé\u00a0: 0 s",
        "0 à 30 UA, à l'échelle",
        "Zoom sur les 1,6 premières UA",
        "Mercure à Mars",
        "Jupiter",
        "Saturne",
        "Uranus",
        "Neptune",
        "Mercure",
        "Vénus",
        "Terre",
        "Mars",
      ],
    },
  ],
  [
    "en",
    {
      canvas: "To-scale track from the Sun to Neptune, with a close-up of the inner planets",
      start: "Send the flash",
      pause: "Pause",
      resume: "Resume",
      restart: "Run again",
      group: "Speed-up",
      speeds: ["×100", "×1,000", "×10,000"],
      initial: "Ready. At ×1,000, the flash reaches Neptune in 15 seconds.",
      ready100: "Ready. At ×100, the flash reaches Neptune in 2 min 30 s.",
      mars: "Reached Mars after 12 min 40 s.",
      arrival: "Reached Neptune after 4 h 10 min. The first four planets lie within the first 5 per cent of the journey.",
      drawn: [
        "Time elapsed: 0 s",
        "0 to 30 AU, to scale",
        "Close-up of the first 1.6 AU",
        "Mercury to Mars",
        "Jupiter",
        "Saturn",
        "Uranus",
        "Neptune",
        "Mercury",
        "Venus",
        "Earth",
        "Mars",
      ],
    },
  ],
  [
    "es",
    {
      canvas: "Pista a escala del Sol a Neptuno, con un zoom sobre los planetas interiores",
      start: "Lanzar el destello",
      pause: "Pausa",
      resume: "Reanudar",
      restart: "Repetir",
      group: "Aceleración",
      speeds: ["×100", "×1000", "×10.000"],
      initial: "Listo. A ×1000, el destello llega a Neptuno en 15 segundos.",
      ready100: "Listo. A ×100, el destello llega a Neptuno en 2 min 30 s.",
      mars: "Llega a Marte tras 12 min 40 s de viaje.",
      arrival: "Llega a Neptuno tras 4 h 10 min. Los cuatro primeros planetas caben en el primer 5 % del trayecto.",
      drawn: [
        "Tiempo transcurrido: 0 s",
        "De 0 a 30 UA, a escala",
        "Zoom sobre las primeras 1,6 UA",
        "De Mercurio a Marte",
        "Júpiter",
        "Saturno",
        "Urano",
        "Neptuno",
        "Mercurio",
        "Venus",
        "Tierra",
        "Marte",
      ],
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
const readout = () => document.getElementById("light-race-readout");
const button = (name: string) => screen.getByRole("button", { name });

describe.each(CASES)("LightRace (%s)", (locale, expected) => {

  it("devrait décrire la piste et proposer le départ quand rien n'a encore été lancé", () => {
    stubCanvas();
    renderIn(locale, <LightRace />);
    expect(screen.getByRole("img")).toHaveAccessibleName(expected.canvas);
    expect(button(expected.start)).toBeInTheDocument();
    expect(readout()?.textContent).toBe(expected.initial);
  });

  it("devrait écrire les accélérations à la manière de la langue, ×1 000 choisie au départ", () => {
    stubCanvas();
    renderIn(locale, <LightRace />);
    const group = screen.getByRole("group", { name: expected.group });
    expect(group).toBeInTheDocument();
    for (const label of expected.speeds) expect(button(label)).toBeInTheDocument();
    expect(button(expected.speeds[1])).toHaveAttribute("aria-pressed", "true");
  });

  it("devrait annoncer la durée du trajet, après le calme, quand on choisit ×100 avant le départ", () => {
    stubCanvas();
    renderIn(locale, <LightRace />);
    fireEvent.click(button(expected.speeds[0]));
    expect(readout()?.textContent).toBe(expected.ready100);
    settle();
    expect(screen.getByRole("status").textContent).toBe(expected.ready100);
  });

  it("devrait proposer la pause pendant la course, puis la reprise en annonçant la dernière planète atteinte", () => {
    stubCanvas();
    stubVisibleCanvas();
    renderIn(locale, <LightRace />);
    fireEvent.click(button(expected.start));
    elapse(1000);
    expect(readout()?.textContent).toBe(expected.mars);
    fireEvent.click(button(expected.pause));
    expect(button(expected.resume)).toBeInTheDocument();
    settle();
    expect(screen.getByRole("status").textContent).toBe(expected.mars);
  });

  it("devrait proposer de relancer et annoncer l'arrivée quand l'éclair atteint Neptune", () => {
    stubCanvas();
    stubVisibleCanvas();
    renderIn(locale, <LightRace />);
    fireEvent.click(button(expected.speeds[2]));
    fireEvent.click(button(expected.start));
    elapse(2000);
    expect(button(expected.restart)).toBeInTheDocument();
    expect(readout()?.textContent).toBe(expected.arrival);
    settle();
    expect(screen.getByRole("status").textContent).toBe(expected.arrival);
  });

  it("devrait écrire sur le canevas le temps écoulé, l'échelle, la loupe et le nom des planètes", () => {
    const canvas = stubCanvas();
    renderIn(locale, <LightRace />);
    expect(canvas.texts()).toEqual(expect.arrayContaining([...expected.drawn]));
  });

  it("devrait garder le temps écoulé et l'échelle côte à côte, sans chevauchement, sur un canevas large", () => {
    const canvas = stubCanvas();
    stubCanvasWidth(WIDE_WIDTH);
    renderIn(locale, <LightRace />);
    const [elapsed, scale] = expected.drawn;
    const left = textBox(drawnText(canvas.drawn(), elapsed), "left");
    const right = textBox(drawnText(canvas.drawn(), scale), "right");
    expect(left.right).toBeLessThanOrEqual(right.left);
    expect(right.right).toBeLessThanOrEqual(WIDE_WIDTH);
  });

  it("devrait passer l'échelle sous le temps écoulé, chacun borné au canevas, sur un téléphone", () => {
    const canvas = stubCanvas();
    stubCanvasWidth(PHONE_WIDTH);
    renderIn(locale, <LightRace />);
    const [elapsed, scale] = expected.drawn.map((text) => drawnText(canvas.drawn(), text));
    expect(scale.y).toBeGreaterThan(elapsed.y);
    for (const entry of [elapsed, scale]) expect(textBox(entry, "left").right).toBeLessThanOrEqual(PHONE_WIDTH);
  });
});
