import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { sizesStore, useCurrentSizeStop } from "@/lib/sizes/store";

afterEach(() => {
  sizesStore.reset();
});

describe("sizesStore", () => {
  it("devrait partir au repos sur l'introduction, en haut de la page", () => {
    expect(sizesStore.initial).toBe("intro");
    expect(sizesStore.get()).toEqual({ from: "intro", to: "intro", t: 0, current: "intro" });
  });

  it("devrait afficher l'étoile d'arrivée passé la moitié du vol", () => {
    sizesStore.update("sun", "sirius-a", 0.6);
    expect(sizesStore.get().current).toBe("sirius-a");
  });
});

describe("useCurrentSizeStop", () => {
  it("devrait suivre l'étoile affichée, puis revenir à l'introduction quand la page est quittée (remise à zéro)", () => {
    const { result } = renderHook(() => useCurrentSizeStop());
    expect(result.current).toBe("intro");
    act(() => sizesStore.update("betelgeuse", "vy-canis-majoris", 0.2));
    expect(result.current).toBe("betelgeuse");
    act(() => sizesStore.reset());
    expect(result.current).toBe("intro");
  });
});
