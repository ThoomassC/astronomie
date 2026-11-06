import { describe, expect, it } from "vitest";
import { markerLayouts, type LabelBox } from "@/components/scene/labels";
import { nameParts, SIZES_STRINGS } from "@/components/sizes/sizes.strings";
import { labelJetOf } from "@/components/sizes/sizesObjects";
import {
  discBoxes,
  frameBoxes,
  introVeil,
  jetBoxes,
  labelOrder,
  layoutSizeLabels,
  placeLimbLabel,
  starLabelMode,
  sunRinged,
  type LabelPlacement,
  type LimbLabelSize,
  type ObjectLabelMetrics,
  type RingMarker,
  type StarLabelMode,
} from "@/components/sizes/sizesLabels";
import { LOCALES, type Locale } from "@/i18n/locales";
import { smootherstep } from "@/lib/journey/sections";
import { placeObjects } from "@/lib/sizes/layout";
import { COMPARED_OBJECTS, layoutInput, visibleShare } from "@/lib/sizes/objects";
import { scaleBarBox } from "@/lib/sizes/scaleBar";
import {
  railSideFade,
  rightEdgePx,
  screenDisc,
  sizesFlightCamera,
  sizesRestCamera,
  visibleObjectCount,
  type ScreenDisc,
  type SizesCam,
  type SizesFrameContext,
} from "@/lib/sizes/sizesCamera";

/*
 * Étiquettes de la scène des tailles : au-dessus du limbe pour un astre assez grand à l'écran, sur un anneau pour
 * un petit (dispositions du ciel profond), anneau « ici » pour le Soleil quand il n'est plus qu'un point. Aucune ne
 * recouvre une autre étiquette, un astre, la barre, la règle, la plaque ou l'échelle graphique, ni ne sort de la vue.
 */

const overlaps = (a: LabelBox, b: LabelBox) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];

describe("starLabelMode", () => {
  it.each([
    [30, null, "limb"],
    [24, "ring", "limb"],
    [20, null, "ring"],
    [20, "limb", "limb"],
    [17.9, "limb", "ring"],
    [1, null, "ring"],
  ] as const)(
    "devrait étiqueter un astre de %f px de diamètre, après « %s », sur le mode %s (limbe dès 24 px, quitté sous 18 px)",
    (diameterPx, previous, mode) => {
      expect(starLabelMode(diameterPx, previous)).toBe(mode);
    },
  );
});

describe("discBoxes", () => {
  it("devrait couvrir un grand disque d'une croix de deux boîtes, sans en réserver les coins (Antarès A : centre 150 ; 300, rayon 110)", () => {
    const [wide, tall] = discBoxes(150, 300, 110);
    expect(wide).toEqual([40, expect.closeTo(220.8, 9), 260, expect.closeTo(379.2, 9)]);
    expect(tall).toEqual([expect.closeTo(70.8, 9), 190, expect.closeTo(229.2, 9), 410]);
  });

  it.each([0, 20, 45, 70, 90, 135, 200, 300])("devrait contenir chaque point du bord du disque (%i°)", (degrees) => {
    const angle = (degrees * Math.PI) / 180;
    const point = [150 + 110 * Math.cos(angle) * 0.999, 300 + 110 * Math.sin(angle) * 0.999];
    const inside = (box: LabelBox) => point[0] >= box[0] && point[0] <= box[2] && point[1] >= box[1] && point[1] <= box[3];
    expect(discBoxes(150, 300, 110).some(inside)).toBe(true);
  });
});

