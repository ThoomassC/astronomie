import { act, cleanup, renderHook } from "@testing-library/react";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as StoreModule from "@/lib/journey/store";

/**
 * Le store est un singleton de module : chaque test recharge le module
 * pour partir de l'état initial, quel que soit l'ordre d'exécution.
 */
let journeyStore: typeof StoreModule.journeyStore;
let useCurrentStop: typeof StoreModule.useCurrentStop;
let useIsCosmicStop: typeof StoreModule.useIsCosmicStop;
let createStopStore: typeof StoreModule.createStopStore;
let useStopStoreCurrent: typeof StoreModule.useStopStoreCurrent;

beforeEach(async () => {
  vi.resetModules();
  ({ journeyStore, useCurrentStop, useIsCosmicStop, createStopStore, useStopStoreCurrent } = await import(
    "@/lib/journey/store"
  ));
});

/** Escales d'un parcours quelconque (celui de la page Tailles, par exemple). */
type SizeKey = "intro" | "sun" | "sirius-a";

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

describe("journeyStore.reset", () => {
  it("devrait ramener le voyage au repos sur la vue d'ensemble, et prévenir puisque l'escale affichée change", () => {
    const listener = vi.fn();
    journeyStore.subscribe(listener);
    journeyStore.update("saturn", "uranus", 0.2);
    journeyStore.reset();
    expect(journeyStore.initial).toBe("hero");
    expect(journeyStore.get()).toEqual({ from: "hero", to: "hero", t: 0, current: "hero" });
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe("createStopStore", () => {
  it("devrait partir au repos sur l'escale initiale, qu'il garde en mémoire", () => {
    const store = createStopStore("intro");
    expect(store.initial).toBe("intro");
    expect(store.get()).toEqual({ from: "intro", to: "intro", t: 0, current: "intro" });
  });

  it("devrait suivre le vol en silence et ne prévenir qu'au changement de l'escale affichée", () => {
    const store = createStopStore<SizeKey>("intro");
    const listener = vi.fn();
    store.subscribe(listener);
    store.update("intro", "sun", 0.3);
    expect(store.get()).toEqual({ from: "intro", to: "sun", t: 0.3, current: "intro" });
    expect(listener).not.toHaveBeenCalled();
    store.update("intro", "sun", 0.6);
    store.update("sun", "sirius-a", 0.2);
    expect(store.get()).toEqual({ from: "sun", to: "sirius-a", t: 0.2, current: "sun" });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("devrait revenir à l'état initial avec reset, et ne prévenir que si l'escale affichée change", () => {
    const store = createStopStore<SizeKey>("intro");
    const listener = vi.fn();
    store.subscribe(listener);
    store.update("intro", "sun", 0.3);
    store.reset();
    expect(store.get()).toEqual({ from: "intro", to: "intro", t: 0, current: "intro" });
    expect(listener).not.toHaveBeenCalled();
    store.update("sun", "sun", 0);
    store.reset();
    expect(store.get().current).toBe("intro");
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("devrait garder chaque parcours indépendant des autres (le voyage et la page Tailles)", () => {
    const sizes = createStopStore<SizeKey>("intro");
    sizes.update("sun", "sun", 0);
    expect(sizes.get().current).toBe("sun");
    expect(journeyStore.get().current).toBe("hero");
  });

  it("devrait fonctionner avec ses méthodes détachées (abonnement de React, lecture de la règle à chaque image)", () => {
    const { get, update, subscribe, reset } = createStopStore<SizeKey>("intro");
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);
    update("sun", "sun", 0);
    expect(get().current).toBe("sun");
    unsubscribe();
    reset();
    expect(get().current).toBe("intro");
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("useStopStoreCurrent", () => {
  afterEach(cleanup);

  it("devrait rendre l'escale affichée du parcours puis suivre ses changements", () => {
    const store = createStopStore<SizeKey>("intro");
    const { result } = renderHook(() => useStopStoreCurrent(store));
    expect(result.current).toBe("intro");
    act(() => store.update("intro", "sun", 0.8));
    expect(result.current).toBe("sun");
    act(() => store.reset());
    expect(result.current).toBe("intro");
  });

  it("devrait rendre l'escale initiale au rendu serveur, quel que soit l'état du parcours", () => {
    const store = createStopStore<SizeKey>("intro");
    store.update("sun", "sun", 0);
    const Current = () => useStopStoreCurrent(store);
    expect(renderToString(createElement(Current))).toBe("intro");
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

describe("useIsCosmicStop", () => {
  afterEach(cleanup);

  it("devrait dire si l'escale affichée est au-delà du système solaire (étoiles voisines, Voie lactée)", () => {
    const { result } = renderHook(() => useIsCosmicStop());
    expect(result.current).toBe(false);
    act(() => journeyStore.update("beyond", "stars", 0.6));
    expect(result.current).toBe(true);
    act(() => journeyStore.update("stars", "galaxy", 0.6));
    expect(result.current).toBe(true);
    act(() => journeyStore.update("galaxy", "beyond", 0.6));
    expect(result.current).toBe(false);
  });

  it("ne devrait re-rendre qu'au passage de la frontière du système solaire, pas à chaque escale", () => {
    let renders = 0;
    renderHook(() => {
      renders += 1;
      return useIsCosmicStop();
    });
    const initial = renders;
    act(() => journeyStore.update("hero", "sun", 0.6));
    act(() => journeyStore.update("sun", "mars", 0.6));
    expect(renders).toBe(initial);
    act(() => journeyStore.update("neptune", "stars", 0.6));
    act(() => journeyStore.update("stars", "galaxy", 0.6));
    expect(renders).toBe(initial + 1);
  });
});
