import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SpeedSelector } from "@/components/journey/SpeedSelector";
import { SPEEDS } from "@/lib/sim/clock";

/**
 * jsdom ne calcule aucune mise en page : on simule la piste. Boutons de 90 px espacés de 2 px,
 * 3 px de marge intérieure : le bouton i commence à 3 + 92 i, la piste mesure 3 + 4 × 92 − 2 + 3.
 */
const BUTTON_WIDTH = 90;
const TRACK_WIDTH = 3 + 4 * (BUTTON_WIDTH + 2) - 2 + 3;
const leftOf = (index: number) => 3 + index * (BUTTON_WIDTH + 2);
let trackWidth = TRACK_WIDTH;

/** Rappels des ResizeObserver créés par le composant. */
let resizeCallbacks: (() => void)[] = [];

beforeEach(() => {
  trackWidth = TRACK_WIDTH;
  resizeCallbacks = [];
  const labelIndex = (element: HTMLElement) => SPEEDS.findIndex((speed) => speed.label === element.dataset.label);
  vi.spyOn(HTMLElement.prototype, "offsetLeft", "get").mockImplementation(function (this: HTMLElement) {
    const index = labelIndex(this);
    return index < 0 || trackWidth === 0 ? 0 : leftOf(index);
  });
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(function (this: HTMLElement) {
    return labelIndex(this) < 0 || trackWidth === 0 ? 0 : BUTTON_WIDTH;
  });
  vi.spyOn(Element.prototype, "clientWidth", "get").mockImplementation(function (this: Element) {
    return this.classList.contains("seg") ? trackWidth : 0;
  });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: () => void) {
        resizeCallbacks.push(callback);
      }
      observe() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const group = () => screen.getByRole("group", { name: "Vitesse du temps" });
const bubbleEdges = () => [group().style.getPropertyValue("--bubble-left"), group().style.getPropertyValue("--bubble-right")];
const edgesUnder = (index: number) => [`${leftOf(index)}px`, `${TRACK_WIDTH - leftOf(index) - BUTTON_WIDTH}px`];

describe("SpeedSelector", () => {
  it("devrait proposer les quatre vitesses et ne marquer que l'active", () => {
    render(<SpeedSelector value={7} onChange={() => {}} />);
    const buttons = within(group()).getAllByRole("button");
    expect(buttons.map((button) => button.getAttribute("aria-label"))).toEqual([
      "1 jour par seconde",
      "1 semaine par seconde",
      "1 mois par seconde",
      "1 an par seconde",
    ]);
    expect(buttons.filter((button) => button.getAttribute("aria-pressed") === "true")).toEqual([
      screen.getByRole("button", { name: "1 semaine par seconde" }),
    ]);
  });

  it("devrait transmettre la vitesse choisie", async () => {
    const onChange = vi.fn();
    render(<SpeedSelector value={7} onChange={onChange} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "1 an par seconde" }));
    expect(onChange).toHaveBeenCalledWith(365.25);
  });

  it("devrait cacher la bulle et sa copie des libellés aux technologies d'assistance", () => {
    const { container } = render(<SpeedSelector value={7} onChange={() => {}} />);
    expect(container.querySelector(".seg-bubble")).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector(".seg-ink")).toHaveAttribute("aria-hidden", "true");
  });

  it("devrait placer la bulle sous le bouton actif avant la première image", () => {
    render(<SpeedSelector value={7} onChange={() => {}} />);
    expect(bubbleEdges()).toEqual(edgesUnder(1));
    expect(group()).toHaveAttribute("data-ready", "true");
  });

  it("devrait lancer la bulle vers la vitesse choisie, bord avant en tête", () => {
    const { rerender } = render(<SpeedSelector value={7} onChange={() => {}} />);
    rerender(<SpeedSelector value={365.25} onChange={() => {}} />);
    expect(bubbleEdges()).toEqual(edgesUnder(3));
    expect(group()).toHaveAttribute("data-dir", "next");
    rerender(<SpeedSelector value={1} onChange={() => {}} />);
    expect(bubbleEdges()).toEqual(edgesUnder(0));
    expect(group()).toHaveAttribute("data-dir", "prev");
  });

  it("ne devrait rien placer tant que la piste est masquée (mobile)", () => {
    trackWidth = 0;
    render(<SpeedSelector value={7} onChange={() => {}} />);
    expect(bubbleEdges()).toEqual(["", ""]);
    expect(group()).not.toHaveAttribute("data-ready");
  });

  it("devrait placer la bulle sans animation quand la piste réapparaît", () => {
    trackWidth = 0;
    const { rerender } = render(<SpeedSelector value={7} onChange={() => {}} />);
    // Vitesse changée pendant que la piste était masquée (bouton « cycle » du mobile).
    rerender(<SpeedSelector value={30.44} onChange={() => {}} />);
    trackWidth = TRACK_WIDTH;
    act(() => resizeCallbacks.forEach((callback) => callback()));
    expect(bubbleEdges()).toEqual(edgesUnder(2));
    expect(group()).toHaveAttribute("data-ready", "true");
    // Le placement instantané ne laisse pas la piste figée : les changements suivants s'animent.
    expect(group()).not.toHaveAttribute("data-instant");
  });
});
