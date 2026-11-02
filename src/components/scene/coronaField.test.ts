import { ClampToEdgeWrapping, LinearFilter, RGFormat, RepeatWrapping, UnsignedByteType } from "three";
import { describe, expect, it } from "vitest";
import {
  CORONA_FIELD_HEIGHT,
  CORONA_FIELD_WIDTH,
  coronaFieldData,
  coronaJets,
  createCoronaFieldTexture,
  fieldCoordinates,
  fieldDirection,
  prominenceSites,
  valueNoise,
} from "@/components/scene/coronaField";
import type { Vec3 } from "@/lib/astro/constants";

/*
 * Champ de la couronne cuit dans une texture : jets (r) et sites des protubérances (g), lus par le shader en longitude
 * (autour du pôle, y) et en distance au pôle, au lieu de deux à trois bruits de valeur par pixel.
 */

/** Directions unitaires réparties sur la sphère (tirage reproductible). */
function directions(count: number): Vec3[] {
  let seed = 7;
  const random = () => (seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648) / 2_147_483_648;
  return Array.from({ length: count }, () => {
    const y = 2 * random() - 1;
    const angle = 2 * Math.PI * random();
    const ring = Math.sqrt(1 - y * y);
    return { x: ring * Math.cos(angle), y, z: ring * Math.sin(angle) };
  });
}

/** Lecture bilinéaire du canal `channel` de la carte, comme le GPU : répétée en longitude, bornée aux pôles. */
function sample(data: Uint8Array, u: number, v: number, channel: 0 | 1): number {
  const x = u * CORONA_FIELD_WIDTH - 0.5;
  const y = Math.min(Math.max(v * CORONA_FIELD_HEIGHT - 0.5, 0), CORONA_FIELD_HEIGHT - 1);
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const at = (i: number, j: number) => {
    const column = ((i % CORONA_FIELD_WIDTH) + CORONA_FIELD_WIDTH) % CORONA_FIELD_WIDTH;
    return data[(Math.min(j, CORONA_FIELD_HEIGHT - 1) * CORONA_FIELD_WIDTH + column) * 2 + channel] / 255;
  };
  const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * (x - x0);
  const bottom = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * (x - x0);
  return top + (bottom - top) * (y - y0);
}

describe("valueNoise (bruit de valeur du shader)", () => {
  it("devrait rester entre 0 et 1 et redonner la même valeur au même point", () => {
    for (const { x, y, z } of directions(500)) {
      const value = valueNoise(x * 7.5 + 23, y * 7.5, z * 7.5);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
      expect(valueNoise(x * 7.5 + 23, y * 7.5, z * 7.5)).toBe(value);
    }
  });

  it("devrait varier sans saut : continu d'un point à son voisin", () => {
    for (const { x, y, z } of directions(200)) {
      expect(Math.abs(valueNoise(x * 4, y * 4, z * 4) - valueNoise(x * 4 + 1e-4, y * 4, z * 4))).toBeLessThan(1e-3);
    }
  });
});

describe("fieldDirection, fieldCoordinates", () => {
  it("devrait retrouver les coordonnées d'un point de la carte depuis sa direction", () => {
    for (const [u, v] of [
      [0.1, 0.2],
      [0.5, 0.5],
      [0.93, 0.71],
    ] as const) {
      const { u: back, v: down } = fieldCoordinates(fieldDirection(u, v));
      expect(back).toBeCloseTo(u, 9);
      expect(down).toBeCloseTo(v, 9);
    }
  });

  it("devrait poser le pôle nord du Soleil (y) en haut de la carte, et refermer la carte en longitude", () => {
    expect(fieldDirection(0.37, 0).y).toBeCloseTo(1, 12);
    const start = fieldDirection(0, 0.5);
    const end = fieldDirection(1, 0.5);
    expect(Math.hypot(start.x - end.x, start.y - end.y, start.z - end.z)).toBeLessThan(1e-12);
  });
});

describe("coronaFieldData", () => {
  it("devrait cuire une carte de 256 × 128 texels à deux canaux de 8 bits", () => {
    expect(coronaFieldData()).toHaveLength(CORONA_FIELD_WIDTH * CORONA_FIELD_HEIGHT * 2);
    expect([CORONA_FIELD_WIDTH, CORONA_FIELD_HEIGHT]).toEqual([256, 128]);
  });

  it("devrait ranger au centre de chaque texel les jets (r) et les sites des protubérances (g) de sa direction", () => {
    const data = coronaFieldData();
    for (const [i, j] of [
      [0, 0],
      [17, 40],
      [128, 64],
      [255, 127],
    ] as const) {
      const n = fieldDirection((i + 0.5) / CORONA_FIELD_WIDTH, (j + 0.5) / CORONA_FIELD_HEIGHT);
      expect(data[(j * CORONA_FIELD_WIDTH + i) * 2]).toBe(Math.round(255 * coronaJets(n)));
      expect(data[(j * CORONA_FIELD_WIDTH + i) * 2 + 1]).toBe(Math.round(255 * prominenceSites(n)));
    }
  });

  it("devrait suivre le bruit calculé par pixel à 2 % près, filtrage et 8 bits compris", () => {
    const data = coronaFieldData();
    let worstJets = 0;
    let worstSites = 0;
    for (const n of directions(20_000)) {
      const { u, v } = fieldCoordinates(n);
      worstJets = Math.max(worstJets, Math.abs(sample(data, u, v, 0) - coronaJets(n)));
      worstSites = Math.max(worstSites, Math.abs(sample(data, u, v, 1) - prominenceSites(n)));
    }
    expect(worstJets).toBeLessThan(0.02);
    expect(worstSites).toBeLessThan(0.02);
  });

  it("ne devrait cuire la carte qu'une fois : la scène reconstruite la reprend", () => {
    expect(coronaFieldData()).toBe(coronaFieldData());
  });
});

describe("createCoronaFieldTexture", () => {
  it("devrait lire la carte en deux canaux de 8 bits, filtrée, répétée en longitude et bornée aux pôles, sans mipmap", () => {
    const texture = createCoronaFieldTexture();
    expect(texture.image).toMatchObject({ width: CORONA_FIELD_WIDTH, height: CORONA_FIELD_HEIGHT, data: coronaFieldData() });
    expect([texture.format, texture.type]).toEqual([RGFormat, UnsignedByteType]);
    expect([texture.wrapS, texture.wrapT]).toEqual([RepeatWrapping, ClampToEdgeWrapping]);
    expect([texture.magFilter, texture.minFilter, texture.generateMipmaps]).toEqual([LinearFilter, LinearFilter, false]);
    texture.dispose();
  });

  it("devrait créer une texture par scène, à libérer avec elle, sur les mêmes données", () => {
    const first = createCoronaFieldTexture();
    const second = createCoronaFieldTexture();
    expect(second).not.toBe(first);
    expect(second.image.data).toBe(first.image.data);
  });
});
