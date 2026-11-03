import { Color } from "three";
import { describe, expect, it } from "vitest";
import { wienCoefficients } from "@/components/scene/starSurface";
import { neutralToneMap } from "@/components/scene/toneMapping.testUtils";
import { createStarMeshes, haloLook, showStars, starLook } from "@/components/sizes/starMeshes";
import { COMPARED_STARS, type ComparedStar, type SizeStarKey } from "@/lib/astro/starSizes";
import { placeObjects } from "@/lib/sizes/layout";
import { layoutInput } from "@/lib/sizes/objects";

/*
 * Étoiles 3D de la page « Tailles », construites sans WebGL (Three crée maillages et matériaux sans rendu) :
 * positions et tailles de la disposition, étoiles dessinées et halo de celle qui arrive pendant un vol.
 */

const PLACED = placeObjects(COMPARED_STARS.map(layoutInput));
const INDICES = COMPARED_STARS.map((_, i) => i);

function star(key: SizeStarKey): ComparedStar {
  const found = COMPARED_STARS.find((candidate) => candidate.key === key);
  if (!found) throw new Error(`Étoile absente des données : ${key}`);
  return found;
}

const build = () => createStarMeshes(COMPARED_STARS, PLACED, { time: { value: 0 }, lite: false, sunSpots: null });

describe("createStarMeshes", () => {
  it("devrait poser une sphère par étoile, à la position x de la disposition, mise à l'échelle de son rayon", () => {
    const { meshes } = build();
    expect(meshes.map((mesh) => [mesh.key, mesh.body.position.x, mesh.body.scale.x])).toEqual(
      PLACED.map((placed) => [placed.key, placed.x, placed.radius]),
    );
  });

  it("devrait entourer chaque étoile d'un halo de son étendue (1,25 rayon, 1,7 pour les chaudes), centré sur elle", () => {
    const { meshes } = build();
    expect(meshes.map((mesh) => [mesh.halo.position.x, mesh.halo.scale.x])).toEqual(
      PLACED.map((placed, i) => [placed.x, expect.closeTo(haloLook(COMPARED_STARS[i]).extent * placed.radius, 12)]),
    );
  });

  it("devrait ranger sphères et halos dans un seul groupe, à ajouter à la scène", () => {
    const { group, meshes } = build();
    expect(group.children).toHaveLength(2 * meshes.length);
  });

  it("devrait faire partager à toutes les surfaces le même temps affiché", () => {
    const time = { value: 0 };
    const { meshes } = createStarMeshes(COMPARED_STARS, PLACED, { time, lite: false, sunSpots: null });
    expect(meshes.every((mesh) => mesh.surface.uTime === time)).toBe(true);
  });

  it("devrait réserver les taches au Soleil quand on lui donne l'activité du jour", () => {
    const { meshes } = createStarMeshes(COMPARED_STARS, PLACED, {
      time: { value: 0 },
      lite: false,
      sunSpots: { activity: 0.6, latitude: 0.25 },
    });
    expect(meshes.filter((mesh) => mesh.surface.uSpotA.value.length > 0).map((mesh) => mesh.key)).toEqual(["sun"]);
  });

  it("devrait ne montrer au départ que la plus petite étoile (repos sur l'introduction)", () => {
    const { meshes } = build();
    expect(meshes.map((mesh) => mesh.body.visible)).toEqual(INDICES.map((i) => i === 0));
  });
});

describe("showStars", () => {
  it("devrait dessiner les étoiles 0 à 3 au repos sur l'étoile 3, halos pleins", () => {
    const { meshes } = build();
    showStars(meshes, 3, 3, 0);
    expect(meshes.map((mesh) => mesh.body.visible)).toEqual(INDICES.map((i) => i <= 3));
    expect(meshes.slice(0, 4).map((mesh) => mesh.haloOpacity.value)).toEqual([1, 1, 1, 1]);
  });

  it("devrait dessiner l'étoile suivante dès le départ du vol, son halo en fondu (3 → 4 à t = 0,15 : 0,5)", () => {
    const { meshes } = build();
    showStars(meshes, 3, 4, 0.15);
    expect(meshes.map((mesh) => mesh.body.visible)).toEqual(INDICES.map((i) => i <= 4));
    expect(meshes[4].haloOpacity.value).toBeCloseTo(0.5, 12);
    expect(meshes[3].haloOpacity.value).toBe(1);
  });

  it("devrait éteindre le halo de l'étoile qui repart à la fin d'un vol retour (4 → 3 à t = 0,85 : 0,5)", () => {
    const { meshes } = build();
    showStars(meshes, 4, 3, 0.85);
    expect(meshes[4].body.visible).toBe(true);
    expect(meshes[4].haloOpacity.value).toBeCloseTo(0.5, 12);
  });

  it("devrait cacher le halo d'une étoile cachée, et celui d'une étoile dont le halo est éteint", () => {
    const { meshes } = build();
    showStars(meshes, 3, 4, 0);
    expect(meshes.map((mesh) => mesh.halo.visible)).toEqual(INDICES.map((i) => i <= 3));
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
