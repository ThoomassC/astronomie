import { Color } from "three";
import { describe, expect, it } from "vitest";
import { createStarMeshes, showStars, starLook } from "@/components/sizes/starMeshes";
import { COMPARED_STARS, type ComparedStar, type SizeStarKey } from "@/lib/astro/starSizes";
import { placeStars } from "@/lib/sizes/layout";

/*
 * Étoiles 3D de la page « Tailles », construites sans WebGL (Three crée maillages et matériaux sans rendu) :
 * positions et tailles de la disposition, étoiles dessinées et halo de celle qui arrive pendant un vol.
 */

const PLACED = placeStars(COMPARED_STARS);
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

  it("devrait entourer chaque étoile d'un halo de 1,25 rayon, centré sur elle", () => {
    const { meshes } = build();
    expect(meshes.map((mesh) => [mesh.halo.position.x, mesh.halo.scale.x])).toEqual(
      PLACED.map((placed) => [placed.x, expect.closeTo(1.25 * placed.radius, 12)]),
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
    const cells = COMPARED_STARS.map((compared) => starLook(compared).granulation);
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
