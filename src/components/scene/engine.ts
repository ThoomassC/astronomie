import {
  ClampToEdgeWrapping,
  Group,
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
import { GALACTIC_CENTER_DISTANCE_LY, GALACTIC_DISK_RADIUS_LY, sceneFromGalacticXYZ } from "@/lib/astro/galactic";
import { galaxyPointBudget } from "@/lib/astro/milkyWay";
import { ROTATION } from "@/lib/astro/orientation";
import { PLANETS, PLANET_BY_KEY, SUN, type PlanetKey } from "@/lib/astro/planets";
import {
  REAL_SCALE_PLANET_SHRINK,
  REAL_SCALE_SUN_SHRINK,
  toScene,
  unitsPerLightYear,
  zoomScale,
} from "@/lib/astro/scale";
import { NEARBY_STARS } from "@/lib/astro/stars";
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
  fadeSky,
  scaleSun,
  texturedMoon,
  updateBelt,
  type PlanetBody,
} from "./bodies";
import { orientAxis, primeMeridianAngle } from "./axes";
import { rawColor } from "./color";
import {
  DISTANCE_RINGS_LY,
  buildGalaxy,
  createCosmos,
  ringLabelKey,
  starLabelKey,
  weighCosmos,
  type DeepLabelKey,
} from "./cosmos";
import { LABEL_OFFSET_X, LABEL_OFFSET_Y, placeLabel, type LabelBox } from "./labels";
import { SOLAR_HIDDEN_ZOOM, layerWeights } from "./layers";
import { createPlaceholderTexture, type SurfaceUniforms, type Uniform } from "./materials";
import { DEG, TAU, clamp, easeFactor, lerp, smoothstep } from "./math";
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
  /**
   * Étiquettes du ciel profond (étoiles voisines, « Vous êtes ici », centre galactique, cercles de distance),
   * placées comme celles des astres, après elles, et seulement aux zooms où leur couche est dessinée.
   */
  deepLabels: ReadonlyMap<DeepLabelKey, HTMLElement>;
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
/**
 * Ordre de placement des étiquettes des astres : les premières gagnent en cas de chevauchement. Celles du ciel
 * profond viennent après : « Vous êtes ici », le centre galactique, les étoiles de la plus proche à la plus
 * lointaine, puis les cercles de distance.
 */
const LABEL_PRIORITY: readonly BodyKey[] = ["sun", "earth", "jupiter", "saturn", "neptune", "uranus", "mars", "venus", "mercury"];
/** Sous cette opacité, une étiquette est masquée. */
const LABEL_MIN_ALPHA = 0.02;
/** Plan lointain tant que le système solaire est dessiné : le ciel est à 2 730 unités. */
const SOLAR_FAR = 7000;
/**
 * Plan lointain du ciel profond (zoom ≥ SOLAR_HIDDEN_ZOOM) : plus aucune géométrie opaque ni écriture de
 * profondeur, la précision du tampon de profondeur est sans objet ; les bords de la galaxie (21 000 unités
 * au zoom 6) entrent dans le champ sans à-coup.
 */
const DEEP_FAR = 100_000;
/** Au-delà de ce zoom affiché, la galaxie manquante est construite tout de suite (lien direct vers la Voie lactée). */
const GALAXY_EAGER_ZOOM = 5.5;
/** Construction de la galaxie au repos : délai maximal de requestIdleCallback, et attente du repli sans lui (Safari). */
const GALAXY_IDLE_TIMEOUT_MS = 3000;
const GALAXY_FALLBACK_DELAY_MS = 1500;
/**
 * Rayon apparent du disque de la Galaxie (px CSS) auquel ses couleurs sont réglées : celui de l'escale « galaxy »
 * en 1440 × 900. Plus petite à l'écran, elle concentre sa lumière et partirait au blanc : son gain suit
 * (rayon / 290 px)^1,5, borné à 1, entre une lumière totale constante (exposant 0, qui sature) et un éclat de
 * surface constant (exposant 2, trop sombre sur téléphone).
 */
