import type * as Three from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSolarScene, type SolarSceneOptions } from "@/components/scene/engine";
import type { ExtragalacticLabelKey } from "@/components/scene/extragalactic";
import { FakeRenderer } from "@/components/scene/testRenderer";
import { journeyStore } from "@/lib/journey/store";

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

/** Boîte posée à la main sur un élément : jsdom ne fait pas de mise en page (offset* y valent 0). */
function measured(element: HTMLElement, box: { left: number; top: number; width: number; height: number }): void {
  Object.defineProperties(element, {
    offsetLeft: { get: () => box.left },
    offsetTop: { get: () => box.top },
    offsetWidth: { get: () => box.width },
    offsetHeight: { get: () => box.height },
  });
}

/** Étiquette de galaxie telle que la rend la page : repère de 16 × 9 px, puis le nom, 6 px plus loin. */
function galaxyLabel(key: ExtragalacticLabelKey): HTMLElement {
  const label = document.createElement("span");
  label.className = "lbl deep galaxy";
  label.dataset.deep = key;
  const dot = document.createElement("i");
  const text = document.createElement("span");
  text.textContent = key;
  label.append(dot, text);
  measured(label, { left: 0, top: 0, width: 182, height: 20 });
  measured(dot, { left: 0, top: 5.5, width: 16, height: 9 });
  measured(text, { left: 22, top: 0, width: 160, height: 20 });
  document.body.append(label);
  return label;
}

/*
 * Au Groupe local, les galaxies sont dessinées grossies : le nom d'une galaxie dont le disque déborde du repère se pose
 * à côté, repère effacé (`data-beside`) ; celui d'une galaxie plus petite que son repère garde la disposition ordinaire.
 */
describe("noms des galaxies au Groupe local", () => {
  afterEach(() => {
    journeyStore.update("hero", "hero", 0);
    document.body.replaceChildren();
  });

  /** Une image au repos sur l'escale du Groupe local ; la scène est rendue pour être libérée après les vérifications. */
  async function framedAtLocalGroup(labels: Map<ExtragalacticLabelKey, HTMLElement>) {
    journeyStore.update("localGroup", "localGroup", 0);
    const scene = createSolarScene({ ...options(), deepLabels: labels });
    if (!scene) throw new Error("Scène absente");
    // Shaders compilés (compileAsync) : la première image peut partir.
    await Promise.resolve();
    scene.frame(1 / 60);
    return scene;
  }

  it("devrait poser le nom d'Andromède à côté de son disque, repère effacé", async () => {
    const andromeda = galaxyLabel("lg:andromeda");
    const scene = await framedAtLocalGroup(new Map([["lg:andromeda", andromeda]]));
    expect(andromeda.style.visibility).toBe("visible");
    expect(andromeda).toHaveAttribute("data-beside");
    scene.dispose();
  });

  // À sa vraie taille, le Grand Nuage ne ferait que 2 px de rayon : seul le grossissement le fait déborder du repère.
  it("devrait mesurer le disque grossi : le Grand Nuage de Magellan déborde de son repère, son nom se pose à côté", async () => {
    const cloud = galaxyLabel("lg:large-magellanic-cloud");
    const scene = await framedAtLocalGroup(new Map([["lg:large-magellanic-cloud", cloud]]));
    expect(cloud).toHaveAttribute("data-beside");
    scene.dispose();
  });

  it("devrait garder le repère sur le Petit Nuage de Magellan, plus petit que lui à l'écran", async () => {
    const cloud = galaxyLabel("lg:small-magellanic-cloud");
    const scene = await framedAtLocalGroup(new Map([["lg:small-magellanic-cloud", cloud]]));
    expect(cloud.style.visibility).toBe("visible");
    expect(cloud).not.toHaveAttribute("data-beside");
    scene.dispose();
  });
});
