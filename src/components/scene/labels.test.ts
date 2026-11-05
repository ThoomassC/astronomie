import { describe, expect, it } from "vitest";
import {
  EDGE_MARGIN,
  LABEL_GAP_PX,
  LABEL_HALO_PX,
  LABEL_OFFSET_X,
  LABEL_OFFSET_Y,
  RING_LABEL_GAP_PX,
  anchoredBox,
  clearanceShift,
  markerLayouts,
  placeLabel,
  placeMarkedLabel,
  pointBox,
  ringLayouts,
  type LabelAnchor,
  type LabelBox,
  type MarkerMetrics,
} from "@/components/scene/labels";

const VIEW_W = 1280;
const VIEW_H = 800;
/** Bas de la barre haute et haut du dock : les étiquettes restent entre les deux. */
const TOP_LIMIT = 72;
const BOTTOM_LIMIT = VIEW_H - 90;

const LABEL_W = 80;
const LABEL_H = 30;

/** Astre au milieu de la vue, devant la caméra, avec un bouton de 80 × 30 px. */
const anchor = (over: Partial<LabelAnchor> = {}): LabelAnchor => ({
  x: 400,
  y: 300,
  depth: 0.5,
  width: LABEL_W,
  height: LABEL_H,
  ...over,
});

/** Boîte attendue pour un astre en (x, y). */
const boxAt = (x: number, y: number): LabelBox => [
  x - LABEL_OFFSET_X,
  y - LABEL_OFFSET_Y,
  x - LABEL_OFFSET_X + LABEL_W,
  y - LABEL_OFFSET_Y + LABEL_H,
];

describe("placeLabel", () => {
  it("devrait renvoyer la boîte du bouton, pastille centrée sur l'astre, quand la place est libre", () => {
    expect(placeLabel(anchor(), VIEW_W, VIEW_H, [])).toEqual(boxAt(400, 300));
  });

  describe("chevauchements", () => {
    it("devrait masquer l'étiquette quand elle chevauche une boîte déjà occupée", () => {
      const occupied: LabelBox[] = [[430, 290, 520, 320]];
      expect(placeLabel(anchor(), VIEW_W, VIEW_H, occupied)).toBeNull();
    });

    it("devrait garder l'étiquette quand elle touche une autre boîte bord à bord", () => {
      const [, top, right, bottom] = boxAt(400, 300);
      const occupied: LabelBox[] = [[right, top, right + 60, bottom]];
      expect(placeLabel(anchor(), VIEW_W, VIEW_H, occupied)).toEqual(boxAt(400, 300));
    });

    it("devrait masquer l'étiquette quand elle déborde sur une zone interdite (règle des distances)", () => {
      const rail: LabelBox = [VIEW_W - 120, 100, VIEW_W, 700];
      expect(placeLabel(anchor({ x: VIEW_W - 150 }), VIEW_W, VIEW_H, [rail])).toBeNull();
    });

    it("devrait garder l'étiquette prioritaire, placée la première, et masquer la suivante qui la chevauche", () => {
      expect(placeLabel(anchor({ x: 400 }), VIEW_W, VIEW_H, [])).toEqual(boxAt(400, 300));
      expect(placeLabel(anchor({ x: 430 }), VIEW_W, VIEW_H, [boxAt(400, 300)])).toBeNull();
    });

    it("devrait laisser passer l'étiquette suivante quand elle ne chevauche pas la prioritaire", () => {
      const first = boxAt(400, 300);
      expect(placeLabel(anchor({ x: 600 }), VIEW_W, VIEW_H, [first])).toEqual(boxAt(600, 300));
    });
  });

  describe("marges haute et basse", () => {
    it("devrait accepter une étiquette dont le haut touche le bas de la barre haute", () => {
      const y = TOP_LIMIT + LABEL_OFFSET_Y;
      expect(placeLabel(anchor({ y }), VIEW_W, VIEW_H, [])).toEqual(boxAt(400, y));
    });

    it("devrait masquer une étiquette qui passerait d'un pixel sous la barre haute", () => {
      const y = TOP_LIMIT + LABEL_OFFSET_Y - 1;
      expect(placeLabel(anchor({ y }), VIEW_W, VIEW_H, [])).toBeNull();
    });

    it("devrait accepter une étiquette dont le bas touche le haut du dock", () => {
      const y = BOTTOM_LIMIT + LABEL_OFFSET_Y - LABEL_H;
      expect(placeLabel(anchor({ y }), VIEW_W, VIEW_H, [])).toEqual(boxAt(400, y));
    });

    it("devrait masquer une étiquette qui mordrait d'un pixel sur le dock", () => {
      const y = BOTTOM_LIMIT + LABEL_OFFSET_Y - LABEL_H + 1;
      expect(placeLabel(anchor({ y }), VIEW_W, VIEW_H, [])).toBeNull();
    });
  });

  describe("bords latéraux et profondeur", () => {
    it("devrait tolérer un léger débord quand l'astre sort un peu par la gauche", () => {
      expect(placeLabel(anchor({ x: -40 }), VIEW_W, VIEW_H, [])).toEqual(boxAt(-40, 300));
    });

    it.each([[-41], [VIEW_W + 41]])("devrait masquer l'étiquette quand l'astre sort franchement de la vue (x = %f)", (x) => {
      expect(placeLabel(anchor({ x }), VIEW_W, VIEW_H, [])).toBeNull();
    });

    it("devrait masquer l'étiquette quand l'astre est derrière la caméra", () => {
      expect(placeLabel(anchor({ depth: 1.0001 }), VIEW_W, VIEW_H, [])).toBeNull();
    });

    it("devrait garder l'étiquette d'un astre à la limite du champ de profondeur", () => {
      expect(placeLabel(anchor({ depth: 1 }), VIEW_W, VIEW_H, [])).toEqual(boxAt(400, 300));
    });
  });
});

