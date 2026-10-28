import { describe, expect, it } from "vitest";
import { STOP_ORDER } from "@/lib/journey/camera";
import { SATURN_RING, TEXTURE_KEYS, pickTextureTier, textureLoadOrder, textureUrl } from "@/components/scene/textureSet";

describe("pickTextureTier", () => {
  const laptop = { coarsePointer: false, shortSide: 900, maxTextureSize: 16384, pixelHeight: 1350 };

  it("devrait servir le 1K à un téléphone", () => {
    expect(pickTextureTier({ coarsePointer: true, shortSide: 390, maxTextureSize: 16384, pixelHeight: 1266 })).toBe("1k");
  });

  it("devrait servir le 2K à un ordinateur et à une tablette", () => {
    expect(pickTextureTier(laptop)).toBe("2k");
    expect(pickTextureTier({ coarsePointer: true, shortSide: 820, maxTextureSize: 16384, pixelHeight: 1770 })).toBe("2k");
  });

  it("devrait servir le 1K à un écran trop bas pour lire le plein niveau d'une carte 2K", () => {
    expect(pickTextureTier({ ...laptop, shortSide: 768, pixelHeight: 768 })).toBe("1k");
  });

  it("devrait se replier sur le 1K quand le GPU refuse les grandes textures", () => {
    expect(pickTextureTier({ ...laptop, maxTextureSize: 2048 })).toBe("1k");
  });
});

describe("textureUrl", () => {
  it("devrait chercher les cartes des planètes dans le dossier de la résolution choisie", () => {
    expect(textureUrl("earth", "2k")).toBe("/textures/2k/earth-day.jpg");
    expect(textureUrl("earth", "1k")).toBe("/textures/1k/earth-day.jpg");
    expect(textureUrl("mars", "1k")).toBe("/textures/1k/mars.jpg");
  });

  it("devrait partager entre les deux résolutions les cartes qui n'existent qu'en un exemplaire", () => {
    expect(textureUrl("moon", "2k")).toBe("/textures/moon.jpg");
    expect(textureUrl("earthSpecular", "2k")).toBe("/textures/earth-specular.jpg");
    expect(textureUrl("saturnRing", "1k")).toBe("/textures/saturn-ring.png");
    expect(textureUrl("milkyWay", "2k")).toBe("/textures/milky-way.jpg");
    expect(textureUrl("venus", "2k")).toBe("/textures/venus.jpg");
  });
});

describe("textureLoadOrder", () => {
  it("devrait commencer par les textures de l'escale en cours, puis le ciel", () => {
    expect(textureLoadOrder("saturn").slice(0, 3)).toEqual(["saturn", "saturnRing", "milkyWay"]);
  });

  it("devrait charger la Terre de jour et ses nuages avant sa face de nuit", () => {
    const order = textureLoadOrder("earth");
    expect(order.slice(0, 2)).toEqual(["earth", "earthClouds"]);
    expect(order.indexOf("earthNight")).toBeLessThan(order.indexOf("milkyWay"));
  });

  it("devrait charger les escales voisines avant les lointaines", () => {
    const order = textureLoadOrder("saturn");
    expect(order.indexOf("jupiter")).toBeLessThan(order.indexOf("earth"));
    expect(order.indexOf("uranus")).toBeLessThan(order.indexOf("mercury"));
  });

  it("devrait citer chaque texture une seule fois, quelle que soit l'escale", () => {
    for (const stop of STOP_ORDER) {
      const order = textureLoadOrder(stop);
      expect([...order].sort()).toEqual([...TEXTURE_KEYS].sort());
    }
  });
});

describe("SATURN_RING", () => {
  /** Coordonnée u de la texture des anneaux (2048 pixels de large) pour un rayon en rayons de Saturne. */
  const u = (radius: number) => (radius - SATURN_RING.inner) / (SATURN_RING.outer - SATURN_RING.inner);

  it("devrait placer le bord de l'anneau B et la division d'Encke là où l'image les montre", () => {
    // Repères indépendants de ceux qui ont fixé les bornes (division de Cassini, bord de l'anneau A).
    expect(u(1.527)).toBeCloseTo(640 / 2048, 2);
    expect(u(2.217)).toBeCloseTo(1831 / 2048, 2);
  });
});
