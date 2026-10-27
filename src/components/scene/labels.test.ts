import { describe, expect, it } from "vitest";
import { LABEL_OFFSET_X, LABEL_OFFSET_Y, placeLabel, type LabelAnchor, type LabelBox } from "@/components/scene/labels";

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