/** Texte de 100 × 20 px, à 10 px à droite de son repère, puis son miroir à gauche. */
const RIGHT: LabelBox = [10, -10, 110, 10];
const LEFT: LabelBox = [-110, -10, -10, 10];
const BOTH = [{ box: RIGHT }, { box: LEFT }];

describe("placeMarkedLabel", () => {
  const at = (x: number, y = 300, depth = 0.5) => ({ x, y, depth });

  it("devrait garder la disposition normale, texte à droite du repère, quand elle tient", () => {
    expect(placeMarkedLabel(at(400), BOTH, VIEW_W, VIEW_H, [])).toBe(0);
  });

  it("devrait passer au miroir, texte à gauche du repère, quand le texte déborderait à droite", () => {
    expect(placeMarkedLabel(at(VIEW_W - 50), BOTH, VIEW_W, VIEW_H, [])).toBe(1);
  });

  it("devrait renoncer quand aucune disposition ne tient dans la vue", () => {
    expect(placeMarkedLabel(at(100), BOTH, 200, VIEW_H, [])).toBeNull();
  });

  describe("bords de la vue : une pastille ne sort jamais de [4 ; W − 4]", () => {
    it("devrait accepter un texte à 4 px du bord droit et refuser le même à 3 px", () => {
      const touching = VIEW_W - EDGE_MARGIN - RIGHT[2];
      expect(placeMarkedLabel(at(touching), [{ box: RIGHT }], VIEW_W, VIEW_H, [])).toBe(0);
      expect(placeMarkedLabel(at(touching + 1), [{ box: RIGHT }], VIEW_W, VIEW_H, [])).toBeNull();
    });

    it("devrait accepter un texte à 4 px du bord gauche et refuser le même à 3 px", () => {
      const touching = EDGE_MARGIN - LEFT[0];
      expect(placeMarkedLabel(at(touching), [{ box: LEFT }], VIEW_W, VIEW_H, [])).toBe(0);
      expect(placeMarkedLabel(at(touching - 1), [{ box: LEFT }], VIEW_W, VIEW_H, [])).toBeNull();
    });

    it("devrait garder le texte sous la barre haute et au-dessus du dock", () => {
      const top = TOP_LIMIT - RIGHT[1];
      const bottom = BOTTOM_LIMIT - RIGHT[3];
      expect(placeMarkedLabel(at(400, top), [{ box: RIGHT }], VIEW_W, VIEW_H, [])).toBe(0);
      expect(placeMarkedLabel(at(400, top - 1), [{ box: RIGHT }], VIEW_W, VIEW_H, [])).toBeNull();
      expect(placeMarkedLabel(at(400, bottom), [{ box: RIGHT }], VIEW_W, VIEW_H, [])).toBe(0);
      expect(placeMarkedLabel(at(400, bottom + 1), [{ box: RIGHT }], VIEW_W, VIEW_H, [])).toBeNull();
    });

    it("devrait soumettre un texte centré sous son repère (« Centre de la Galaxie ») à la même règle", () => {
      const below = [{ box: [-60, 8, 60, 28] as const }];
      expect(placeMarkedLabel(at(EDGE_MARGIN + 60), below, VIEW_W, VIEW_H, [])).toBe(0);
      expect(placeMarkedLabel(at(EDGE_MARGIN + 59), below, VIEW_W, VIEW_H, [])).toBeNull();
    });
  });

  describe("astre hors de la vue", () => {
    /** Textes posés loin de leur repère, qui tiendraient dans la vue : seul l'astre en sort. */
    const BELOW: LabelBox = [10, 100, 110, 120];
    const ABOVE: LabelBox = [10, -200, 110, -180];

    it.each([
      ["à gauche", -1, 300, RIGHT],
      ["à droite", VIEW_W + 1, 300, LEFT],
      ["en haut", 400, -1, BELOW],
      ["en bas", 400, VIEW_H + 1, ABOVE],
    ] as const)("devrait masquer l'étiquette d'un astre sorti %s, même si son texte tiendrait dans la vue", (_side, x, y, box) => {
      expect(placeMarkedLabel(at(x, y), [{ box }], VIEW_W, VIEW_H, [])).toBeNull();
    });

    it("devrait masquer l'étiquette d'un astre derrière la caméra", () => {
      expect(placeMarkedLabel(at(400, 300, 1.0001), BOTH, VIEW_W, VIEW_H, [])).toBeNull();
    });
  });

  describe("points des étoiles", () => {
    it("devrait passer au miroir plutôt que de recouvrir le point d'une autre étoile", () => {
      expect(placeMarkedLabel(at(400), BOTH, VIEW_W, VIEW_H, [pointBox(460, 300, 2)])).toBe(1);
    });

    it("devrait renoncer plutôt que de recouvrir un point de chaque côté", () => {
      const points = [pointBox(460, 300, 2), pointBox(340, 300, 2)];
      expect(placeMarkedLabel(at(400), BOTH, VIEW_W, VIEW_H, points)).toBeNull();
    });
  });

  describe("à côté d'un disque : texte éloigné de `clearance` px du centre", () => {
    it("devrait poser le texte à droite du disque quand il y tient", () => {
      expect(placeMarkedLabel(at(400), BOTH, VIEW_W, VIEW_H, [], 50)).toBe(0);
    });

    it("devrait passer à gauche du disque quand le texte, ainsi éloigné, déborderait à droite", () => {
      // Texte à droite : [x + 50 ; x + 150], à 3 px du bord droit.
      const x = VIEW_W - EDGE_MARGIN - 150 + 1;
      expect(placeMarkedLabel(at(x), BOTH, VIEW_W, VIEW_H, [], 50)).toBe(1);
      expect(placeMarkedLabel(at(x), BOTH, VIEW_W, VIEW_H, [])).toBe(0);
    });

    it("devrait chercher les chevauchements là où va le texte éloigné, pas là où il irait sans disque", () => {
      // Recouvre [450 ; 550], le texte éloigné à droite, mais pas [410 ; 510], le texte collé au repère.
      const obstacle: LabelBox = [520, 295, 530, 305];
      expect(placeMarkedLabel(at(400), BOTH, VIEW_W, VIEW_H, [obstacle], 50)).toBe(1);
      expect(placeMarkedLabel(at(400), BOTH, VIEW_W, VIEW_H, [obstacle])).toBe(0);
    });

    it("devrait renoncer quand le disque ne laisse la place au texte d'aucun côté", () => {
      expect(placeMarkedLabel(at(640), BOTH, VIEW_W, VIEW_H, [], 560)).toBeNull();
    });
  });

  describe("air entre deux étiquettes voisines", () => {
    /** Étiquette déjà posée juste sous le texte à droite du repère ([410 ; 510] × [290 ; 310]), bord à bord. */
    const touching: LabelBox = [410, 310, 510, 330];

    it("devrait refuser, quand on demande de l'air, une étiquette qui en toucherait une autre bord à bord", () => {
      expect(placeMarkedLabel(at(400), BOTH, VIEW_W, VIEW_H, [touching])).toBe(0);
      expect(placeMarkedLabel(at(400), BOTH, VIEW_W, VIEW_H, [touching], 0, { gap: LABEL_GAP_PX })).toBe(1);
    });

    it("devrait accepter une étiquette séparée de l'air demandé", () => {
      const apart: LabelBox = [410, 310 + LABEL_GAP_PX, 510, 330];
      expect(placeMarkedLabel(at(400), BOTH, VIEW_W, VIEW_H, [apart], 0, { gap: LABEL_GAP_PX })).toBe(0);
    });
  });

  describe("halo du texte et points des étoiles", () => {
    const layouts = markerLayouts({
      dotX: 5, dotY: 10, dotWidth: 10, textX: 15, textY: 0, textWidth: 100, textHeight: 20, detailWidth: 0,
      halo: LABEL_HALO_PX,
    });

    it("devrait refuser la disposition dont le halo voilerait le point d'une étoile, que le texte seul épargnerait", () => {
      // Point à 2 px sous le texte à droite ([410 ; 510] × [290 ; 310]) : dans le halo, pas sous le texte.
      const points = [pointBox(460, 315, 2)];
      expect(placeMarkedLabel(at(400), layouts, VIEW_W, VIEW_H, points)).toBe(0);
      expect(placeMarkedLabel(at(400), layouts, VIEW_W, VIEW_H, [], 0, { points })).toBe(1);
    });

    it("ne devrait pas se heurter au point de sa propre étoile, sous son repère, même gros", () => {
      expect(placeMarkedLabel(at(400), layouts, VIEW_W, VIEW_H, [], 0, { points: [pointBox(400, 300, 10)] })).toBe(0);
    });
  });
});

