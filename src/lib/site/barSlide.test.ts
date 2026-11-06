import { afterEach, describe, expect, it, vi } from "vitest";
import { restingRect, translateYOf } from "@/lib/site/barSlide";

/*
 * La scène mesure la barre haute et les plaques à leur place de repos, quelle que soit leur translation passagère.
 */

describe("translateYOf", () => {
  it.each([
    ["none", 0],
    ["", 0],
    ["matrix(1, 0, 0, 1, 0, -64)", -64],
    ["matrix(1, 0, 0, 1, 12.5, -31.25)", -31.25],
    ["matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, -72, 0, 1)", -72],
  ])("devrait lire la translation verticale de la transformation calculée « %s » (%d px)", (transform, expected) => {
    expect(translateYOf(transform)).toBe(expected);
  });
});

describe("restingRect", () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  /** Barre de 64 px, glissée de `dy` px (matrice, comme la donne le navigateur). */
  function barSlidBy(dy: number): HTMLElement {
    const bar = document.createElement("header");
    bar.style.transform = `matrix(1, 0, 0, 1, 0, ${dy})`;
    // Frontière navigateur : jsdom ne calcule aucune boîte ; celle-ci suit le glissement, comme dans la page.
    vi.spyOn(bar, "getBoundingClientRect").mockReturnValue(new DOMRect(0, dy, 375, 64));
    document.body.append(bar);
    return bar;
  }

  it("devrait mesurer la barre à sa place de repos, pendant comme après son glissement", () => {
    for (const dy of [0, -20, -64]) {
      const rect = restingRect(barSlidBy(dy));
      expect([rect.left, rect.top, rect.right, rect.bottom]).toEqual([0, 0, 375, 64]);
    }
  });
});
