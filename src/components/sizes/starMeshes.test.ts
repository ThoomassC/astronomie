import { Color, PlaneGeometry, SphereGeometry } from "three";
import { describe, expect, it } from "vitest";
import { wienCoefficients } from "@/components/scene/starSurface";
import { neutralToneMap } from "@/components/scene/toneMapping.testUtils";
import { createStarMesh, haloLook, starLook } from "@/components/sizes/starMeshes";
import { COMPARED_STARS, type ComparedStar, type SizeStarKey } from "@/lib/astro/starSizes";

/*
 * Étoiles 3D de la page « Tailles », construites sans WebGL (Three crée maillages et matériaux sans rendu) : aspect de
 * chaque étoile, sphère, halo et surface. Leur pose dans la scène et leur affichage pendant les vols se testent dans
 * sizesObjects.test.ts.
 */

const PLACE = { x: -42, radius: 8.97 };

function star(key: SizeStarKey): ComparedStar {
  const found = COMPARED_STARS.find((candidate) => candidate.key === key);
  if (!found) throw new Error(`Étoile absente des données : ${key}`);
  return found;
}

/** Étoile 3D d'une étoile des données, posée en PLACE. */
const build = (key: SizeStarKey, options: { sunSpots?: { activity: number; latitude: number }; time?: { value: number } } = {}) =>
  createStarMesh(star(key), PLACE, {
    time: options.time ?? { value: 0 },
    lite: false,
    sunSpots: options.sunSpots ?? null,
    sphere: new SphereGeometry(1, 8, 6),
    square: new PlaneGeometry(2, 2),
  });

describe("createStarMesh", () => {
  it("devrait poser une sphère à la place donnée, mise à l'échelle du rayon", () => {
    const mesh = build("pollux");
    expect(mesh.key).toBe("pollux");
    expect([mesh.body.position.x, mesh.body.scale.x]).toEqual([-42, 8.97]);
  });

  it("devrait l'entourer d'un halo de son étendue (1,25 rayon, 1,7 pour les chaudes), centré sur elle", () => {
    expect(build("pollux").halo.scale.x).toBeCloseTo(1.25 * 8.97, 12);
    expect(build("rigel").halo.scale.x).toBeCloseTo(1.7 * 8.97, 12);
    expect(build("rigel").halo.position.x).toBe(-42);
  });

  it("devrait faire partager à sa surface le temps affiché donné", () => {
    const time = { value: 0 };
    expect(build("sun", { time }).surface.uTime).toBe(time);
  });

  it("devrait réserver les taches au Soleil quand on lui donne l'activité du jour", () => {
    const sunSpots = { activity: 0.6, latitude: 0.25 };
    expect(build("sun", { sunSpots }).surface.uSpotA.value.length).toBeGreaterThan(0);
    expect(build("arcturus", { sunSpots }).surface.uSpotA.value).toHaveLength(0);
  });

  it("devrait rendre son corps transparent, pleinement opaque au départ, pour l'effacer près de la règle", () => {
    const mesh = build("rigel");
    expect(mesh.body.material.transparent).toBe(true);
    expect(mesh.surface.uOpacity.value).toBe(1);
  });

  it("devrait dessiner le corps, puis le halo additif", () => {
    const mesh = build("sun");
    expect(mesh.body.renderOrder).toBeLessThan(mesh.halo.renderOrder);
  });
});

describe("starLook", () => {
  it("devrait garder au Soleil la granulation du Voyage (60 cellules par rayon)", () => {
    expect(starLook(star("sun")).granulation).toBe(60);
  });

  it("devrait donner aux supergéantes quelques cellules géantes, et des cellules d'autant plus grandes que l'étoile l'est", () => {
    // Parmi les étoiles froides : les chaudes ont un grain plus fin (test suivant).
    const cool = COMPARED_STARS.filter((compared) => compared.temperatureK < 6500);
    const cells = cool.map((compared) => starLook(compared).granulation);
    expect(cells).toEqual([...cells].sort((a, b) => b - a));
    expect(starLook(star("betelgeuse")).granulation).toBeLessThan(8);
    expect(starLook(star("vy-canis-majoris")).granulation).toBeGreaterThanOrEqual(3);
  });

  it("devrait adoucir la granulation des étoiles chaudes, presque sans convection en surface (Sirius A, Rigel)", () => {
    expect(starLook(star("rigel")).granulationContrast).toBeLessThan(starLook(star("sun")).granulationContrast / 2);
    expect(starLook(star("sirius-a")).granulationContrast).toBeLessThan(starLook(star("sun")).granulationContrast / 2);
  });

  it("devrait teinter la surface de la couleur de l'étoile (corps noir), plus lumineuse que le blanc (HDR)", () => {
    const { color, temperature } = starLook(star("sun"));
    const display = new Color(star("sun").color);
    expect(temperature).toBe(5772);
    expect(color.r / color.b).toBeCloseTo(display.r / display.b, 9);
    expect(color.r).toBeGreaterThan(1);
  });
});