describe("placeLimbLabel", () => {
  const VIEW = { width: 1000, height: 800 };
  const SIZE: LimbLabelSize = { width: 120, height: 24, shortWidth: 50 };

  it("devrait centrer l'étiquette complète au-dessus du limbe, à 8 px", () => {
    expect(placeLimbLabel({ x: 500, y: 400, upPx: 100, downPx: 100, depth: 0.5 }, SIZE, VIEW, [])).toEqual({
      box: [440, 268, 560, 292],
      short: false,
    });
  });

  it("devrait la poser au-dessous du limbe quand le dessus passe sous la barre haute", () => {
    expect(placeLimbLabel({ x: 500, y: 150, upPx: 100, downPx: 100, depth: 0.5 }, SIZE, VIEW, [])).toEqual({
      box: [440, 258, 560, 282],
      short: false,
    });
  });

  it("devrait la poser au-dessous du limbe quand le dessus recouvre une boîte déjà occupée", () => {
    const occupied = [[400, 250, 600, 300]] as const;
    expect(placeLimbLabel({ x: 500, y: 400, upPx: 100, downPx: 100, depth: 0.5 }, SIZE, VIEW, occupied)).toEqual({
      box: [440, 508, 560, 532],
      short: false,
    });
  });

  it("ne devrait rien poser quand ni le dessus ni le dessous ne tiennent dans la vue (astre plus grand que l'écran)", () => {
    expect(placeLimbLabel({ x: 500, y: 400, upPx: 500, downPx: 500, depth: 0.5 }, SIZE, VIEW, [])).toBeNull();
  });

  it("devrait la glisser dans la vue quand, centrée, elle déborderait d'un côté : toujours au-dessus de l'astre", () => {
    expect(placeLimbLabel({ x: 20, y: 400, upPx: 100, downPx: 100, depth: 0.5 }, SIZE, VIEW, [])?.box).toEqual([8, 268, 128, 292]);
    expect(placeLimbLabel({ x: 980, y: 400, upPx: 100, downPx: 100, depth: 0.5 }, SIZE, VIEW, [])?.box).toEqual([872, 268, 992, 292]);
  });

  /*
   * Téléphone, 375 × 812, repos sur VY Canis Majoris : diamètre ≈ 115 px, centre vers x ≈ 95 px. Centrée, l'étiquette
   * (« VY Canis Majoris · 1 420 R☉ », ≈ 200 px) commencerait hors de la vue.
   */
  it("devrait poser au-dessus de l'astre l'étiquette d'une supergéante cadrée à gauche d'un téléphone", () => {
    const phone = { width: 375, height: 812 };
    const placed = placeLimbLabel({ x: 95, y: 300, upPx: 57.5, downPx: 57.5, depth: 0.5 }, { width: 200, height: 20, shortWidth: 120 }, phone, []);
    expect(placed).toEqual({ box: [8, 214.5, 208, 234.5], short: false });
  });

  it("ne devrait rien poser quand le centre de l'astre sort de la vue : l'étiquette ne le désignerait plus", () => {
    expect(placeLimbLabel({ x: 4, y: 400, upPx: 100, downPx: 100, depth: 0.5 }, SIZE, VIEW, [])).toBeNull();
    expect(placeLimbLabel({ x: 996, y: 400, upPx: 100, downPx: 100, depth: 0.5 }, SIZE, VIEW, [])).toBeNull();
  });

  it("devrait passer au nom seul quand l'étiquette complète est plus large que la vue", () => {
    expect(placeLimbLabel({ x: 500, y: 400, upPx: 100, downPx: 100, depth: 0.5 }, { ...SIZE, width: 990 }, VIEW, [])).toEqual({
      box: [475, 268, 525, 292],
      short: true,
    });
  });

  it("ne devrait rien poser pour un astre derrière la caméra", () => {
    expect(placeLimbLabel({ x: 500, y: 400, upPx: 100, downPx: 100, depth: 1.2 }, SIZE, VIEW, [])).toBeNull();
  });

  /*
   * La plainte : téléphone 375 × 812, Antarès A (centre 150 ; 300, rayon 110) réservé par sa croix ; Rigel (centre
   * 318 ; 300, rayon 12) à sa droite. Complète (120 px), l'étiquette de Rigel, au-dessus comme au-dessous, mordrait le
   * disque d'Antarès A ; le nom seul (44 px) tient au-dessus.
   */
  it("devrait se replier sur le nom seul plutôt que de recouvrir le grand disque voisin (Rigel à côté d'Antarès A)", () => {
    const phone = { width: 375, height: 812 };
    const occupied = discBoxes(150, 300, 110);
    const placed = placeLimbLabel({ x: 318, y: 300, upPx: 12, downPx: 12, depth: 0.5 }, { width: 120, height: 20, shortWidth: 44 }, phone, occupied);
    expect(placed).toEqual({ box: [296, 260, 340, 280], short: true });
  });

  /*
   * Téléphone en paysage, repos sur Sagittarius A* : l'astre est à 50 px du bord de la zone libre, à droite de la place
   * des plaques. Centrée, l'étiquette mordrait la plaque ; elle glisse à droite, toujours au-dessus du centre.
   */
  it("devrait glisser l'étiquette le long d'une boîte occupée plutôt que de la recouvrir, toujours au-dessus de l'astre", () => {
    const plates = [[0, 0, 553.7, 390]] as const;
    const placed = placeLimbLabel({ x: 603, y: 195, upPx: 36, downPx: 36, depth: 0.5 }, { width: 189, height: 20, shortWidth: 117 }, { width: 844, height: 390 }, plates);
    expect(placed).toEqual({ box: [553.7, 131, 742.7, 151], short: false });
  });

  it("ne devrait pas glisser au point de ne plus couvrir le centre de l'astre", () => {
    const plates = [[0, 0, 610, 390]] as const;
    const placed = placeLimbLabel({ x: 603, y: 195, upPx: 36, downPx: 36, depth: 0.5 }, { width: 189, height: 20, shortWidth: 117 }, { width: 844, height: 390 }, plates);
    expect(placed).toBeNull();
  });

  /*
   * Trou noir : son encombrement va bien au-delà de ce qui se voit (anneau, disque). L'étiquette se pose à 8 px de ce qui
   * se voit, au-dessus (upPx) ou au-dessous (downPx) de son centre.
   */
  it("devrait poser l'étiquette à 8 px au-dessus de ce qui se voit, et au-dessous de même quand le dessus est pris", () => {
    expect(placeLimbLabel({ x: 500, y: 400, upPx: 30, downPx: 50, depth: 0.5 }, SIZE, VIEW, [])?.box).toEqual([440, 338, 560, 362]);
    const occupied = [[400, 330, 600, 365]] as const;
    expect(placeLimbLabel({ x: 500, y: 400, upPx: 30, downPx: 50, depth: 0.5 }, SIZE, VIEW, occupied)?.box).toEqual([
      440, 458, 560, 482,
    ]);
  });

  it("devrait poser le nom seul au-dessous quand le dessus est pris aussi", () => {
    const occupied = [[0, 200, 1000, 300]] as const;
    expect(placeLimbLabel({ x: 500, y: 400, upPx: 100, downPx: 100, depth: 0.5 }, { ...SIZE, width: 990 }, VIEW, occupied)).toEqual({
      box: [475, 508, 525, 532],
      short: true,
    });
  });
});

