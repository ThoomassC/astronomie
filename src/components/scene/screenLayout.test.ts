import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { COMPACT_LAYOUT_QUERY, createScreenLayout, type ScreenLayoutElements } from "@/components/scene/screenLayout";
import { freeBand } from "@/lib/journey/screen";

/** iPhone 375 × 812 : mise en page compacte. */
const PHONE = { width: 375, height: 812 };
/** 1440 × 900 : grand écran. */
const DESK = { width: 1440, height: 900 };

/** Frontière navigateur : requête de la mise en page compacte, que le test bascule. */
const compactQuery = { matches: true, media: COMPACT_LAYOUT_QUERY };

/** Boîte simulée d'un élément : jsdom n'en calcule aucune. */
function stubBox(element: Element, box: { left?: number; top?: number; width?: number; height?: number }): void {
  const { left = 0, top = 0, width = 0, height = 0 } = box;
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue(new DOMRect(left, top, width, height));
}

/** Hauteur de mise en page simulée d'un élément. */
function stubOffsetHeight(element: HTMLElement, height: number): void {
  Object.defineProperty(element, "offsetHeight", { configurable: true, value: height });
}

/** Barre fixe en haut de l'écran, de 64 px. */
function fixedBar(bottom = 64): HTMLElement {
  const bar = document.createElement("header");
  bar.style.position = "fixed";
  stubBox(bar, { width: 375, height: bottom });
  document.body.append(bar);
  return bar;
}

/** Plaque repliée collée en bas de l'écran (82 px au-dessus du bas), de 200 px, large de `right` px sur grand écran. */
function stickyPlate(height = 200, right = 560): HTMLElement {
  const plate = document.createElement("article");
  plate.className = "plate";
  plate.style.position = "sticky";
  plate.style.bottom = "82px";
  stubOffsetHeight(plate, height);
  stubBox(plate, { left: 48, width: right - 48, height });
  document.body.append(plate);
  return plate;
}

/** Règle à droite du grand écran (masquée : largeur nulle). */
function railAt(left: number, width = 40): HTMLElement {
  const rail = document.createElement("nav");
  stubBox(rail, { left, top: 150, width, height: 560 });
  document.body.append(rail);
  return rail;
}

function elements(over: Partial<ScreenLayoutElements<string>> = {}): ScreenLayoutElements<string> {
  return { bar: fixedBar(), rail: null, note: null, plates: new Map([["sun", stickyPlate()]]), ...over };
}

beforeEach(() => {
  compactQuery.matches = true;
  vi.stubGlobal("matchMedia", (query: string) => (query === COMPACT_LAYOUT_QUERY ? compactQuery : { matches: false, media: query }));
});

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("createScreenLayout en mise en page compacte", () => {
  it("devrait cadrer chaque escale dans la bande libre entre la barre fixe et sa plaque collée en bas", () => {
    const layout = createScreenLayout(elements());
    layout.measure(PHONE);
    expect(layout.band("sun")).toBeNull();
    expect(layout.settle(1 / 60, false)).toBe(true);
    expect(layout.band("sun")).toEqual(freeBand(812, 64, { height: 200, bottom: 82 }));
    expect(layout.band("sirius-a")).toBeNull();
    expect(layout.zone()).toBeNull();
  });

  /*
   * La barre glisse hors de l'écran quand on descend (AutoHideBar) et revient quand on remonte : le cadrage la lit à
   * sa place de repos, sans quoi l'astre bougerait à chaque glissement.
   */
  it("devrait garder la bande sous la barre à sa place de repos quand elle glisse hors de l'écran", () => {
    const bar = document.createElement("header");
    bar.style.position = "fixed";
    bar.style.transform = "matrix(1, 0, 0, 1, 0, -64)";
    stubBox(bar, { top: -64, width: 375, height: 64 });
    const layout = createScreenLayout(elements({ bar }));
    layout.measure(PHONE);
    layout.settle(1 / 60, false);
    expect(layout.band("sun")).toEqual(freeBand(812, 64, { height: 200, bottom: 82 }));
  });

  it("devrait garder la mesure repliée d'une plaque dépliée : la caméra ne bouge pas", () => {
    const plate = stickyPlate();
    const layout = createScreenLayout(elements({ plates: new Map([["sun", plate]]) }));
    layout.measure(PHONE);
    layout.settle(1 / 60, false);
    plate.setAttribute("data-expanded", "");
    stubOffsetHeight(plate, 640);
    layout.measure(PHONE);
    expect(layout.settle(1 / 60, false)).toBe(true);
    expect(layout.band("sun")).toEqual(freeBand(812, 64, { height: 200, bottom: 82 }));
  });

  it("devrait oublier la mesure repliée quand la largeur change, la plaque dépliée n'ayant plus de bande", () => {
    const plate = stickyPlate();
    const layout = createScreenLayout(elements({ plates: new Map([["sun", plate]]) }));
    layout.measure(PHONE);
    plate.setAttribute("data-expanded", "");
    layout.measure({ width: 390, height: 812 });
    layout.settle(1 / 60, false);
    expect(layout.band("sun")).toBeNull();
  });

  it("devrait border la bande par le bas de la note visible repliée, et lui garder sa place dépliée ou suspendue", () => {
    const note = document.createElement("div");
    note.dataset.visible = "true";
    stubBox(note, { top: 64, width: 375, height: 56 });
    const layout = createScreenLayout(elements({ note }));
    const bandTop = () => {
      layout.measure(PHONE);
      layout.settle(1 / 60, true);
      return layout.band("sun")?.top;
    };
    expect(bandTop()).toBeCloseTo((120 + 8) / 812, 12);
    // Dépliée, la note s'allonge : la bande garde le bas de sa forme repliée.
    note.setAttribute("data-open", "");
    stubBox(note, { top: 64, width: 375, height: 300 });
    expect(bandTop()).toBeCloseTo((120 + 8) / 812, 12);
    // Suspendue aux escales cosmiques, elle se tait sans rendre sa place.
    note.dataset.visible = "false";
    note.setAttribute("data-suspended", "");
    expect(bandTop()).toBeCloseTo((120 + 8) / 812, 12);
    note.removeAttribute("data-suspended");
    expect(bandTop()).toBeCloseTo((64 + 8) / 812, 12);
  });

  it("ne devrait mesurer aucune bande sans barre fixe ni plaque collée (écran bas, texte très agrandi)", () => {
    const bar = fixedBar();
    bar.style.position = "static";
    const layout = createScreenLayout(elements({ bar }));
    layout.measure(PHONE);
    layout.settle(1 / 60, false);
    expect(layout.band("sun")).toBeNull();
    const loose = stickyPlate();
    loose.style.position = "static";
    const other = createScreenLayout(elements({ plates: new Map([["sun", loose]]) }));
    other.measure(PHONE);
    other.settle(1 / 60, false);
    expect(other.band("sun")).toBeNull();
  });
});