/*
 * Étoiles chaudes (Sirius A, Rigel) : leur couleur HDR, dominée par le bleu, passait au-delà du coude du tone mapping
 * PBR Neutral, qui écrase le centre du disque plus que le bord ; l'assombrissement centre-bord en température, déjà
 * faible à ces températures, disparaissait : disque pâle et plat. Elles ont désormais un éclat moindre, un
 * assombrissement en intensité, un grain fin et peu contrasté, un halo plus large et bleuté. Le Soleil et les étoiles
 * froides ne changent pas.
 */
describe("étoiles chaudes", () => {
  it.each(["sirius-a", "rigel"] as const)("devrait assombrir le bord de %s en intensité (u = 0,35), à un éclat de 1,2", (key) => {
    const look = starLook(star(key));
    expect(look.limbIntensity).toBeCloseTo(0.35, 9);
    const display = new Color(star(key).color);
    expect(look.color.r / display.r).toBeCloseTo(1.2, 9);
  });

  it.each(["sun", "betelgeuse", "proxima-centauri"] as const)("ne devrait rien changer à %s, étoile froide (u = 0, éclat 1,6)", (key) => {
    const look = starLook(star(key));
    expect(look.limbIntensity).toBe(0);
    expect(look.color.r / new Color(star(key).color).r).toBeCloseTo(1.6, 9);
  });

  it.each(["sirius-a", "rigel"] as const)("devrait donner à %s un grain fin et peu contrasté plutôt que rien", (key) => {
    const look = starLook(star(key));
    expect(look.granulationContrast).toBeCloseTo(0.045, 9);
    expect(look.granulation).toBeCloseTo(Math.min(80, 1.5 * Math.min(80, Math.max(4, 60 * star(key).radiusSolar ** -0.35))), 9);
  });

  it("devrait entourer les étoiles chaudes d'un halo de 1,7 rayon, plus vif et bleuté ; les froides de 1,25 rayon", () => {
    const rigel = haloLook(star("rigel"));
    const sun = haloLook(star("sun"));
    expect(rigel.extent).toBeCloseTo(1.7, 9);
    expect(sun.extent).toBeCloseTo(1.25, 9);
    const rigelColor = new Color(star("rigel").color);
    // Teinte mêlée à 35 % de la classe O (#9BB0FF), gain 0,85 : plus bleue que l'étoile.
    expect(rigel.color.b / rigel.color.r).toBeGreaterThan(rigelColor.b / rigelColor.r);
    const sunColor = new Color(star("sun").color).multiplyScalar(0.55);
    expect([sun.color.r, sun.color.g, sun.color.b]).toEqual([
      expect.closeTo(sunColor.r, 9),
      expect.closeTo(sunColor.g, 9),
      expect.closeTo(sunColor.b, 9),
    ]);
  });

  /** Luminance (Rec. 709, linéaire) affichée au point μ du disque : miroir du shader de surface puis de PBR Neutral. */
  function displayedLuminance(key: SizeStarKey, mu: number): { luminance: number; red: number; blue: number } {
    const look = starLook(star(key));
    const wien = wienCoefficients(look.temperature);
    const t = (1 - look.limbDarkening + look.limbDarkening * mu) ** 0.25;
    const intensity = 1 - look.limbIntensity * (1 - mu);
    const light = [
      look.color.r * Math.exp(-wien.x * (1 / t - 1)) * intensity,
      look.color.g * Math.exp(-wien.y * (1 / t - 1)) * intensity,
      look.color.b * Math.exp(-wien.z * (1 / t - 1)) * intensity,
    ] as const;
    const [red, green, blue] = neutralToneMap(light);
    return { luminance: 0.2126 * red + 0.7152 * green + 0.0722 * blue, red, blue };
  }

  it.each(["sirius-a", "rigel"] as const)(
    "devrait montrer un disque ni plat ni charbonneux : à mi-rayon (μ = 0,5), %s brille de 0,6 à 0,85 fois son centre, encore bleuté",
    (key) => {
      const center = displayedLuminance(key, 1);
      const half = displayedLuminance(key, 0.5);
      expect(half.luminance / center.luminance).toBeGreaterThan(0.6);
      expect(half.luminance / center.luminance).toBeLessThan(0.85);
      expect(half.blue).toBeGreaterThan(half.red);
    },
  );

  it("devrait garder au Soleil son assombrissement centre-bord (0,82 à mi-rayon)", () => {
    expect(displayedLuminance("sun", 0.5).luminance / displayedLuminance("sun", 1).luminance).toBeCloseTo(0.82, 2);
  });
});