describe("labelOrder", () => {
  it.each([
    [8, [8, 7, 1, 9, 6, 5, 4, 3, 2, 0]],
    [0, [0, 1, 9, 8, 7, 6, 5, 4, 3, 2]],
    [1, [1, 0, 9, 8, 7, 6, 5, 4, 3, 2]],
    [2, [2, 1, 9, 8, 7, 6, 5, 4, 3, 0]],
  ])(
    "devrait poser l'astre affiché (%i), le précédent, le Soleil, puis les autres du plus grand au plus petit",
    (current, order) => {
      expect(labelOrder(current, 1, 10)).toEqual(order);
    },
  );
});

describe("sunRinged", () => {
  it.each([
    [13.9, true],
    [14, false],
    [0.2, true],
  ])("devrait cercler le Soleil de l'anneau « ici » sous 14 px de diamètre (%f px : %s)", (diameterPx, ringed) => {
    expect(sunRinged(diameterPx)).toBe(ringed);
  });
});

describe("jetBoxes", () => {
  const VIEW = { width: 1000, height: 800 };
  const CTX = { fovDeg: 36 };
  /** Pixels par unité de tangente : à la profondeur `dist`, 1 r_s (1 R☉ ici) fait F / dist px. */
  const F = 800 / (2 * Math.tan((18 * Math.PI) / 180));
  /** Jet couché dans le plan des astres, vers la droite. */
  const JET = { axis: { x: 1, y: 0, z: 0 }, lengthRs: 40, widthRs: 0.25, spread: 0 };
  const FAR: SizesCam = { tx: 0, dist: 100, offX: 0, offY: 0 };

  it("devrait couvrir le jet du centre du trou noir à son bout, de boîtes élargies de deux largeurs", () => {
    const boxes = jetBoxes({ x: 0, rs: 1 }, JET, FAR, CTX, VIEW);
    const half = (2 * 0.25 * F) / 100;
    expect(Math.min(...boxes.map((box) => box[0]))).toBeCloseTo(500 - half, 6);
    expect(Math.max(...boxes.map((box) => box[2]))).toBeCloseTo(500 + (40 * F) / 100 + half, 6);
    for (const box of boxes) {
      expect(box[1]).toBeCloseTo(400 - half, 6);
      expect(box[3]).toBeCloseTo(400 + half, 6);
    }
  });

  it("devrait s'élargir avec le jet : deux largeurs au bout, widthRs + lengthRs × spread", () => {
    const boxes = jetBoxes({ x: 0, rs: 1 }, { ...JET, spread: 0.02 }, FAR, CTX, VIEW);
    expect(Math.max(...boxes.map((box) => box[3])) - 400).toBeCloseTo((2 * (0.25 + 40 * 0.02) * F) / 100, 6);
  });

  it("devrait couper la part du jet derrière la caméra, et borner ses boîtes à la vue", () => {
    const near: SizesCam = { tx: 0, dist: 20, offX: 0, offY: 0 };
    const boxes = jetBoxes({ x: 0, rs: 1 }, { ...JET, axis: { x: 0.6, y: 0, z: 0.8 } }, near, CTX, VIEW);
    expect(boxes.length).toBeGreaterThan(0);
    for (const box of boxes) {
      expect(box.every(Number.isFinite)).toBe(true);
      expect(box[0]).toBeGreaterThanOrEqual(0);
      expect(box[1]).toBeGreaterThanOrEqual(0);
      expect(box[2]).toBeLessThanOrEqual(1000);
      expect(box[3]).toBeLessThanOrEqual(800);
      expect(box[2]).toBeGreaterThan(box[0]);
      expect(box[3]).toBeGreaterThan(box[1]);
    }
  });

  it("ne devrait rien réserver d'un jet tout entier hors de la vue", () => {
    expect(jetBoxes({ x: -5000, rs: 1 }, JET, FAR, CTX, VIEW)).toEqual([]);
  });
});

