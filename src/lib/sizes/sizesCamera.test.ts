import { describe, expect, it } from "vitest";
import { placeObjects, type PlacedObject } from "@/lib/sizes/layout";
import { COMPARED_OBJECTS, layoutInput } from "@/lib/sizes/objects";
import {
  RAIL_FADE_PX,
  SIZES_FILL,
  haloOpacity,
  railSideFade,
  rightEdgePx,
  screenDisc,
  sizesFlightCamera,
  sizesRestCamera,
  visibleObjectCount,
  type SizesCam,
  type SizesFrameContext,
} from "@/lib/sizes/sizesCamera";

const DEG = Math.PI / 180;

/**
 * Trois étoiles fictives (rayons 1, 2 et 8 R☉, encombrement égal au rayon) aux positions du plan, calculées avec un
 * écart de 2,4 rayons de la plus petite : x = 0 ; −5,4 ; −20,2. Positions figées ici : les attentes de caméra ne
 * dépendent pas du réglage des écarts.
 */
const PLACED: readonly PlacedObject[] = [
  { key: "proxima-centauri", radius: 1, extent: 1, x: 0 },
  { key: "sun", radius: 2, extent: 2, x: -5.4 },
  { key: "sirius-a", radius: 8, extent: 8, x: -20.2 },
];

/** Écran 16/9, champ vertical de 36°, sans bande ni zone libre. */
const PLAIN: SizesFrameContext = { aspect: 16 / 9, fovDeg: 36, band: null, zone: null };
/** Même écran, zone libre de 45 % à 85 % de la largeur, entre la plaque et la règle. */
const DESK: SizesFrameContext = { ...PLAIN, zone: { left: 0.45, right: 0.85 } };
/** iPhone 375 × 812, champ de 50° : bande libre de 9 % à 62 % de la hauteur, au-dessus de la plaque compacte. */
const PHONE: SizesFrameContext = { aspect: 375 / 812, fovDeg: 50, band: { top: 0.09, bottom: 0.62 }, zone: null };

/** Demi-largeur de la boîte de la paire (étoile 1, étoile 0) : de −7,4 à 1. */
const PAIR_HALF_WIDTH = 4.2;

const tanHalf = (ctx: SizesFrameContext) => Math.tan((ctx.fovDeg * DEG) / 2);
/** Demi-largeur `half`, prise au plan de la cible à la distance `dist`, en part de la demi-largeur d'écran. */
const widthShare = (half: number, dist: number, ctx: SizesFrameContext) => half / dist / (ctx.aspect * tanHalf(ctx));
/** Diamètre apparent d'une sphère de rayon `radius` à la profondeur `dist`, en part de la hauteur d'écran. */
const heightShare = (radius: number, dist: number, ctx: SizesFrameContext) =>
  Math.tan(Math.asin(radius / dist)) / tanHalf(ctx);

/** Compare deux caméras champ par champ. */
function expectCam(actual: SizesCam, expected: SizesCam) {
  expect(actual.tx, "tx").toBeCloseTo(expected.tx, 9);
  expect(actual.dist, "dist").toBeCloseTo(expected.dist, 9);
  expect(actual.offX, "offX").toBeCloseTo(expected.offX, 9);
  expect(actual.offY, "offY").toBeCloseTo(expected.offY, 9);
}

