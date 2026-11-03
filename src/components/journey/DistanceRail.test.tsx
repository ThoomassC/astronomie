import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { anchorOf } from "@/components/journey/anchors";
import { DistanceRail, type RailStop } from "@/components/journey/DistanceRail";
import { renderIn } from "@/components/modules/testUtils";
import { RAIL_STOPS } from "@/lib/journey/camera";
import { journeyStore } from "@/lib/journey/store";
import type * as FrameLoopModule from "@/lib/sim/frameLoop";
import type { FrameCallback } from "@/lib/sim/frameLoop";

/*
 * Caractérisation, figée avec le code d'avant l'extraction de la vue générique de la règle : l'enveloppe
 * du voyage doit rendre exactement la même règle (repères, noms accessibles, graduations, axe, curseur,
 * équerres, infobulles).
 */

/** Boucle d'images pilotée à la main : la règle y inscrit le suivi de son curseur. */
const frame = vi.hoisted(() => {
  const loop: { callback: FrameCallback | null } = { callback: null };
  return loop;
});

vi.mock("@/lib/sim/frameLoop", async (importOriginal) => ({
  ...(await importOriginal<typeof FrameLoopModule>()),
  useFrame: (callback: FrameCallback) => {
    frame.callback = callback;
  },
}));

/** Une image de la boucle. */
const runFrame = () => act(() => frame.callback?.(1 / 60));

/** Les repères de la page du voyage. */
const STOPS: readonly RailStop[] = RAIL_STOPS.map(({ key, au }) => ({ key, au, href: anchorOf(key) }));

/** Petits écrans : le nom d'un repère devient une infobulle (globals.css). */
const TIPS_QUERY = "(max-width: 860px)";

/** Frontière navigateur : jsdom n'a pas de matchMedia ; seul `query` répond vrai. */
const stubMatchMedia = (query: string | null) =>
  vi.stubGlobal("matchMedia", (media: string) => ({ matches: media === query, media }));

/**
 * Frontière navigateur : jsdom ne mesure rien. La règle fait `height` px, chaque repère 20 px de haut,
 * et l'observateur rend compte dès qu'on l'inscrit.
 */
function stubRailHeight(height: number): void {
  vi.spyOn(Element.prototype, "clientHeight", "get").mockReturnValue(height);
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(20);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(private readonly callback: () => void) {}
      observe() {
        this.callback();
      }
      disconnect() {}
    },
  );
}

const rail = () => screen.getByRole("navigation", { name: "Escales, du Soleil vers l'extérieur" });
const marker = (name: string) => screen.getByRole("link", { name });

