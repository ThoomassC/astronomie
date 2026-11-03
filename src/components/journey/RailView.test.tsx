import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RailView, type RailMarker, type RailTick, type RailViewProps } from "@/components/journey/RailView";
import type * as FrameLoopModule from "@/lib/sim/frameLoop";
import type { FrameCallback } from "@/lib/sim/frameLoop";

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

/** Une règle quelconque : celle des tailles d'étoiles, réduite à trois repères. */
const MARKERS: readonly RailMarker[] = [
  { key: "proxima-centauri", href: "#proxima-du-centaure", name: "Proxima du Centaure", sub: "0,154 R☉", color: "#E8775A", percent: 21.5 },
  { key: "sun", href: "#soleil", name: "Soleil", sub: "1 R☉", color: "#FFB13B", percent: 25.39 },
  { key: "betelgeuse", href: "#betelgeuse", name: "Bételgeuse", sub: "764 R☉", color: "#F2994A", percent: 89.2 },
];
const TICKS: readonly RailTick[] = [
  { percent: 4, major: false },
  { percent: 25.3902, major: true },
  { percent: 96, major: false },
];

/** Vol lu par la règle à chaque image. */
let flight = { from: "intro", to: "intro", t: 0 };

const props = (over: Partial<RailViewProps> = {}): RailViewProps => ({
  id: "regle-des-tailles",
  label: "Règle des tailles",
  markers: MARKERS,
  ticks: TICKS,
  axis: [{ from: 0, to: 100 }],
  current: "intro",
  readFlight: () => flight,
  ...over,
});

const rail = () => screen.getByRole("navigation", { name: "Règle des tailles" });
const marker = (name: string) => screen.getByRole("link", { name });