describe("frameBoxes", () => {
  const VIEW = { width: 1000, height: 800 };

  it("devrait réserver la barre et la règle mesurées, l'échelle graphique, puis la place des plaques à gauche de la zone libre", () => {
    expect(frameBoxes(VIEW, [[0, 0, 1000, 70]], { left: 0.4, right: 0.8 }, null, [500, 600, 700, 650])).toEqual([
      [0, 0, 1000, 70],
      [500, 600, 700, 650],
      [0, 0, 400, 800],
    ]);
  });

  it("devrait réserver, en mise en page compacte, la carte fixée en haut au-dessus de la bande libre, et le bas sous elle", () => {
    expect(frameBoxes(VIEW, [], null, { top: 0.1, bottom: 0.6 }, null)).toEqual([
      [0, 0, 1000, 80 - 8],
      [0, 480, 1000, 800],
    ]);
  });
});

/*
 * Mesures d'étiquettes, modèle de la feuille de style (`.lbl.deep`, Atkinson Hyperlegible Next à 13 px) : 7,2 px par
 * caractère, chasse moyenne majorée ; pastille de texte de 7,2 px de marge et 1 px de bord de chaque côté, 20,2 px de
 * haut ; repère de 12 px, à 3,2 px du bord gauche, 4,8 px avant le texte, centré sur la ligne.
 */
const CHAR_PX = 7.2;
const PILL_PX = 2 * 7.2 + 2;
const TEXT_HEIGHT = 20.2;

/** `core` : ce que garde la forme courte, le nom court d'un astre au nom long (`nameParts`), sans la taille. */
function metricsFor(name: string, size: string, core: string = name): ObjectLabelMetrics {
  const detail = ` · ${size}`;
  const width = (name.length + detail.length) * CHAR_PX + PILL_PX;
  const ring: RingMarker = {
    layouts: markerLayouts({
      dotX: 9.2,
      dotY: 15.7,
      dotWidth: 12,
      textX: 20,
      textY: 5.6,
      textWidth: width,
      textHeight: TEXT_HEIGHT,
      detailWidth: (name.length - core.length + detail.length) * CHAR_PX,
    }),
    dotY: 15.7,
    dotWidth: 12,
    dotHeight: 12,
  };
  return { ring, limb: { width, height: TEXT_HEIGHT, shortWidth: core.length * CHAR_PX + PILL_PX } };
}

/** Anneau « ici » du Soleil : texte centré au-dessus d'un anneau de 14 px. */
function sunMarkerFor(locale: Locale): RingMarker {
  const width = (`${SIZES_STRINGS[locale].names.sun} · 1 R☉`.length) * CHAR_PX + PILL_PX;
  return {
    layouts: markerLayouts({
      dotX: width / 2,
      dotY: TEXT_HEIGHT + 3.2 + 7,
      dotWidth: 14,
      textX: 0,
      textY: 0,
      textWidth: width,
      textHeight: TEXT_HEIGHT,
      detailWidth: 0,
    }),
    dotY: TEXT_HEIGHT + 3.2 + 7,
    dotWidth: 14,
    dotHeight: 14,
  };
}

const OBJECTS = placeObjects(COMPARED_OBJECTS.map(layoutInput));
const SUN = COMPARED_OBJECTS.findIndex((object) => object.key === "sun");
/** Ce qui se voit de chaque astre au-dessus et au-dessous de son centre, en part de son encombrement. */
const REACH = COMPARED_OBJECTS.map(visibleShare);
/** Jet de chaque trou noir qui en a un (M87*), que le moteur réserve. */
const JETS = COMPARED_OBJECTS.map((object) => (object.kind === "black-hole" ? labelJetOf(object.key) : null));

/**
 * Ce qui se voit d'un astre à l'écran : la croix de son disque ; pour un trou noir, celle de son anneau, ou, pour un
 * disque vu par la tranche (Cygnus X-1, plus haut que bas), la bande de son encombrement entre son haut et son bas.
 */
function visibleBoxes(index: number, disc: ScreenDisc): LabelBox[] {
  const { up, down } = REACH[index];
  if (up === down) return discBoxes(disc.x, disc.y, up * disc.radius);
  return [[disc.x - disc.radius, disc.y - up * disc.radius, disc.x + disc.radius, disc.y + down * disc.radius]];
}

/**
 * Vues de référence de la demande, avec ce qui les borde dans la page : téléphones en portrait (mise en page compacte,
 * bande libre entre la barre et la plaque repliée), téléphone en paysage (zone libre étroite à droite des plaques,
 * règle remplacée par le menu), grand écran (zone libre entre les plaques et la règle).
 */
