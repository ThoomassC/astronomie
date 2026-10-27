import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as StoreModule from "@/lib/journey/store";

/**
 * Le store est un singleton de module : chaque test recharge le module
 * pour partir de l'état initial, quel que soit l'ordre d'exécution.
 */
let journeyStore: typeof StoreModule.journeyStore;
let useCurrentStop: typeof StoreModule.useCurrentStop;

beforeEach(async () => {
  vi.resetModules();
  ({ journeyStore, useCurrentStop } = await import("@/lib/journey/store"));
});

describe("journeyStore", () => {
  it("devrait partir de l'escale « hero », au repos", () => {
    expect(journeyStore.get()).toEqual({ from: "hero", to: "hero", t: 0, current: "hero" });
  });

  it.each([
    [0, "hero"],
    [0.49, "hero"],
    [0.5, "sun"],
    [1, "sun"],
  ] as const)("devrait afficher l'escale de départ avant mi-vol et celle d'arrivée ensuite (t = %f → %s)", (t, current) => {
    journeyStore.update("hero", "sun", t);
    expect(journeyStore.get()).toEqual({ from: "hero", to: "sun", t, current });
  });

  it("ne devrait pas prévenir quand l'escale affichée reste la même", () => {
    const listener = vi.fn();
    journeyStore.subscribe(listener);
    journeyStore.update("hero", "sun", 0.3);
    expect(listener).not.toHaveBeenCalled();
  });

  it("devrait mettre à jour l'avancement en silence quand l'escale affichée ne change pas", () => {
    const listener = vi.fn();
    journeyStore.subscribe(listener);
    journeyStore.update("hero", "sun", 0.3);
    expect(journeyStore.get().t).toBe(0.3);
    expect(listener).not.toHaveBeenCalled();
  });

  it("devrait prévenir une seule fois quand l'escale affichée change puis reste stable", () => {
    const listener = vi.fn();
    journeyStore.subscribe(listener);
    journeyStore.update("hero", "sun", 0.6);
    journeyStore.update("hero", "sun", 0.8);
    journeyStore.update("sun", "mercury", 0.1);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("devrait prévenir à nouveau quand on revient en arrière", () => {
    const listener = vi.fn();
    journeyStore.subscribe(listener);
    journeyStore.update("hero", "sun", 0.6);
    journeyStore.update("hero", "sun", 0.4);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("devrait laisser l'abonné lire le nouvel état au moment où il est prévenu", () => {
    const seen: string[] = [];
    journeyStore.subscribe(() => seen.push(journeyStore.get().current));
    journeyStore.update("hero", "sun", 0.7);
    expect(seen).toEqual(["sun"]);
  });

  it("ne devrait plus prévenir un abonné qui s'est désinscrit", () => {
    const listener = vi.fn();
    const unsubscribe = journeyStore.subscribe(listener);
    unsubscribe();
    journeyStore.update("hero", "sun", 0.9);
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("useCurrentStop", () => {
  afterEach(cleanup);

  it("devrait rendre l'escale affichée puis suivre ses changements", () => {
    const { result } = renderHook(() => useCurrentStop());
    expect(result.current).toBe("hero");
    act(() => journeyStore.update("hero", "sun", 0.8));
    expect(result.current).toBe("sun");
  });
});