describe("sizesRestCamera", () => {
  describe("sans bande ni zone libre", () => {
    it("devrait viser le milieu de la paire, du bord gauche de l'étoile au bord droit de la précédente (tx −3,2)", () => {
      expect(sizesRestCamera(PLACED, "sun", PLAIN).tx).toBeCloseTo(-3.2, 9);
    });

    it("devrait reculer jusqu'à ce que la paire occupe 70 % de la largeur (dist 10,3872)", () => {
      const { dist } = sizesRestCamera(PLACED, "sun", PLAIN);
      expect(dist).toBeCloseTo(10.3872, 4);
      expect(widthShare(PAIR_HALF_WIDTH, dist, PLAIN)).toBeCloseTo(0.7, 9);
    });

    it("devrait laisser la cible au centre de l'écran (décalages nuls)", () => {
      const cam = sizesRestCamera(PLACED, "sun", PLAIN);
      expect(cam.offX).toBe(0);
      expect(cam.offY).toBe(0);
    });

    it("devrait cadrer la plus petite étoile seule, par la hauteur : 70 % de l'écran (tx 0, dist 4,5090)", () => {
      const cam = sizesRestCamera(PLACED, "proxima-centauri", PLAIN);
      expect(cam.tx).toBe(0);
      expect(cam.dist).toBeCloseTo(4.509, 4);
      expect(heightShare(1, cam.dist, PLAIN)).toBeCloseTo(0.7, 9);
    });

    it("devrait cadrer la paire par la hauteur quand la plus grande y déborde (étoile 2 : tx −15,8, dist 36,0718)", () => {
      const cam = sizesRestCamera(PLACED, "sirius-a", PLAIN);
      expect(cam.tx).toBeCloseTo(-15.8, 9);
      expect(cam.dist).toBeCloseTo(36.0718, 4);
      expect(heightShare(8, cam.dist, PLAIN)).toBeCloseTo(0.7, 9);
    });
  });

  describe("introduction", () => {
    it("devrait reculer de × 1,6 sur le repos de la plus petite étoile (dist 4,5090 × 1,6)", () => {
      expectCam(sizesRestCamera(PLACED, "intro", PLAIN), { tx: 0, dist: 4.50897878727332 * 1.6, offX: 0, offY: 0 });
    });

    it("devrait garder le décalage de la zone libre du repos de la plus petite étoile", () => {
      const rest = sizesRestCamera(PLACED, "proxima-centauri", DESK);
      expectCam(sizesRestCamera(PLACED, "intro", DESK), { ...rest, dist: rest.dist * 1.6 });
    });
  });

  describe("grand écran (zone libre)", () => {
    it("devrait centrer la paire dans la zone, sur 90 % de sa largeur (zone 0,45–0,85 : offX 0,15, dist 20,1973)", () => {
      const cam = sizesRestCamera(PLACED, "sun", DESK);
      expect(cam.tx).toBeCloseTo(-3.2, 9);
      expect(cam.offX).toBeCloseTo(0.15, 9);
      expect(cam.offY).toBe(0);
      expect(cam.dist).toBeCloseTo(20.1973, 4);
      expect(widthShare(PAIR_HALF_WIDTH, cam.dist, DESK) / 0.4).toBeCloseTo(0.9, 9);
    });

    it("devrait limiter l'étoile à 80 % de la hauteur de l'écran quand la zone est plus large que haute", () => {
      const wide: SizesFrameContext = { ...PLAIN, zone: { left: 0.05, right: 0.95 } };
      const cam = sizesRestCamera(PLACED, "proxima-centauri", wide);
      expect(heightShare(1, cam.dist, wide)).toBeCloseTo(0.8, 9);
      expect(widthShare(1, cam.dist, wide) / 0.9).toBeLessThan(0.9);
    });
  });

  describe("téléphone (bande libre)", () => {
    /*
     * L'astre courant d'abord : la paire, cadrée sur 80 % de la largeur, ferait l'astre courant plus petit que s'il
     * était cadré seul sur 65 % ; il est alors cadré seul, centré dans la bande. La précédente sort par la droite et se
     * compare pendant le vol ; le suivant reste hors champ, à gauche.
     */
    it("devrait cadrer seule l'étoile courante sur 65 % de la largeur quand la paire la ferait plus petite (Soleil : tx −5,4, dist 14,2879)", () => {
      const cam = sizesRestCamera(PLACED, "sun", PHONE);
      expect(cam.tx).toBeCloseTo(-5.4, 9);
      expect(cam.offX).toBe(0);
      expect(cam.offY).toBeCloseTo(-0.145, 9);
      expect(cam.dist).toBeCloseTo(14.2879, 4);
      expect(widthShare(2, cam.dist, PHONE)).toBeCloseTo(SIZES_FILL.bandCurrentWidth, 9);
    });

    it("devrait cadrer seule la plus grande étoile de la fixture de même (Sirius : tx −20,2, dist 57,1517)", () => {
      const cam = sizesRestCamera(PLACED, "sirius-a", PHONE);
      expect(cam.tx).toBeCloseTo(-20.2, 9);
      expect(cam.dist).toBeCloseTo(57.1517, 4);
    });

    it("devrait cadrer la plus petite étoile seule sur 80 % de la largeur (dist 5,8045), plus grande qu'à 65 %", () => {
      const cam = sizesRestCamera(PLACED, "proxima-centauri", PHONE);
      expect(cam.tx).toBe(0);
      expect(cam.dist).toBeCloseTo(5.8045, 4);
      expect(widthShare(1, cam.dist, PHONE)).toBeCloseTo(0.8, 9);
    });

    it("devrait garder la paire, sur 80 % de la largeur, quand la précédente est minuscule et collée (tx −11,75, dist 68,7829)", () => {
      const tiny: readonly PlacedObject[] = [
        { key: "cygnus-x-1", radius: 0.05, extent: 0.1, x: 0 },
        { key: "proxima-centauri", radius: 10, extent: 10, x: -13.6 },
      ];
      const cam = sizesRestCamera(tiny, "proxima-centauri", PHONE);
      expect(cam.tx).toBeCloseTo(-11.75, 9);
      expect(cam.dist).toBeCloseTo(68.7829, 4);
      expect(widthShare(11.85, cam.dist, PHONE)).toBeCloseTo(0.8, 9);
    });

    it("devrait limiter l'étoile à 90 % de la hauteur de la bande quand la bande est basse", () => {
      const low: SizesFrameContext = { ...PHONE, band: { top: 0.45, bottom: 0.55 } };
      const cam = sizesRestCamera(PLACED, "sun", low);
      expect(heightShare(2, cam.dist, low) / 0.1).toBeCloseTo(0.9, 9);
      expect(widthShare(PAIR_HALF_WIDTH, cam.dist, low)).toBeLessThan(0.8);
    });

    it("devrait suivre la bande quand la bande et la zone sont fournies (mise en page compacte, comme au voyage)", () => {
      const both: SizesFrameContext = { ...PHONE, zone: { left: 0.45, right: 0.85 } };
      expectCam(sizesRestCamera(PLACED, "sun", both), sizesRestCamera(PLACED, "sun", PHONE));
    });
  });

  it("devrait écrire dans out, le renvoyer et en écraser tous les champs quand out est fourni", () => {
    const out: SizesCam = { tx: 9, dist: 9, offX: 9, offY: 9 };
    const result = sizesRestCamera(PLACED, "sun", DESK, out);
    expect(result).toBe(out);
    expectCam(out, sizesRestCamera(PLACED, "sun", DESK));
  });

  it("ne devrait pas partager l'état renvoyé entre deux appels sans out", () => {
    const sun = sizesRestCamera(PLACED, "sun", PLAIN);
    sizesRestCamera(PLACED, "sirius-a", PLAIN);
    expect(sun.tx).toBeCloseTo(-3.2, 9);
  });

  it("devrait cadrer l'encombrement, et non la seule taille comparée (trou noir de rayon 1 et d'encombrement 10)", () => {
    const hole: readonly PlacedObject[] = [{ key: "m87-star", radius: 1, extent: 10, x: 0 }];
    expect(heightShare(10, sizesRestCamera(hole, "m87-star", PLAIN).dist, PLAIN)).toBeCloseTo(0.7, 9);
  });

  it("devrait lever une erreur quand l'étoile de l'escale n'est pas posée", () => {
    expect(() => sizesRestCamera(PLACED, "betelgeuse", PLAIN)).toThrow(/betelgeuse/);
  });

  it("devrait lever une erreur à l'introduction quand aucune étoile n'est posée", () => {
    expect(() => sizesRestCamera([], "intro", PLAIN)).toThrow(/intro/);
  });
});