const VIEWS = [
  {
    name: "375 × 812",
    view: { width: 375, height: 812 },
    compact: true,
    ctx: { aspect: 375 / 812, fovDeg: 50, band: { top: 0.09, bottom: 0.62 }, zone: null },
  },
  {
    name: "390 × 844",
    view: { width: 390, height: 844 },
    compact: true,
    ctx: { aspect: 390 / 844, fovDeg: 50, band: { top: 0.085, bottom: 0.628 }, zone: null },
  },
  {
    name: "844 × 390",
    view: { width: 844, height: 390 },
    compact: false,
    ctx: { aspect: 844 / 390, fovDeg: 36, band: null, zone: { left: 0.656, right: 0.972 } },
  },
  {
    name: "1 440 × 900",
    view: { width: 1440, height: 900 },
    compact: false,
    ctx: { aspect: 1440 / 900, fovDeg: 36, band: null, zone: { left: 0.45, right: 0.85 } },
  },
] as const satisfies readonly { name: string; view: { width: number; height: number }; compact: boolean; ctx: SizesFrameContext }[];

type View = (typeof VIEWS)[number];

/** Barre haute (76 px), et règle à droite de la zone libre sur grand écran (la page les mesure). */
function measuredBoxes({ view, ctx }: View): LabelBox[] {
  const boxes: LabelBox[] = [[0, 0, view.width, 76]];
  if (ctx.zone) boxes.push([ctx.zone.right * view.width + 24, 0, view.width, view.height]);
  return boxes;
}

/** Étiquettes d'une image : caméra `cam`, les `drawn` plus petits astres dessinés, astre affiché `current`. */
function layoutAt(view: View, locale: Locale, cam: SizesCam, drawn: number, current: number) {
  const discs: ScreenDisc[] = OBJECTS.slice(0, drawn).map((object) => screenDisc(object, cam, view.ctx, view.view));
  const zone = view.ctx.zone ? { left: view.ctx.zone.left * view.view.width, right: view.ctx.zone.right * view.view.width } : null;
  // Comme le moteur : sur grand écran, un astre qui déborde vers la règle s'efface ; tout à fait effacé, il n'est plus dessiné.
  const fits = OBJECTS.slice(0, drawn).map((object) =>
    zone ? railSideFade(rightEdgePx(object, cam, view.ctx, view.view.width), zone.right) : 1,
  );
  const scale = scaleBarBox({ compact: view.compact, zone, view: view.view, barBottom: 76, discs, measured: null });
  const reserved = frameBoxes(view.view, measuredBoxes(view), view.ctx.zone, view.ctx.band, scale);
  // Comme le moteur : le jet d'un trou noir dessiné est réservé, aucune étiquette ne le coupe.
  OBJECTS.slice(0, drawn).forEach((object, i) => {
    const jet = JETS[i];
    if (!jet || fits[i] === 0) return;
    reserved.push(...jetBoxes({ x: object.x, rs: COMPARED_OBJECTS[i].radiusSolar }, jet, cam, view.ctx, view.view));
  });
  const t = SIZES_STRINGS[locale];
  const metrics = COMPARED_OBJECTS.map((object) => metricsFor(t.names[object.key], t.size(object), nameParts(t, object.key).core));
  const modes: (StarLabelMode | null)[] = COMPARED_OBJECTS.map(() => null);
  const layout = layoutSizeLabels({
    discs,
    count: COMPARED_OBJECTS.length,
    current,
    sun: SUN,
    metrics,
    sunMarker: sunMarkerFor(locale),
    view: view.view,
    reserved,
    modes,
    fits,
    reach: REACH,
  });
  return { layout, discs, reserved, fits };
}

/** Boîtes de texte posées d'une image. */
const placedBoxes = (placements: readonly LabelPlacement[]) =>
  placements.flatMap((placement) => (placement.form === "hidden" ? [] : [placement.box]));