describe("clearanceShift", () => {
  it("devrait pousser vers la droite un texte à droite du repère, jusqu'à `clearance` px du centre", () => {
    expect(clearanceShift(RIGHT, 50)).toBe(40);
  });

  it("devrait pousser vers la gauche un texte à gauche du repère (miroir)", () => {
    expect(clearanceShift(LEFT, 50)).toBe(-40);
  });

  it("devrait laisser en place un texte déjà assez loin du centre", () => {
    expect(clearanceShift(RIGHT, 6)).toBe(0);
    expect(clearanceShift(LEFT, 6)).toBe(0);
  });

  it("devrait laisser en place un texte centré au-dessus ou en dessous de son repère", () => {
    expect(clearanceShift([-60, 8, 60, 28], 50)).toBe(0);
  });
});

describe("pointBox", () => {
  it("devrait réserver le point, centre ± (demi-taille + 2 px)", () => {
    expect(pointBox(100, 50, 6)).toEqual([95, 45, 105, 55]);
  });
});

describe("anchoredBox", () => {
  it("devrait poser une boîte relative au repère sur le repère", () => {
    expect(anchoredBox(RIGHT, 400, 300)).toEqual([410, 290, 510, 310]);
  });
});

/** Étiquette d'étoile : repère de 10 px, puis la pastille du texte (nom et distance), 4,8 px plus loin. */
const STAR_METRICS: MarkerMetrics = {
  dotX: 8.2,
  dotY: 15.7,
  dotWidth: 10,
  textX: 18,
  textY: 5.6,
  textWidth: 180,
  textHeight: 20.2,
  detailWidth: 40,
};

