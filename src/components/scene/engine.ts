import {
  ClampToEdgeWrapping,
  Line,
  Mesh,
  NeutralToneMapping,
  NoColorSpace,
  PerspectiveCamera,
  Points,
  Raycaster,
  RedFormat,
  RepeatWrapping,
  SRGBColorSpace,
  Scene,
  Texture,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Material,
  type Object3D,
} from "three";
import { J2000_JD } from "@/lib/astro/constants";
import { elementsAt, heliocentric, julianDate, positionAt } from "@/lib/astro/ephemeris";
import { ROTATION } from "@/lib/astro/orientation";
import { PLANETS, PLANET_BY_KEY, SUN, type PlanetKey } from "@/lib/astro/planets";
import { toScene } from "@/lib/astro/scale";
import {
  blendCameras,
  cameraFor,
  freeBand,
  smootherstep,
  type CamState,
  type ScreenBand,
  type ScreenZone,
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
  createPlanet,
  createSky,
  createSun,
  scaleSun,
  texturedMoon,
  updateBelt,
  type PlanetBody,
} from "./bodies";
import { orientAxis, primeMeridianAngle } from "./axes";
import { rawColor } from "./color";
import { placeLabel, type LabelBox } from "./labels";
import { createPlaceholderTexture, type SurfaceUniforms, type Uniform } from "./materials";
import { TAU, clamp, easeFactor, lerp, smoothstep } from "./math";
import { createTextureStream } from "./textureLoader";
import { pickTextureTier, textureLoadOrder, type TextureKey } from "./textureSet";

export type BodyKey = "sun" | PlanetKey;

export interface SolarSceneOptions {
  canvas: HTMLCanvasElement;
  /** Étiquettes DOM des astres, placées à chaque image utile (masquées par `visibility`). */
  labels: ReadonlyMap<BodyKey, HTMLElement>;
  /** Éléments que les étiquettes ne recouvrent jamais (règle des distances). */
  obstacles: readonly Element[];
  /** Plaques des escales : sur téléphone, l'astre est cadré dans la bande libre au-dessus de la sienne. */
  plates: ReadonlyMap<StopKey, HTMLElement>;
  /** Barre du haut : la bande libre commence sous elle. */
  bar: Element | null;
  /** Règle des distances : sur grand écran, la zone libre s'arrête avant elle. */
  rail: Element | null;
  /** Note d'échelle : visible sur téléphone, elle borde aussi la bande libre par le haut. */
  note: HTMLElement | null;
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
/** Mise en page compacte (globals.css) : plaques repliées collées au bas de l'écran (téléphone, tablette en portrait). */
const MOBILE_LAYOUT = "(max-width: 640px), (max-width: 1100px) and (orientation: portrait)";
/** Grand écran : air entre la zone libre et ce qui la borde (plaque, règle), en px. */
const ZONE_MARGIN_PX = 24;
/** Zone plus étroite que cette part de l'écran (fenêtre très étroite) : cadrage habituel. */
const MIN_ZONE_SHARE = 0.2;
/** Vitesse à laquelle le cadrage rejoint une bande libre qui change (barre d'outils, note), par seconde. */
const BAND_FOLLOW_RATE = 6;
const BAND_EPSILON = 1e-4;
const RESIZE_DEBOUNCE_MS = 120;
/** Au-delà, le coût par pixel l'emporte sur le gain de netteté. */
const MAX_PIXEL_RATIO = 1.5;
/** Plafond de pixels rendus : un écran 4K externe en 1,5 en compterait 8 millions. */
const MAX_PIXELS = 4_200_000;
/** Distance minimale entre la caméra et le centre du Soleil, en rayons solaires (certains vols le frôlent). */
const SUN_CLEARANCE = 2.5;
/** Seuils sous lesquels parallaxe et fondu des orbites sont considérés comme arrivés. */
const PARALLAX_EPSILON = 1e-4;
const ORBIT_FADE_EPSILON = 1e-3;
/** Ordre de placement des étiquettes : les premières gagnent en cas de chevauchement. */
const LABEL_PRIORITY: readonly BodyKey[] = ["sun", "earth", "jupiter", "saturn", "neptune", "uranus", "mars", "venus", "mercury"];
/** Durée du passage de la couleur unie à la carte photographique. */
const TEXTURE_FADE_SECONDS = 0.6;
/** Dérive des nuages terrestres par rapport au sol, en tours par seconde (temps en marche). */
const CLOUD_DRIFT = 0.005;
/** Si la compilation asynchrone des shaders traîne, on rend quand même (compilation au premier rendu). */
const MAX_COMPILE_WAIT_FRAMES = 120;
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
  }
}

