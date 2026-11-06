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

/**
 * Carte fixée en haut de l'écran, sous la barre (64 px) : repliée, haute de `height` px, large de `right` px sur grand
 * écran. Sa hauteur maximale (dépliée) la mène jusqu'à la réserve du dock, à 82 px du bas d'un écran de 812 px.
 */
function fixedCard(height = 80, right = 560): HTMLElement {
  const plate = document.createElement("article");
  plate.className = "plate";
  plate.style.position = "fixed";
  plate.style.maxHeight = `${812 - 82 - 64}px`;
  stubOffsetHeight(plate, height);
  stubBox(plate, { left: 48, top: 64, width: right - 48, height });
  document.body.append(plate);
  return plate;
}

/** Carte descendue à `top` px (barre plus haute) : sa hauteur maximale raccourcit d'autant, son plancher reste. */
function moveCard(card: HTMLElement, top: number): void {
  card.style.maxHeight = `${812 - 82 - top}px`;
  stubBox(card, { left: 48, top, width: 512, height: 80 });
}

/** Bande attendue sous une carte de `height` px posée à `top` px, au-dessus de la réserve du dock (812 − 82 px). */
const bandUnder = (height = 80, top = 64) => freeBand(812, top + height, 812 - 82);

/** Règle à droite du grand écran (masquée : largeur nulle). */
function railAt(left: number, width = 40): HTMLElement {
  const rail = document.createElement("nav");
  stubBox(rail, { left, top: 150, width, height: 560 });
  document.body.append(rail);
  return rail;
}