/** Ce qu'une image ne doit jamais montrer : texte hors de la vue, sur un autre texte, sur une boîte réservée, sur un astre. */
function faults(view: View, layoutResult: ReturnType<typeof layoutAt>): string[] {
  const { layout, discs, reserved, fits } = layoutResult;
  const placements = [...layout.objects, layout.sun];
  const boxes = placedBoxes(placements);
  const found: string[] = [];
  // Un astre effacé près de la règle n'est pas dessiné : son étiquette non plus.
  layout.objects.forEach((placement, i) => {
    if (placement.form !== "hidden" && fits[i] === 0) found.push(`étiquette de ${COMPARED_OBJECTS[i].key}, effacé`);
  });
  if (layout.sun.form !== "hidden" && fits[SUN] === 0) found.push("anneau « ici » du Soleil, effacé");
  boxes.forEach((box, i) => {
    if (box[0] < 0 || box[2] > view.view.width || box[1] < 0 || box[3] > view.view.height) found.push(`hors de la vue ${box}`);
    boxes.slice(i + 1).forEach((other) => {
      if (overlaps(box, other)) found.push(`textes superposés ${box} / ${other}`);
    });
    for (const other of reserved) if (overlaps(box, other)) found.push(`sur une boîte réservée ${box} / ${other}`);
  });
  /*
   * Un texte ne recouvre rien de ce qui se voit d'un astre dessiné de 24 px ou plus (visibleBoxes ; le jet d'un trou
   * noir est parmi les boîtes réservées) ; un anneau se pose sur son propre point, petit.
   */
  layout.objects.forEach((placement, i) => {
    if (placement.form === "hidden") return;
    discs.forEach((disc, j) => {
      if (2 * disc.radius < 24 || fits[j] === 0) return;
      for (const shape of visibleBoxes(j, disc)) {
        if (overlaps(placement.box, shape)) found.push(`texte de ${COMPARED_OBJECTS[i].key} sur ${COMPARED_OBJECTS[j].key}`);
      }
    });
  });
  return found;
}

describe("étiquettes sur les vues de référence, au repos sur chaque escale", () => {
  const CASES = VIEWS.flatMap((view) =>
    LOCALES.flatMap((locale) => OBJECTS.map((object, i) => [view.name, locale, object.key, view, i] as const)),
  );

  it.each(CASES)("ne devrait couper ni superposer aucun texte (%s, %s, repos sur %s)", (_name, locale, key, view, i) => {
    const cam = sizesRestCamera(OBJECTS, key, view.ctx);
    expect(faults(view, layoutAt(view, locale, cam, visibleObjectCount(i, i, 0), i))).toEqual([]);
  });

  it.each(CASES)("devrait nommer l'astre affiché (%s, %s, repos sur %s)", (_name, locale, key, view, i) => {
    const cam = sizesRestCamera(OBJECTS, key, view.ctx);
    const { layout } = layoutAt(view, locale, cam, visibleObjectCount(i, i, 0), i);
    const shown = i === SUN && layout.sun.form !== "hidden" ? layout.sun : layout.objects[i];
    expect(shown.form).not.toBe("hidden");
  });
});

/*
 * Au repos sur un trou noir, son étiquette se pose à 8 px de ce qui se voit (anneau, disque, ombre), au-dessus ou
 * au-dessous, et non au bord de son encombrement (10 r_s), bien plus loin.
 */
describe("étiquettes des trous noirs, au repos sur chacun", () => {
  const HOLES = OBJECTS.flatMap((object, i) => (COMPARED_OBJECTS[i].kind === "black-hole" ? [[object.key, i] as const] : []));
  const CASES = VIEWS.flatMap((view) =>
    LOCALES.flatMap((locale) => HOLES.map(([key, i]) => [view.name, locale, key, view, i] as const)),
  );

  it.each(CASES)("devrait poser l'étiquette à 8 px de ce qui se voit (%s, %s, repos sur %s)", (_name, locale, key, view, i) => {
    const cam = sizesRestCamera(OBJECTS, key, view.ctx);
    const { layout, discs } = layoutAt(view, locale, cam, visibleObjectCount(i, i, 0), i);
    const placement = layout.objects[i];
    if (placement.form !== "limb") throw new Error(`étiquette de ${key} : ${placement.form}`);
    const { up, down } = REACH[i];
    const above = discs[i].y - up * discs[i].radius - placement.box[3];
    const below = placement.box[1] - (discs[i].y + down * discs[i].radius);
    expect(Math.min(Math.abs(above - 8), Math.abs(below - 8))).toBeCloseTo(0, 9);
  });
});

describe("étiquettes sur les vues de référence, pendant les vols", () => {
  // Un pas de 5 % : un astre ne reste effacé près de la règle que sur 12 à 16 % d'un vol.
  const STEPS = Array.from({ length: 19 }, (_, k) => (k + 1) / 20);
  const CASES = VIEWS.flatMap((view) => OBJECTS.slice(0, -1).map((object, i) => [view.name, object.key, view, i] as const));

  it.each(CASES)("ne devrait couper ni superposer aucun texte (%s, vol depuis %s)", (_name, key, view, i) => {
    const from = sizesRestCamera(OBJECTS, key, view.ctx);
    const to = sizesRestCamera(OBJECTS, OBJECTS[i + 1].key, view.ctx);
    for (const t of STEPS) {
      const cam = sizesFlightCamera(from, to, smootherstep(t));
      const current = t < 0.5 ? i : i + 1;
      for (const locale of LOCALES) {
        expect(faults(view, layoutAt(view, locale, cam, visibleObjectCount(i, i + 1, t), current)), `${locale}, t = ${t}`).toEqual([]);
      }
    }
  });
});