/**
 * Bord droit de la silhouette d'un astre (son encombrement) à l'écran, en fraction de la largeur (0 à gauche), vue par
 * la caméra au repos `cam` : la cible est à 0,5 + offX (décalage d'écran de setViewOffset). Le regard est
 * perpendiculaire à l'axe x, quelle que soit l'élévation : les centres sont dans le plan horizontal de la caméra, à la
 * profondeur cam.dist, et le rayon tangent droit à la sphère fait avec l'axe de visée l'angle
 * atan2(x − tx, dist) + asin(e / √((x − tx)² + dist²)). Plafonné à 90° : une sphère qui déborde sur le côté de la
 * caméra a son bord à l'infini, à droite. Écrit ici sans le module testé, pour ne pas le vérifier avec lui-même.
 */
function rightEdgeOnScreen(object: PlacedObject, cam: SizesCam, ctx: SizesFrameContext): number {
  const dx = object.x - cam.tx;
  const angle = Math.atan2(dx, cam.dist) + Math.asin(Math.min(1, object.extent / Math.hypot(dx, cam.dist)));
  return 0.5 + cam.offX + Math.tan(Math.min(angle, Math.PI / 2)) / (2 * ctx.aspect * tanHalf(ctx));
}

/** Les quatorze astres du comparateur, posés comme dans la scène. */
const OBJECTS = placeObjects(COMPARED_OBJECTS.map(layoutInput));