beforeEach(() => {
  // Frontière navigateur : jsdom n'a pas de ResizeObserver ; sans mesure, les repères restent à leur position vraie.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  act(() => journeyStore.update("hero", "hero", 0));
  frame.callback = null;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("DistanceRail", () => {
  it("devrait lister les seize escales, du Soleil au multivers, chacune avec son ancre", () => {
    render(<DistanceRail stops={STOPS} />);
    expect(rail()).toHaveAttribute("id", "rail");
    expect(rail()).toHaveAttribute("data-hide-on-explore");
    const links = within(rail()).getAllByRole("link");
    expect(links).toHaveLength(16);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "#soleil", "#mercure", "#venus", "#terre", "#mars", "#ceinture", "#jupiter", "#saturne", "#uranus", "#neptune",
      "#au-dela", "#etoiles-voisines", "#voie-lactee", "#groupe-local", "#univers-observable", "#multivers",
    ]);
  });

  it("devrait nommer chaque repère par son escale et sa distance au Soleil (« Mars, 1,52 UA »)", () => {
    render(<DistanceRail stops={STOPS} />);
    expect(within(rail()).getAllByRole("link").map((link) => link.getAttribute("aria-label"))).toEqual([
      "Soleil, le centre",
      "Mercure, 0,39 UA",
      "Vénus, 0,72 UA",
      "Terre, 1 UA",
      "Mars, 1,52 UA",
      "Astéroïdes, 2,1 à 3,3 UA",
      "Jupiter, 5,20 UA",
      "Saturne, 9,54 UA",
      "Uranus, 19,2 UA",
      "Neptune, 30,1 UA",
      "Au-delà, plus de 30 UA",
      "Étoiles voisines, dès 4,2 al",
      "Voie lactée, centre à 27\u202f000 al",
      "Groupe local, Andromède à 2,5 millions d'al",
      "Univers observable, rayon de 46 milliards d'al",
      "Multivers, hypothèse",
    ]);
    // Le nom visible et la distance en petit, sous lui.
    expect(marker("Mars, 1,52 UA")).toHaveTextContent("Mars1,52 UA");
    expect(marker("Mars, 1,52 UA").querySelector("small")).toHaveTextContent("1,52 UA");
  });

  it("devrait marquer l'escale affichée (aria-current=\"step\"), et aucune à l'accueil, absent de la règle", () => {
    render(<DistanceRail stops={STOPS} />);
    expect(within(rail()).getAllByRole("link").filter((link) => link.hasAttribute("aria-current"))).toEqual([]);
    act(() => journeyStore.update("mars", "saturn", 0.7));
    expect(marker("Saturne, 9,54 UA")).toHaveAttribute("aria-current", "step");
    expect(marker("Mars, 1,52 UA")).not.toHaveAttribute("aria-current");
    act(() => journeyStore.update("stars", "galaxy", 0.4));
    expect(marker("Étoiles voisines, dès 4,2 al")).toHaveAttribute("aria-current", "step");
  });

  it("devrait tracer 21 graduations dans le système solaire et 12 en années-lumière, majeures à 1 UA, 10 UA, 1 al, 1 Mal et 1 Gal", () => {
    const { container } = render(<DistanceRail stops={STOPS} />);
    const ticks = [...container.querySelectorAll<HTMLElement>(".tick")];
    // Positions relues dans le style, que jsdom écrit sans zéros inutiles (« 6.000% » devient « 6% »).
    expect(ticks.map((tick) => tick.style.top)).toEqual([
      "6%", "10.499%", "13.988%", "16.839%", "19.249%", "21.337%", "23.179%",
      "24.827%", "35.666%", "42.006%", "46.505%", "49.994%", "52.845%", "55.255%", "57.344%", "59.185%",
      "60.833%", "71.672%", "78.012%", "82.511%", "86%",
      "89%", "89.818%", "90.636%", "91.455%", "92.273%", "93.091%", "93.909%", "94.727%", "95.545%", "96.364%",
      "97.182%", "98%",
    ]);
    const majors = ticks.filter((tick) => tick.classList.contains("maj"));
    expect(majors.map((tick) => tick.style.top)).toEqual(["24.827%", "60.833%", "89%", "93.909%", "96.364%"]);
    expect(majors.map((tick) => tick.style.width)).toEqual(["12px", "12px", "12px", "12px", "12px"]);
    expect(ticks.filter((tick) => tick.style.width === "6px")).toHaveLength(28);
  });

  it("devrait interrompre l'axe entre le système solaire et les étoiles, signe « ≈ » au milieu, ignoré des lecteurs d'écran", () => {
    const { container } = render(<DistanceRail stops={STOPS} />);
    const axes = [...container.querySelectorAll<HTMLElement>(".axis")];
    expect(axes.map((axis) => axis.getAttribute("style"))).toEqual(["bottom: 13%;", "top: 88.5%; bottom: 2%;"]);
    const breakMark = container.querySelector<HTMLElement>(".rail-break");
    expect(breakMark).toHaveTextContent("≈");
    expect(breakMark).toHaveAttribute("aria-hidden", "true");
    expect(breakMark?.getAttribute("style")).toBe("top: 87.75%;");
  });

  it("devrait arrêter l'axe à 10¹¹ al (98 %) et poser le multivers après lui, hors échelle", () => {
    const { container } = render(<DistanceRail stops={STOPS} />);
    const axisEnd = 100 - parseFloat(container.querySelectorAll<HTMLElement>(".axis")[1].style.bottom);
    expect(axisEnd).toBe(98);
    expect(parseFloat(marker("Univers observable, rayon de 46 milliards d'al").style.top)).toBeLessThan(axisEnd);
    expect(parseFloat(marker("Multivers, hypothèse").style.top)).toBeGreaterThan(axisEnd);
  });

  it("devrait poser chaque repère à sa position vraie, dans sa couleur, tant que la règle n'est pas mesurée", () => {
    const { container } = render(<DistanceRail stops={STOPS} />);
    const links = within(rail()).getAllByRole("link");
    expect(links.map((link) => link.style.top)).toEqual([
      "2%", "9.982%", "19.755%", "24.827%", "31.415%", "40.359%", "50.607%", "60.096%", "71.025%", "78.049%",
      "84.352%", "89.514%", "92.626%", "94.232%", "97.724%", "99.4%",
    ]);
    expect(links.map((link) => link.style.getPropertyValue("--pc"))).toEqual([
      "#FFB13B", "#B5ADA3", "#E6CB94", "#5B9BE6", "#DA6A43", "#A89F94", "#D8A878", "#E2C98F", "#9ED9DE", "#5878E8",
      "#C2A36B", "#CFDCFF", "#B3A4EE", "#A9B8E8", "#E7A6C1", "#7FD8C8",
    ]);
    // Pastille du repère, après le nom.
    expect(links.every((link) => link.lastElementChild?.tagName === "I")).toBe(true);
    expect(container.querySelectorAll(".leader")).toHaveLength(0);
  });

  it("devrait écarter les repères trop proches sur une règle courte, et les relier à leur vraie position par une équerre", () => {
    stubRailHeight(600);
    const { container } = render(<DistanceRail stops={STOPS} />);
    const top = (name: string) => parseFloat(marker(name).style.top);
    // 600 px, écart de 26 px : les planètes intérieures gardent leur place ; d'Uranus au multivers, les repères
    // lointains, serrés au bas de la règle, remontent un à un.
    expect(marker("Vénus, 0,72 UA").style.top).toMatch(/px$/);
    expect(top("Vénus, 0,72 UA")).toBeCloseTo(118.5296, 3);
    expect(top("Uranus, 19,2 UA")).toBeCloseTo(418, 9);
    expect(top("Voie lactée, centre à 27\u202f000 al")).toBeCloseTo(522, 9);
    expect(top("Multivers, hypothèse")).toBeCloseTo(600, 9);
    const leaders = [...container.querySelectorAll<HTMLElement>(".leader")];
    expect(leaders.map((leader) => leader.className)).toEqual([...Array(7).fill("leader up"), "leader down"]);
    expect(leaders.map((leader) => leader.style.getPropertyValue("--pc"))).toEqual([
      "#9ED9DE", "#5878E8", "#C2A36B", "#CFDCFF", "#B3A4EE", "#A9B8E8", "#E7A6C1", "#7FD8C8",
    ]);
    expect(parseFloat(leaders[0].style.top)).toBeCloseTo(418, 3);
    expect(parseFloat(leaders[0].style.height)).toBeCloseTo(8.1516, 3);
    expect(parseFloat(leaders[7].style.top)).toBeCloseTo(596.4, 3);
    expect(parseFloat(leaders[7].style.height)).toBeCloseTo(3.6, 3);
  });

  it("devrait faire glisser le curseur avec la caméra, au rythme de smootherstep, l'accueil étant placé comme le Soleil", () => {
    const { container } = render(<DistanceRail stops={STOPS} />);
    const cursor = () => container.querySelector<HTMLElement>(".cursor-track")?.style.transform;
    expect(cursor()).toBe("translateY(2%)");
    runFrame();
    expect(cursor()).toBe("translateY(2.000%)");
    act(() => journeyStore.update("earth", "mars", 0.5));
    runFrame();
    expect(cursor()).toBe("translateY(28.121%)");
    act(() => journeyStore.update("saturn", "uranus", 0.25));
    runFrame();
    expect(cursor()).toBe("translateY(61.228%)");
  });

  it("devrait masquer l'infobulle des petits écrans avec Échap, sans fermer autre chose, et la rendre au focus suivant", () => {
    stubMatchMedia(TIPS_QUERY);
    render(<DistanceRail stops={STOPS} />);
    // fireEvent renvoie false quand l'événement a été annulé : la note d'échelle ne se ferme pas avec lui.
    expect(fireEvent.keyDown(marker("Mars, 1,52 UA"), { key: "Escape" })).toBe(false);
    expect(rail()).toHaveAttribute("data-tips", "off");
    // Infobulle déjà masquée : l'appui suivant passe à la couche d'après.
    expect(fireEvent.keyDown(marker("Mars, 1,52 UA"), { key: "Escape" })).toBe(true);
    act(() => marker("Terre, 1 UA").focus());
    expect(rail()).not.toHaveAttribute("data-tips");
  });

  it("devrait masquer les infobulles sur grand écran sans retenir Échap, et les rendre quand le pointeur quitte la règle", () => {
    stubMatchMedia(null);
    render(<DistanceRail stops={STOPS} />);
    expect(fireEvent.keyDown(marker("Mars, 1,52 UA"), { key: "Escape" })).toBe(true);
    expect(rail()).toHaveAttribute("data-tips", "off");
    fireEvent.pointerLeave(rail());
    expect(rail()).not.toHaveAttribute("data-tips");
  });
});

