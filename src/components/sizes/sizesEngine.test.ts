import { afterEach, describe, expect, it, vi } from "vitest";
import { createSizesScene } from "@/components/sizes/sizesEngine";

afterEach(() => {
  vi.restoreAllMocks();
});

/*
 * Le moteur de la scène des tailles a besoin de WebGL. jsdom n'en a pas : c'est le cas d'un navigateur sans WebGL ou
 * en rendu logiciel, où la page passe au repli. Maillages, visibilité et halos se testent sans WebGL dans
 * starMeshes.test.ts ; le cadrage dans sizesCamera.test.ts.
 */
describe("createSizesScene", () => {
  it("devrait renvoyer null sans WebGL, sans lever d'erreur : la page passe au repli sans scène", () => {
    // jsdom signale sur la console que le canevas n'a pas de contexte : bruit attendu ici.
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const scene = createSizesScene({
      canvas: document.createElement("canvas"),
      ringLabels: new Map(),
      limbLabels: new Map(),
      sunMarker: null,
      scaleBar: null,
      scaleText: (suns) => `${suns}`,
      layout: { bar: null, rail: null, plates: new Map() },
    });
    expect(scene).toBeNull();
  });
});
