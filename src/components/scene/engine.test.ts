import * as Three from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSolarScene, type SolarSceneOptions } from "@/components/scene/engine";
import type { ExtragalacticLabelKey } from "@/components/scene/extragalactic";
import { FakeRenderer } from "@/components/scene/testRenderer";
import type { TextureKey } from "@/components/scene/textureSet";
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

/** Cartes photographiques « arrivées », rendues une à une par le flux (frontière réseau : rien ne se télécharge ici). */
const arrivals = vi.hoisted(() => ({ queue: [] as { key: TextureKey; texture: Three.Texture }[] }));

vi.mock("@/components/scene/textureLoader", () => ({
  createTextureStream: () => ({
    pump: () => undefined,
    take: () => arrivals.queue.shift() ?? null,
    dispose: () => {
      arrivals.queue.length = 0;
    },
  }),
}));

/** Frontière navigateur : requêtes média lues par le moteur (pointeur, mouvement réduit, mise en page compacte). */
function stubMatchMedia(reducedMotion = false): void {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reducedMotion && query === "(prefers-reduced-motion: reduce)",
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

/*
 * Arrivée d'une carte photographique : la couleur unie de l'astre cède à la carte en 400 ms (textureFade), au lieu de
 * la laisser surgir d'un coup, en mouvement réduit compris (un fondu enchaîné, sans mouvement).
 */
describe("fondu des cartes photographiques", () => {
  afterEach(() => {
    journeyStore.update("hero", "hero", 0);
    arrivals.queue.length = 0;
  });

  /** Mélange couleur unie → carte de la surface de Jupiter, lu dans la scène rendue (couleur de base de Jupiter). */
  function jupiterMix(scene: Three.Object3D): () => number {
    const base = new Three.Color("#D8A878");
    let mix: { value: number } | null = null;
    scene.traverse((object) => {
      if (!(object instanceof Three.Mesh) || !(object.material instanceof Three.ShaderMaterial)) return;
      const { uniforms } = object.material;
      if (uniforms.uMapMix && uniforms.uBaseColor?.value instanceof Three.Color && uniforms.uBaseColor.value.equals(base)) {
        mix = uniforms.uMapMix;
      }
    });
    if (!mix) throw new Error("Surface de Jupiter absente");
    const found: { value: number } = mix;
    return () => found.value;
  }

  /** Au repos sur Jupiter, sa carte arrivée : mélanges lus image après image (60 i/s) pendant une demi-seconde. */
  async function fadeAtJupiter(): Promise<number[]> {
    journeyStore.update("jupiter", "jupiter", 0);
    const render = vi.spyOn(FakeRenderer.prototype, "render");
    const scene = createSolarScene(options());
    if (!scene) throw new Error("Scène absente");
    await Promise.resolve();
    // Première image : la caméra se pose (aucune carte envoyée au GPU pendant un vol).
    scene.frame(1 / 60);
    const sceneRoot = render.mock.calls[0]?.[0];
    if (!(sceneRoot instanceof Three.Object3D)) throw new Error("Aucune image rendue");
    const mix = jupiterMix(sceneRoot);
    arrivals.queue.push({ key: "jupiter", texture: new Three.Texture() });
    const mixes: number[] = [];
    for (let i = 0; i < 30; i++) {
      scene.frame(1 / 60);
      mixes.push(mix());
    }
    scene.dispose();
    return mixes;
  }

  it("devrait passer de la couleur unie à la carte en 400 ms, en douceur", async () => {
    stubMatchMedia();
    const mixes = await fadeAtJupiter();
    expect(mixes[0]).toBeGreaterThan(0);
    expect(mixes[0]).toBeLessThan(0.05);
    expect(mixes.slice(1).every((mix, i) => mix >= mixes[i])).toBe(true);
    // 24 images à 60 i/s : 400 ms.
    expect(mixes[22]).toBeLessThan(1);
    expect(mixes[23]).toBe(1);
  });

  it("devrait fondre la carte aussi en mouvement réduit, au lieu de la faire surgir", async () => {
    stubMatchMedia(true);
    const mixes = await fadeAtJupiter();
    expect(mixes[0]).toBeLessThan(0.05);
    expect(mixes[11]).toBeCloseTo(0.5, 1);
    expect(mixes[23]).toBe(1);
  });
});