describe("DistanceRail en anglais et en espagnol", () => {
  it.each([
    {
      locale: "en",
      rail: "Stops, from the Sun outwards",
      labels: [
        "Sun, the centre",
        "Mercury, 0.39 AU",
        "Venus, 0.72 AU",
        "Earth, 1 AU",
        "Mars, 1.52 AU",
        "Asteroids, 2.1 to 3.3 AU",
        "Jupiter, 5.20 AU",
        "Saturn, 9.54 AU",
        "Uranus, 19.2 AU",
        "Neptune, 30.1 AU",
        "Beyond, over 30 AU",
        "Nearby stars, from 4.2 ly",
        "Milky Way, centre at 27,000 ly",
        "Local Group, Andromeda at 2.5 million ly",
        "Observable Universe, 46 billion ly in radius",
        "Multiverse, hypothesis",
      ],
    },
    {
      locale: "es",
      rail: "Escalas, del Sol hacia fuera",
      labels: [
        "Sol, el centro",
        "Mercurio, 0,39 UA",
        "Venus, 0,72 UA",
        "Tierra, 1 UA",
        "Marte, 1,52 UA",
        "Asteroides, de 2,1 a 3,3 UA",
        "Júpiter, 5,20 UA",
        "Saturno, 9,54 UA",
        "Urano, 19,2 UA",
        "Neptuno, 30,1 UA",
        "Más allá, más de 30 UA",
        "Estrellas vecinas, desde 4,2 al",
        "Vía Láctea, centro a 27.000 al",
        "Grupo Local, Andrómeda a 2,5 millones de al",
        "Universo observable, radio de 46 mil millones de al",
        "Multiverso, hipótesis",
      ],
    },
  ] as const)(
    "devrait nommer la règle et chaque repère dans la langue de la page ($locale)",
    ({ locale, rail: name, labels }) => {
      renderIn(locale, <DistanceRail stops={STOPS} />);
      const links = within(screen.getByRole("navigation", { name })).getAllByRole("link");
      expect(links.map((link) => link.getAttribute("aria-label"))).toEqual(labels);
    },
  );
});

