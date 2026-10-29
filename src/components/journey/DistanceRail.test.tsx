import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { anchorOf } from "@/components/journey/anchors";
import { DistanceRail, type RailStop } from "@/components/journey/DistanceRail";
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
  it("devrait lister les treize escales, du Soleil à la Voie lactée, chacune avec son ancre", () => {
    render(<DistanceRail stops={STOPS} />);
    expect(rail()).toHaveAttribute("id", "rail");
    expect(rail()).toHaveAttribute("data-hide-on-explore");
    const links = within(rail()).getAllByRole("link");
    expect(links).toHaveLength(13);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "#soleil", "#mercure", "#venus", "#terre", "#mars", "#ceinture", "#jupiter", "#saturne", "#uranus", "#neptune",
      "#au-dela", "#etoiles-voisines", "#voie-lactee",
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

  it("devrait tracer 21 graduations dans le système solaire et 6 en années-lumière, majeures à 1 UA, 10 UA et 1 al", () => {
    const { container } = render(<DistanceRail stops={STOPS} />);
    const ticks = [...container.querySelectorAll<HTMLElement>(".tick")];
    // Positions relues dans le style, que jsdom écrit sans zéros inutiles (« 6.000% » devient « 6% »).
    expect(ticks.map((tick) => tick.style.top)).toEqual([
      "6%", "10.499%", "13.988%", "16.839%", "19.249%", "21.337%", "23.179%",
      "24.827%", "35.666%", "42.006%", "46.505%", "49.994%", "52.845%", "55.255%", "57.344%", "59.185%",
      "60.833%", "71.672%", "78.012%", "82.511%", "86%",
      "91%", "92.4%", "93.8%", "95.2%", "96.6%", "98%",
    ]);
    const majors = ticks.filter((tick) => tick.classList.contains("maj"));
    expect(majors.map((tick) => tick.style.top)).toEqual(["24.827%", "60.833%", "91%"]);
    expect(majors.map((tick) => tick.style.width)).toEqual(["12px", "12px", "12px"]);
    expect(ticks.filter((tick) => tick.style.width === "6px")).toHaveLength(24);
  });

  it("devrait interrompre l'axe entre le système solaire et les étoiles, signe « ≈ » au milieu, ignoré des lecteurs d'écran", () => {
    const { container } = render(<DistanceRail stops={STOPS} />);
    const axes = [...container.querySelectorAll<HTMLElement>(".axis")];
    expect(axes.map((axis) => axis.getAttribute("style"))).toEqual(["bottom: 13%;", "top: 90%;"]);
    const breakMark = container.querySelector<HTMLElement>(".rail-break");
    expect(breakMark).toHaveTextContent("≈");
    expect(breakMark).toHaveAttribute("aria-hidden", "true");
    expect(breakMark?.getAttribute("style")).toBe("top: 88.5%;");
  });

  it("devrait poser chaque repère à sa position vraie, dans sa couleur, tant que la règle n'est pas mesurée", () => {
    const { container } = render(<DistanceRail stops={STOPS} />);
    const links = within(rail()).getAllByRole("link");
    expect(links.map((link) => link.style.top)).toEqual([
      "2%", "9.982%", "19.755%", "24.827%", "31.415%", "40.359%", "50.607%", "60.096%", "71.025%", "78.049%",
      "84.352%", "91.879%", "97.204%",
    ]);
    expect(links.map((link) => link.style.getPropertyValue("--pc"))).toEqual([
      "#FFB13B", "#B5ADA3", "#E6CB94", "#5B9BE6", "#DA6A43", "#A89F94", "#D8A878", "#E2C98F", "#9ED9DE", "#5878E8",
      "#C2A36B", "#CFDCFF", "#B3A4EE",
    ]);
    // Pastille du repère, après le nom.
    expect(links.every((link) => link.lastElementChild?.tagName === "I")).toBe(true);
    expect(container.querySelectorAll(".leader")).toHaveLength(0);
  });

  it("devrait écarter les repères trop proches sur une règle courte, et les relier à leur vraie position par une équerre", () => {
    stubRailHeight(400);
    const { container } = render(<DistanceRail stops={STOPS} />);
    const top = (name: string) => parseFloat(marker(name).style.top);
    // 400 px, écart de 26 px : la Terre et Mars descendent sous Vénus, la Voie lactée sous les étoiles voisines.
    expect(marker("Vénus, 0,72 UA").style.top).toMatch(/px$/);
    expect(top("Vénus, 0,72 UA")).toBeCloseTo(79.0197, 3);
    expect(top("Terre, 1 UA")).toBeCloseTo(105.0197, 3);
    expect(top("Mars, 1,52 UA")).toBeCloseTo(131.0197, 3);
    expect(top("Voie lactée, centre à 27\u202f000 al")).toBeCloseTo(393.517, 3);
    const leaders = [...container.querySelectorAll<HTMLElement>(".leader")];
    expect(leaders.map((leader) => leader.className)).toEqual(["leader down", "leader down", "leader down"]);
    expect(leaders.map((leader) => leader.style.getPropertyValue("--pc"))).toEqual(["#5B9BE6", "#DA6A43", "#B3A4EE"]);
    expect(parseFloat(leaders[0].style.top)).toBeCloseTo(99.3072, 3);
    expect(parseFloat(leaders[0].style.height)).toBeCloseTo(5.7125, 3);
    expect(parseFloat(leaders[2].style.top)).toBeCloseTo(388.8156, 3);
    expect(parseFloat(leaders[2].style.height)).toBeCloseTo(4.7013, 3);
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
