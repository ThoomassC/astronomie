import type * as Three from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeRenderer } from "@/components/scene/testRenderer";
import { createSizesScene, type SizesSceneOptions } from "@/components/sizes/sizesEngine";

/*
 * Le moteur de la scène des tailles a besoin de WebGL. jsdom n'en a pas : un moteur de rendu factice
 * (testRenderer.ts) tient la place de WebGLRenderer, et `FakeRenderer.available = false` imite un navigateur sans
 * WebGL ou en rendu logiciel, où la page passe au repli. Maillages, visibilité et halos se testent sans WebGL dans
 * starMeshes.test.ts ; le cadrage dans sizesCamera.test.ts.
 */
vi.mock("three", async (importOriginal) => {
  const three = await importOriginal<typeof Three>();
  const { FakeRenderer: Renderer } = await import("@/components/scene/testRenderer");
  return { ...three, WebGLRenderer: Renderer };
});

/** Frontière navigateur : requêtes média lues par le moteur (pointeur, mouvement réduit, mise en page compacte). */
function stubMatchMedia(): void {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  }));
}

function options(canvas: HTMLCanvasElement = document.createElement("canvas")): SizesSceneOptions {
  return {
    canvas,
    ringLabels: new Map(),
    limbLabels: new Map(),
    sunMarker: null,
    scaleBar: null,
    scaleText: (suns) => `${suns}`,
    layout: { bar: null, rail: null, plates: new Map() },
  };
}

/** Le moteur de rendu créé en `index`-ième. */
function renderer(index = 0): FakeRenderer {
  const found = FakeRenderer.instances[index];
  if (!found) throw new Error(`Moteur de rendu ${index} absent`);
  return found;
}

beforeEach(() => {
  FakeRenderer.reset();
  stubMatchMedia();
  // Frontière navigateur : jsdom n'a pas de ResizeObserver.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("createSizesScene", () => {
  it("devrait renvoyer null sans WebGL, sans lever d'erreur : la page passe au repli sans scène", () => {
    FakeRenderer.available = false;
    expect(createSizesScene(options())).toBeNull();
  });

  it("devrait demander le GPU économe en énergie et refuser un rendu logiciel", () => {
    createSizesScene(options())?.dispose();
    expect(renderer().parameters).toMatchObject({ powerPreference: "low-power", failIfMajorPerformanceCaveat: true });
  });

  /*
   * Next garde la page quittée dans le DOM, masquée : son canevas garde son contexte WebGL, que dispose() ne libère
   * pas. Son tampon d'image plein écran se réduit donc d'abord à 1 × 1 px ; resize() le rend au remontage.
   */
  it("devrait réduire le tampon d'image à 1 × 1 px, puis libérer le moteur de rendu", () => {
    createSizesScene(options())?.dispose();
    expect(renderer().calls.slice(-2)).toEqual(["setSize 1×1", "dispose"]);
  });

  it("devrait rendre au tampon la taille de la vue au retour sur la page, sur le même canevas", () => {
    const canvas = document.createElement("canvas");
    createSizesScene(options(canvas))?.dispose();
    createSizesScene(options(canvas))?.dispose();
    expect(renderer(1).calls.find((call) => call.startsWith("setSize"))).toBe(
      `setSize ${window.innerWidth}×${window.innerHeight}`,
    );
  });
});
