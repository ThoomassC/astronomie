import {
  AmbientLight,
  CanvasTexture,
  Line,
  Mesh,
  PerspectiveCamera,
  PointLight,
  Points,
  Raycaster,
  SRGBColorSpace,
  Scene,
  Sprite,
  Texture,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Material,
  type Object3D,
} from "three";
import { J2000_JD } from "@/lib/astro/constants";
import { elementsAt, heliocentric, julianDate, positionAt } from "@/lib/astro/ephemeris";
import { PLANETS, PLANET_BY_KEY, type PlanetKey } from "@/lib/astro/planets";
import { toScene } from "@/lib/astro/scale";
import {
  blendCameras,
  cameraFor,
  smootherstep,
  type CamState,
  type StopCameraContext,
  type StopKey,
} from "@/lib/journey/camera";
import { journeyStore, type JourneyState } from "@/lib/journey/store";
import { getClock, type ClockSnapshot } from "@/lib/sim/clock";
import {
  ASTEROID_BELT,
  BRASS_HEX,
  KUIPER_BELT,
  ORBIT_SEGMENTS,
  createBelt,
  createClouds,
  createPlanet,
  createStarfield,
  createSun,
  updateBelt,
  type PlanetBody,
  type SurfaceMaterial,
} from "./bodies";
import { rawColor } from "./color";
import { placeLabel, type LabelBox } from "./labels";
import { TAU, clamp, easeFactor, lerp, smoothstep } from "./math";
import { cloudTexture, earthTexture, moonTexture, planetTexture, type TexturedPlanet } from "./textures";

export type BodyKey = "sun" | PlanetKey;

export interface SolarSceneOptions {
  canvas: HTMLCanvasElement;
  /** Étiquettes DOM des astres, placées à chaque image utile (masquées par `visibility`). */
  labels: ReadonlyMap<BodyKey, HTMLElement>;
  /** Éléments que les étiquettes ne recouvrent jamais (règle des distances). */
  obstacles: readonly Element[];
  /** Clic sur un astre de la scène. */
  onPick(key: BodyKey): void;
}

export interface SolarScene {
  /** Met à jour les astres et la caméra, rend l'image, place les étiquettes, seulement si quelque chose a changé. */
  frame(dt: number): void;
  /** Libère les ressources GPU et les écouteurs. Idempotent. */
  dispose(): void;
}

/** En dessous de ce rapport largeur / hauteur, l'écran est traité en portrait. */
const PORTRAIT_ASPECT = 0.9;
const RESIZE_DEBOUNCE_MS = 120;
/** Au-delà, le coût par pixel l'emporte sur le gain de netteté. */
const MAX_PIXEL_RATIO = 1.5;
/** Seuils sous lesquels parallaxe et fondu des orbites sont considérés comme arrivés. */
const PARALLAX_EPSILON = 1e-4;
const ORBIT_FADE_EPSILON = 1e-3;
/** Ordre de placement des étiquettes : les premières gagnent en cas de chevauchement. */
const LABEL_PRIORITY: readonly BodyKey[] = ["sun", "earth", "jupiter", "saturn", "neptune", "uranus", "mars", "venus", "mercury"];
/** Ordre de génération des cartes, après la Terre et ses nuages. */
const TEXTURE_ORDER: readonly TexturedPlanet[] = ["jupiter", "saturn", "mars", "venus", "mercury", "uranus", "neptune"];
const PLANET_KEYS = new Set<StopKey>(PLANETS.map((planet) => planet.key));

const isPlanetKey = (key: StopKey): key is PlanetKey => PLANET_KEYS.has(key);

const emptyCamState = (): CamState => ({
  tx: 0,
  ty: 0,
  tz: 0,
  dist: 330,
  azim: 0,
  elev: 0,
  offX: 0,
  offY: 0,
  planet: false,
});

/** Rapproche `value` de `target` et s'y pose quand l'écart devient négligeable. */
function approach(value: number, target: number, factor: number, epsilon: number): number {
  const next = value + (target - value) * factor;
  return Math.abs(target - next) < epsilon ? target : next;
}