/** Où va une carte photographique, et comment la lire. */
interface TextureSlot {
  textures: Uniform<Texture>[];
  /** Mélanges qui passent de 0 à 1 à son arrivée. */
  mixes: Uniform<number>[];
  /** Couleur (sRGB) ou donnée brute (nuages, océans). */
  color: boolean;
  /** Une seule composante utile (nuages, océans) : un canal au lieu de quatre en mémoire graphique. */
  mono?: true;
  /** Répétée en longitude (cartes de sphère). */
  wrap: boolean;
  /** Filtrage anisotrope : nette jusqu'au bord du disque. */
  sharp: boolean;
}

const surfaceSlot = (surface: SurfaceUniforms, sharp = true): TextureSlot => ({
  textures: [surface.uMap],
  mixes: [surface.uMapMix],
  color: true,
  wrap: true,
  sharp,
});

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

function setupScene(
  renderer: WebGLRenderer,
  { canvas, labels, obstacles, plates, bar, rail, note, onPick }: SolarSceneOptions,
): SolarScene {
  renderer.outputColorSpace = SRGBColorSpace;
  // Les shaders sortent en HDR : PBR Neutral garde les teintes des cartes et adoucit les hautes lumières.
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.setClearColor(0x060b18, 1);
  // Lire le journal de compilation coûte des allers-retours synchrones avec le GPU : en développement seulement.
  renderer.debug.checkShaderErrors = process.env.NODE_ENV !== "production";

  const scene = new Scene();
  const camera = new PerspectiveCamera(36, 1, 0.05, 7000);
  const placeholder = createPlaceholderTexture();
  const tier = pickTextureTier({
    coarsePointer: window.matchMedia("(pointer: coarse)").matches,
    shortSide: Math.min(window.screen.width, window.screen.height),
    maxTextureSize: renderer.capabilities.maxTextureSize,
    pixelHeight: Math.round(window.innerHeight * Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO)),
  });

  const sky = createSky(placeholder);
  scene.add(sky.group);
  const sun = createSun();
  scene.add(sun.mesh, sun.corona);

  const planets = PLANETS.map((planet) => createPlanet(planet, placeholder));
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
  const earth = bodyOf("earth");
  const moon = texturedMoon(earth);
  if (!moon) throw new Error("Lune absente de la scène");
  const saturn = bodyOf("saturn");

  // ---------- Orientation des axes (pôles UAI) ----------
  /** Le pôle est écrit directement dans l'uniforme partagé (nuages de la Terre, anneaux de Saturne). */
  function orientBodies(jd: number): void {
    for (const body of planets) orientAxis(body.tilt, ROTATION[body.planet.key], jd, body.surface.uPlanetPole.value);
  }

  // Méridien origine à sa vraie place au chargement ; ensuite la rotation affichée est ralentie.
  const startJd = julianDate(getClock().now());
  orientBodies(startJd);
  for (const body of planets) body.mesh.rotation.y = primeMeridianAngle(ROTATION[body.planet.key], startJd);

  // ---------- Cartes photographiques : téléchargées par ordre d'escale, fondues à leur arrivée ----------
  const slots: Record<TextureKey, TextureSlot> = {
    mercury: surfaceSlot(bodyOf("mercury").surface),
    venus: surfaceSlot(bodyOf("venus").surface),
    earth: surfaceSlot(earth.surface),
    earthClouds: {
      textures: [earth.surface.uClouds],
      mixes: [earth.surface.uCloudsMix],
      color: false,
      mono: true,
      wrap: true,
      sharp: true,
    },
    earthNight: { textures: [earth.surface.uNight], mixes: [earth.surface.uNightMix], color: true, wrap: true, sharp: true },
    earthSpecular: {
      textures: [earth.surface.uSpecular],
      mixes: [earth.surface.uSpecularMix],
      color: false,
      mono: true,
      wrap: true,
      sharp: false,
    },
    moon: surfaceSlot(moon.surface, false),
    mars: surfaceSlot(bodyOf("mars").surface),
    jupiter: surfaceSlot(bodyOf("jupiter").surface),
    saturn: surfaceSlot(saturn.surface),
    // La texture des anneaux sert aussi à l'ombre qu'ils portent sur Saturne (uniformes partagés).
    saturnRing: { textures: [saturn.surface.uRingMap], mixes: [saturn.surface.uRingMix], color: true, wrap: false, sharp: false },
    uranus: surfaceSlot(bodyOf("uranus").surface),
    neptune: surfaceSlot(bodyOf("neptune").surface),
    milkyWay: { textures: [sky.uniforms.uMap], mixes: [sky.uniforms.uMapMix], color: true, wrap: true, sharp: false },
  };
  // Le filtrage anisotrope ne joue qu'au bord des disques : moins en 1K.
  const anisotropy = Math.min(tier === "2k" ? 8 : 4, renderer.capabilities.getMaxAnisotropy());
  function configureTexture(key: TextureKey, texture: Texture): void {
    const slot = slots[key];
    texture.colorSpace = slot.color ? SRGBColorSpace : NoColorSpace;
    if (slot.mono) texture.format = RedFormat;
    texture.wrapS = slot.wrap ? RepeatWrapping : ClampToEdgeWrapping;
    texture.anisotropy = slot.sharp ? anisotropy : 1;
  }
  let textures = createTextureStream(tier, configureTexture);
  const fading = new Set<Uniform<number>>();
  let loadStop: StopKey | null = null;
  let loadOrder: TextureKey[] = [];
  /** Images à attendre avant d'envoyer la carte suivante au GPU (quelques ms pour une 2K). */
  let installCooldown = 0;

  /** Demande les cartes suivantes, installe au plus une carte arrivée, avance les fondus. */
  function updateTextures(journey: JourneyState, dt: number, reduced: boolean): void {
    if (journey.current !== loadStop) {
      loadStop = journey.current;
      loadOrder = textureLoadOrder(journey.current);
    }
    textures.pump(loadOrder);
    // Pas d'envoi au GPU pendant un vol : une image perdue y décalerait la scène du texte qui défile.
    const flying = journey.from !== lastFrom || journey.to !== lastTo || journey.t !== lastT;
    if (installCooldown > 0) installCooldown -= 1;
    else if (compiled && !flying) {
      const arrived = textures.take();
      if (arrived) {
        const slot = slots[arrived.key];
        for (const target of slot.textures) target.value = arrived.texture;
        renderer.initTexture(arrived.texture);
        for (const mix of slot.mixes) {
          if (reduced) mix.value = 1;
          else fading.add(mix);
        }
        installCooldown = tier === "2k" ? 4 : 2;
        needsRender = true;
      }
    }
    if (fading.size === 0) return;
    for (const mix of fading) {
      mix.value = Math.min(1, mix.value + dt / TEXTURE_FADE_SECONDS);
      if (mix.value === 1) fading.delete(mix);
    }
    needsRender = true;
  }

  // ---------- État ----------
  const view = { width: 1, height: 1 };
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobileLayout = window.matchMedia(MOBILE_LAYOUT);
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
  let disposed = false;
  /** Shaders compilés (en parallèle du fil principal quand le navigateur le permet). */
  let compiled = false;
  let compileWaitFrames = 0;
  /** Quand seul le temps simulé avance, une image sur deux est sautée et son pas de temps reporté. */
  let skipNextFrame = false;
  let pendingDt = 0;
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
    aspect: 1,
    fov: 36,
    band: (key) => shownBands.get(key) ?? null,
    zone: () => zone,
  };
  /** Grand écran : zone libre entre la colonne des plaques et la règle, en fractions de la largeur. */
  let zone: ScreenZone | null = null;
  /** Plaque repliée de chaque escale, collée en bas : hauteur et écart au bas de l'écran, en px. */
  const compactPlates = new Map<StopKey, { height: number; bottom: number }>();
  /** Largeur de vue des mesures repliées : une plaque change de hauteur avec elle. */
  let compactWidth = 0;
  /** Bas de la note d'échelle repliée : la déplier ne déplace pas la caméra. */
  let noteBottom = 0;
  /** Bande libre mesurée au-dessus de chaque plaque, en fractions de la hauteur de la vue (téléphone seulement). */
  const bands = new Map<StopKey, ScreenBand>();
  /** Bandes du cadrage : elles rejoignent en douceur les bandes mesurées. */
  const shownBands = new Map<StopKey, ScreenBand>();
  let bandsSettled = true;
  const orbitPoint = new Vector3();
  const projected = new Vector3();
  const labelSizes = new Map<BodyKey, { width: number; height: number }>();
  const labelShown = new Map<BodyKey, boolean>();
  let obstacleBoxes: LabelBox[] = [];
  const occupied: LabelBox[] = [];

  // ---------- Taille de la vue, mesures du DOM ----------
  function resize(): void {
    view.width = Math.max(1, window.innerWidth);
    view.height = Math.max(1, window.innerHeight);
    const pixelBudget = Math.sqrt(MAX_PIXELS / (view.width * view.height));
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO, pixelBudget));
    renderer.setSize(view.width, view.height, false);
    camera.aspect = view.width / view.height;
    camera.fov = camera.aspect < PORTRAIT_ASPECT ? 50 : 36;
    camera.updateProjectionMatrix();
    cameraContext.aspect = camera.aspect;
    cameraContext.fov = camera.fov;
    needsRender = true;
  }

  /**
   * Mise en page compacte : bande libre entre la barre du haut (ou la note d'échelle visible) et la
   * plaque repliée de chaque escale. Une plaque ou une note dépliée garde la mesure de sa forme
   * repliée, pour que la caméra ne bouge pas ; la mesure des plaques se perd si la largeur change.
   * Sans barre fixe ni plaque collée en bas (écran bas), pas de bande.
   */
  function measureBands(): void {
    bands.clear();
    bandsSettled = false;
    if (view.width !== compactWidth) {
      compactPlates.clear();
      compactWidth = view.width;
    }
    if (!mobileLayout.matches || !bar || getComputedStyle(bar).position !== "fixed") {
      compactPlates.clear();
      return;
    }
    let top = bar.getBoundingClientRect().bottom;
    if (note?.dataset.visible === "true") {
      if (!note.hasAttribute("data-open")) noteBottom = note.getBoundingClientRect().bottom;
      top = Math.max(top, noteBottom);
    } else {
      noteBottom = 0;
    }
    for (const [key, plate] of plates) {
      if (!plate.hasAttribute("data-expanded")) {
        const style = getComputedStyle(plate);
        if (style.position === "sticky") {
          compactPlates.set(key, { height: plate.offsetHeight, bottom: parseFloat(style.bottom) || 0 });
        } else {
          compactPlates.delete(key);
        }
      }
      const compact = compactPlates.get(key);
      const band = compact ? freeBand(view.height, top, compact) : null;
      if (band) bands.set(key, band);
    }
  }

  /**
   * Le cadrage rejoint les bandes mesurées en douceur : la barre d'outils du navigateur qui se replie
   * ou la note qui apparaît ne font pas sauter l'astre. Une bande qui apparaît ou disparaît s'applique
   * aussitôt (pas de forme intermédiaire), comme tout changement en mouvement réduit.
   */
  function settleBands(dt: number, reduced: boolean): void {
    if (bandsSettled) return;
    const follow = reduced ? 1 : easeFactor(dt, BAND_FOLLOW_RATE);
    let settled = true;
    for (const key of shownBands.keys()) if (!bands.has(key)) shownBands.delete(key);
    for (const [key, target] of bands) {
      const shown = shownBands.get(key);
      if (!shown) {
        shownBands.set(key, { ...target });
        continue;
      }
      shown.top = approach(shown.top, target.top, follow, BAND_EPSILON);
      shown.bottom = approach(shown.bottom, target.bottom, follow, BAND_EPSILON);
      if (shown.top !== target.top || shown.bottom !== target.bottom) settled = false;
    }
    bandsSettled = settled;
  }

  /** Grand écran : zone libre entre la colonne des plaques (toutes alignées) et la règle des distances. */
  function measureZone(): void {
    zone = null;
    if (mobileLayout.matches || !rail) return;
    const plate = plates.values().next().value;
    if (!plate) return;
    const left = plate.getBoundingClientRect().right + ZONE_MARGIN_PX;
    // Règle masquée (liste des escales à sa place) : la zone va jusqu'au bord de l'écran.
    const railBox = rail.getBoundingClientRect();
    const right = (railBox.width > 0 ? railBox.left : view.width) - ZONE_MARGIN_PX;
    if (right - left >= MIN_ZONE_SHARE * view.width) zone = { left: left / view.width, right: right / view.width };
  }

  /** Une seule passe de lecture : taille des neuf étiquettes, zones à éviter, bandes et zone libres. */
  function measureLayout(): void {
    for (const [key, element] of labels) {
      labelSizes.set(key, { width: element.offsetWidth, height: element.offsetHeight });
    }
    obstacleBoxes = obstacles.map((element) => {
      const rect = element.getBoundingClientRect();
      return [rect.left, rect.top, rect.right, rect.bottom] as const;
    });
    measureBands();
    measureZone();
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
  // Une plaque change de hauteur (dépliée, repliée, texte agrandi) : nouvelles bandes libres.
  let platesTimer: ReturnType<typeof setTimeout> | undefined;
  const platesObserver = new ResizeObserver(() => {
    clearTimeout(platesTimer);
    platesTimer = setTimeout(measureLayout, RESIZE_DEBOUNCE_MS);
  });
  for (const plate of plates.values()) platesObserver.observe(plate);
  // La note change de taille en apparaissant ou en disparaissant.
  if (note) platesObserver.observe(note);
  void document.fonts?.ready.then(() => {
    if (!disposed) measureLayout();
  });

  // Compilation des shaders hors du premier rendu ; en cas d'échec, elle se fera au premier rendu.
  const onCompiled = () => {
    compiled = true;
    needsRender = true;
  };
  renderer.compileAsync(scene, camera).then(onCompiled, onCompiled);

  /**
   * Contexte WebGL restauré (GPU réinitialisé, onglet mobile repris) : Three renvoie chaque texture
   * depuis son image, or celles des cartes ont été libérées après leur envoi. On repart donc des
   * couleurs unies et on recharge les cartes, que le cache HTTP sert aussitôt.
   */
  const onContextRestored = () => {
    textures.dispose();
    for (const slot of Object.values(slots)) {
      for (const target of slot.textures) target.value = placeholder;
      for (const mix of slot.mixes) mix.value = 0;
    }
    fading.clear();
    textures = createTextureStream(tier, configureTexture);
    needsRender = true;
  };
  canvas.addEventListener("webglcontextrestored", onContextRestored);

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
        // Repère monde de la planète, pour l'ombre des anneaux et le halo d'atmosphère.
        const radius = body.planet.displayRadius * shrink;
        body.surface.uPlanetCenter.value.copy(body.position);
        body.surface.uPlanetRadius.value = radius;
        if (body.atmosphere) {
          body.atmosphere.uPlanetCenter.value.copy(body.position);
          body.atmosphere.uPlanetRadius.value = radius;
        }
      }
      const days = jd - J2000_JD;
      for (const belt of belts) updateBelt(belt, days, s);
      scaleSun(sun, s);
    }

    for (const body of planets) {
      body.mesh.rotation.y += body.spin * dt * run;
      for (const satellite of body.moons) {
        const angle = satellite.phase + (TAU * moonDays) / satellite.periodDays;
        satellite.mesh.position.set(Math.cos(angle) * satellite.distance, 0, -Math.sin(angle) * satellite.distance);
        // Rotation synchrone : chaque lune montre toujours la même face à sa planète.
        satellite.mesh.rotation.y = angle + Math.PI;
        satellite.mesh.visible = s < 0.3;
      }
    }
    earth.surface.uCloudDrift.value = (earth.surface.uCloudDrift.value + CLOUD_DRIFT * dt * run) % 1;

    // Orbites et axes se recalculent quand l'échelle bouge, ou tous les dix ans simulés (précession lente).
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
      orientBodies(jd);
    }

    // La surface du Soleil ne bouille que si le temps tourne, et jamais en mouvement réduit.
    if (snapshot.playing && !reduced) sun.time.value += dt;
  }

  function updateCamera(dt: number, journey: JourneyState, reduced: boolean): void {
    settleBands(dt, reduced);
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
    // Certains vols entre le Soleil et Mercure passeraient dans le Soleil : on le contourne.
    const clearance = SUN.displayRadius * SUN_CLEARANCE * lerp(1, 0.05, realScale);
    if (camera.position.lengthSq() < clearance * clearance) camera.position.setLength(clearance);
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
    sky.group.position.copy(camera.position);
    cameraDistance = state.dist;
    // Éblouissement : discret près du Soleil, plus large quand on le regarde de loin.
    sun.coronaUniforms.uGlare.value = lerp(0.08, 0.32, smoothstep(60, 420, camera.position.length()));

    // L'orbite de l'escale en cours ressort dans sa couleur, les autres s'effacent.
    const focus = journey.current;
    const focusOnPlanet = isPlanetKey(focus);
    const fade = easeFactor(dt, 4);
    let fadingOrbits = false;
    for (const body of planets) {
      const on = body.planet.key === focus;
      const material = body.orbit.material;
      const target = on ? 0.85 : focusOnPlanet ? 0.14 : 0.3;
      material.opacity = approach(material.opacity, target, fade, ORBIT_FADE_EPSILON);
      if (material.opacity !== target) fadingOrbits = true;
      material.color.copy(on ? body.color : brass);
    }
    orbitsSettled = !fadingOrbits;
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
      const journey = journeyStore.get();
      const reduced = reducedMotion.matches;
      updateTextures(journey, dt, reduced);
      if (!compiled) {
        if (++compileWaitFrames < MAX_COMPILE_WAIT_FRAMES) return;
        compiled = true;
      }
      const clock = getClock();
      const now = clock.now();
      const snapshot = clock.snapshot();
      const moving =
        needsRender ||
        journey.from !== lastFrom ||
        journey.to !== lastTo ||
        journey.t !== lastT ||
        realScale !== (snapshot.realScale ? 1 : 0) ||
        (!reduced && (parallax.x !== parallax.targetX || parallax.y !== parallax.targetY)) ||
        !orbitsSettled ||
        !bandsSettled;
      if (!moving) {
        // Rien n'a bougé (temps en pause, défilement et pointeur immobiles) : pas de nouvelle image.
        if (now === lastNow) return;
        // Seul le temps simulé avance : 30 images par seconde suffisent, le pas de temps est reporté.
        skipNextFrame = !skipNextFrame;
        if (skipNextFrame) {
          pendingDt += dt;
          return;
        }
      }
      const step = dt + pendingDt;
      pendingDt = 0;
      needsRender = false;
      lastNow = now;
      lastFrom = journey.from;
      lastTo = journey.to;
      lastT = journey.t;
      updateBodies(step, now, snapshot, reduced);
      updateCamera(step, journey, reduced);
      renderer.render(scene, camera);
      updateLabels();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      clearTimeout(resizeTimer);
      clearTimeout(platesTimer);
      platesObserver.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onWindowPointerMove);
      canvas.removeEventListener("pointermove", onCanvasPointerMove);
      canvas.removeEventListener("click", onCanvasClick);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      canvas.style.cursor = "";
      for (const element of labels.values()) element.style.visibility = "hidden";
      textures.dispose();
      scene.traverse(disposeObject);
      placeholder.dispose();
      renderer.dispose();
    },
  };
}