/*
 * Place de la règle (globals.css, lu tel quel) : ses seize repères doivent garder au moins 24 px entre leurs centres
 * (WCAG 2.5.8, cibles de 24 px). Là où sa hauteur ne le permet pas, la liste des escales de la barre la remplace.
 */
describe("la règle et la liste des escales", () => {
  const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
  /** Écart minimal entre les centres de deux repères voisins, en px CSS. */
  const MIN_PITCH_PX = 24;
  const REM_PX = 16;

  /** Conditions de la requête média dont le bloc affiche la liste des escales (`.stops-menu { display: block; … }`). */
  function swapConditions(): string[] {
    const at = css.search(/\n {2}\.stops-menu \{\n {4}display: block;/);
    expect(at).toBeGreaterThan(0);
    const start = css.lastIndexOf("@media", at);
    const query = css.slice(start + "@media".length, css.indexOf("{", start));
    return query.split(",").map((condition) => condition.replace(/\s+/g, " ").trim());
  }

  /** Hauteur de la règle sur grand écran : `min(<vh>vh, <px>px)`, dans le premier bloc `.rail`. */
  function railHeight(viewportHeight: number): number {
    const match = /\n\.rail \{[^}]*?height: min\((\d+(?:\.\d+)?)vh, (\d+)px\);/.exec(css);
    expect(match).not.toBeNull();
    const [, vh, px] = match ?? [];
    return Math.min((Number(vh) / 100) * viewportHeight, Number(px));
  }

  it("devrait remplacer la règle par la liste sur tout écran de 860 px de large ou moins, quelle qu'en soit la hauteur", () => {
    expect(swapConditions()).toContain("(max-width: 860px) and (scripting: enabled)");
  });

  it("devrait remplacer la règle par la liste sous la hauteur où ses seize repères n'auraient plus 24 px entre eux", () => {
    const short = swapConditions()
      .map((condition) => /^\(max-height: (\d+(?:\.\d+)?)rem\) and \(scripting: enabled\)$/.exec(condition))
      .find((match) => match !== null);
    expect(short).toBeDefined();
    const threshold = Number(short?.[1]) * REM_PX;
    // Juste au-dessus du seuil, la règle s'affiche : ses repères y tiennent à 24 px au moins.
    expect(railHeight(threshold + 0.01) / (RAIL_STOPS.length - 1)).toBeGreaterThanOrEqual(MIN_PITCH_PX);
    // Le seuil ne retire pas la règle là où elle tiendrait encore à 25 px (pas plus d'un pixel de marge perdu).
    expect(railHeight(threshold - 16) / (RAIL_STOPS.length - 1)).toBeLessThan(MIN_PITCH_PX + 1);
  });
});