describe("markerLayouts", () => {
  it("devrait proposer le texte complet à droite, puis à gauche, puis le nom seul à droite, puis à gauche", () => {
    const layouts = markerLayouts(STAR_METRICS);
    expect(layouts.map(({ mirrored, short }) => ({ mirrored, short }))).toEqual([
      { mirrored: false, short: false },
      { mirrored: true, short: false },
      { mirrored: false, short: true },
      { mirrored: true, short: true },
    ]);
  });

  it("devrait poser le texte à droite du repère avec l'écart mesuré, pastille centrée en hauteur", () => {
    const [right] = markerLayouts(STAR_METRICS);
    expect(right.box.map((v) => Number(v.toFixed(2)))).toEqual([9.8, -10.1, 189.8, 10.1]);
    expect(right.dotX).toBe(8.2);
  });

  it("devrait garder le même écart dans le miroir, repère désormais à droite du texte", () => {
    const [, left] = markerLayouts(STAR_METRICS);
    expect(left.box.map((v) => Number(v.toFixed(2)))).toEqual([-189.8, -10.1, -9.8, 10.1]);
    // Ligne inversée : le texte part du bord gauche de l'étiquette, le repère vient après lui et l'écart.
    expect(left.dotX).toBeCloseTo(STAR_METRICS.textX + STAR_METRICS.textWidth - STAR_METRICS.dotWidth / 2, 9);
  });

  it("devrait raccourcir la forme courte de la largeur de la précision, des deux côtés", () => {
    const [, , right, left] = markerLayouts(STAR_METRICS);
    expect(right.box[2] - right.box[0]).toBeCloseTo(140, 9);
    expect(left.box[2] - left.box[0]).toBeCloseTo(140, 9);
    expect(left.box[2]).toBeCloseTo(-9.8, 9);
    expect(left.dotX).toBeCloseTo(STAR_METRICS.textX + 140 - STAR_METRICS.dotWidth / 2, 9);
  });

  it("ne devrait proposer ni forme courte ni rien d'autre que les deux côtés à un texte sans précision", () => {
    expect(markerLayouts({ ...STAR_METRICS, detailWidth: 0 })).toHaveLength(2);
  });

  it("ne devrait proposer qu'une disposition à un texte centré sur son repère (« Centre de la Galaxie »)", () => {
    // Repère en haut au milieu, texte centré en dessous.
    const below: MarkerMetrics = { ...STAR_METRICS, dotX: 60, dotY: 5, textX: 0, textY: 13, textWidth: 120, detailWidth: 0 };
    const layouts = markerLayouts(below);
    expect(layouts).toHaveLength(1);
    expect(layouts[0].box).toEqual([-60, 8, 60, 28.2]);
  });

  it("devrait confondre la boîte du halo et celle du texte sans halo (pastilles de la page Tailles)", () => {
    expect(markerLayouts(STAR_METRICS).every((layout) => layout.haloBox === layout.box)).toBe(true);
  });

  it("devrait élargir la boîte du halo de tous les côtés sauf celui de son repère, dans les deux dispositions", () => {
    const metrics: MarkerMetrics = {
      dotX: 5, dotY: 10, dotWidth: 10, textX: 15, textY: 0, textWidth: 100, textHeight: 20, detailWidth: 0, halo: 6,
    };
    const [right, left] = markerLayouts(metrics);
    expect(right.box).toEqual([10, -10, 110, 10]);
    expect(right.haloBox).toEqual([10, -16, 116, 16]);
    expect(left.box).toEqual([-110, -10, -10, 10]);
    expect(left.haloBox).toEqual([-116, -16, -10, 16]);
  });

  it("devrait élargir le halo d'un texte centré sous son repère partout, sauf vers le repère", () => {
    const below: MarkerMetrics = {
      dotX: 60, dotY: 5, dotWidth: 10, textX: 0, textY: 13, textWidth: 120, textHeight: 20, detailWidth: 0, halo: 6,
    };
    expect(markerLayouts(below)[0].haloBox).toEqual([-66, 8, 66, 34]);
  });
});

