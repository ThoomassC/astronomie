import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CONCEAL_AFTER_PX,
  REVEAL_AFTER_PX,
  followScroll,
  restingRect,
  shownBar,
  translateYOf,
} from "@/lib/site/barSlide";

/*
 * Barre haute du Voyage et de Tailles sur téléphone : elle glisse hors de l'écran quand on descend, revient dès qu'on
 * remonte, et reste en haut de la page. La scène, elle, la mesure à sa place de repos, quel que soit son glissement.
 */

/** Hauteur de la barre : en deçà, en haut de la page, elle reste affichée. */
const TOP = 64;

/** Défile de position en position, depuis la barre affichée au défilement `from`. */
const scrollThrough = (from: number, ...positions: number[]) =>
  positions.reduce((bar, y) => followScroll(bar, y, TOP), shownBar(from));

describe("followScroll", () => {
  it("devrait garder la barre affichée en haut de la page, même en descendant", () => {
    expect(scrollThrough(0, 20, 40, TOP).concealed).toBe(false);
  });

  it(`devrait la glisser hors de l'écran après ${CONCEAL_AFTER_PX} px de descente, pas avant`, () => {
    expect(scrollThrough(500, 500 + CONCEAL_AFTER_PX - 1).concealed).toBe(false);
    expect(scrollThrough(500, 500 + CONCEAL_AFTER_PX).concealed).toBe(true);
  });

  it("devrait cumuler une descente faite de petits pas", () => {
    expect(scrollThrough(500, 504, 508, 512, 516).concealed).toBe(true);
  });

  it("devrait la cacher dès qu'on descend sous le haut de la page, la course comptée depuis le haut", () => {
    expect(scrollThrough(0, TOP + CONCEAL_AFTER_PX).concealed).toBe(true);
  });

  it("devrait la laisser cachée tant qu'on descend", () => {
    expect(scrollThrough(500, 600, 2000, 9000).concealed).toBe(true);
  });

  it(`devrait la faire revenir dès ${REVEAL_AFTER_PX} px de remontée, pas avant`, () => {
    const hidden = scrollThrough(500, 600);
    expect(followScroll(hidden, 600 - REVEAL_AFTER_PX + 1, TOP).concealed).toBe(true);
    expect(followScroll(hidden, 600 - REVEAL_AFTER_PX, TOP).concealed).toBe(false);
  });

  it("devrait repartir de zéro à chaque changement de sens : un va-et-vient ne la cache pas", () => {
    expect(scrollThrough(500, 510, 505, 515, 510, 520).concealed).toBe(false);
  });

  it("ne devrait pas la faire revenir sur un frémissement vers le haut, au milieu d'une descente", () => {
    expect(scrollThrough(500, 600, 597, 700).concealed).toBe(true);
  });

  it("devrait la rendre en haut de la page, même d'un saut depuis le bas", () => {
    expect(scrollThrough(500, 9000, 9000 - REVEAL_AFTER_PX + 1, 0).concealed).toBe(false);
  });

  it("devrait rendre le même état quand le défilement n'a pas bougé", () => {
    const hidden = scrollThrough(500, 600);
    expect(followScroll(hidden, 600, TOP)).toBe(hidden);
  });
});

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