const GALAXY_REFERENCE_RADIUS_PX = 290;
const GALAXY_GAIN_EXPONENT = 1.5;
/**
 * Étiquette d'un cercle de distance : points du cercle essayés tour à tour, en angle depuis la direction de la
 * caméra. D'abord le côté opposé (au-dessus du Soleil à l'écran), puis les côtés, droit en premier (l'étiquette
 * s'étend vers la droite, hors du cercle), puis le côté proche, puis les diagonales ; la première place libre gagne.
 */
const RING_LABEL_ANGLES: readonly number[] = [
  Math.PI,
  (3 * Math.PI) / 2,
  Math.PI / 2,
  0,
  (5 * Math.PI) / 4,
  (3 * Math.PI) / 4,
  (7 * Math.PI) / 4,
  Math.PI / 4,
];
/** Ceintures, dans l'ordre de `belts` : leur opacité de référence est pondérée par le zoom cosmique. */
const BELT_SPECS = [ASTEROID_BELT, KUIPER_BELT] as const;
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
  zoom: 0,
});

/** Étiquette DOM placée par le moteur : taille mesurée, visibilité écrite (le DOM n'est touché qu'au changement). */
interface LabelSlot {
  element: HTMLElement;
  width: number;
  height: number;
  shown: boolean | null;
  /**
   * Ciel profond seulement : centre de la pastille de repère et boîte du texte, mesurés dans l'étiquette (px).
   * Le repère se pose exactement sur l'astre et seul le texte occupe la place, quelle que soit la disposition
   * (texte à droite, au-dessus, en dessous). `null` pour les astres, placés comme avant (décalage fixe).
   */
  layout: { dotX: number; dotY: number; textX: number; textY: number; textWidth: number; textHeight: number } | null;
}

