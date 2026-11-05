import * as Three from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSolarScene, type SolarSceneOptions } from "@/components/scene/engine";
import { RING_LABEL_GAP_PX, type LabelBox } from "@/components/scene/labels";
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

/*
 * Obstacles des étiquettes (règle, fondus sous la barre et sous le dock) : la scène les mesure dans la page et n'y pose
 * aucune étiquette, où son texte serait voilé ou coupé. Un fondu ne paraît qu'à certaines tailles d'écran : la mesure
 * est reprise au redimensionnement.
 */
describe("étiquettes hors des obstacles", () => {
  afterEach(() => {
    vi.useRealTimers();
    journeyStore.update("hero", "hero", 0);
    document.body.replaceChildren();
  });

  it("devrait retirer une étiquette d'un fondu qui la couvre, relu au redimensionnement, et l'y rendre quand il part", async () => {
    vi.useFakeTimers();
    journeyStore.update("hero", "hero", 0);
    // « Soleil », bouton de 60 × 24 px ; un fondu d'abord masqué par la feuille de style (boîte vide).
    const sun = document.createElement("button");
    measured(sun, { left: 0, top: 0, width: 60, height: 24 });
    document.body.append(sun);
    const fade = document.createElement("div");
    let fadeBox = new DOMRect(0, 0, 0, 0);
    vi.spyOn(fade, "getBoundingClientRect").mockImplementation(() => fadeBox);
    const scene = createSolarScene({ ...options(), labels: new Map([["sun", sun]]), obstacles: [fade] });
    if (!scene) throw new Error("Scène absente");
    await Promise.resolve();
    const resizeTo = (box: DOMRect) => {
      fadeBox = box;
      window.dispatchEvent(new Event("resize"));
      vi.advanceTimersByTime(120);
      scene.frame(1 / 60);
    };

    scene.frame(1 / 60);
    expect(sun.style.visibility).toBe("visible");
    const top = Number(/translate3d\([-\d.]+px,([-\d.]+)px/.exec(sun.style.transform)?.[1]);
    // Le fondu paraît (fenêtre élargie) et couvre le haut de l'écran jusque sous l'étiquette : elle s'efface.
    resizeTo(new DOMRect(0, 0, window.innerWidth, top + 30));
    expect(sun.style.visibility).toBe("hidden");
    // Il repart (mise en page compacte) : l'étiquette revient.
    resizeTo(new DOMRect(0, 0, 0, 0));
    expect(sun.style.visibility).toBe("visible");
    scene.dispose();
  });

  /*
   * La barre haute couvre le haut de l'écran, de 59 à 132 px selon l'encoche : aucune étiquette ne se pose dessous,
   * même quand elle a glissé hors de l'écran (AutoHideBar), car elle peut revenir à tout moment.
   */
  it("devrait réserver la barre haute à sa place de repos, même glissée hors de l'écran", async () => {
    const sun = document.createElement("button");
    measured(sun, { left: 0, top: 0, width: 60, height: 24 });
    document.body.append(sun);
    const framed = async (bar: HTMLElement | null) => {
      const scene = createSolarScene({ ...options(), labels: new Map([["sun", sun]]), bar });
      if (!scene) throw new Error("Scène absente");
      await Promise.resolve();
      scene.frame(1 / 60);
      return scene;
    };
    // Sans barre, « Soleil » se pose à `top` px du haut de l'écran.
    (await framed(null)).dispose();
    const top = Number(/translate3d\([-\d.]+px,([-\d.]+)px/.exec(sun.style.transform)?.[1]);
    expect(top).toBeGreaterThan(0);
    // Une barre qui descend jusque sous l'étiquette, glissée hors de l'écran de toute sa hauteur.
    const bar = document.createElement("header");
    const height = top + 30;
    bar.style.transform = `matrix(1, 0, 0, 1, 0, ${-height})`;
    vi.spyOn(bar, "getBoundingClientRect").mockReturnValue(new DOMRect(0, -height, window.innerWidth, height));
    document.body.append(bar);
    const scene = await framed(bar);
    expect(sun.style.visibility).toBe("hidden");
    scene.dispose();
  });
});

/*
 * Cercles de distance aux étoiles voisines, en 375 × 812 : le cercle de 10 al passe à la hauteur du Soleil. Son
 * premier point libre à 2 px d'air, texte seul, posait la graduation à 3,5 px du texte de « Soleil », sur sa ligne :
 * on lisait « Soleil | 10 al ». Le moteur demande 8 px, graduation comprise : l'étiquette se pose plus loin sur le
 * cercle. Retirer l'une ou l'autre exigence (ringPlacement, ringLayouts) ramène la graduation contre « Soleil ».
 */
describe("étiquettes des cercles de distance", () => {
  afterEach(() => {
    journeyStore.update("hero", "hero", 0);
    document.body.replaceChildren();
  });

  /** Étiquette à repère telle que la rend la page : repère, puis le texte 6 px plus loin ; 30 px de haut. */
  function markedLabel(text: { width: number; height: number }, dot: { width: number; height: number }, deep: boolean) {
    const label = document.createElement("span");
    if (deep) label.dataset.deep = "";
    const marker = document.createElement("i");
    const span = document.createElement("span");
    label.append(marker, span);
    measured(label, { left: 0, top: 0, width: 4 + dot.width + 6 + text.width, height: 30 });
    measured(marker, { left: 4, top: 15 - dot.height / 2, width: dot.width, height: dot.height });
    measured(span, { left: 4 + dot.width + 6, top: 6, width: text.width, height: text.height });
    document.body.append(label);
    return label;
  }

  /** Coin haut gauche d'une étiquette posée, lu dans sa transformation. */
  const cornerOf = (label: HTMLElement) => {
    const [, x, y] = /translate3d\(([-\d.]+)px,([-\d.]+)px/.exec(label.style.transform) ?? [];
    return { x: Number(x), y: Number(y) };
  };

  /** Air entre deux boîtes, en px : le plus grand écart, horizontal ou vertical (négatif si elles se chevauchent). */
  const airBetween = (a: LabelBox, b: LabelBox) => Math.max(a[0] - b[2], b[0] - a[2], a[1] - b[3], b[1] - a[3]);

  it("devrait garder 8 px d'air entre « 10 al », graduation comprise, et « Soleil »", async () => {
    vi.stubGlobal("innerWidth", 375);
    vi.stubGlobal("innerHeight", 812);
    journeyStore.update("stars", "stars", 0);
    // « Soleil » : anneau de 10 px, texte de 40 × 20 px ; « 10 al » : graduation de 2 × 9 px, texte de 32 × 18 px.
    const sun = markedLabel({ width: 40, height: 20 }, { width: 10, height: 10 }, false);
    const ring = markedLabel({ width: 32, height: 18 }, { width: 2, height: 9 }, true);
    const scene = createSolarScene({ ...options(), labels: new Map([["sun", sun]]), deepLabels: new Map([["ring-10", ring]]) });
    if (!scene) throw new Error("Scène absente");
    await Promise.resolve();
    scene.frame(1 / 60);
    expect(sun.style.visibility).toBe("visible");
    expect(ring.style.visibility).toBe("visible");
    expect(sun).not.toHaveAttribute("data-mirrored");
    const s = cornerOf(sun);
    const r = cornerOf(ring);
    // Texte de « Soleil » ; graduation et texte de « 10 al », de part ou d'autre l'un de l'autre (même emprise).
    const sunText: LabelBox = [s.x + 20, s.y + 6, s.x + 60, s.y + 26];
    const ringBox: LabelBox = [r.x + 4, r.y + 6, r.x + 44, r.y + 24];
    expect(airBetween(sunText, ringBox)).toBeGreaterThanOrEqual(RING_LABEL_GAP_PX);
    scene.dispose();
  });
});

