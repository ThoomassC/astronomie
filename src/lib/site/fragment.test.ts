import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as FragmentModule from "@/lib/site/fragment";

/**
 * Le registre est un singleton de module : chaque test recharge le module pour partir sans source,
 * quel que soit l'ordre d'exécution.
 */
let currentFragment: typeof FragmentModule.currentFragment;
let setFragmentSource: typeof FragmentModule.setFragmentSource;
let useFragmentSource: typeof FragmentModule.useFragmentSource;

beforeEach(async () => {
  vi.resetModules();
  ({ currentFragment, setFragmentSource, useFragmentSource } = await import("@/lib/site/fragment"));
});

afterEach(() => {
  cleanup();
});

describe("currentFragment", () => {
  it("devrait valoir null quand aucune page n'a déclaré de source", () => {
    expect(currentFragment()).toBeNull();
  });

  it("devrait lire la source à chaque appel, pour suivre la position affichée", () => {
    let anchor: `#${string}` = "#mars";
    setFragmentSource(() => anchor);
    expect(currentFragment()).toBe("#mars");
    anchor = "#saturne";
    expect(currentFragment()).toBe("#saturne");
  });

  it("devrait valoir null quand la source n'a pas de position à donner", () => {
    setFragmentSource(() => null);
    expect(currentFragment()).toBeNull();
  });
});

describe("setFragmentSource", () => {
  it("devrait revenir à null quand la source se retire", () => {
    const remove = setFragmentSource(() => "#saturne");
    remove();
    expect(currentFragment()).toBeNull();
  });

  it("ne devrait garder qu'une source : la dernière déclarée remplace la précédente", () => {
    setFragmentSource(() => "#saturne");
    setFragmentSource(() => "#betelgeuse");
    expect(currentFragment()).toBe("#betelgeuse");
  });

  it("ne devrait pas retirer la source suivante quand la précédente se retire après elle (page suivante montée avant)", () => {
    const removeVoyage = setFragmentSource(() => "#saturne");
    setFragmentSource(() => "#betelgeuse");
    removeVoyage();
    expect(currentFragment()).toBe("#betelgeuse");
  });

  it("devrait rester sans effet quand on retire deux fois la même source", () => {
    const remove = setFragmentSource(() => "#saturne");
    remove();
    setFragmentSource(() => "#mars");
    remove();
    expect(currentFragment()).toBe("#mars");
  });
});

describe("useFragmentSource", () => {
  it("devrait déclarer la source le temps du montage, puis la retirer", () => {
    const { unmount } = renderHook(() => useFragmentSource(() => "#saturne"));
    expect(currentFragment()).toBe("#saturne");
    unmount();
    expect(currentFragment()).toBeNull();
  });

  it("devrait lire la source du dernier rendu quand le composant se rend de nouveau", () => {
    const { rerender } = renderHook(({ anchor }: { anchor: `#${string}` }) => useFragmentSource(() => anchor), {
      initialProps: { anchor: "#mars" },
    });
    act(() => rerender({ anchor: "#saturne" }));
    expect(currentFragment()).toBe("#saturne");
  });

  it("ne devrait pas effacer une source déclarée ailleurs entre-temps, au démontage", () => {
    const { unmount } = renderHook(() => useFragmentSource(() => "#saturne"));
    act(() => {
      setFragmentSource(() => "#betelgeuse");
    });
    unmount();
    expect(currentFragment()).toBe("#betelgeuse");
  });
});
