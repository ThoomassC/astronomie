import { describe, expect, it } from "vitest";
import { freeBand } from "@/lib/journey/screen";

describe("freeBand", () => {
  it("devrait aller du bas des bandeaux du haut au haut de la plaque repliée, 8 px d'air de chaque côté", () => {
    expect(freeBand(800, 80, { height: 280, bottom: 82 })).toEqual({ top: 88 / 800, bottom: 430 / 800 });
  });

  it("devrait renoncer quand la bande tombe sous 8 % de l'écran (texte très agrandi)", () => {
    expect(freeBand(800, 80, { height: 560, bottom: 82 })).toBeNull();
  });
});