/**
 * Vues de référence, champ réglé comme au voyage (50° sous un rapport largeur / hauteur de 0,9, 36° au-dessus) :
 * grand écran avec zone libre ; téléphone et tablette en portrait, bande libre entre la barre haute et la plaque
 * repliée ; téléphone en paysage, sans bande ni zone (écran bas, cas le plus exigeant). `hiddenLeftOf` : bord gauche
 * de ce qui est visible.
 */
const VIEWS = [
  { name: "1 440 × 900, zone 0,45–0,85", hiddenLeftOf: 0.45, ctx: { aspect: 1440 / 900, fovDeg: 36, band: null, zone: { left: 0.45, right: 0.85 } } },
  { name: "375 × 812, bande 0,09–0,62", hiddenLeftOf: 0, ctx: { aspect: 375 / 812, fovDeg: 50, band: { top: 0.09, bottom: 0.62 }, zone: null } },
  { name: "820 × 1 180, bande 0,06–0,70", hiddenLeftOf: 0, ctx: { aspect: 820 / 1180, fovDeg: 50, band: { top: 0.06, bottom: 0.7 }, zone: null } },
  { name: "844 × 390, sans bande ni zone", hiddenLeftOf: 0, ctx: { aspect: 844 / 390, fovDeg: 36, band: null, zone: null } },
] as const satisfies readonly { name: string; hiddenLeftOf: number; ctx: SizesFrameContext }[];

/*
 * Invariant de non-apparition : au repos sur l'astre i, l'astre i + 1, qui sera dessiné dès que le vol commence, est
 * entièrement à gauche du bord gauche de la zone libre (sous la plaque), ou de l'écran sans zone. Le bord est celui de
 * la silhouette projetée de son encombrement, pas du point (x + e, 0, 0) : une grande sphère proche de la caméra
 * déborde nettement de ce point. En cas d'échec, élargir les écarts (layout.ts), ne pas affaiblir le test.
 */
describe("invariant de non-apparition, sur les quatorze astres du comparateur", () => {
  const CASES = VIEWS.flatMap((view) =>
    OBJECTS.slice(0, -1).map((object, i) => [view.name, object.key, OBJECTS[i + 1].key, view, i] as const),
  );

  it.each(CASES)("devrait garder l'astre suivant hors champ (%s, repos sur %s : %s caché)", (_name, stop, _next, view, i) => {
    const cam = sizesRestCamera(OBJECTS, stop, view.ctx);
    expect(rightEdgeOnScreen(OBJECTS[i + 1], cam, view.ctx)).toBeLessThan(view.hiddenLeftOf);
  });
});

/*
 * Invariant d'extériorité : pendant chaque vol vers l'astre suivant, la caméra reste hors de tout trou noir dessiné, à
 * plus de 1,05 encombrement de son centre : elle ne traverse jamais ce qu'il éclaire. Les retours suivent les mêmes
 * positions, en sens inverse.
 */
describe("invariant d'extériorité des trous noirs pendant les vols", () => {
  const HOLES = OBJECTS.map((object, index) => ({ object, index })).filter(({ index }) => COMPARED_OBJECTS[index].kind === "black-hole");
  const CASES = VIEWS.flatMap((view) => OBJECTS.slice(0, -1).map((object, i) => [view.name, object.key, view, i] as const));

  it.each(CASES)("devrait garder la caméra hors des trous noirs dessinés (%s, vol depuis %s)", (_name, stop, view, i) => {
    const from = sizesRestCamera(OBJECTS, stop, view.ctx);
    const to = sizesRestCamera(OBJECTS, OBJECTS[i + 1].key, view.ctx);
    const drawn = visibleObjectCount(i, i + 1, 0.5);
    for (let step = 0; step <= 100; step++) {
      const cam = sizesFlightCamera(from, to, step / 100);
      for (const { object, index } of HOLES) {
        if (index >= drawn) continue;
        expect(Math.hypot(object.x - cam.tx, cam.dist) / object.extent, `${object.key}, s = ${step / 100}`).toBeGreaterThan(1.05);
      }
    }
  });
});