/**
 * Escale des étoiles voisines sur un téléphone de 375 × 812 px : positions projetées du Soleil et de ses voisines
 * (cadrage de l'escale), tailles de leurs points, et mesures des étiquettes en Atkinson Hyperlegible Next de 13 px
 * (largeurs d'avance de la police, interlettrage compris). « Soleil » est un bouton (interligne 1,6) ; les étoiles,
 * des pastilles (interligne 1,4). Ordre du moteur : « Soleil », puis les points, puis les étoiles par distance.
 */
describe("étoiles voisines en 375 × 812 : « Soleil » et « Proxima du Centaure »", () => {
  const W = 375;
  const H = 812;
  const SUN = { x: 187.5, y: 371 };
  const POINTS: readonly (readonly [x: number, y: number, size: number])[] = [
    [187.5, 371, 6], // point-Soleil
    [213.4, 393.4, 2], // Proxima du Centaure
    [214.9, 393, 7.4], // Alpha du Centaure
    [228.9, 339.7, 2.9], // Barnard
    [198.6, 412.3, 2], // Wolf 359
    [185.2, 381.4, 4.3], // Lalande 21185
    [144.8, 369.4, 2], // Luyten 726-8
    [189.2, 360, 4.6], // Lacaille 9352
    [216.4, 385, 6.1], // Epsilon Indi
  ];
  const SOLEIL: MarkerMetrics = {
    dotX: 8.2,
    dotY: 16,
    dotWidth: 10,
    textX: 20.4,
    textY: 5.6,
    textWidth: 32.7,
    textHeight: 20.8,
    detailWidth: 0,
  };
  const PROXIMA: MarkerMetrics = { ...STAR_METRICS, textWidth: 182.6, detailWidth: 43.3 };
  const ALPHA: MarkerMetrics = { ...STAR_METRICS, textWidth: 208.1, detailWidth: 43.7 };

  /** Pose une étiquette comme le moteur : première disposition qui tient, texte réservé. */
  function place(metrics: MarkerMetrics, x: number, y: number, occupied: LabelBox[]) {
    const layouts = markerLayouts(metrics);
    const index = placeMarkedLabel({ x, y, depth: 0.5 }, layouts, W, H, occupied);
    if (index === null) return null;
    occupied.push(anchoredBox(layouts[index].box, x, y));
    return layouts[index];
  }

  it("devrait nommer les deux : le Soleil à droite de son point, Proxima à droite du sien, par son nom seul", () => {
    const occupied: LabelBox[] = [];
    const soleil = place(SOLEIL, SUN.x, SUN.y, occupied);
    occupied.push(...POINTS.map(([x, y, size]) => pointBox(x, y, size)));
    const proxima = place(PROXIMA, 213.4, 393.4, occupied);
    expect(soleil).toMatchObject({ mirrored: false, short: false });
    // Le nom et la distance débordent à droite ; à gauche, ils recouvriraient le point de Lalande 21185.
    expect(proxima).toMatchObject({ mirrored: false, short: true });
  });

  it("devrait laisser Alpha du Centaure céder : son point touche presque celui de Proxima", () => {
    const occupied: LabelBox[] = [];
    place(SOLEIL, SUN.x, SUN.y, occupied);
    occupied.push(...POINTS.map(([x, y, size]) => pointBox(x, y, size)));
    place(PROXIMA, 213.4, 393.4, occupied);
    expect(place(ALPHA, 214.9, 393, occupied)).toBeNull();
  });
});