function elements(over: Partial<ScreenLayoutElements<string>> = {}): ScreenLayoutElements<string> {
  return { bar: fixedBar(), rail: null, note: null, plates: new Map([["sun", fixedCard()]]), ...over };
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
  it("devrait cadrer chaque escale dans la bande libre entre sa carte fixée en haut et la réserve du dock", () => {
    const layout = createScreenLayout(elements());
    layout.measure(PHONE);
    expect(layout.band("sun")).toBeNull();
    expect(layout.settle(1 / 60, false)).toBe(true);
    expect(layout.band("sun")).toEqual(bandUnder());
    expect(layout.band("sirius-a")).toBeNull();
    expect(layout.zone()).toBeNull();
  });

  it("devrait mesurer chaque carte à sa hauteur repliée : un nom sur deux lignes rabaisse le haut de la bande", () => {
    const layout = createScreenLayout(elements({ plates: new Map([["sun", fixedCard()], ["mars", fixedCard(106)]]) }));
    layout.measure(PHONE);
    layout.settle(1 / 60, false);
    expect(layout.band("sun")).toEqual(bandUnder(80));
    expect(layout.band("mars")).toEqual(bandUnder(106));
  });

  /*
   * La barre glisse hors de l'écran quand on descend (AutoHideBar), la carte remonte avec elle ; elles reviennent
   * quand on remonte. Le cadrage lit la carte à sa place de repos, sans quoi l'astre bougerait à chaque glissement.
   */
  it("devrait garder la bande sous la carte à sa place de repos quand elle remonte avec la barre", () => {
    const bar = document.createElement("header");
    bar.style.position = "fixed";
    bar.style.transform = "matrix(1, 0, 0, 1, 0, -64)";
    stubBox(bar, { top: -64, width: 375, height: 64 });
    const card = fixedCard();
    card.style.transform = "matrix(1, 0, 0, 1, 0, -64)";
    stubBox(card, { left: 48, top: 0, width: 512, height: 80 });
    const layout = createScreenLayout(elements({ bar, plates: new Map([["sun", card]]) }));
    layout.measure(PHONE);
    layout.settle(1 / 60, false);
    expect(layout.band("sun")).toEqual(bandUnder());
  });

  it("devrait garder la mesure repliée d'une carte dépliée : la caméra ne bouge pas", () => {
    const plate = fixedCard();
    const layout = createScreenLayout(elements({ plates: new Map([["sun", plate]]) }));
    layout.measure(PHONE);
    layout.settle(1 / 60, false);
    plate.setAttribute("data-expanded", "");
    stubOffsetHeight(plate, 640);
    layout.measure(PHONE);
    expect(layout.settle(1 / 60, false)).toBe(true);
    expect(layout.band("sun")).toEqual(bandUnder());
  });

  it("devrait oublier la mesure repliée quand la largeur change, la carte dépliée n'ayant plus de bande", () => {
    const plate = fixedCard();
    const layout = createScreenLayout(elements({ plates: new Map([["sun", plate]]) }));
    layout.measure(PHONE);
    plate.setAttribute("data-expanded", "");
    layout.measure({ width: 390, height: 812 });
    layout.settle(1 / 60, false);
    expect(layout.band("sun")).toBeNull();
  });

  it("devrait border la bande par le haut de la note visible repliée, et lui garder sa place dépliée ou suspendue", () => {
    const note = document.createElement("div");
    note.dataset.visible = "true";
    stubBox(note, { top: 600, width: 375, height: 56 });
    const layout = createScreenLayout(elements({ note }));
    const bandBottom = () => {
      layout.measure(PHONE);
      layout.settle(1 / 60, true);
      return layout.band("sun")?.bottom;
    };
    expect(bandBottom()).toBeCloseTo((600 - 8) / 812, 12);
    // Dépliée, la note s'allonge vers le haut : la bande garde le haut de sa forme repliée.
    note.setAttribute("data-open", "");
    stubBox(note, { top: 356, width: 375, height: 300 });
    expect(bandBottom()).toBeCloseTo((600 - 8) / 812, 12);
    // Suspendue aux escales cosmiques, elle se tait sans rendre sa place.
    note.dataset.visible = "false";
    note.setAttribute("data-suspended", "");
    expect(bandBottom()).toBeCloseTo((600 - 8) / 812, 12);
    note.removeAttribute("data-suspended");
    expect(bandBottom()).toBeCloseTo((812 - 82 - 8) / 812, 12);
  });

  it("ne devrait mesurer aucune bande sans barre fixe ni carte fixe (écran bas, sans JavaScript)", () => {
    const bar = fixedBar();
    bar.style.position = "static";
    const layout = createScreenLayout(elements({ bar }));
    layout.measure(PHONE);
    layout.settle(1 / 60, false);
    expect(layout.band("sun")).toBeNull();
    const loose = fixedCard();
    loose.style.position = "relative";
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
    const narrow = createScreenLayout(elements({ rail: railAt(1180), plates: new Map([["sun", fixedCard(200, 1000)]]) }));
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
    const card = fixedCard();
    const layout = createScreenLayout(elements({ plates: new Map([["sun", card]]) }));
    layout.measure(PHONE);
    layout.settle(1 / 60, false);
    const before = bandUnder(80);
    const after = bandUnder(80, 100);
    if (!before || !after) throw new Error("bandes attendues");
    moveCard(card, 100);
    layout.measure(PHONE);
    expect(layout.settle(0.1, false)).toBe(false);
    const follow = 1 - Math.exp(-0.6);
    expect(layout.band("sun")?.top).toBeCloseTo(before.top + (after.top - before.top) * follow, 12);
    let frames = 0;
    while (!layout.settle(0.1, false)) frames += 1;
    expect(frames).toBeLessThan(40);
    expect(layout.band("sun")).toEqual(after);
  });

  it("devrait poser la bande en une image en mouvement réduit", () => {
    const card = fixedCard();
    const layout = createScreenLayout(elements({ plates: new Map([["sun", card]]) }));
    layout.measure(PHONE);
    layout.settle(1 / 60, true);
    moveCard(card, 100);
    layout.measure(PHONE);
    expect(layout.settle(1 / 60, true)).toBe(true);
    expect(layout.band("sun")).toEqual(bandUnder(80, 100));
  });

  it("devrait retirer aussitôt une bande qui disparaît, et rester posé sans nouvelle mesure", () => {
    const plate = fixedCard();
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
