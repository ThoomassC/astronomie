import type * as Three from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeRenderer } from "@/components/scene/testRenderer";
import { SHARP_AFTER_STILL_FRAMES, createSizesScene, type SizesSceneOptions } from "@/components/sizes/sizesEngine";
import { sizesStore } from "@/lib/sizes/store";

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

/**
 * Frontière navigateur : requêtes média lues par le moteur (pointeur, mouvement réduit, mise en page compacte). Écran
 * tactile si `coarse`.
 */
function stubMatchMedia(coarse = false): void {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: coarse && query === "(pointer: coarse)",
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
  sizesStore.reset();
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

/*
 * Sur téléphone, une supergéante remplit l'écran pendant les vols, et chaque pixel calcule sa surface : le rapport de
 * pixels tombe à 1 pendant le vol, puis une image nette est rendue quand plus rien ne bouge.
 */
describe("rapport de pixels pendant les vols", () => {
  /** Écran de rapport de pixels 3, dont le moteur garde 1,5 (MAX_PIXEL_RATIO). */
  async function sceneOn(coarse: boolean) {
    stubMatchMedia(coarse);
    vi.stubGlobal("devicePixelRatio", 3);
    const scene = createSizesScene(options());
    if (!scene) throw new Error("Scène absente");
    // Shaders compilés (compileAsync) : la première image peut partir.
    await Promise.resolve();
    scene.frame(1 / 60);
    renderer().calls.length = 0;
    return scene;
  }

  it("devrait rendre les vols en rapport de pixels 1 sur écran tactile", async () => {
    const scene = await sceneOn(true);
    sizesStore.update("intro", "proxima-centauri", 0.3);
    scene.frame(1 / 60);
    sizesStore.update("intro", "proxima-centauri", 0.6);
    scene.frame(1 / 60);
    expect(renderer().calls).toEqual(["setPixelRatio 1", "render", "render"]);
    scene.dispose();
  });

  it("devrait rendre une image nette, une seule, quand le vol reste arrêté SHARP_AFTER_STILL_FRAMES images", async () => {
    const scene = await sceneOn(true);
    sizesStore.update("intro", "proxima-centauri", 0.3);
    scene.frame(1 / 60);
    renderer().calls.length = 0;
    for (let i = 1; i < SHARP_AFTER_STILL_FRAMES; i++) scene.frame(1 / 60);
    expect(renderer().calls).toEqual([]);
    scene.frame(1 / 60);
    scene.frame(1 / 60);
    expect(renderer().calls).toEqual(["setPixelRatio 1.5", "render"]);
    scene.dispose();
  });

  /*
   * Sur un écran à 120 Hz, un glissé lent ne fait avancer le défilement qu'une image sur deux : le rapport de pixels ne
   * doit pas remonter à chaque image immobile, ce qui réallouerait le tampon et ferait alterner images nettes et floues.
   */
  it("devrait garder le rapport de pixels 1 pendant un glissé lent, immobile une image sur deux", async () => {
    const scene = await sceneOn(true);
    for (let i = 1; i <= 6; i++) {
      sizesStore.update("intro", "proxima-centauri", i / 10);
      scene.frame(1 / 120);
      scene.frame(1 / 120);
    }
    expect(renderer().calls.filter((call) => call.startsWith("setPixelRatio"))).toEqual(["setPixelRatio 1"]);
    scene.dispose();
  });

  it("ne devrait pas baisser le rapport de pixels d'une page ouverte entre deux escales, tant que rien ne bouge", async () => {
    stubMatchMedia(true);
    vi.stubGlobal("devicePixelRatio", 3);
    sizesStore.update("intro", "proxima-centauri", 0.4);
    const scene = createSizesScene(options());
    if (!scene) throw new Error("Scène absente");
    await Promise.resolve();
    for (let i = 0; i < 4; i++) scene.frame(1 / 60);
    expect(renderer().calls.filter((call) => call.startsWith("setPixelRatio"))).toEqual(["setPixelRatio 1.5"]);
    scene.dispose();
  });

  it("devrait rendre net l'arrivée sur une escale, dès l'image où le vol se pose", async () => {
    const scene = await sceneOn(true);
    sizesStore.update("intro", "proxima-centauri", 0.6);
    scene.frame(1 / 60);
    renderer().calls.length = 0;
    sizesStore.update("proxima-centauri", "proxima-centauri", 0);
    scene.frame(1 / 60);
    expect(renderer().calls).toEqual(["setPixelRatio 1.5", "render"]);
    scene.dispose();
  });

  it("devrait garder le rapport de pixels de l'écran pendant les vols, avec une souris", async () => {
    const scene = await sceneOn(false);
    sizesStore.update("intro", "proxima-centauri", 0.3);
    scene.frame(1 / 60);
    expect(renderer().calls).toEqual(["render"]);
    scene.dispose();
  });
});
