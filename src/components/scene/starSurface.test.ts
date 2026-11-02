import { Color, Vector3 } from "three";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createSun } from "@/components/scene/bodies";
import { coronaFieldData } from "@/components/scene/coronaField";
import {
  SUN_SURFACE,
  createStarSurfaceMaterial,
  placeStarspots,
  wienCoefficients,
  type StarSurfaceUniforms,
} from "@/components/scene/starSurface";

const DEG = Math.PI / 180;
/** Rotation différentielle d'essai : 0,03 rad/s à l'équateur, 30 % de moins aux pôles. */
const spin = (latitude: number) => 0.03 * (1 - 0.3 * Math.sin(latitude) ** 2);

function sunUniforms(groups = 12): StarSurfaceUniforms {
  return createStarSurfaceMaterial({ ...SUN_SURFACE, spotGroups: groups, time: { value: 0 } }).uniforms;
}

interface Spot {
  x: number;
  y: number;
  z: number;
  radius: number;
  umbra: number;
  plageRadius: number;
  plage: number;
  cosBound: number;
}

function spotsOf(uniforms: StarSurfaceUniforms): Spot[] {
  const a = uniforms.uSpotA.value;
  const b = uniforms.uSpotB.value;
  return Array.from({ length: a.length / 4 }, (_, i) => ({
    x: a[i * 4],
    y: a[i * 4 + 1],
    z: a[i * 4 + 2],
    radius: a[i * 4 + 3],
    umbra: b[i * 4],
    plageRadius: b[i * 4 + 1],
    plage: b[i * 4 + 2],
    cosBound: b[i * 4 + 3],
  }));
}

/** Groupes allumés : leur tache de tête (indice pair) a un rayon. */
const litGroups = (spots: Spot[]) => spots.filter((spot, i) => i % 2 === 0 && spot.radius > 0).length;

describe("wienCoefficients", () => {
  it("devrait décroître comme 1/T : une étoile deux fois plus chaude rougit deux fois moins", () => {
    const sun = wienCoefficients(5772);
    const hot = wienCoefficients(11544);
    expect(hot.x).toBeCloseTo(sun.x / 2, 9);
    expect(hot.y).toBeCloseTo(sun.y / 2, 9);
    expect(hot.z).toBeCloseTo(sun.z / 2, 9);
  });

  it("devrait assombrir davantage le bleu que le vert, et le vert que le rouge (rougissement des zones froides)", () => {
    const sun = wienCoefficients(5772);
    expect(sun.x).toBeCloseTo(1.438777e-2 / (610e-9 * 5772), 6);
    expect(sun.y).toBeGreaterThan(sun.x);
    expect(sun.z).toBeGreaterThan(sun.y);
  });
});

describe("createStarSurfaceMaterial", () => {
  it("devrait partager l'uniforme du temps et copier la couleur", () => {
    const time = { value: 3 };
    const color = new Color(1.6, 0.66, 0.1);
    const { material, uniforms } = createStarSurfaceMaterial({ ...SUN_SURFACE, color, time });
    expect(uniforms.uTime).toBe(time);
    expect(material.uniforms.uTime).toBe(time);
    expect(uniforms.uColor.value).not.toBe(color);
    expect(uniforms.uColor.value.equals(color)).toBe(true);
  });

  it("devrait réserver deux taches par groupe, et aucune quand l'étoile n'en a pas", () => {
    const spotted = createStarSurfaceMaterial({ ...SUN_SURFACE, spotGroups: 5, time: { value: 0 } });
    expect(spotted.material.defines.STARSPOTS).toBe(10);
    expect(spotted.uniforms.uSpotA.value).toHaveLength(40);
    expect(spotted.uniforms.uSpotB.value).toHaveLength(40);
    const clear = createStarSurfaceMaterial({ ...SUN_SURFACE, spotGroups: 0, time: { value: 0 } });
    expect(clear.material.defines.STARSPOTS).toBe(0);
  });

  it("devrait compiler la variante allégée seulement quand elle est demandée", () => {
    const full = createStarSurfaceMaterial({ ...SUN_SURFACE, time: { value: 0 } });
    const lite = createStarSurfaceMaterial({ ...SUN_SURFACE, time: { value: 0 }, lite: true });
    expect(full.material.defines.STAR_LITE).toBeUndefined();
    expect(lite.material.defines.STAR_LITE).toBe("");
  });

  it("devrait éteindre toutes les taches tant qu'aucune n'est placée", () => {
    const spots = spotsOf(sunUniforms());
    expect(spots.every((spot) => spot.radius === 0 && spot.plage === 0 && spot.cosBound > 1)).toBe(true);
  });
});