const labelSlot = (element: HTMLElement): LabelSlot => ({ element, width: 0, height: 0, shown: null, layout: null });

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
  { canvas, labels, obstacles, plates, bar, rail, note, deepLabels, onPick }: SolarSceneOptions,
): SolarScene {
  renderer.outputColorSpace = SRGBColorSpace;
  // Les shaders sortent en HDR : PBR Neutral garde les teintes des cartes et adoucit les hautes lumières.
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.setClearColor(0x060b18, 1);
  // Lire le journal de compilation coûte des allers-retours synchrones avec le GPU : en développement seulement.
  renderer.debug.checkShaderErrors = process.env.NODE_ENV !== "production";

  const scene = new Scene();
  const camera = new PerspectiveCamera(36, 1, 0.05, SOLAR_FAR);
  const placeholder = createPlaceholderTexture();
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const tier = pickTextureTier({
    coarsePointer,
    shortSide: Math.min(window.screen.width, window.screen.height),
    maxTextureSize: renderer.capabilities.maxTextureSize,
    pixelHeight: Math.round(window.innerHeight * Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO)),
  });

  const sky = createSky(placeholder);
  scene.add(sky.group);
  /**
   * Système solaire : réduit autour du Soleil par le zoom cosmique (échelle 10^−zoom, posée à chaque image),
   * caché au-delà de SOLAR_HIDDEN_ZOOM. Au zoom 0, l'échelle 1 laisse chaque matrice exactement inchangée.
   */
  const solarRoot = new Group();
  scene.add(solarRoot);
  const sun = createSun();
  solarRoot.add(sun.mesh, sun.corona);

  const planets = PLANETS.map((planet) => createPlanet(planet, placeholder));
  for (const body of planets) solarRoot.add(body.group);
  for (const body of planets) solarRoot.add(body.orbit);
  const belts = BELT_SPECS.map((spec) => createBelt(spec));
  for (const belt of belts) solarRoot.add(belt.points);

  // Ciel profond, en années-lumière, mis à l'échelle du zoom : étoiles voisines, Soleil vu de loin, cercles, galaxie.
  const cosmos = createCosmos(NEARBY_STARS);
  scene.add(cosmos.group);

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
  /** Réduction du système solaire déjà reportée sur les uniformes en coordonnées monde, et astres déplacés depuis. */
  let worldScale = Number.NaN;
  let worldDirty = true;
  /** Poids des couches au zoom cosmique de la dernière image. */
  const weights = layerWeights(0);
  /** Fondu de chaque orbite (mise en avant de l'escale), avant le poids du système solaire. */
  const orbitFade = planets.map((body) => body.orbit.material.opacity);
  /** Centre galactique, en années-lumière depuis le Soleil (ancre de son étiquette), et sa position dans la scène. */
  const galacticCenterLy = new Vector3();
  sceneFromGalacticXYZ(GALACTIC_CENTER_DISTANCE_LY, 0, 0, galacticCenterLy);
  const galacticCenter = new Vector3();
  /** Construction de la galaxie planifiée au repos : de quoi l'annuler. */
  let cancelGalaxyTask: (() => void) | null = null;
  /** Une construction a échoué : la scène continue sans galaxie, sans réessayer à chaque image. */
  let galaxyFailed = false;
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
  const anchor = new Vector3();
  const bodySlots = new Map<BodyKey, LabelSlot>([...labels].map(([key, element]) => [key, labelSlot(element)]));
  const deepSlots = new Map<DeepLabelKey, LabelSlot>([...deepLabels].map(([key, element]) => [key, labelSlot(element)]));
  const labelSlots = [...bodySlots.values(), ...deepSlots.values()];
  /** Étiquettes des étoiles, dans l'ordre des données (distance croissante), et des cercles de distance. */
  const starLabels = [...cosmos.starPositions].map(([key, position]) => ({
    slot: deepSlots.get(starLabelKey(key)),
    position,
  }));
  const ringLabels = DISTANCE_RINGS_LY.map((radius) => ({ slot: deepSlots.get(ringLabelKey(radius)), radius }));
  let obstacleBoxes: LabelBox[] = [];
  const occupied: LabelBox[] = [];

  // ---------- Taille de la vue, mesures du DOM ----------
  function resize(): void {
    view.width = Math.max(1, window.innerWidth);
    view.height = Math.max(1, window.innerHeight);
    const pixelBudget = Math.sqrt(MAX_PIXELS / (view.width * view.height));
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO, pixelBudget));
    // Les points du ciel profond gardent leur taille en px CSS.
    cosmos.pixelRatio.value = renderer.getPixelRatio();
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

  /** Une seule passe de lecture : taille des étiquettes (astres et ciel profond), zones à éviter, bandes et zone libres. */
  function measureLayout(): void {
    for (const slot of labelSlots) {
      slot.width = slot.element.offsetWidth;
      slot.height = slot.element.offsetHeight;
    }
    // L'étiquette est positionnée : les décalages de ses enfants lui sont relatifs.
    for (const slot of deepSlots.values()) {
      const dot = slot.element.querySelector<HTMLElement>("i");
      const text = slot.element.querySelector<HTMLElement>("span");
      slot.layout =
        dot && text
          ? {
              dotX: dot.offsetLeft + dot.offsetWidth / 2,
              dotY: dot.offsetTop + dot.offsetHeight / 2,
              textX: text.offsetLeft,
              textY: text.offsetTop,
              textWidth: text.offsetWidth,
              textHeight: text.offsetHeight,
            }
          : null;
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

  // ---------- Galaxie : construite une fois, au repos, ou tout de suite si l'on y arrive directement ----------
  /**
   * Construit la galaxie (≈ 10 à 30 ms, une fois) et la pèse aussitôt. Un échec laisse la scène tourner
   * sans galaxie, sans nouvel essai.
   */
  function buildGalaxyNow(): void {
    cancelGalaxyTask?.();
    cancelGalaxyTask = null;
    if (disposed || cosmos.galaxy || galaxyFailed) return;
    try {
      buildGalaxy(cosmos, galaxyPointBudget(coarsePointer));
    } catch (error) {
      galaxyFailed = true;
      console.error("Voie lactée non construite : la scène continue sans elle", error);
      return;
    }
    weighCosmos(cosmos, weights);
    if (weights.galaxy > 0) needsRender = true;
  }

  /**
   * Planifie la construction quand le fil principal est libre, après la compilation des shaders (le programme
   * des points, partagé avec les étoiles, est déjà prêt). Safari n'a pas requestIdleCallback : simple délai.
   */
  function scheduleGalaxy(): void {
    if (disposed || cosmos.galaxy || galaxyFailed || cancelGalaxyTask) return;
    if (typeof window.requestIdleCallback === "function") {
      const handle = window.requestIdleCallback(() => buildGalaxyNow(), { timeout: GALAXY_IDLE_TIMEOUT_MS });
      cancelGalaxyTask = () => window.cancelIdleCallback(handle);
    } else {
      const handle = setTimeout(buildGalaxyNow, GALAXY_FALLBACK_DELAY_MS);
      cancelGalaxyTask = () => clearTimeout(handle);
    }
  }

  // Compilation des shaders hors du premier rendu ; en cas d'échec, elle se fera au premier rendu.
  const onCompiled = () => {
    compiled = true;
    needsRender = true;
    scheduleGalaxy();
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
    // Le lancer de rayon ignore la visibilité : hors du système solaire, plus rien à viser.
    if (!solarRoot.visible) return null;
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

    // Positions, tailles et ceintures ne dépendent que de l'instant simulé et de l'échelle. Positions dans le
    // repère du système solaire (`solarRoot`) ; leurs reports en coordonnées monde suivent le zoom (syncSolarWorld).
    if (jd !== bodiesJd || s !== bodiesScale) {
      bodiesJd = jd;
      bodiesScale = s;
      // En échelle réelle, les planètes deviennent plus petites qu'un pixel : seules les étiquettes les signalent.
      const shrink = lerp(1, REAL_SCALE_PLANET_SHRINK, s);
      for (const body of planets) {
        toScene(heliocentric(body.planet, jd), s, body.position);
        body.group.position.copy(body.position);
        body.group.scale.setScalar(shrink);
      }
      const days = jd - J2000_JD;
      for (const belt of belts) updateBelt(belt, days, s);
      worldDirty = true;
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

  /**
   * Repères lus par les shaders en coordonnées monde, hors de la matrice de `solarRoot` : centre et rayon des
   * planètes (ombre des anneaux, halo d'atmosphère) et couronne du Soleil (tracée en espace vue). Ils suivent
   * ici la réduction du zoom cosmique ; recalculés quand les astres bougent ou que la réduction change.
   */
  function syncSolarWorld(scale: number): void {
    worldScale = scale;
    worldDirty = false;
    const shrink = lerp(1, REAL_SCALE_PLANET_SHRINK, realScale);
    for (const body of planets) {
      const radius = body.planet.displayRadius * shrink * scale;
      body.surface.uPlanetCenter.value.copy(body.position).multiplyScalar(scale);
      body.surface.uPlanetRadius.value = radius;
      if (body.atmosphere) {
        body.atmosphere.uPlanetCenter.value.copy(body.position).multiplyScalar(scale);
        body.atmosphere.uPlanetRadius.value = radius;
      }
    }
    scaleSun(sun, realScale, scale);
  }

  /**
   * Zoom cosmique affiché : réduit le système solaire autour du Soleil (10^−zoom, la lumière des shaders vient
   * toujours de l'origine) et le cache au-delà de SOLAR_HIDDEN_ZOOM, met le ciel profond à l'échelle des
   * années-lumière, pèse chaque couche, choisit le plan lointain. Au zoom 0, rien ne change : échelle 1,
   * couches nouvelles invisibles, plan lointain de 7 000.
   */
  function applyZoom(zoom: number): void {
    const scale = zoomScale(zoom);
    solarRoot.scale.setScalar(scale);
    solarRoot.visible = zoom < SOLAR_HIDDEN_ZOOM;
    cosmos.group.scale.setScalar(unitsPerLightYear(zoom));
    if (zoom > GALAXY_EAGER_ZOOM && !cosmos.galaxy) buildGalaxyNow();
    layerWeights(zoom, weights);
    weighCosmos(cosmos, weights);
    fadeSky(sky, weights.sky);
    if (worldDirty || scale !== worldScale) syncSolarWorld(scale);
    // La projection est recalculée par setViewOffset, à chaque image.
    camera.far = solarRoot.visible ? SOLAR_FAR : DEEP_FAR;
  }

  /**
   * Gain de la galaxie : rayon apparent de son disque (px CSS, à la distance de son centre) rapporté au rayon de
   * référence, à la puissance GALAXY_GAIN_EXPONENT, borné à 1. Plus grande qu'au repos (vol vers elle), elle ne
   * s'éclaircit pas : ses points s'écartent.
   */
  function updateGalaxyGain(): void {
    const lightYear = cosmos.group.scale.x;
    galacticCenter.copy(galacticCenterLy).multiplyScalar(lightYear);
    const pixelsPerTangent = view.height / (2 * Math.tan((camera.fov * DEG) / 2));
    const radiusPx = (GALACTIC_DISK_RADIUS_LY * lightYear * pixelsPerTangent) / camera.position.distanceTo(galacticCenter);
    cosmos.galaxyGain.value = Math.min(1, (radiusPx / GALAXY_REFERENCE_RADIUS_PX) ** GALAXY_GAIN_EXPONENT);
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
    applyZoom(state.zoom);
    const scale = solarRoot.scale.x;

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
    const clearance = SUN.displayRadius * SUN_CLEARANCE * lerp(1, REAL_SCALE_SUN_SHRINK, realScale) * scale;
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
    if (weights.galaxy > 0) updateGalaxyGain();
    // Éblouissement : discret près du Soleil, plus large quand on le regarde de loin (distance ramenée à
    // l'échelle du système solaire : réduit par le zoom, il est vu de très loin).
    sun.coronaUniforms.uGlare.value = lerp(0.08, 0.32, smoothstep(60, 420, camera.position.length() / scale));

    // L'orbite de l'escale en cours ressort dans sa couleur, les autres s'effacent. Orbites et ceintures
    // s'éteignent ensuite avec le poids du système solaire : réduites, elles s'agglutineraient en une tache.
    const focus = journey.current;
    const focusOnPlanet = isPlanetKey(focus);
    const fade = easeFactor(dt, 4);
    const solarWeight = weights.solar;
    let fadingOrbits = false;
    planets.forEach((body, i) => {
      const on = body.planet.key === focus;
      const target = on ? 0.85 : focusOnPlanet ? 0.14 : 0.3;
      orbitFade[i] = approach(orbitFade[i], target, fade, ORBIT_FADE_EPSILON);
      if (orbitFade[i] !== target) fadingOrbits = true;
      const material = body.orbit.material;
      material.opacity = orbitFade[i] * solarWeight;
      material.color.copy(on ? body.color : brass);
      body.orbit.visible = solarWeight > 0;
    });
    orbitsSettled = !fadingOrbits;
    belts.forEach((belt, i) => {
      belt.points.material.opacity = BELT_SPECS[i].opacity * solarWeight;
      belt.points.visible = solarWeight > 0;
    });
  }

  function setLabelShown(slot: LabelSlot, shown: boolean): void {
    if (slot.shown === shown) return;
    slot.shown = shown;
    slot.element.style.visibility = shown ? "visible" : "hidden";
  }

  /**
   * Pose l'étiquette sur son ancre (coordonnées monde) avec l'opacité `alpha`, si elle y tient sans recouvrir
   * une étiquette plus prioritaire ; renvoie faux sinon, sans rien changer.
   */
  function fitSlot(slot: LabelSlot, at: Vector3, alpha: number): boolean {
    projected.copy(at).project(camera);
    const x = ((projected.x + 1) / 2) * view.width;
    const y = ((1 - projected.y) / 2) * view.height;
    const { layout } = slot;
    // Ciel profond : la boîte testée est celle du texte (placeLabel la décale de LABEL_OFFSET_X/Y : on compense).
    const box = layout
      ? placeLabel(
          {
            x: x - layout.dotX + layout.textX + LABEL_OFFSET_X,
            y: y - layout.dotY + layout.textY + LABEL_OFFSET_Y,
            depth: projected.z,
            width: layout.textWidth,
            height: layout.textHeight,
          },
          view.width,
          view.height,
          occupied,
        )
      : placeLabel({ x, y, depth: projected.z, width: slot.width, height: slot.height }, view.width, view.height, occupied);
    if (!box) return false;
    occupied.push(box);
    const left = layout ? x - layout.dotX : box[0];
    const top = layout ? y - layout.dotY : box[1];
    slot.element.style.transform = `translate3d(${left.toFixed(1)}px,${top.toFixed(1)}px,0)`;
    slot.element.style.opacity = alpha.toFixed(3);
    setLabelShown(slot, true);
    return true;
  }

  /** Place l'étiquette sur son ancre si elle y tient ; sinon, ou sous LABEL_MIN_ALPHA, la masque. */
  function placeSlot(slot: LabelSlot | undefined, at: Vector3, alpha: number): void {
    if (!slot) return;
    if (alpha < LABEL_MIN_ALPHA || !fitSlot(slot, at, alpha)) setLabelShown(slot, false);
  }

  /**
   * Étiquette d'un cercle de distance (`radius` en unités de scène) : essaie les points de RING_LABEL_ANGLES,
   * comptés depuis la direction de la caméra, et garde le premier où elle tient ; sinon, la masque.
   */
  function placeRingSlot(slot: LabelSlot | undefined, radius: number, towardCamera: number, alpha: number): void {
    if (!slot) return;
    if (alpha >= LABEL_MIN_ALPHA) {
      for (const angle of RING_LABEL_ANGLES) {
        const around = towardCamera + angle;
        if (fitSlot(slot, anchor.set(radius * Math.cos(around), 0, radius * Math.sin(around)), alpha)) return;
      }
    }
    setLabelShown(slot, false);
  }

  function updateLabels(): void {
    // Vue rapprochée : les étiquettes s'effacent ; en échelle réelle, elles sont le seul repère.
    const alpha = realScale > 0.5 ? 1 : smoothstep(28, 95, cameraDistance);
    const solarScale = solarRoot.scale.x;
    const lightYear = cosmos.group.scale.x;
    /*
     * « Soleil » et « Vous êtes ici » partagent l'ancre du Soleil : le premier s'efface pendant la première
     * moitié de l'arrivée de la galaxie, le second apparaît pendant la seconde ; jamais l'un sur l'autre.
     */
    const sunFade = 1 - smoothstep(0, 0.5, weights.galaxy);
    const hereFade = smoothstep(0.5, 1, weights.galaxy);
    occupied.length = 0;
    occupied.push(...obstacleBoxes);
    for (const key of LABEL_PRIORITY) {
      if (key === "sun") placeSlot(bodySlots.get(key), anchor.set(0, 0, 0), alpha * sunFade);
      else placeSlot(bodySlots.get(key), anchor.copy(bodyOf(key).position).multiplyScalar(solarScale), alpha * weights.planetLabels);
    }
    // Ciel profond : non interactif, placé après les astres.
    placeSlot(deepSlots.get("here"), anchor.set(0, 0, 0), hereFade);
    placeSlot(deepSlots.get("center"), anchor.copy(galacticCenterLy).multiplyScalar(lightYear), weights.galaxy);
    for (const { slot, position } of starLabels) {
      placeSlot(slot, anchor.set(position.x, position.y, position.z).multiplyScalar(lightYear), weights.stars);
    }
    // Les cercles, en dernier : chacun est nommé là où son étiquette trouve une place libre le long du cercle.
    const towardCamera = Math.atan2(camera.position.z, camera.position.x);
    for (const { slot, radius } of ringLabels) placeRingSlot(slot, radius * lightYear, towardCamera, weights.stars);
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
        scheduleGalaxy();
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
        // Seul le temps simulé avance, or hors du système solaire (étoiles, galaxie) il ne change rien de visible.
        if (!solarRoot.visible) return;
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
      cancelGalaxyTask?.();
      cancelGalaxyTask = null;
      for (const slot of labelSlots) slot.element.style.visibility = "hidden";
      textures.dispose();
      scene.traverse(disposeObject);
      placeholder.dispose();
      renderer.dispose();
    },
  };
}
