import type * as Three from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSolarScene, type SolarSceneOptions } from "@/components/scene/engine";
import { FakeRenderer } from "@/components/scene/testRenderer";

/*
 * Moteur de la scène du Voyage, sans WebGL : jsdom n'en a pas, un moteur de rendu factice (testRenderer.ts) tient la
 * place de WebGLRenderer. On y vérifie ce que le moteur demande au GPU et ce qu'il lui rend.
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

/** Scène sans étiquettes ni mise en page : seul compte ici le dialogue avec le moteur de rendu. */
function options(canvas: HTMLCanvasElement = document.createElement("canvas")): SolarSceneOptions {
  return {
    canvas,
    labels: new Map(),
    obstacles: [],
    plates: new Map(),
    bar: null,
    rail: null,
    note: null,
    deepLabels: new Map(),
    onPick: () => undefined,
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
  // Frontière navigateur : jsdom ne dessine pas (`getContext` rend null) ; le profil des anneaux d'Uranus s'y peint.
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    fillStyle: "",
    fillRect: () => undefined,
  } as unknown as CanvasRenderingContext2D);
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

describe("createSolarScene", () => {
  it("devrait renvoyer null sans WebGL, sans lever d'erreur : la page passe au repli sans scène", () => {
    FakeRenderer.available = false;
    expect(createSolarScene(options())).toBeNull();
  });

  it("devrait demander le GPU économe en énergie et refuser un rendu logiciel", () => {
    createSolarScene(options())?.dispose();
    expect(renderer().parameters).toMatchObject({ powerPreference: "low-power", failIfMajorPerformanceCaveat: true });
  });

  /*
   * Next garde la page quittée dans le DOM, masquée : son canevas garde son contexte WebGL, que dispose() ne libère
   * pas. Son tampon d'image plein écran (≈ 90 à 170 Mo avec l'antialiasing) se réduit donc d'abord à 1 × 1 px.
   */
  it("devrait réduire le tampon d'image à 1 × 1 px, puis libérer le moteur de rendu", () => {
    const scene = createSolarScene(options());
    scene?.dispose();
    expect(renderer().calls.slice(-2)).toEqual(["setSize 1×1", "dispose"]);
  });

  it("devrait rendre au tampon la taille de la vue au retour sur la page, sur le même canevas", () => {
    const canvas = document.createElement("canvas");
    createSolarScene(options(canvas))?.dispose();
    createSolarScene(options(canvas))?.dispose();
    expect(renderer(1).calls.find((call) => call.startsWith("setSize"))).toBe(
      `setSize ${window.innerWidth}×${window.innerHeight}`,
    );
  });

  it("ne devrait rien libérer deux fois", () => {
    const scene = createSolarScene(options());
    scene?.dispose();
    scene?.dispose();
    expect(renderer().calls.filter((call) => call === "dispose")).toHaveLength(1);
  });
});