beforeEach(() => {
  flight = { from: "intro", to: "intro", t: 0 };
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
  frame.callback = null;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("RailView", () => {
  it("devrait lier chaque repère à sa section, nommé par son nom puis sa précision", () => {
    render(<RailView {...props()} />);
    expect(rail()).toHaveAttribute("id", "regle-des-tailles");
    const links = within(rail()).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["#proxima-du-centaure", "#soleil", "#betelgeuse"]);
    expect(links.map((link) => link.getAttribute("aria-label"))).toEqual([
      "Proxima du Centaure, 0,154 R☉",
      "Soleil, 1 R☉",
      "Bételgeuse, 764 R☉",
    ]);
    expect(marker("Soleil, 1 R☉").querySelector("small")).toHaveTextContent("1 R☉");
    expect(marker("Soleil, 1 R☉").style.getPropertyValue("--pc")).toBe("#FFB13B");
    expect(marker("Bételgeuse, 764 R☉").style.top).toBe("89.2%");
  });

  it("devrait marquer l'escale affichée (aria-current=\"step\"), et aucune quand elle n'a pas de repère", () => {
    const { rerender } = render(<RailView {...props()} />);
    expect(within(rail()).getAllByRole("link").filter((link) => link.hasAttribute("aria-current"))).toEqual([]);
    rerender(<RailView {...props({ current: "sun" })} />);
    expect(marker("Soleil, 1 R☉")).toHaveAttribute("aria-current", "step");
    expect(marker("Bételgeuse, 764 R☉")).not.toHaveAttribute("aria-current");
  });

  it("devrait tracer les graduations, les majeures deux fois plus longues", () => {
    const { container } = render(<RailView {...props()} />);
    const ticks = [...container.querySelectorAll<HTMLElement>(".tick")];
    expect(ticks.map((tick) => [tick.style.top, tick.style.width, tick.classList.contains("maj")])).toEqual([
      ["4%", "6px", false],
      ["25.39%", "12px", true],
      ["96%", "6px", false],
    ]);
  });

  it("devrait dessiner l'axe sur toute la hauteur, sans signe « ≈ », quand l'échelle ne change pas", () => {
    const { container } = render(<RailView {...props()} />);
    const axes = [...container.querySelectorAll<HTMLElement>(".axis")];
    expect(axes).toHaveLength(1);
    expect(axes[0].style.top).toBe("");
    expect(axes[0].style.bottom).toBe("");
    expect(container.querySelector(".rail-break")).toBeNull();
  });

  it("devrait interrompre l'axe entre ses morceaux et y poser les signes « ≈ », ignorés des lecteurs d'écran", () => {
    const { container } = render(
      <RailView {...props({ axis: [{ from: 0, to: 40 }, { from: 45, to: 100 }], breakMarks: [42.5] })} />,
    );
    const axes = [...container.querySelectorAll<HTMLElement>(".axis")];
    expect(axes.map((axis) => axis.getAttribute("style"))).toEqual(["bottom: 60%;", "top: 45%;"]);
    const marks = [...container.querySelectorAll<HTMLElement>(".rail-break")];
    expect(marks).toHaveLength(1);
    expect(marks[0]).toHaveTextContent("≈");
    expect(marks[0]).toHaveAttribute("aria-hidden", "true");
    expect(marks[0].style.top).toBe("42.5%");
  });

  it("devrait faire suivre au curseur le vol lu à chaque image, l'escale sans repère se plaçant comme le premier", () => {
    const { container } = render(<RailView {...props()} />);
    const cursor = () => container.querySelector<HTMLElement>(".cursor-track")?.style.transform;
    expect(cursor()).toBe("translateY(21.5%)");
    flight = { from: "intro", to: "proxima-centauri", t: 0.5 };
    runFrame();
    expect(cursor()).toBe("translateY(21.500%)");
    // 25,39 + (89,2 − 25,39) × smootherstep(0,25).
    flight = { from: "sun", to: "betelgeuse", t: 0.25 };
    runFrame();
    expect(cursor()).toBe("translateY(31.995%)");
  });

  it("devrait écarter les repères trop proches une fois la règle mesurée, et relier le repère déplacé à sa vraie position", () => {
    // Frontière navigateur : jsdom ne mesure rien. Règle de 100 px, repères de 20 px : écart minimal de 26 px.
    vi.spyOn(Element.prototype, "clientHeight", "get").mockReturnValue(100);
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
    const { container } = render(<RailView {...props()} />);
    expect(marker("Proxima du Centaure, 0,154 R☉").style.top).toBe("21.5px");
    expect(marker("Soleil, 1 R☉").style.top).toBe("47.5px");
    const leaders = [...container.querySelectorAll<HTMLElement>(".leader")];
    expect(leaders.map((leader) => leader.className)).toEqual(["leader down"]);
    expect(leaders[0].style.getPropertyValue("--pc")).toBe("#FFB13B");
    expect(parseFloat(leaders[0].style.top)).toBeCloseTo(25.39, 9);
    expect(parseFloat(leaders[0].style.height)).toBeCloseTo(22.11, 9);
  });

  it("devrait masquer l'infobulle des petits écrans avec Échap, sans rien fermer d'autre, et la rendre au départ du pointeur", () => {
    // Frontière navigateur : petit écran, où le nom d'un repère devient une infobulle.
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(max-width: 860px)", media: query }));
    render(<RailView {...props()} />);
    expect(fireEvent.keyDown(marker("Soleil, 1 R☉"), { key: "Escape" })).toBe(false);
    expect(rail()).toHaveAttribute("data-tips", "off");
    fireEvent.pointerLeave(rail());
    expect(rail()).not.toHaveAttribute("data-tips");
  });
});

/** Cinq repères : assez pour qu'une escale en cours ait des voisines et des repères lointains. */
const FIVE: readonly RailMarker[] = [
  { key: "a", href: "#a", name: "Alpha", sub: "1 al", color: "#111111", percent: 10 },
  { key: "b", href: "#b", name: "Bêta", sub: "2 al", color: "#222222", percent: 30 },
  { key: "c", href: "#c", name: "Gamma", sub: "3 al", color: "#333333", percent: 50 },
  { key: "d", href: "#d", name: "Delta", sub: "4 al", color: "#444444", percent: 70 },
  { key: "e", href: "#e", name: "Epsilon", sub: "5 al", color: "#555555", percent: 90 },
];

/** Repères dont la règle affiche le nom et la précision (`data-near`), dans l'ordre. */
const nearOf = () => within(rail()).getAllByRole("link").map((link) => link.hasAttribute("data-near"));

describe("RailView, repères nommés et graduations", () => {
  it("devrait nommer l'escale en cours et ses deux voisines, et réduire les autres à une graduation", () => {
    const { rerender } = render(<RailView {...props({ markers: FIVE, current: "c" })} />);
    expect(nearOf()).toEqual([false, true, true, true, false]);
    rerender(<RailView {...props({ markers: FIVE, current: "e" })} />);
    expect(nearOf()).toEqual([false, false, false, true, true]);
  });

  it("devrait nommer le premier repère et son voisin quand l'escale affichée n'est pas sur la règle (introduction)", () => {
    render(<RailView {...props({ markers: FIVE, current: "intro" })} />);
    expect(nearOf()).toEqual([true, true, false, false, false]);
  });

  it("devrait garder à chaque graduation son nom accessible et son texte, masqué à l'œil seulement", () => {
    render(<RailView {...props({ markers: FIVE, current: "a" })} />);
    const far = marker("Epsilon, 5 al");
    expect(far).not.toHaveAttribute("data-near");
    expect(far).toHaveTextContent("Epsilon5 al");
    expect(far.querySelector("small")).toHaveTextContent("5 al");
  });

  it("devrait écarter le texte d'une voisine qui toucherait celui de l'escale en cours, sans bouger le repère", () => {
    // Frontière navigateur : règle de 100 px, graduations de 20 px, textes nommés de 30 px de haut.
    vi.spyOn(Element.prototype, "clientHeight", "get").mockReturnValue(100);
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (this: HTMLElement) {
      return this.tagName === "SPAN" ? 30 : 20;
    });
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
    render(<RailView {...props({ current: "sun" })} />);
    // Repères posés à 21,5 et 47,5 px : le texte de Proxima (30 px) monte de 4 px, Bételgeuse (89,2 px) est dégagée.
    expect(marker("Proxima du Centaure, 0,154 R☉").style.top).toBe("21.5px");
    expect(marker("Proxima du Centaure, 0,154 R☉").style.getPropertyValue("--shift")).toBe("-4px");
    expect(marker("Soleil, 1 R☉").style.getPropertyValue("--shift")).toBe("");
    expect(marker("Bételgeuse, 764 R☉").style.getPropertyValue("--shift")).toBe("");
  });

  it("devrait masquer l'infobulle d'une graduation avec Échap sur grand écran, sans rien fermer d'autre", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query }));
    render(<RailView {...props({ markers: FIVE, current: "a" })} />);
    expect(fireEvent.keyDown(marker("Epsilon, 5 al"), { key: "Escape" })).toBe(false);
    expect(rail()).toHaveAttribute("data-tips", "off");
  });

  it("devrait laisser passer Échap sur un repère nommé du grand écran, qui n'a pas d'infobulle", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query }));
    render(<RailView {...props({ markers: FIVE, current: "a" })} />);
    expect(fireEvent.keyDown(marker("Bêta, 2 al"), { key: "Escape" })).toBe(true);
  });
});