describe("layoutSizeLabels", () => {
  const VIEW = { width: 1000, height: 800 };
  const metrics = metricsFor("Rigel", "74 R☉");

  /*
   * Vol de Rigel vers Antarès A sur grand écran, à mi-chemin : Sagittarius A*, effacé contre la règle, n'est plus
   * dessiné ; son étiquette ne doit pas rester seule, collée à la règle.
   */
  it("ne devrait ni réserver ni étiqueter un astre tout à fait effacé près de la règle, et oublier sa disposition", () => {
    const modes: (StarLabelMode | null)[] = ["ring", "ring"];
    const layout = layoutSizeLabels({
      discs: [
        { x: 500, y: 400, radius: 100 },
        { x: 900, y: 400, radius: 5 },
      ],
      count: 2,
      current: 0,
      sun: 5,
      metrics: [metrics, metrics],
      sunMarker: null,
      view: VIEW,
      reserved: [],
      modes,
      fits: [1, 0],
    });
    expect(layout.objects[0].form).toBe("limb");
    expect(layout.objects[1]).toEqual({ form: "hidden" });
    expect(modes[1]).toBeNull();
  });

  /*
   * M87* au repos sur grand écran : encombrement de 10 r_s (200 px de rayon), anneau de 3,7 r_s. Son étiquette se pose à
   * 8 px au-dessus de l'anneau, dans l'encombrement : sa propre croix ne l'en empêche pas.
   */
  it("devrait poser l'étiquette d'un trou noir à 8 px au-dessus de ce qui se voit, dans son propre encombrement", () => {
    const layout = layoutSizeLabels({
      discs: [{ x: 500, y: 400, radius: 200 }],
      count: 1,
      current: 0,
      sun: 5,
      metrics: [metrics],
      sunMarker: null,
      view: VIEW,
      reserved: [],
      modes: [null],
      reach: [{ up: 0.37, down: 0.37 }],
    });
    const placement = layout.objects[0];
    if (placement.form !== "limb") throw new Error(placement.form);
    expect(placement.box[3]).toBeCloseTo(400 - 74 - 8, 9);
  });

  /*
   * Une étoile tout près d'un trou noir, au bord droit de la vue : son texte à droite n'y tient pas, à gauche il
   * mordrait l'encombrement du trou noir, que les autres étiquettes laissent libre ; le nom seul, à droite, tient.
   */
  it("devrait garder l'encombrement d'un trou noir aux étiquettes des autres astres", () => {
    const layout = layoutSizeLabels({
      discs: [
        { x: 720, y: 400, radius: 5 },
        { x: 500, y: 400, radius: 200 },
      ],
      count: 2,
      current: 1,
      sun: 5,
      metrics: [metrics, metrics],
      sunMarker: null,
      view: { width: 800, height: 800 },
      reserved: [],
      modes: [null, null],
      reach: [
        { up: 1, down: 1 },
        { up: 0.37, down: 0.37 },
      ],
    });
    expect(layout.objects[1].form).toBe("limb");
    const star = layout.objects[0];
    if (star.form === "hidden") throw new Error("étoile sans étiquette");
    for (const cross of discBoxes(500, 400, 200)) expect(overlaps(star.box, cross)).toBe(false);
  });

  it("devrait encore étiqueter un astre en partie effacé : il reste dessiné", () => {
    const layout = layoutSizeLabels({
      discs: [{ x: 500, y: 400, radius: 5 }],
      count: 1,
      current: 0,
      sun: 5,
      metrics: [metrics],
      sunMarker: null,
      view: VIEW,
      reserved: [],
      modes: [null],
      fits: [0.3],
    });
    expect(layout.objects[0].form).toBe("ring");
  });

  it("ne devrait poser aucune étiquette sur un astre qui n'est pas dessiné, et oublier sa disposition", () => {
    const modes: (StarLabelMode | null)[] = ["limb", "limb"];
    const layout = layoutSizeLabels({
      discs: [{ x: 500, y: 400, radius: 100 }],
      count: 2,
      current: 0,
      sun: 5,
      metrics: [metrics, metrics],
      sunMarker: null,
      view: VIEW,
      reserved: [],
      modes,
    });
    expect(layout.objects[0].form).toBe("limb");
    expect(layout.objects[1]).toEqual({ form: "hidden" });
    expect(modes).toEqual(["limb", null]);
  });

  it("devrait poser un petit astre sur son anneau, son propre point n'empêchant pas la pose", () => {
    const layout = layoutSizeLabels({
      discs: [{ x: 500, y: 400, radius: 9 }],
      count: 1,
      current: 0,
      sun: 5,
      metrics: [metrics],
      sunMarker: null,
      view: VIEW,
      reserved: [],
      modes: [null],
    });
    expect(layout.objects[0]).toMatchObject({ form: "ring", mirrored: false, short: false });
  });

  it("devrait poser l'anneau « ici » du Soleil devenu un point, et rien sur son étiquette ordinaire", () => {
    const layout = layoutSizeLabels({
      discs: [{ x: 500, y: 400, radius: 2 }],
      count: 1,
      current: 0,
      sun: 0,
      metrics: [metrics],
      sunMarker: sunMarkerFor("fr"),
      view: VIEW,
      reserved: [],
      modes: [null],
    });
    expect(layout.objects[0]).toEqual({ form: "hidden" });
    expect(layout.sun.form).toBe("ring");
  });

  it("ne devrait poser aucune étiquette quand la caméra est dans un astre (rayon infini)", () => {
    const layout = layoutSizeLabels({
      discs: [{ x: 500, y: 400, radius: Infinity }, { x: 900, y: 400, radius: 5 }],
      count: 2,
      current: 0,
      sun: 5,
      metrics: [metrics, metrics],
      sunMarker: null,
      view: VIEW,
      reserved: [],
      modes: [null, null],
    });
    expect(layout.objects.map((placement) => placement.form)).toEqual(["hidden", "hidden"]);
  });
});

