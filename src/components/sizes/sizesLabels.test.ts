import { describe, expect, it } from "vitest";
import { labelOrder, placeLimbLabel, starLabelMode, sunRinged } from "@/components/sizes/sizesLabels";

/*
 * Étiquettes de la scène des tailles : au-dessus du limbe pour une étoile assez grande à l'écran, sur un anneau pour
 * une petite (dispositions du ciel profond), anneau « ici » pour le Soleil quand il n'est plus qu'un point.
 */

describe("starLabelMode", () => {
  it.each([
    [30, null, "limb"],
    [24, "ring", "limb"],
    [20, null, "ring"],
    [20, "limb", "limb"],
    [17.9, "limb", "ring"],
    [1, null, "ring"],
  ] as const)(
    "devrait étiqueter une étoile de %f px de diamètre, après « %s », sur le mode %s (limbe dès 24 px, quitté sous 18 px)",
    (diameterPx, previous, mode) => {
      expect(starLabelMode(diameterPx, previous)).toBe(mode);
    },
  );
});

describe("placeLimbLabel", () => {
  const VIEW = { width: 1000, height: 800 };
  const SIZE = { width: 120, height: 24 };

  it("devrait centrer l'étiquette au-dessus du limbe, à 8 px", () => {
    expect(placeLimbLabel({ x: 500, y: 400, radiusPx: 100, depth: 0.5 }, SIZE, VIEW, [])).toEqual([440, 268, 560, 292]);
  });

  it("devrait la poser au-dessous du limbe quand le dessus passe sous la barre haute", () => {
    expect(placeLimbLabel({ x: 500, y: 150, radiusPx: 100, depth: 0.5 }, SIZE, VIEW, [])).toEqual([440, 258, 560, 282]);
  });

  it("devrait la poser au-dessous du limbe quand le dessus recouvre une boîte déjà occupée", () => {
    const occupied = [[400, 250, 600, 300]] as const;
    expect(placeLimbLabel({ x: 500, y: 400, radiusPx: 100, depth: 0.5 }, SIZE, VIEW, occupied)).toEqual([440, 508, 560, 532]);
  });

  it("ne devrait rien poser quand ni le dessus ni le dessous ne tiennent dans la vue (étoile plus grande que l'écran)", () => {
    expect(placeLimbLabel({ x: 500, y: 400, radiusPx: 500, depth: 0.5 }, SIZE, VIEW, [])).toBeNull();
  });

  it("devrait la glisser dans la vue quand, centrée, elle déborderait d'un côté : toujours au-dessus de l'étoile", () => {
    expect(placeLimbLabel({ x: 20, y: 400, radiusPx: 100, depth: 0.5 }, SIZE, VIEW, [])).toEqual([8, 268, 128, 292]);
    expect(placeLimbLabel({ x: 980, y: 400, radiusPx: 100, depth: 0.5 }, SIZE, VIEW, [])).toEqual([872, 268, 992, 292]);
  });

  /*
   * Téléphone, 375 × 812, repos sur VY Canis Majoris : la caméra cadre l'étoile avec la précédente (Bételgeuse) à sa
   * droite, son centre à 3 rayons de Bételgeuse à gauche du centre de la vue. Diamètre ≈ 115 px, centre vers x ≈ 95 px :
   * centrée, l'étiquette (« VY Canis Majoris · 1 420 R☉ », ≈ 200 px) commencerait hors de la vue.
   */
  it("devrait poser au-dessus de l'étoile l'étiquette d'une supergéante cadrée à gauche d'un téléphone", () => {
    const phone = { width: 375, height: 812 };
    const box = placeLimbLabel({ x: 95, y: 300, radiusPx: 57.5, depth: 0.5 }, { width: 200, height: 20 }, phone, []);
    expect(box).toEqual([8, 214.5, 208, 234.5]);
  });

  it("ne devrait rien poser quand le centre de l'étoile sort de la vue : l'étiquette ne la désignerait plus", () => {
    expect(placeLimbLabel({ x: 4, y: 400, radiusPx: 100, depth: 0.5 }, SIZE, VIEW, [])).toBeNull();
    expect(placeLimbLabel({ x: 996, y: 400, radiusPx: 100, depth: 0.5 }, SIZE, VIEW, [])).toBeNull();
  });

  it("ne devrait rien poser quand l'étiquette est plus large que la vue", () => {
    expect(placeLimbLabel({ x: 500, y: 400, radiusPx: 100, depth: 0.5 }, { width: 990, height: 24 }, VIEW, [])).toBeNull();
  });

  it("ne devrait rien poser pour une étoile derrière la caméra", () => {
    expect(placeLimbLabel({ x: 500, y: 400, radiusPx: 100, depth: 1.2 }, SIZE, VIEW, [])).toBeNull();
  });
});

describe("labelOrder", () => {
  it.each([
    [8, [8, 7, 1, 9, 6, 5, 4, 3, 2, 0]],
    [0, [0, 1, 9, 8, 7, 6, 5, 4, 3, 2]],
    [1, [1, 0, 9, 8, 7, 6, 5, 4, 3, 2]],
    [2, [2, 1, 9, 8, 7, 6, 5, 4, 3, 0]],
  ])(
    "devrait poser l'étoile affichée (%i), la précédente, le Soleil, puis les autres de la plus grande à la plus petite",
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