describe("placeStarspots", () => {
  it("ne devrait allumer aucune tache ni facule quand l'activité est nulle", () => {
    const uniforms = sunUniforms();
    for (const time of [0, 37, 512, 4096]) {
      placeStarspots(uniforms, { time, activity: 0, latitude: 15 * DEG, spin });
      expect(spotsOf(uniforms).every((spot) => spot.radius === 0 && spot.plage === 0 && spot.cosBound > 1)).toBe(true);
    }
  });

  it("devrait allumer d'autant plus de groupes que l'activité est forte", () => {
    const uniforms = sunUniforms();
    const count = (activity: number) => {
      let lit = 0;
      for (let time = 0; time < 2000; time += 13) {
        placeStarspots(uniforms, { time, activity, latitude: 15 * DEG, spin });
        lit += litGroups(spotsOf(uniforms));
      }
      return lit;
    };
    const low = count(0.25);
    const mid = count(0.6);
    const high = count(1);
    expect(low).toBeGreaterThan(0);
    expect(mid).toBeGreaterThan(low);
    expect(high).toBeGreaterThan(mid);
  });

  it("devrait poser les taches sur la sphère unité, dans les bandes d'activité (entre 3° et 45° de latitude)", () => {
    const uniforms = sunUniforms();
    for (let time = 0; time < 3000; time += 29) {
      placeStarspots(uniforms, { time, activity: 1, latitude: 15 * DEG, spin });
      for (const spot of spotsOf(uniforms)) {
        if (spot.radius === 0) continue;
        expect(Math.hypot(spot.x, spot.y, spot.z)).toBeCloseTo(1, 5);
        const latitude = Math.abs(Math.asin(spot.y)) / DEG;
        expect(latitude).toBeGreaterThan(3);
        expect(latitude).toBeLessThan(45);
        expect(spot.umbra).toBeGreaterThan(0);
        expect(spot.umbra).toBeLessThan(1);
        expect(spot.cosBound).toBeLessThan(Math.cos(spot.radius));
      }
    }
  });

  it("devrait faire tourner chaque tache dans le sens direct, à la vitesse de sa latitude", () => {
    const uniforms = sunUniforms();
    const longitude = (spot: Spot) => Math.atan2(-spot.z, spot.x);
    let checked = 0;
    for (let time = 5; time < 3000 && checked < 6; time += 41) {
      placeStarspots(uniforms, { time, activity: 1, latitude: 15 * DEG, spin });
      const before = spotsOf(uniforms);
      placeStarspots(uniforms, { time: time + 0.5, activity: 1, latitude: 15 * DEG, spin });
      const after = spotsOf(uniforms);
      before.forEach((spot, i) => {
        // Même tache (même incarnation) : même latitude.
        if (spot.radius === 0 || after[i].radius === 0 || Math.abs(spot.y - after[i].y) > 1e-6) return;
        const turned = (longitude(after[i]) - longitude(spot) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
        expect(turned).toBeCloseTo(spin(Math.asin(spot.y)) * 0.5, 4);
        checked++;
      });
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("devrait donner le même ciel pour le même instant (aucun hasard d'une image à l'autre)", () => {
    const first = sunUniforms();
    const second = sunUniforms();
    placeStarspots(first, { time: 321.5, activity: 0.7, latitude: 12 * DEG, spin });
    placeStarspots(second, { time: 321.5, activity: 0.7, latitude: 12 * DEG, spin });
    expect(Array.from(second.uSpotA.value)).toEqual(Array.from(first.uSpotA.value));
    expect(Array.from(second.uSpotB.value)).toEqual(Array.from(first.uSpotB.value));
  });
});

describe("createSun (préréglage du Soleil branché sur le cycle solaire)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** Frontière navigateur : écran tactile (pointer: coarse) ou souris. */
  function stubPointer(coarse: boolean): void {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: coarse && query === "(pointer: coarse)",
      media: query,
      addEventListener() {},
      removeEventListener() {},
    }));
  }

  it("devrait lire les jets et les protubérances de la couronne dans la carte cuite une fois (coronaField.ts)", () => {
    const sun = createSun(() => Date.UTC(2024, 9, 15));
    expect(sun.coronaUniforms.uField.value.image.data).toBe(coronaFieldData());
    expect(sun.corona.material.uniforms.uField).toBe(sun.coronaUniforms.uField);
  });

  it("devrait alléger surface et couronne sur écran tactile : ni spicules ni fibres (CORONA_LITE), 8 cellules (STAR_LITE)", () => {
    stubPointer(true);
    const lite = createSun(() => Date.UTC(2024, 9, 15));
    expect(lite.corona.material.defines.CORONA_LITE).toBe("");
    expect(lite.mesh.material.defines.STAR_LITE).toBe("");
    stubPointer(false);
    const full = createSun(() => Date.UTC(2024, 9, 15));
    expect(full.corona.material.defines.CORONA_LITE).toBeUndefined();
    expect(full.mesh.material.defines.STAR_LITE).toBeUndefined();
  });

  it("devrait poser le pôle du Soleil sur l'axe y local, à 7,25° du pôle de l'écliptique, et la couronne dans le même repère", () => {
    const sun = createSun(() => Date.UTC(2024, 9, 15));
    const pole = new Vector3(0, 1, 0).applyQuaternion(sun.mesh.quaternion);
    expect(pole.angleTo(new Vector3(0, 1, 0)) / DEG).toBeCloseTo(7.25, 1);
    expect(pole.applyMatrix3(sun.coronaUniforms.uStarFrame.value).y).toBeCloseTo(1, 9);
  });

  it("devrait régler l'activité sur la date simulée : maximum en octobre 2024, calme en décembre 2019", () => {
    let ms = Date.UTC(2024, 9, 15);
    const sun = createSun(() => ms);
    sun.update();
    expect(sun.surface.uActivity.value).toBeCloseTo(1, 2);
    ms = Date.UTC(2019, 11, 15);
    sun.update();
    expect(sun.surface.uActivity.value).toBeLessThan(0.1);
  });

  it("devrait montrer des taches au maximum du cycle, aucune au minimum", () => {
    let ms = Date.UTC(2024, 9, 15);
    const sun = createSun(() => ms);
    let lit = 0;
    for (let time = 0; time < 600; time += 7) {
      sun.time.value = time;
      sun.update();
      lit += litGroups(spotsOf(sun.surface));
    }
    expect(lit).toBeGreaterThan(0);
    ms = Date.UTC(2019, 11, 15);
    for (let time = 0; time < 600; time += 7) {
      sun.time.value = time;
      sun.update();
      expect(litGroups(spotsOf(sun.surface))).toBe(0);
    }
  });
});