/**
 * Même escale, étiquettes du voyage posées à nu (sans pastille) : texte à 6,4 px du repère, interligne 1,4, halo de nuit
 * réservé (LABEL_HALO_PX) autour des points des étoiles, air (LABEL_GAP_PX) entre étiquettes voisines ; tailles des
 * points d'aujourd'hui (3,5 à 10 px).
 */
describe("étoiles voisines en 375 × 812, étiquettes à nu : halo réservé et air entre voisines", () => {
  const W = 375;
  const H = 812;
  const SUN = { x: 187.5, y: 371 };
  const POINTS: readonly (readonly [x: number, y: number, size: number])[] = [
    [187.5, 371, 6], // point-Soleil
    [213.4, 393.4, 3.5], // Proxima du Centaure
    [214.9, 393, 8.3], // Alpha du Centaure
    [228.9, 339.7, 3.9], // Barnard
    [198.6, 412.3, 3.5], // Wolf 359
    [185.2, 381.4, 5.3], // Lalande 21185
    [144.8, 369.4, 3.5], // Luyten 726-8
    [189.2, 360, 5.6], // Lacaille 9352
    [216.4, 385, 7.1], // Epsilon Indi
  ];
  /** « Soleil » : bouton, sans le halo du ciel profond. */
  const SOLEIL: MarkerMetrics = {
    dotX: 8.2, dotY: 16, dotWidth: 10, textX: 20.4, textY: 5.6, textWidth: 32.7, textHeight: 20.8, detailWidth: 0,
  };
  const NAKED = { dotX: 8.2, dotY: 14.7, dotWidth: 10, textX: 19.6, textY: 5.6, textHeight: 18.2, halo: LABEL_HALO_PX };
  const PROXIMA: MarkerMetrics = { ...NAKED, textWidth: 166.2, detailWidth: 43.3 };
  const ALPHA: MarkerMetrics = { ...NAKED, textWidth: 191.7, detailWidth: 43.7 };

  /** Pose une étiquette comme le moteur du voyage : halo contre les points, air contre les étiquettes posées. */
  function place(metrics: MarkerMetrics, x: number, y: number, occupied: LabelBox[], points: readonly LabelBox[]) {
    const layouts = markerLayouts(metrics);
    const index = placeMarkedLabel({ x, y, depth: 0.5 }, layouts, W, H, occupied, 0, { points, gap: LABEL_GAP_PX });
    if (index === null) return null;
    occupied.push(anchoredBox(layouts[index].box, x, y), [x - 5, y - 5, x + 5, y + 5]);
    return { ...layouts[index], at: anchoredBox(layouts[index].box, x, y) };
  }

  it("devrait encore nommer le Soleil et Proxima (par son nom seul), séparés de l'air demandé", () => {
    const occupied: LabelBox[] = [];
    const soleil = place(SOLEIL, SUN.x, SUN.y, occupied, []);
    const points = POINTS.map(([x, y, size]) => pointBox(x, y, size));
    const proxima = place(PROXIMA, 213.4, 393.4, occupied, points);
    expect(soleil).toMatchObject({ mirrored: false, short: false });
    expect(proxima).toMatchObject({ mirrored: false, short: true });
    expect((proxima?.at[1] ?? 0) - (soleil?.at[3] ?? 0)).toBeGreaterThanOrEqual(LABEL_GAP_PX);
  });

  it("devrait laisser Alpha du Centaure céder plutôt que de toucher Proxima ou de voiler un point", () => {
    const occupied: LabelBox[] = [];
    place(SOLEIL, SUN.x, SUN.y, occupied, []);
    const points = POINTS.map(([x, y, size]) => pointBox(x, y, size));
    place(PROXIMA, 213.4, 393.4, occupied, points);
    expect(place(ALPHA, 214.9, 393, occupied, points)).toBeNull();
  });

  /*
   * Cercle de distance : « 5 al » sur une graduation de laiton de 2 × 9 px, texte à 6,5 px d'elle. Sur la même ligne
   * que « Soleil », sa graduation à 6,6 px du texte du Soleil se lisait « Soleil 5 al », collés. Graduation comprise,
   * l'étiquette du cercle garde 8 px d'air avec toute autre ; sinon, elle se pose plus loin sur le cercle.
   */
  describe("cercles de distance", () => {
    const FIVE_LY: MarkerMetrics = {
      dotX: 4, dotY: 14.5, dotWidth: 2, textX: 11.5, textY: 5.5, textWidth: 26, textHeight: 18, detailWidth: 0,
      halo: LABEL_HALO_PX,
    };
    const RING = ringLayouts(markerLayouts(FIVE_LY), 2, 9);
    /** « Soleil » posé, et les points des étoiles : ce que trouve le cercle, posé en dernier. */
    function afterSun(): { occupied: LabelBox[]; points: LabelBox[] } {
      const occupied: LabelBox[] = [];
      place(SOLEIL, SUN.x, SUN.y, occupied, []);
      return { occupied, points: POINTS.map(([x, y, size]) => pointBox(x, y, size)) };
    }
    /** Place du cercle à droite de « Soleil », sur sa ligne : graduation à 6,6 px du texte du Soleil (232,4 px). */
    const BESIDE_SUN = { x: 240, y: SUN.y, depth: 0.5 };

    it("devrait étendre chaque disposition à sa graduation, posée sur le cercle", () => {
      const [right, left] = RING;
      expect(right.box).toEqual([-1, -9, 33.5, 9]);
      expect(left.box).toEqual([-33.5, -9, 1, 9]);
      expect(right.haloBox).toEqual(markerLayouts(FIVE_LY)[0].haloBox);
    });

    it("devrait refuser la place où sa graduation se collerait à « Soleil », que l'air entre textes laissait passer", () => {
      const { occupied, points } = afterSun();
      expect(placeMarkedLabel(BESIDE_SUN, markerLayouts(FIVE_LY), W, H, occupied, 0, { points, gap: LABEL_GAP_PX })).toBe(0);
      expect(placeMarkedLabel(BESIDE_SUN, RING, W, H, occupied, 0, { points, gap: RING_LABEL_GAP_PX })).toBeNull();
    });

    it("devrait se poser plus loin sur le cercle, à 8 px au moins de « Soleil », graduation comprise", () => {
      const { occupied, points } = afterSun();
      const further = { ...BESIDE_SUN, x: 250 };
      const index = placeMarkedLabel(further, RING, W, H, occupied, 0, { points, gap: RING_LABEL_GAP_PX });
      expect(index).toBe(0);
      const ring = anchoredBox(RING[index ?? 0].box, further.x, further.y);
      const soleil = occupied[0];
      expect(ring[0] - soleil[2]).toBeGreaterThanOrEqual(RING_LABEL_GAP_PX);
    });
  });
});
