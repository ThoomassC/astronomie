import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as ExploreModule from "@/lib/journey/explore";
import type { OrbitInput } from "@/lib/journey/orbit";

/**
 * Le store est un singleton de module : chaque test recharge le module
 * pour partir de l'état initial, quel que soit l'ordre d'exécution.
 */
let exploreStore: typeof ExploreModule.exploreStore;
let useExploration: typeof ExploreModule.useExploration;

beforeEach(async () => {
  vi.resetModules();
  ({ exploreStore, useExploration } = await import("@/lib/journey/explore"));
});

/** Compare des gestes lus par le moteur, champ par champ. */
function expectInput(actual: OrbitInput | null, expected: OrbitInput) {
  expect(actual).not.toBeNull();
  expect(actual?.azim, "azim").toBeCloseTo(expected.azim, 12);
  expect(actual?.elev, "elev").toBeCloseTo(expected.elev, 12);
  expect(actual?.distanceLog, "distanceLog").toBeCloseTo(expected.distanceLog, 12);
  expect(actual?.recenter, "recenter").toBe(expected.recenter);
}

describe("exploreStore", () => {
  it("devrait partir hors du mode, sans vue depuis la Terre", () => {
    expect(exploreStore.get()).toEqual({ stop: null, fromEarth: false });
  });

  describe("enter", () => {
    it("devrait entrer dans le mode sur l'escale demandée et prévenir une fois", () => {
      const listener = vi.fn();
      exploreStore.subscribe(listener);
      exploreStore.enter("saturn");
      expect(exploreStore.get().stop).toBe("saturn");
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("ne devrait pas prévenir quand on entre de nouveau dans l'escale déjà explorée", () => {
      exploreStore.enter("saturn");
      const listener = vi.fn();
      exploreStore.subscribe(listener);
      exploreStore.enter("saturn");
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("setFromEarth", () => {
    it("devrait activer la vue depuis la Terre sur une planète autre que la Terre, et prévenir", () => {
      exploreStore.enter("saturn");
      const listener = vi.fn();
      exploreStore.subscribe(listener);
      exploreStore.setFromEarth(true);
      expect(exploreStore.get().fromEarth).toBe(true);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it.each(["earth", "hero", "stars"] as const)("devrait l'ignorer à l'escale %s, qui n'est pas une autre planète", (stop) => {
      exploreStore.enter(stop);
      exploreStore.setFromEarth(true);
      expect(exploreStore.get().fromEarth).toBe(false);
    });

    it("devrait l'ignorer hors du mode", () => {
      exploreStore.setFromEarth(true);
      expect(exploreStore.get()).toEqual({ stop: null, fromEarth: false });
    });
  });

  describe("gestes", () => {
    it("devrait cumuler les rotations jusqu'à leur lecture, puis repartir de zéro", () => {
      exploreStore.enter("saturn");
      exploreStore.rotate(0.1, 0);
      exploreStore.rotate(0.1, 0);
      expectInput(exploreStore.takeInput(), { azim: 0.2, elev: 0, distanceLog: 0, recenter: false });
      expect(exploreStore.takeInput()).toBeNull();
    });

    it("devrait cumuler les changements de distance jusqu'à leur lecture", () => {
      exploreStore.enter("saturn");
      exploreStore.zoom(0.2);
      exploreStore.zoom(-0.05);
      expectInput(exploreStore.takeInput(), { azim: 0, elev: 0, distanceLog: 0.15, recenter: false });
    });

    it("devrait signaler des gestes en attente, sans les consommer, jusqu'à leur lecture", () => {
      exploreStore.enter("saturn");
      exploreStore.rotate(0.1, 0);
      expect(exploreStore.hasInput()).toBe(true);
      expect(exploreStore.hasInput()).toBe(true);
      exploreStore.takeInput();
      expect(exploreStore.hasInput()).toBe(false);
    });

    it("devrait couper la vue depuis la Terre quand on fait tourner l'astre, et prévenir", () => {
      exploreStore.enter("saturn");
      exploreStore.setFromEarth(true);
      const listener = vi.fn();
      exploreStore.subscribe(listener);
      exploreStore.rotate(0.1, 0);
      expect(exploreStore.get().fromEarth).toBe(false);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("devrait garder la vue depuis la Terre quand on change la distance, sans prévenir", () => {
      exploreStore.enter("saturn");
      exploreStore.setFromEarth(true);
      const listener = vi.fn();
      exploreStore.subscribe(listener);
      exploreStore.zoom(0.2);
      expect(exploreStore.get().fromEarth).toBe(true);
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("recenter", () => {
    it("devrait effacer les gestes en attente et demander le retour à la vue de départ", () => {
      exploreStore.enter("saturn");
      exploreStore.rotate(0.3, 0.1);
      exploreStore.zoom(0.2);
      exploreStore.recenter();
      expectInput(exploreStore.takeInput(), { azim: 0, elev: 0, distanceLog: 0, recenter: true });
    });

    it("devrait couper la vue depuis la Terre", () => {
      exploreStore.enter("saturn");
      exploreStore.setFromEarth(true);
      exploreStore.recenter();
      expect(exploreStore.get().fromEarth).toBe(false);
    });
  });

  describe("exit", () => {
    it("devrait quitter le mode, couper la vue depuis la Terre et oublier les gestes en attente", () => {
      exploreStore.enter("saturn");
      exploreStore.rotate(0.1, 0);
      exploreStore.setFromEarth(true);
      exploreStore.exit();
      expect(exploreStore.get()).toEqual({ stop: null, fromEarth: false });
      expect(exploreStore.takeInput()).toBeNull();
    });

    it("ne devrait pas prévenir quand on quitte alors qu'on n'explore rien", () => {
      const listener = vi.fn();
      exploreStore.subscribe(listener);
      exploreStore.exit();
      expect(listener).not.toHaveBeenCalled();
    });
  });
});

describe("useExploration", () => {
  afterEach(cleanup);

  it("devrait rendre l'état du mode puis suivre l'entrée et la sortie", () => {
    const { result } = renderHook(() => useExploration());
    expect(result.current).toEqual({ stop: null, fromEarth: false });
    act(() => exploreStore.enter("saturn"));
    expect(result.current).toEqual({ stop: "saturn", fromEarth: false });
    act(() => exploreStore.exit());
    expect(result.current).toEqual({ stop: null, fromEarth: false });
  });
});