function srgb<T extends Texture>(texture: T): T {
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function applyMap(material: SurfaceMaterial, map: Texture): void {
  material.map = map;
  material.color.set(0xffffff);
  material.needsUpdate = true;
}

function disposeMaterials(material: Material | Material[]): void {
  for (const item of Array.isArray(material) ? material : [material]) {
    if ("map" in item && item.map instanceof Texture) item.map.dispose();
    item.dispose();
  }
}

function disposeObject(object: Object3D): void {
  if (object instanceof Mesh || object instanceof Points || object instanceof Line) {
    object.geometry.dispose();
    disposeMaterials(object.material);
  } else if (object instanceof Sprite) {
    // La géométrie des sprites est partagée par Three : seul le matériau est libéré.
    disposeMaterials(object.material);
  }
}

/**
 * Scène 3D du système solaire, portée de la maquette (Three r128) vers Three 0.186.
 * Renvoie `null` sans WebGL 2 ou en rendu logiciel : la page passe alors au repli CSS.
 */
export function createSolarScene(options: SolarSceneOptions): SolarScene | null {
  let renderer: WebGLRenderer;
  try {
    // Un rendu logiciel serait trop lent : le repli CSS vaut mieux.
    renderer = new WebGLRenderer({ canvas: options.canvas, antialias: true, failIfMajorPerformanceCaveat: true });
  } catch {
    return null;
  }
  try {
    return setupScene(renderer, options);
  } catch (error) {
    renderer.dispose();
    throw error;
  }
}

function setupScene(renderer: WebGLRenderer, { canvas, labels, obstacles, onPick }: SolarSceneOptions): SolarScene {
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setClearColor(0x060b18, 1);

  const scene = new Scene();
  const camera = new PerspectiveCamera(36, 1, 0.05, 7000);

  const sky = createStarfield();
  scene.add(sky);
  const sun = createSun();
  scene.add(sun.mesh, sun.innerGlow, sun.outerGlow);
  // Éclairage physique (Three ≥ 0.155) : intensités × π et sans atténuation pour retrouver r128.
  scene.add(new PointLight(rawColor(0xfff1de), 1.55 * Math.PI, 0, 0));
  scene.add(new AmbientLight(rawColor(0x2b3858), 0.55 * Math.PI));

  const planets = PLANETS.map(createPlanet);
  for (const body of planets) scene.add(body.group);
  for (const body of planets) scene.add(body.orbit);
  const belts = [createBelt(ASTEROID_BELT), createBelt(KUIPER_BELT)];
  for (const belt of belts) scene.add(belt.points);

  const bodies = new Map<PlanetKey, PlanetBody>(planets.map((body) => [body.planet.key, body]));
  const bodyOf = (key: PlanetKey): PlanetBody => {
    const body = bodies.get(key);
    if (!body) throw new Error(`Astre absent de la scène : ${key}`);
    return body;
  };

  // ---------- État ----------
  const view = { width: 1, height: 1 };
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const brass = rawColor(BRASS_HEX);
  /** Échelle affichée : 0 compressée, 1 réelle, lissée vers la demande de l'horloge. */
  let realScale = 0;
  let moonDays = 0;
  let orbitScale = -1;
  let orbitJd = 0;
  /** Instant et échelle des positions déjà calculées. */
  let bodiesJd = Number.NaN;
  let bodiesScale = Number.NaN;
  let cameraDistance = 330;
  let frameCount = 0;
  let disposed = false;
  /** Quelque chose impose une nouvelle image (taille, polices, texture). */
  let needsRender = true;
  let orbitsSettled = false;
  let lastNow = Number.NaN;
  let lastFrom: StopKey | null = null;
  let lastTo: StopKey | null = null;
  let lastT = Number.NaN;
  const parallax = { x: 0, y: 0, targetX: 0, targetY: 0 };
  const camFrom = emptyCamState();
  const camTo = emptyCamState();
  const camBlend = emptyCamState();
  const cameraContext: StopCameraContext = {
    planetPosition: (key) => bodyOf(key).position,
    planetRadius: (key) => PLANET_BY_KEY[key].displayRadius,
    realScale: 0,
    portrait: false,
  };
  const orbitPoint = new Vector3();
  const projected = new Vector3();
  const labelSizes = new Map<BodyKey, { width: number; height: number }>();
  const labelShown = new Map<BodyKey, boolean>();
  let obstacleBoxes: LabelBox[] = [];
  const occupied: LabelBox[] = [];

  // ---------- Textures : une génération toutes les deux images, après les premiers rendus ----------
  const textureJobs: (() => void)[] = [
    () => applyMap(bodyOf("earth").mesh.material, srgb(new CanvasTexture(earthTexture()))),
    () => {
      const earth = bodyOf("earth");
      earth.clouds = createClouds(earth.planet, new CanvasTexture(cloudTexture()));
      earth.tilt.add(earth.clouds);
    },
    ...TEXTURE_ORDER.map((key) => () => applyMap(bodyOf(key).mesh.material, srgb(new CanvasTexture(planetTexture(key))))),
    () => {
      const moon = bodyOf("earth").moons[0];
      if (moon) applyMap(moon.mesh.material, srgb(new CanvasTexture(moonTexture())));
    },
  ];

  // ---------- Taille de la vue, mesures du DOM ----------
  function resize(): void {
    view.width = Math.max(1, window.innerWidth);
    view.height = Math.max(1, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
    renderer.setSize(view.width, view.height, false);
    camera.aspect = view.width / view.height;
    camera.fov = camera.aspect < PORTRAIT_ASPECT ? 50 : 36;
    camera.updateProjectionMatrix();
    needsRender = true;
  }

  /** Une seule passe de lecture : taille des neuf étiquettes et zones à éviter. */
  function measureLayout(): void {
    for (const [key, element] of labels) {
      labelSizes.set(key, { width: element.offsetWidth, height: element.offsetHeight });
    }
    obstacleBoxes = obstacles.map((element) => {
      const rect = element.getBoundingClientRect();
      return [rect.left, rect.top, rect.right, rect.bottom] as const;
    });
    needsRender = true;
  }

  resize();
  measureLayout();

  let resizeTimer: ReturnType<typeof setTimeout> | undefined;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resize();
      measureLayout();
    }, RESIZE_DEBOUNCE_MS);
  };
  window.addEventListener("resize", onResize);
  void document.fonts?.ready.then(() => {
    if (!disposed) measureLayout();
  });

  // ---------- Pointeur : parallaxe et clic sur les astres ----------
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const pickTargets: Object3D[] = [sun.mesh, ...planets.map((body) => body.mesh)];

  function pick(clientX: number, clientY: number): BodyKey | null {
    pointer.set((clientX / view.width) * 2 - 1, -(clientY / view.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(pickTargets, false)[0];
    if (!hit) return null;
    if (hit.object === sun.mesh) return "sun";
    return planets.find((body) => body.mesh === hit.object)?.planet.key ?? null;
  }

  const onCanvasPointerMove = (event: PointerEvent) => {
    canvas.style.cursor = pick(event.clientX, event.clientY) ? "pointer" : "";
  };
  const onCanvasClick = (event: MouseEvent) => {
    const key = pick(event.clientX, event.clientY);
    if (key) onPick(key);
  };
  const onWindowPointerMove = (event: PointerEvent) => {
    parallax.targetX = (event.clientX / view.width) * 2 - 1;
    parallax.targetY = (event.clientY / view.height) * 2 - 1;
  };
  canvas.addEventListener("pointermove", onCanvasPointerMove);
  canvas.addEventListener("click", onCanvasClick);
  window.addEventListener("pointermove", onWindowPointerMove, { passive: true });

  // ---------- Image ----------
  function updateBodies(dt: number, now: number, snapshot: ClockSnapshot, reduced: boolean): void {
    const target = snapshot.realScale ? 1 : 0;
    realScale = approach(realScale, target, easeFactor(dt, reduced ? 60 : 1.8), 1e-4);
    const s = realScale;
    const run = snapshot.playing ? 1 : 0;
    // Les lunes tournent au plus à 1,5 jour par seconde, sinon elles deviendraient un flou.
    if (snapshot.playing) moonDays += dt * Math.min(snapshot.speedDays, 1.5);
    const jd = julianDate(now);

    // Positions, tailles et ceintures ne dépendent que de l'instant simulé et de l'échelle.
    if (jd !== bodiesJd || s !== bodiesScale) {
      bodiesJd = jd;
      bodiesScale = s;
      // En échelle réelle, les planètes deviennent plus petites qu'un pixel : seules les étiquettes les signalent.
      const shrink = lerp(1, 0.012, s);
      for (const body of planets) {
        toScene(heliocentric(body.planet, jd), s, body.position);
        body.group.position.copy(body.position);
        body.group.scale.setScalar(shrink);
      }
      const days = jd - J2000_JD;
      for (const belt of belts) updateBelt(belt, days, s);
      sun.mesh.scale.setScalar(lerp(1, 0.05, s));
      sun.innerGlow.scale.setScalar(lerp(46, 9, s));
      sun.outerGlow.scale.setScalar(lerp(190, 60, s));
    }

    for (const body of planets) {
      body.mesh.rotation.y += body.spin * dt * run;
      if (body.clouds) body.clouds.rotation.y += body.spin * 1.15 * dt * run;
      for (const moon of body.moons) {
        const angle = moon.phase + (TAU * moonDays) / moon.periodDays;
        moon.mesh.position.set(Math.cos(angle) * moon.distance, 0, -Math.sin(angle) * moon.distance);
        moon.mesh.visible = s < 0.3;
      }
    }

    // Les orbites se recalculent quand l'échelle bouge, ou tous les dix ans simulés (précession lente).
    if (Math.abs(s - orbitScale) > 0.0005 || Math.abs(jd - orbitJd) > 3650) {
      orbitScale = s;
      orbitJd = jd;
      for (const body of planets) {
        const elements = elementsAt(body.planet, jd);
        for (let i = 0; i <= ORBIT_SEGMENTS; i++) {
          toScene(positionAt(elements, (i / ORBIT_SEGMENTS) * TAU), s, orbitPoint);
          body.orbitPositions.setXYZ(i, orbitPoint.x, orbitPoint.y, orbitPoint.z);
        }
        body.orbitPositions.needsUpdate = true;
      }
    }

    // La surface du Soleil ne bouille que si le temps tourne, et jamais en mouvement réduit.
    if (snapshot.playing && !reduced) sun.time.value += dt;
  }

  function updateCamera(dt: number, journey: JourneyState, reduced: boolean): void {
    cameraContext.realScale = realScale;
    cameraContext.portrait = view.width / view.height < PORTRAIT_ASPECT;
    const from = cameraFor(journey.from, cameraContext, camFrom);
    const state =
      journey.t > 0
        ? blendCameras(from, cameraFor(journey.to, cameraContext, camTo), smootherstep(journey.t), camBlend)
        : from;

    if (reduced) {
      parallax.x = 0;
      parallax.y = 0;
    } else {
      const follow = easeFactor(dt, 2);
      parallax.x = approach(parallax.x, parallax.targetX, follow, PARALLAX_EPSILON);
      parallax.y = approach(parallax.y, parallax.targetY, follow, PARALLAX_EPSILON);
    }
    const azimuth = state.azim + parallax.x * 0.05;
    const elevation = clamp(state.elev + parallax.y * 0.03, -1.2, 1.45);
    const horizontal = state.dist * Math.cos(elevation);
    camera.position.set(
      state.tx + horizontal * Math.cos(azimuth),
      state.ty + state.dist * Math.sin(elevation),
      state.tz + horizontal * Math.sin(azimuth),
    );
    camera.lookAt(state.tx, state.ty, state.tz);
    // Décale la cible à l'écran (offX, offY) pour laisser la place aux plaques.
    camera.setViewOffset(
      view.width,
      view.height,
      -state.offX * view.width,
      -state.offY * view.height,
      view.width,
      view.height,
    );
    sky.position.copy(camera.position);
    cameraDistance = state.dist;

    // L'orbite de l'escale en cours ressort dans sa couleur, les autres s'effacent.
    const focus = journey.current;
    const focusOnPlanet = isPlanetKey(focus);
    const fade = easeFactor(dt, 4);
    let fading = false;
    for (const body of planets) {
      const on = body.planet.key === focus;
      const material = body.orbit.material;
      const target = on ? 0.85 : focusOnPlanet ? 0.14 : 0.3;
      material.opacity = approach(material.opacity, target, fade, ORBIT_FADE_EPSILON);
      if (material.opacity !== target) fading = true;
      material.color.copy(on ? body.color : brass);
    }
    orbitsSettled = !fading;
  }

  function setLabelShown(key: BodyKey, element: HTMLElement, shown: boolean): void {
    if (labelShown.get(key) === shown) return;
    labelShown.set(key, shown);
    element.style.visibility = shown ? "visible" : "hidden";
  }

  function updateLabels(): void {
    // Vue rapprochée : les étiquettes s'effacent ; en échelle réelle, elles sont le seul repère.
    const alpha = realScale > 0.5 ? 1 : smoothstep(28, 95, cameraDistance);
    occupied.length = 0;
    occupied.push(...obstacleBoxes);
    for (const key of LABEL_PRIORITY) {
      const element = labels.get(key);
      const size = labelSizes.get(key);
      if (!element || !size) continue;
      if (alpha < 0.02) {
        setLabelShown(key, element, false);
        continue;
      }
      if (key === "sun") projected.set(0, 0, 0);
      else projected.copy(bodyOf(key).position);
      projected.project(camera);
      const x = ((projected.x + 1) / 2) * view.width;
      const y = ((1 - projected.y) / 2) * view.height;
      const box = placeLabel(
        { x, y, depth: projected.z, width: size.width, height: size.height },
        view.width,
        view.height,
        occupied,
      );
      if (!box) {
        setLabelShown(key, element, false);
        continue;
      }
      occupied.push(box);
      element.style.transform = `translate3d(${box[0].toFixed(1)}px,${box[1].toFixed(1)}px,0)`;
      element.style.opacity = alpha.toFixed(3);
      setLabelShown(key, element, true);
    }
  }

  return {
    frame(dt) {
      if (disposed) return;
      frameCount += 1;
      if (frameCount > 2 && frameCount % 2 === 0 && textureJobs.length > 0) {
        textureJobs.shift()?.();
        needsRender = true;
      }
      const clock = getClock();
      const now = clock.now();
      const snapshot = clock.snapshot();
      const journey = journeyStore.get();
      const reduced = reducedMotion.matches;
      // Rien n'a bougé (temps en pause, défilement et pointeur immobiles) : pas de nouvelle image.
      const changed =
        needsRender ||
        now !== lastNow ||
        journey.from !== lastFrom ||
        journey.to !== lastTo ||
        journey.t !== lastT ||
        realScale !== (snapshot.realScale ? 1 : 0) ||
        (!reduced && (parallax.x !== parallax.targetX || parallax.y !== parallax.targetY)) ||
        !orbitsSettled;
      if (!changed) return;
      needsRender = false;
      lastNow = now;
      lastFrom = journey.from;
      lastTo = journey.to;
      lastT = journey.t;
      updateBodies(dt, now, snapshot, reduced);
      updateCamera(dt, journey, reduced);
      renderer.render(scene, camera);
      updateLabels();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onWindowPointerMove);
      canvas.removeEventListener("pointermove", onCanvasPointerMove);
      canvas.removeEventListener("click", onCanvasClick);
      canvas.style.cursor = "";
      for (const element of labels.values()) element.style.visibility = "hidden";
      textureJobs.length = 0;
      scene.traverse(disposeObject);
      renderer.dispose();
    },
  };
}