describe("screenDisc", () => {
  const VIEW = { width: 1440, height: 900 };
  const CAM: SizesCam = { tx: -3, dist: 20, offX: 0.15, offY: -0.1 };
  /** Pixels par unité de tangente au centre de l'image : hauteur / (2 tan(champ / 2)). */
  const PX_PER_TANGENT = 900 / (2 * Math.tan(18 * DEG));

  it("devrait projeter le centre d'un astre sur la ligne de la cible, décalée comme la vue (offX, offY)", () => {
    const disc = screenDisc({ x: -1, extent: 2 }, CAM, DESK, VIEW);
    expect(disc.x).toBeCloseTo(1440 * 0.65 + (2 / 20) * PX_PER_TANGENT, 9);
    expect(disc.y).toBeCloseTo(900 * 0.4, 9);
  });

  it("devrait donner le rayon apparent de la sphère d'encombrement : tan(asin(e / d)) à la distance d du centre", () => {
    const disc = screenDisc({ x: -1, extent: 2 }, CAM, DESK, VIEW);
    expect(disc.radius).toBeCloseTo(PX_PER_TANGENT * Math.tan(Math.asin(2 / Math.hypot(2, 20))), 9);
  });

  it("devrait donner un rayon infini quand la caméra est dans la sphère", () => {
    expect(screenDisc({ x: -3, extent: 25 }, CAM, DESK, VIEW).radius).toBe(Number.POSITIVE_INFINITY);
  });

  it("devrait écrire dans out et le renvoyer quand out est fourni", () => {
    const out = { x: 0, y: 0, radius: 0 };
    expect(screenDisc({ x: -1, extent: 2 }, CAM, DESK, VIEW, out)).toBe(out);
  });
});

describe("rightEdgePx", () => {
  it.each(OBJECTS.slice(0, 6).map((object, i) => [object.key, object, i] as const))(
    "devrait donner en px le bord droit de la silhouette de %s, au repos sur l'astre suivant (grand écran)",
    (_key, object, i) => {
      const cam = sizesRestCamera(OBJECTS, OBJECTS[i + 1].key, DESK);
      expect(rightEdgePx(object, cam, DESK, 1440)).toBeCloseTo(1440 * rightEdgeOnScreen(object, cam, DESK), 6);
    },
  );
});

describe("railSideFade", () => {
  it.each([
    [-50, 1],
    [0, 1],
    [12, 0.5],
    [RAIL_FADE_PX, 0],
    [200, 0],
  ])("devrait effacer un astre qui déborde de la zone libre vers la règle, sur 24 px (débord %f px → %f)", (overflow, fit) => {
    expect(railSideFade(1200 + overflow, 1200)).toBeCloseTo(fit, 12);
  });
});