/*
 * Texte de l'introduction (titre, promesse, bouton de départ), qui défile au-dessus de la scène : aucune étiquette ne
 * s'affiche dessous (« Cygnus X-1 · 163 km » sur le titre, en 375 × 812). Il ne déplace rien : l'étiquette qu'il
 * recouvrirait se masque à sa place, gardée aux autres, et revient à la même place quand il est passé.
 */
describe("layoutSizeLabels sous le texte de l'introduction", () => {
  const VIEW = { width: 1000, height: 800 };
  const metrics = metricsFor("Rigel", "74 R☉");
  /** Un grand astre (étiquette au-dessus du limbe) et un petit, à sa droite (étiquette sur son anneau). */
  const input = (veils?: readonly LabelBox[]) =>
    layoutSizeLabels({
      discs: [
        { x: 400, y: 400, radius: 100 },
        { x: 750, y: 400, radius: 5 },
      ],
      count: 2,
      current: 0,
      sun: 5,
      metrics: [metrics, metrics],
      sunMarker: null,
      view: VIEW,
      reserved: [],
      modes: [null, null],
      veils,
    });
  const boxOf = (placement: LabelPlacement) => {
    if (placement.form === "hidden") throw new Error("étiquette masquée");
    return placement.box;
  };

  it("devrait masquer l'étiquette que recouvrirait le texte, sans rien déplacer d'autre", () => {
    const free = input();
    const limb = boxOf(free.objects[0]);
    const veiled = input([[limb[0] + 10, limb[1] - 30, limb[2] - 10, limb[1] + 4]]);
    expect(veiled.objects[0]).toEqual({ form: "hidden" });
    expect(veiled.objects[1]).toEqual(free.objects[1]);
  });

  it("ne devrait masquer aucune étiquette que le texte ne recouvre pas", () => {
    const free = input();
    expect(input([[0, 0, 1000, 120]])).toEqual(free);
  });

  it("devrait masquer l'étiquette d'un petit astre dont le repère passe sous le texte, même si son texte en sort", () => {
    const free = input();
    expect(free.objects[1].form).toBe("ring");
    const veiled = input([[745, 395, 755, 405]]);
    expect(veiled.objects[1]).toEqual({ form: "hidden" });
  });

  it("devrait masquer de même l'anneau « ici » du Soleil devenu un point", () => {
    const sunIn = (veils?: readonly LabelBox[]) =>
      layoutSizeLabels({
        discs: [{ x: 500, y: 400, radius: 2 }],
        count: 1,
        current: 0,
        sun: 0,
        metrics: [metrics],
        sunMarker: sunMarkerFor("fr"),
        view: VIEW,
        reserved: [],
        modes: [null],
        veils,
      });
    expect(sunIn().sun.form).toBe("ring");
    expect(sunIn([[490, 390, 510, 410]]).sun).toEqual({ form: "hidden" });
  });
});

describe("introVeil", () => {
  /** Texte de l'introduction, en px du document : de 280 à 580 px, sur la largeur d'un téléphone. */
  const TEXT: LabelBox = [16, 280, 359, 580];

  it("devrait suivre le texte à l'écran, décalé du défilement", () => {
    expect(introVeil(TEXT, 0, 812)).toEqual([16, 280, 359, 580]);
    expect(introVeil(TEXT, 500, 812)).toEqual([16, -220, 359, 80]);
  });

  it("devrait disparaître dès que le texte est sorti de l'écran, par le haut comme par le bas", () => {
    expect(introVeil(TEXT, 580, 812)).toBeNull();
    expect(introVeil([16, 900, 359, 1200], 0, 812)).toBeNull();
  });

  it("ne devrait rien voiler sans introduction", () => {
    expect(introVeil(null, 0, 812)).toBeNull();
  });
});