describe("createScreenLayout sur grand écran", () => {
  beforeEach(() => {
    compactQuery.matches = false;
  });

  it("devrait mesurer la zone libre entre la colonne des plaques et la règle, à 24 px de chacune", () => {
    const layout = createScreenLayout(elements({ rail: railAt(1180) }));
    layout.measure(DESK);
    expect(layout.zone()).toEqual({ left: (560 + 24) / 1440, right: (1180 - 24) / 1440 });
    layout.settle(1 / 60, false);
    expect(layout.band("sun")).toBeNull();
  });

  it("devrait aller jusqu'au bord de l'écran quand la règle est masquée", () => {
    const layout = createScreenLayout(elements({ rail: railAt(0, 0) }));
    layout.measure(DESK);
    expect(layout.zone()).toEqual({ left: (560 + 24) / 1440, right: (1440 - 24) / 1440 });
  });

  it("devrait renoncer à une zone de moins de 20 % de la largeur (fenêtre très étroite), ou sans règle", () => {
    const narrow = createScreenLayout(elements({ rail: railAt(1180), plates: new Map([["sun", stickyPlate(200, 1000)]]) }));
    narrow.measure(DESK);
    expect(narrow.zone()).toBeNull();
    const noRail = createScreenLayout(elements());
    noRail.measure(DESK);
    expect(noRail.zone()).toBeNull();
  });

  it("devrait suivre la requête de mise en page à chaque mesure (rotation, fenêtre élargie)", () => {
    const layout = createScreenLayout(elements({ rail: railAt(1180) }));
    layout.measure(DESK);
    expect(layout.zone()).not.toBeNull();
    compactQuery.matches = true;
    layout.measure(PHONE);
    layout.settle(1 / 60, false);
    expect(layout.zone()).toBeNull();
    expect(layout.band("sun")).not.toBeNull();
  });

  it("devrait suivre la requête de mise en page compacte qu'on lui donne, à la place de celle de globals.css", () => {
    const wide = "(max-width: 2000px)";
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === wide, media: query }));
    const layout = createScreenLayout(elements(), window.matchMedia(wide));
    layout.measure(DESK);
    layout.settle(1 / 60, false);
    expect(layout.band("sun")).not.toBeNull();
  });
});

describe("ScreenLayout.settle", () => {
  it("devrait faire rejoindre en douceur une bande qui change, à 1 − e^(−6·dt) par image, puis s'y poser", () => {
    const bar = fixedBar();
    const layout = createScreenLayout(elements({ bar }));
    layout.measure(PHONE);
    layout.settle(1 / 60, false);
    const before = freeBand(812, 64, { height: 200, bottom: 82 });
    const after = freeBand(812, 100, { height: 200, bottom: 82 });
    if (!before || !after) throw new Error("bandes attendues");
    stubBox(bar, { width: 375, height: 100 });
    layout.measure(PHONE);
    expect(layout.settle(0.1, false)).toBe(false);
    const follow = 1 - Math.exp(-0.6);
    expect(layout.band("sun")?.top).toBeCloseTo(before.top + (after.top - before.top) * follow, 12);
    expect(layout.band("sun")?.bottom).toBe(after.bottom);
    let frames = 0;
    while (!layout.settle(0.1, false)) frames += 1;
    expect(frames).toBeLessThan(40);
    expect(layout.band("sun")).toEqual(after);
  });

  it("devrait poser la bande en une image en mouvement réduit", () => {
    const bar = fixedBar();
    const layout = createScreenLayout(elements({ bar }));
    layout.measure(PHONE);
    layout.settle(1 / 60, true);
    stubBox(bar, { width: 375, height: 100 });
    layout.measure(PHONE);
    expect(layout.settle(1 / 60, true)).toBe(true);
    expect(layout.band("sun")).toEqual(freeBand(812, 100, { height: 200, bottom: 82 }));
  });

  it("devrait retirer aussitôt une bande qui disparaît, et rester posé sans nouvelle mesure", () => {
    const plate = stickyPlate();
    const layout = createScreenLayout(elements({ plates: new Map([["sun", plate]]) }));
    layout.measure(PHONE);
    layout.settle(1 / 60, false);
    plate.style.position = "static";
    layout.measure(PHONE);
    expect(layout.settle(1 / 60, false)).toBe(true);
    expect(layout.band("sun")).toBeNull();
    expect(layout.settle(1 / 60, false)).toBe(true);
  });
});