describe("sizesFlightCamera", () => {
  /** Repos de la fixture sur les étoiles 1 et 2, sans bande ni zone (valeurs des tests de sizesRestCamera). */
  const REST_1: SizesCam = { tx: -3.2, dist: 10.387181937966483, offX: 0, offY: 0 };
  const REST_2: SizesCam = { tx: -15.8, dist: 36.07183029818656, offX: 0, offY: 0 };

  it("devrait partir du repos de départ quand s = 0", () => {
    expectCam(sizesFlightCamera(REST_1, REST_2, 0), REST_1);
  });

  it("devrait arriver au repos d'arrivée quand s = 1", () => {
    expectCam(sizesFlightCamera(REST_1, REST_2, 1), REST_2);
  });

  it("devrait passer par la moyenne géométrique des distances à mi-vol (1 → 2 : dist 19,3568)", () => {
    expect(sizesFlightCamera(REST_1, REST_2, 0.5).dist).toBeCloseTo(19.3568, 4);
  });

  it.each([0.1, 0.25, 0.75, 0.9])("devrait multiplier la distance par un même facteur à pas de s égaux (s = %f)", (s) => {
    expect(sizesFlightCamera(REST_1, REST_2, s).dist).toBeCloseTo(REST_1.dist ** (1 - s) * REST_2.dist ** s, 9);
  });

  it("devrait faire suivre le zoom à la cible : à mi-vol, elle n'a fait que 34,92 % du chemin (tx −7,6002)", () => {
    const { tx } = sizesFlightCamera(REST_1, REST_2, 0.5);
    expect(tx).toBeCloseTo(-7.6002, 4);
    expect((tx - REST_1.tx) / (REST_2.tx - REST_1.tx)).toBeCloseTo(0.3492, 4);
  });

  it.each([0.1, 0.25, 0.75, 0.9])(
    "devrait avancer la cible du même pourcentage que la distance (w = (dist − a.dist) / (b.dist − a.dist), s = %f)",
    (s) => {
      const cam = sizesFlightCamera(REST_1, REST_2, s);
      const w = (cam.dist - REST_1.dist) / (REST_2.dist - REST_1.dist);
      expect((cam.tx - REST_1.tx) / (REST_2.tx - REST_1.tx)).toBeCloseTo(w, 9);
    },
  );

  it("devrait interpoler linéairement en s les décalages d'écran (quart du vol)", () => {
    const quarter = sizesFlightCamera({ ...REST_1, offX: 0.2, offY: 0 }, { ...REST_2, offX: 0, offY: -0.2 }, 0.25);
    expect(quarter.offX).toBeCloseTo(0.15, 12);
    expect(quarter.offY).toBeCloseTo(-0.05, 12);
  });

  it("devrait avancer la cible comme s quand les deux distances sont égales", () => {
    const cam = sizesFlightCamera({ tx: 0, dist: 10, offX: 0, offY: 0 }, { tx: -8, dist: 10, offX: 0, offY: 0 }, 0.25);
    expect(cam.tx).toBeCloseTo(-2, 12);
    expect(cam.dist).toBeCloseTo(10, 12);
  });

  it("ne devrait pas faire sauter la cible au départ quand les distances ne diffèrent que d'un ulp", () => {
    const a: SizesCam = { tx: 0, dist: 10, offX: 0, offY: 0 };
    const b: SizesCam = { tx: -8, dist: 10 + 2 ** -49, offX: 0, offY: 0 };
    expect(sizesFlightCamera(a, b, 0).tx).toBeCloseTo(0, 12);
    expect(sizesFlightCamera(a, b, 0.5).tx).toBeCloseTo(-4, 6);
  });

  it("devrait écrire dans out et le renvoyer quand out est fourni", () => {
    const out: SizesCam = { tx: 9, dist: 9, offX: 9, offY: 9 };
    const result = sizesFlightCamera(REST_1, REST_2, 0.3, out);
    expect(result).toBe(out);
    expectCam(out, sizesFlightCamera(REST_1, REST_2, 0.3));
  });

  it("ne devrait modifier ni a ni b", () => {
    const a = { ...REST_1 };
    const b = { ...REST_2 };
    sizesFlightCamera(a, b, 0.4);
    expect(a).toEqual(REST_1);
    expect(b).toEqual(REST_2);
  });
});

describe("visibleObjectCount", () => {
  it.each([
    [0, 0, 0, 1],
    [3, 3, 0, 4],
    [3, 4, 0.01, 5],
    [3, 4, 1, 5],
    [4, 3, 0.5, 5],
  ])("devrait dessiner, du repos ou du vol %i → %i à t = %f, %i astres", (fromIndex, toIndex, t, expected) => {
    expect(visibleObjectCount(fromIndex, toIndex, t)).toBe(expected);
  });
});

describe("haloOpacity", () => {
  it.each([
    [0, 0],
    [0.15, 0.5],
    [0.3, 1],
    [0.6, 1],
  ])("devrait faire entrer en fondu le halo de l'étoile qui arrive, smoothstep(0 ; 0,3 ; t) (t = %f → %f)", (t, expected) => {
    expect(haloOpacity(4, 3, 4, t)).toBeCloseTo(expected, 12);
  });

  it.each([
    [0, 1],
    [0.7, 1],
    [0.85, 0.5],
    [1, 0],
  ])("devrait éteindre le halo de l'étoile qui repart au retour, smoothstep(0 ; 0,3 ; 1 − t) (t = %f → %f)", (t, expected) => {
    expect(haloOpacity(4, 4, 3, t)).toBeCloseTo(expected, 12);
  });

  it.each([
    [3, 3, 4, 0.1],
    [0, 3, 4, 0.1],
    [3, 4, 3, 0.9],
    [2, 4, 3, 0.9],
    [5, 5, 5, 0],
  ])("devrait laisser le halo plein pour toute autre étoile (étoile %i, de %i vers %i, t = %f)", (index, fromIndex, toIndex, t) => {
    expect(haloOpacity(index, fromIndex, toIndex, t)).toBe(1);
  });
});
