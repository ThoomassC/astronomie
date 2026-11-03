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
  type Material,
  type Object3D,
  type WebGLRenderer,
} from "three";
import { J2000_JD } from "@/lib/astro/constants";
import { isEarthViewTarget, viewFromEarth } from "@/lib/astro/earthView";
import { elementsAt, heliocentric, julianDate, positionAt } from "@/lib/astro/ephemeris";
import { GALACTIC_CENTER_DISTANCE_LY, GALACTIC_DISK_RADIUS_LY, sceneFromGalacticXYZ } from "@/lib/astro/galactic";
import { LOCAL_GROUP, galaxyCenterKly, galaxyRadiusKly } from "@/lib/astro/localGroup";
import { galaxyPointBudget } from "@/lib/astro/milkyWay";
import { ROTATION } from "@/lib/astro/orientation";
import { PLANETS, PLANET_BY_KEY, type PlanetKey } from "@/lib/astro/planets";
import { REAL_SCALE_PLANET_SHRINK, toScene, unitsPerLightYear, zoomScale } from "@/lib/astro/scale";
import { NEARBY_STARS } from "@/lib/astro/stars";
import { OBSERVABLE_UNIVERSE_RADIUS_GLY } from "@/lib/astro/universe";
import {
  STOP_ORDER,
  blendCameras,
  cameraFor,
  isCosmicStop,
  mixCameras,
  type CamState,
  type StopCameraContext,
  type StopKey,
} from "@/lib/journey/camera";
import { exploreStore, type ExploreState } from "@/lib/journey/explore";
import {
  EXPLORE_COSMIC_BAND,
  EXPLORE_TRANSITION_S,
  ORBIT_EASE_RATE,
  ORBIT_MAX_ELEV,
  applyOrbitInput,
  directionToView,
  easeOrbitView,
  orbitCamera,
  orbitFromCamera,
  orbitLimits,
  sunClearance,
  type ExploreStop,
  type OrbitInput,
  type OrbitView,
} from "@/lib/journey/orbit";
import { smootherstep } from "@/lib/journey/sections";
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
  fadeOrbitNear,
  fadeSky,
  scaleSun,
  setPlanetBrightness,
  texturedMoon,
  updateBelt,
  type PlanetBody,
} from "./bodies";
import { orientAxis, primeMeridianAngle } from "./axes";
import { rawColor } from "./color";
import { planetBrightness, restWeight } from "./focus";
import {
  DISTANCE_RINGS_LY,
  SUN_POINT_SIZE_PX,
  buildGalaxy,
  createCosmos,
  magnifyGalaxy,
  ringLabelKey,
  starLabelKey,
  starLabelOrder,
  sunPointPosition,
  weighCosmos,
  type DeepLabelKey,
} from "./cosmos";
import {
  EXTRAGALACTIC_LABEL_ORDER,
  LOCAL_GROUP_POINT_BUDGET,
  WEB_POINT_BUDGET,
  buildLocalGroup,
  buildUniverse,
  createExtragalactic,
  fitLocalGroup,
  fitShells,
  fitWeb,
  labelledBubbleIndex,
  magnifyLocalGroup,
  shellFit,
  splitLight,
  weighExtragalactic,
  type ExtragalacticLabelKey,
  type ScreenBox,
} from "./extragalactic";
import {
  anchoredBox,
  clearanceShift,
  markerLayouts,
  placeLabel,
  placeMarkedLabel,
  pointBox,
  type LabelBox,
  type MarkerLayout,
} from "./labels";
import { SOLAR_HIDDEN_ZOOM, galaxyMagnification, layerWeights } from "./layers";
import { createPlaceholderTexture, type SurfaceUniforms, type Uniform } from "./materials";
import { DEG, TAU, clamp, easeFactor, lerp, smoothstep } from "./math";
import { createRenderer, releaseRenderer } from "./renderer";
import { createScreenLayout } from "./screenLayout";
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
  /**
   * Note d'échelle : visible sur téléphone, elle borde aussi la bande libre par le haut. Suspendue aux escales
   * cosmiques (`data-suspended`), elle y garde sa place.
   */
  note: HTMLElement | null;
  /**
   * Étiquettes du ciel profond (étoiles voisines, « Vous êtes ici », centre galactique, cercles de distance, galaxies
   * du Groupe local, toile, fond diffus, univers), placées après celles des astres et seulement aux zooms où leur
   * couche est dessinée : repère exactement sur l'astre, texte à droite ou à gauche, jamais hors de la vue ni sur le
   * point d'une étoile.
   */
  deepLabels: ReadonlyMap<DeepLabelKey | ExtragalacticLabelKey, HTMLElement>;
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
/** Plafond de pixels rendus : un écran 4K externe en 1,5 en compterait 8 millions. */
const MAX_PIXELS = 4_200_000;
/**
 * Seuils sous lesquels parallaxe et fondu des orbites sont considérés comme arrivés. La parallaxe (au plus 0,05 rad
 * d'azimut) s'arrête à un millième de sa course : le dernier dixième de pixel ne valait pas des secondes de rendu.
 */
const PARALLAX_EPSILON = 1e-3;
const ORBIT_FADE_EPSILON = 1e-3;
/**
 * Ordre de placement des étiquettes des astres : les premières gagnent en cas de chevauchement. Viennent ensuite les
 * points visibles (point-Soleil, étoiles), que nulle étiquette du ciel profond ne recouvre, puis le ciel profond :
 * « Vous êtes ici », le centre galactique, les galaxies du Groupe local, la toile, le fond diffus, notre univers et
 * les autres (EXTRAGALACTIC_LABEL_ORDER), les étoiles de la plus proche à la plus lointaine, les cercles de distance.
 */
const LABEL_PRIORITY: readonly BodyKey[] = ["sun", "earth", "jupiter", "saturn", "neptune", "uranus", "mars", "venus", "mercury"];
/** Sous cette opacité, une étiquette est masquée. */
const LABEL_MIN_ALPHA = 0.02;
/** Écart entre le bord du disque d'une galaxie et son nom posé à côté, en px. */
const GALAXY_LABEL_GAP_PX = 6;
/** Plan lointain tant que le système solaire est dessiné : le ciel est à 2 730 unités. */
const SOLAR_FAR = 7000;
/**
 * Plan lointain du ciel profond (zoom ≥ SOLAR_HIDDEN_ZOOM) : plus aucune géométrie opaque ni écriture de
 * profondeur, la précision du tampon de profondeur est sans objet ; les bords de la galaxie (21 000 unités
 * au zoom 6) entrent dans le champ sans à-coup. Il suffit jusqu'au multivers : quand la toile paraît (zoom 11,2),
 * l'Univers observable fait 80 950 unités de rayon, caméra près de son centre ; au Groupe local, Andromède est à
 * 140 unités ; à l'Univers observable, la sphère fait 128 unités, au multivers 13.
 */
const DEEP_FAR = 100_000;
/** Au-delà de ce zoom affiché, la galaxie manquante est construite tout de suite (lien direct vers la Voie lactée). */
const GALAXY_EAGER_ZOOM = 5.5;
/** De même pour le Groupe local (ses galaxies paraissent à 8,5) et pour l'Univers (la toile paraît à 11,2). */
const LOCAL_GROUP_EAGER_ZOOM = 8.6;
const UNIVERSE_EAGER_ZOOM = 11;
/**
 * Escales d'où la galaxie se prépare : l'au-delà de Neptune et après. Qui ne quitte pas le système solaire ne paie
 * ni sa génération ni sa mémoire.
 */
const GALAXY_PREPARE_STOPS: ReadonlySet<StopKey> = new Set(STOP_ORDER.slice(STOP_ORDER.indexOf("beyond")));
/**
 * Constructions au repos (galaxie, puis Groupe local, puis Univers, en chaîne) : délai maximal de requestIdleCallback,
 * et attente du repli sans lui (Safari).
 */
const BUILD_IDLE_TIMEOUT_MS = 3000;
const BUILD_FALLBACK_DELAY_MS = 1500;
/**
 * Rayon apparent du disque de la Galaxie (px CSS) auquel ses couleurs sont réglées : celui de l'escale « galaxy »
 * en 1440 × 900. Plus petite à l'écran, elle concentre sa lumière et partirait au blanc : sa lumière suit
 * (rayon / 290 px)^1,5, bornée à 1, entre une lumière totale constante (exposant 0, qui sature) et un éclat de
 * surface constant (exposant 2, trop sombre sur téléphone).
 */
const GALAXY_REFERENCE_RADIUS_PX = 290;
const GALAXY_GAIN_EXPONENT = 1.5;
/**
 * Gain le plus bas de la galaxie : en dessous, chaque point ajouterait moins d'un demi-niveau sur 255 et le tampon
 * 8 bits l'effacerait (au Groupe local, le gain tomberait à 0,0025 : plus de Voie lactée). La lumière qui reste se
 * règle alors par la part des points dessinés (splitLight) ; au-dessus, rien ne change.
 */
const GALAXY_MIN_GAIN = 0.25;
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

const emptyOrbitView = (): OrbitView => ({ azim: 0, elev: 0, distanceLog: 0 });

/** Aucun geste : la vue d'exploration est seulement bornée (ses limites suivent l'échelle et la taille de la vue). */
const NO_ORBIT_INPUT: Readonly<OrbitInput> = { azim: 0, elev: 0, distanceLog: 0, recenter: false };

/** La vue affichée s'est posée sur la vue demandée (easeOrbitView s'y pose exactement). */
const sameView = (a: OrbitView, b: OrbitView) =>
  a.azim === b.azim && a.elev === b.elev && a.distanceLog === b.distanceLog;

/**
 * Étiquette à repère (ciel profond, et « Soleil » devenu point) : le repère se pose exactement sur l'astre et seul le
 * texte occupe la place. Dispositions du texte mesurées dans la forme normale (texte complet à droite du repère, ou
 * centré au-dessus ou en dessous de lui), à essayer dans l'ordre ; taille du repère, réservée une fois posé.
 */
interface LabelMarker {
  layouts: MarkerLayout[];
  dotY: number;
  dotWidth: number;
  dotHeight: number;
}

/** Étiquette DOM placée par le moteur : taille mesurée, et dernières valeurs écrites (le DOM n'est touché qu'au changement). */
interface LabelSlot {
  element: HTMLElement;
  width: number;
  height: number;
  shown: boolean | null;
  transform: string;
  opacity: string;
  /** Texte à gauche du repère (`data-mirrored`), nom seul (`data-short`). */
  mirrored: boolean;
  short: boolean;
  /** Nom d'une galaxie posé à côté de son disque, repère effacé (`data-beside`). */
  beside: boolean;
  /** Étiquettes à repère seulement ; `null` pour les planètes, placées par leur bouton entier (décalage fixe). */
  marker: LabelMarker | null;
}

/** Mémoire d'une étiquette, partie de l'état du DOM (un moteur précédent a pu y écrire). */
const labelSlot = (element: HTMLElement): LabelSlot => ({
  element,
  width: 0,
  height: 0,
  shown: null,
  transform: element.style.transform,
  opacity: element.style.opacity,
  mirrored: element.hasAttribute("data-mirrored"),
  short: element.hasAttribute("data-short"),
  beside: element.hasAttribute("data-beside"),
  marker: null,
});

function setLabelShown(slot: LabelSlot, shown: boolean): void {
  if (slot.shown === shown) return;
  slot.shown = shown;
  slot.element.style.visibility = shown ? "visible" : "hidden";
}

/** Disposition écrite dans l'étiquette : texte à gauche du repère (`data-mirrored`), nom seul (`data-short`). */
function setLabelForm(slot: LabelSlot, mirrored: boolean, short: boolean): void {
  if (slot.mirrored !== mirrored) {
    slot.mirrored = mirrored;
    slot.element.toggleAttribute("data-mirrored", mirrored);
  }
  if (slot.short !== short) {
    slot.short = short;
    slot.element.toggleAttribute("data-short", short);
  }
}

/** Nom posé à côté du disque de sa galaxie, repère effacé (`data-beside`), ou sur son repère. */
function setLabelBeside(slot: LabelSlot, beside: boolean): void {
  if (slot.beside === beside) return;
  slot.beside = beside;
  slot.element.toggleAttribute("data-beside", beside);
}

/**
 * Montre l'étiquette, coin haut gauche en (left, top) px, à l'opacité `alpha`. Seules les valeurs qui changent sont
 * écrites : au repos ou quand seul le temps avance, le style des étiquettes n'est plus invalidé à chaque image.
 */
function showLabel(slot: LabelSlot, left: number, top: number, alpha: number): void {
  const transform = `translate3d(${left.toFixed(1)}px,${top.toFixed(1)}px,0)`;
  if (transform !== slot.transform) {
    slot.transform = transform;
    slot.element.style.transform = transform;
  }
  const opacity = alpha.toFixed(3);
  if (opacity !== slot.opacity) {
    slot.opacity = opacity;
    slot.element.style.opacity = opacity;
  }
  setLabelShown(slot, true);
}

/** Repère et texte d'une étiquette, mesurés dans sa forme normale ; `null` s'il lui manque l'un ou l'autre. */
function measureMarker(element: HTMLElement): LabelMarker | null {
  // L'étiquette est positionnée : les décalages de ses enfants lui sont relatifs.
  const dot = element.querySelector<HTMLElement>(":scope > i");
  const text = element.querySelector<HTMLElement>(":scope > span");
  if (!dot || !text) return null;
  const dotY = dot.offsetTop + dot.offsetHeight / 2;
  return {
    layouts: markerLayouts({
      dotX: dot.offsetLeft + dot.offsetWidth / 2,
      dotY,
      dotWidth: dot.offsetWidth,
      textX: text.offsetLeft,
      textY: text.offsetTop,
      textWidth: text.offsetWidth,
      textHeight: text.offsetHeight,
      detailWidth: text.querySelector<HTMLElement>(".dist")?.offsetWidth ?? 0,
    }),
    dotY,
    dotWidth: dot.offsetWidth,
    dotHeight: dot.offsetHeight,
  };
}

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
 * Renvoie `null` sans WebGL 2 ou en rendu logiciel : la page passe alors au repli CSS (createRenderer).
 */
export function createSolarScene(options: SolarSceneOptions): SolarScene | null {
  const renderer = createRenderer(options.canvas);
  if (!renderer) return null;
  try {
    return setupScene(renderer, options);
  } catch (error) {
    releaseRenderer(renderer);
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
  // Au-delà : galaxies du Groupe local (kly), toile, fond diffus et autres bulles (Gal), construits à la demande.
  const extragalactic = createExtragalactic(cosmos.pixelRatio, LOCAL_GROUP);
  scene.add(extragalactic.localGroup, extragalactic.universe);

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
        // Carte d'un objet caché (système solaire réduit au point-Soleil, ciel éteint) : pas de fondu à regarder,
        // ni d'image à rendre. La carte est déjà sur le GPU quand l'objet réapparaît.
        const hidden = arrived.key === "milkyWay" ? !sky.group.visible : !solarRoot.visible;
        for (const mix of slot.mixes) {
          if (reduced || hidden) mix.value = 1;
          else fading.add(mix);
        }
        installCooldown = tier === "2k" ? 4 : 2;
        if (!hidden) needsRender = true;
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
  /** Bandes libres (téléphone) et zone libre (grand écran) autour de la scène, mesurées dans la page. */
  const screenLayout = createScreenLayout({ bar, rail, note, plates });
  /** Bandes du cadrage posées sur leur mesure : aucune image à rendre pour elles. */
  let layoutSettled = true;
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
  /** Andromède, la plus grande galaxie du Groupe local : son rayon apparent règle le niveau de détail du groupe. */
  const andromeda = LOCAL_GROUP.find((galaxy) => galaxy.key === "andromeda");
  const andromedaCenterKly = new Vector3();
  if (andromeda) galaxyCenterKly(andromeda, andromedaCenterKly);
  const andromedaRadiusKly = andromeda ? galaxyRadiusKly(andromeda) : 0;
  /**
   * Grossissement des galaxies au zoom affiché (galaxyMagnification) : 1 jusqu'à la Voie lactée,
   * LOCAL_GROUP_MAGNIFICATION au Groupe local.
   */
  let magnification = 1;
  /**
   * Part du fond diffus et de chaque autre bulle qui tient dans l'espace libre de l'écran (fitShellsToScreen) : leurs
   * étiquettes s'effacent avec elles.
   */
  let cmbFit = 1;
  const bubbleFits: number[] = [];
  const labelledBubble = labelledBubbleIndex();
  /** Espace libre de l'écran, en px CSS (freeBox). */
  const freeArea: ScreenBox = { left: 0, right: 0, top: 0, bottom: 0 };
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
    band: (key) => screenLayout.band(key),
    zone: () => screenLayout.zone(),
  };

  // Exploration (« Tourner autour ») : la caméra quitte le voyage et tourne autour de la cible de l'escale, au gré des
  // gestes (exploreStore). Entrée et sortie se fondent depuis la dernière caméra affichée.
  /**
   * Cadrage de l'exploration : mêmes astres, sans la mise en page (le contenu est masqué). Les escales lointaines
   * remplissent tout l'écran (EXPLORE_COSMIC_BAND) ; les astres, l'accueil et l'au-delà gardent leur distance de base.
   * Échelle et taille de la vue recopiées de `cameraContext` à chaque image.
   */
  const exploreContext: StopCameraContext = {
    planetPosition: cameraContext.planetPosition,
    planetRadius: cameraContext.planetRadius,
    realScale: 0,
    portrait: false,
    aspect: 1,
    fov: 36,
    band: (key) => (isCosmicStop(key) ? EXPLORE_COSMIC_BAND : null),
  };
  /** Escale explorée par la caméra ; null quand elle suit le voyage. */
  let exploring: ExploreStop | null = null;
  /** « Vu depuis la Terre » appliqué à la dernière image rendue. */
  let fromEarthShown = false;
  /** Caméra de la dernière image rendue, d'où partent les fondus ; aucune avant la première image. */
  const shownCamera = emptyCamState();
  let cameraShown = false;
  /** Fondu d'entrée ou de sortie : caméra de départ et avancement, de 0 à 1 (1 : aucun fondu en cours). */
  const transitionFrom = emptyCamState();
  let transitionT = 1;
  /** Vue demandée par les gestes, vue affichée (lissée vers elle), vue de départ de l'escale (recentrage). */
  const orbitView = emptyOrbitView();
  const orbitShown = emptyOrbitView();
  const orbitHome = emptyOrbitView();
  const exploreBase = emptyCamState();
  const exploreCam = emptyCamState();
  const camMixed = emptyCamState();
  const orbitPoint = new Vector3();
  const projected = new Vector3();
  const anchor = new Vector3();
  /** Bord du disque d'une galaxie, sur l'axe horizontal de la caméra (discRadiusPx). */
  const discEdge = new Vector3();
  const bodySlots = new Map<BodyKey, LabelSlot>([...labels].map(([key, element]) => [key, labelSlot(element)]));
  const deepSlots = new Map<DeepLabelKey | ExtragalacticLabelKey, LabelSlot>(
    [...deepLabels].map(([key, element]) => [key, labelSlot(element)]),
  );
  const labelSlots = [...bodySlots.values(), ...deepSlots.values()];
  /** Étiquettes à repère : tout le ciel profond, et « Soleil », qui en prend la disposition quand le Soleil devient un point. */
  const sunSlot = bodySlots.get("sun");
  const markedSlots = [...(sunSlot ? [sunSlot] : []), ...deepSlots.values()];
  /**
   * Étoiles, dans l'ordre de pose de leurs étiquettes (les remarquables d'abord, puis par distance croissante) :
   * étiquette, position (al), taille du point (px).
   */
  const stars = starLabelOrder(NEARBY_STARS).flatMap((key) => {
    const position = cosmos.starPositions.get(key);
    return position ? [{ slot: deepSlots.get(starLabelKey(key)), position, size: cosmos.starSizes.get(key) ?? 0 }] : [];
  });
  const ringLabels = DISTANCE_RINGS_LY.map((radius) => ({ slot: deepSlots.get(ringLabelKey(radius)), radius }));
  /** Galaxies, toile, fond diffus, univers, dans l'ordre de priorité : étiquette, ancre dans le repère de son groupe. */
  const extragalacticLabels = EXTRAGALACTIC_LABEL_ORDER.flatMap((key) => {
    const anchorOf = extragalactic.labelAnchors.get(key);
    return anchorOf
      ? [{ key, slot: deepSlots.get(key), group: anchorOf.group, position: anchorOf.position, radius: anchorOf.radius }]
      : [];
  });
  let obstacleBoxes: LabelBox[] = [];
  const occupied: LabelBox[] = [];
  /** Position projetée de la dernière ancre, en px (la profondeur reste dans `projected.z`). */
  const onScreen = { x: 0, y: 0 };

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
   * Une seule passe de lecture : taille des étiquettes (astres et ciel profond), zones à éviter, bandes et zone
   * libres. Les étiquettes à repère sont mesurées dans leur forme normale, puis reprennent la leur après toutes les
   * lectures : sur un écran à 120 Hz, la boucle saute une image sur deux, et la suivante pourrait être peinte sans elle.
   */
  function measureLayout(): void {
    const forms = markedSlots.map(({ mirrored, short }) => ({ mirrored, short }));
    for (const slot of markedSlots) setLabelForm(slot, false, false);
    for (const slot of labelSlots) {
      slot.width = slot.element.offsetWidth;
      slot.height = slot.element.offsetHeight;
    }
    for (const slot of markedSlots) slot.marker = measureMarker(slot.element);
    obstacleBoxes = obstacles.map((element) => {
      const rect = element.getBoundingClientRect();
      return [rect.left, rect.top, rect.right, rect.bottom] as const;
    });
    screenLayout.measure(view);
    layoutSettled = false;
    markedSlots.forEach((slot, i) => setLabelForm(slot, forms[i].mirrored, forms[i].short));
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

  // ---------- Ciel profond : construit une fois, au repos ou tout de suite si l'on y arrive directement ----------
  /** Construction faite une fois, au repos (planifiée) ou tout de suite ; un échec ne se retente pas. */
  interface DeferredBuild {
    /** Construit tout de suite et annule l'attente ; sans effet si c'est déjà fait ou après un échec. */
    now(): void;
    /** Planifie la construction quand le fil principal est libre, au plus tard BUILD_IDLE_TIMEOUT_MS après. */
    schedule(): void;
    cancel(): void;
  }

  /**
   * Construction différée de `what` : `build` crée les objets ; `built` dit s'ils existent ; `after` les pèse et
   * enchaîne. Un échec laisse la scène tourner sans eux, sans nouvel essai. Safari n'a pas requestIdleCallback :
   * simple délai, qui peut tomber pendant un défilement.
   */
  function deferredBuild(what: string, built: () => boolean, build: () => void, after: () => void): DeferredBuild {
    let failed = false;
    let cancelTask: (() => void) | null = null;
    const cancel = () => {
      cancelTask?.();
      cancelTask = null;
    };
    const now = () => {
      cancel();
      if (disposed || failed || built()) return;
      try {
        build();
      } catch (error) {
        failed = true;
        console.error(`${what} non construit : la scène continue sans`, error);
        return;
      }
      after();
    };
    return {
      now,
      cancel,
      schedule() {
        if (disposed || failed || cancelTask || built()) return;
        if (typeof window.requestIdleCallback === "function") {
          const handle = window.requestIdleCallback(now, { timeout: BUILD_IDLE_TIMEOUT_MS });
          cancelTask = () => window.cancelIdleCallback(handle);
        } else {
          const handle = setTimeout(now, BUILD_FALLBACK_DELAY_MS);
          cancelTask = () => clearTimeout(handle);
        }
      },
    };
  }

  /**
   * Galaxie (≈ 10 à 30 ms, une fois), dès l'au-delà de Neptune ; puis, en chaîne et au repos, le Groupe local
   * (≈ 2 à 7 ms) et l'Univers (≈ 3 à 10 ms, toile, fond diffus et bulles). Les nuages de points ne sont tirés qu'une
   * fois par chargement de la page : au retour sur le Voyage, la scène reconstruite les reprend (cosmos.ts,
   * extragalactic.ts). Le programme des points est déjà compilé (partagé avec les étoiles) ; ceux du fond diffus et des
   * bulles le sont hors du fil principal, juste après leur construction. Chacun est pesé aussitôt construit.
   */
  const universeBuild = deferredBuild(
    "Univers observable",
    () => extragalactic.web !== null,
    () => buildUniverse(extragalactic, WEB_POINT_BUDGET[coarsePointer ? "coarse" : "fine"]),
    () => {
      weighExtragalactic(extragalactic, weights);
      const compiledUniverse = () => {
        if (weights.web > 0 || weights.cmb > 0 || weights.multiverse > 0) needsRender = true;
      };
      renderer.compileAsync(extragalactic.universe, camera, scene).then(compiledUniverse, compiledUniverse);
      if (weights.web > 0 || weights.cmb > 0 || weights.multiverse > 0) needsRender = true;
    },
  );
  const localGroupBuild = deferredBuild(
    "Groupe local",
    () => extragalactic.galaxies !== null,
    () => buildLocalGroup(extragalactic, LOCAL_GROUP_POINT_BUDGET[coarsePointer ? "coarse" : "fine"]),
    () => {
      magnifyLocalGroup(extragalactic, magnification);
      weighExtragalactic(extragalactic, weights);
      if (weights.localGroup > 0) needsRender = true;
      universeBuild.schedule();
    },
  );
  const galaxyBuild = deferredBuild(
    "Voie lactée",
    () => cosmos.galaxy !== null,
    () => buildGalaxy(cosmos, galaxyPointBudget(coarsePointer)),
    () => {
      magnifyGalaxy(cosmos, magnification);
      weighCosmos(cosmos, weights);
      if (weights.galaxy > 0) needsRender = true;
      localGroupBuild.schedule();
    },
  );

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
  // À la souris seulement : au doigt, chaque geste de défilement relançait plusieurs secondes de rendu. Pas pendant
  // l'exploration : la caméra y obéit aux gestes, et chaque glisser de la souris la ferait dériver.
  const onWindowPointerMove = (event: PointerEvent) => {
    if (event.pointerType !== "mouse" || exploreStore.get().stop !== null) return;
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

    // Positions et tailles ne dépendent que de l'instant simulé et de l'échelle. Positions dans le repère du
    // système solaire (`solarRoot`) ; leurs reports en coordonnées monde suivent le zoom (syncSolarWorld).
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
   * Ceintures, seulement quand elles sont dessinées (poids du système solaire non nul, connu une fois le zoom
   * appliqué) : des milliers de points recalculés pour rien aux escales lointaines. `updateBelt` rattrape l'instant
   * et l'échelle à leur retour, et ne refait rien tant qu'ils n'ont pas changé.
   */
  function updateBelts(): void {
    if (weights.solar === 0) return;
    const days = bodiesJd - J2000_JD;
    for (const belt of belts) updateBelt(belt, days, bodiesScale);
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
   * années-lumière, le Groupe local à celle des milliers et l'Univers à celle des milliards d'années-lumière, grossit
   * les galaxies au Groupe local (galaxyMagnification), pèse chaque couche, choisit le plan lointain. Au zoom 0, rien
   * ne change : échelle 1, couches nouvelles invisibles, plan lointain de 7 000.
   */
  function applyZoom(zoom: number): void {
    const scale = zoomScale(zoom);
    const lightYear = unitsPerLightYear(zoom);
    solarRoot.scale.setScalar(scale);
    solarRoot.visible = zoom < SOLAR_HIDDEN_ZOOM;
    cosmos.group.scale.setScalar(lightYear);
    extragalactic.localGroup.scale.setScalar(lightYear * 1e3);
    extragalactic.universe.scale.setScalar(lightYear * 1e9);
    if (zoom > GALAXY_EAGER_ZOOM && !cosmos.galaxy) galaxyBuild.now();
    if (zoom > LOCAL_GROUP_EAGER_ZOOM && !extragalactic.galaxies) localGroupBuild.now();
    if (zoom > UNIVERSE_EAGER_ZOOM && !extragalactic.web) universeBuild.now();
    magnification = galaxyMagnification(zoom);
    magnifyGalaxy(cosmos, magnification);
    magnifyLocalGroup(extragalactic, magnification);
    layerWeights(zoom, weights);
    weighCosmos(cosmos, weights);
    weighExtragalactic(extragalactic, weights);
    fadeSky(sky, weights.sky);
    if (worldDirty || scale !== worldScale) syncSolarWorld(scale);
    // La projection est recalculée par setViewOffset, à chaque image.
    camera.far = solarRoot.visible ? SOLAR_FAR : DEEP_FAR;
  }

  /**
   * Rayon apparent (px CSS) d'une sphère de rayon `radius` centrée en `center` (coordonnées monde) : Infinity quand la
   * caméra est dedans.
   */
  function apparentRadiusPx(center: Vector3, radius: number, pixelsPerTangent: number): number {
    const distance = camera.position.distanceTo(center);
    return distance <= radius ? Infinity : (radius * pixelsPerTangent) / distance;
  }

  /**
   * Lumière de la galaxie : rayon apparent de son disque (px CSS, à la distance de son centre) rapporté au rayon de
   * référence, à la puissance GALAXY_GAIN_EXPONENT, bornée à 1. Plus grande qu'au repos (vol vers elle), elle ne
   * s'éclaircit pas : ses points s'écartent. Portée par le gain jusqu'à GALAXY_MIN_GAIN (comme avant), puis par la part
   * des points dessinés : au Groupe local, elle reste une petite tache au lieu de disparaître.
   */
  function updateGalaxyDetail(pixelsPerTangent: number): void {
    const lightYear = cosmos.group.scale.x;
    galacticCenter.copy(galacticCenterLy).multiplyScalar(lightYear);
    const diskRadius = GALACTIC_DISK_RADIUS_LY * magnification * lightYear;
    const radiusPx = apparentRadiusPx(galacticCenter, diskRadius, pixelsPerTangent);
    const light = Math.min(1, (radiusPx / GALAXY_REFERENCE_RADIUS_PX) ** GALAXY_GAIN_EXPONENT);
    const { gain, fraction } = splitLight(light, GALAXY_MIN_GAIN);
    cosmos.galaxyGain.value = gain;
    const galaxy = cosmos.galaxy;
    if (galaxy) {
      const count = galaxy.geometry.getAttribute("position").count;
      galaxy.geometry.setDrawRange(0, Math.max(1, Math.round(fraction * count)));
    }
  }

  /**
   * Niveau de détail au-delà de la Voie lactée : le Groupe local selon le rayon apparent d'Andromède, la toile selon
   * celui de l'Univers observable (fitLocalGroup, fitWeb). Les gains restent à 1.
   */
  function updateExtragalacticDetail(pixelsPerTangent: number): void {
    const lightYear = cosmos.group.scale.x;
    if (weights.localGroup > 0) {
      const kly = lightYear * 1e3;
      anchor.copy(andromedaCenterKly).multiplyScalar(kly);
      const andromedaRadius = andromedaRadiusKly * magnification * kly;
      fitLocalGroup(extragalactic, apparentRadiusPx(anchor, andromedaRadius, pixelsPerTangent));
    }
    if (weights.web > 0) {
      const universeRadius = OBSERVABLE_UNIVERSE_RADIUS_GLY * 1e9 * lightYear;
      fitWeb(extragalactic, apparentRadiusPx(anchor.set(0, 0, 0), universeRadius, pixelsPerTangent));
    }
  }

  /**
   * Espace libre où se cadre l'escale `stop`, en px CSS : la bande au-dessus de sa plaque (téléphone), sinon la zone
   * entre les plaques et la règle (grand écran), sinon tout l'écran.
   */
  function freeBox(stop: StopKey): ScreenBox {
    const band = screenLayout.band(stop);
    const zone = band ? null : screenLayout.zone();
    freeArea.left = zone ? zone.left * view.width : 0;
    freeArea.right = zone ? zone.right * view.width : view.width;
    freeArea.top = band ? band.top * view.height : 0;
    freeArea.bottom = band ? band.bottom * view.height : view.height;
    return freeArea;
  }

  /**
   * Part d'une coquille (centre et rayon en coordonnées monde) qui tient dans `free`, vue de la caméra : rayon
   * apparent r / √(d² − r²) en tangentes ; 0 quand la caméra est dedans ou que son centre est derrière elle.
   */
  function shellFitAt(center: Vector3, radius: number, free: ScreenBox, pixelsPerTangent: number): number {
    const distance = camera.position.distanceTo(center);
    if (distance <= radius) return 0;
    project(center);
    if (projected.z > 1) return 0;
    const apparent = (radius / Math.sqrt(distance * distance - radius * radius)) * pixelsPerTangent;
    return shellFit(onScreen.x, onScreen.y, apparent, free);
  }

  /**
   * Coquilles retenues dans l'espace libre : le fond diffus dans celui de l'Univers observable, chaque autre bulle dans
   * celui du multivers. À l'arrivée sur l'Univers, la coquille paraît quand elle tient entre la plaque et la règle, au
   * lieu de les recouvrir ; une bulle qui entre dans le cadre paraît de même. En exploration, la page est masquée :
   * rien à éviter.
   */
  function fitShellsToScreen(pixelsPerTangent: number): void {
    const { cmb, bubbles } = extragalactic;
    if (!cmb || !bubbles) return;
    const exploringNow = exploring !== null;
    const gly = cosmos.group.scale.x * 1e9;
    // Caméra posée à cette image : ses matrices suivent avant de projeter (le rendu ne les a pas encore mises à jour).
    camera.updateMatrixWorld();
    cmbFit =
      exploringNow || weights.cmb <= 0
        ? 1
        : shellFitAt(anchor.set(0, 0, 0), cmb.scale.x * gly, freeBox("universe"), pixelsPerTangent);
    bubbles.forEach((bubble, i) => {
      if (exploringNow || weights.multiverse <= 0) {
        bubbleFits[i] = 1;
        return;
      }
      const center = anchor.copy(bubble.position).multiplyScalar(gly);
      bubbleFits[i] = shellFitAt(center, bubble.scale.x * gly, freeBox("multiverse"), pixelsPerTangent);
    });
    fitShells(extragalactic, weights, cmbFit, bubbleFits);
  }

  /**
   * Suit le mode d'exploration. À chaque changement (entrée, sortie, autre escale), fondu depuis la caméra affichée,
   * sauf en mouvement réduit ou avant la première image ; à l'entrée, la vue part des angles de la caméra de base, et
   * la parallaxe de la souris s'efface (onWindowPointerMove l'ignore pendant le mode).
   */
  function syncExploration(stop: ExploreStop | null, reduced: boolean): void {
    if (stop === exploring) return;
    Object.assign(transitionFrom, shownCamera);
    transitionT = reduced || !cameraShown ? 1 : 0;
    exploring = stop;
    if (stop === null) return;
    orbitFromCamera(cameraFor(stop, exploreContext, exploreBase), orbitView);
    Object.assign(orbitShown, orbitView);
    parallax.targetX = 0;
    parallax.targetY = 0;
  }

  /**
   * Caméra d'exploration de l'image : base de l'escale (exploreContext), gestes appliqués à la vue demandée et bornés
   * (les limites suivent l'échelle et la taille de la vue, même sans geste), direction de la Terre en « vu depuis la
   * Terre », vue affichée lissée vers la demande, distance raccourcie avant la sphère de garde du Soleil.
   */
  function exploreCamera(stop: ExploreStop, fromEarth: boolean, dt: number, reduced: boolean): CamState {
    const base = cameraFor(stop, exploreContext, exploreBase);
    orbitFromCamera(base, orbitHome);
    const input = exploreStore.takeInput() ?? NO_ORBIT_INPUT;
    applyOrbitInput(orbitView, input, orbitHome, orbitLimits(stop, base, exploreContext), orbitView);
    if (fromEarth && isEarthViewTarget(stop)) {
      // Direction vraie (UA) de la Terre vue de la planète : la phase affichée est celle qu'on verrait ce jour-là,
      // la lumière venant du Soleil dans la même direction qu'en distances compressées.
      const { azim, elev } = directionToView(viewFromEarth(stop, bodiesJd).toEarth);
      orbitView.azim = azim;
      orbitView.elev = elev;
    }
    easeOrbitView(orbitShown, orbitView, reduced ? 1 : easeFactor(dt, ORBIT_EASE_RATE), orbitShown);
    return orbitCamera(base, orbitShown, sunClearance(realScale, base.zoom), exploreCam);
  }

  function updateCamera(dt: number, journey: JourneyState, explore: ExploreState, reduced: boolean): void {
    layoutSettled = screenLayout.settle(dt, reduced);
    cameraContext.realScale = realScale;
    cameraContext.portrait = view.width / view.height < PORTRAIT_ASPECT;
    exploreContext.realScale = realScale;
    exploreContext.portrait = cameraContext.portrait;
    exploreContext.aspect = cameraContext.aspect;
    exploreContext.fov = cameraContext.fov;
    syncExploration(explore.stop, reduced);
    const from = cameraFor(journey.from, cameraContext, camFrom);
    const travel =
      journey.t > 0
        ? blendCameras(from, cameraFor(journey.to, cameraContext, camTo), smootherstep(journey.t), camBlend)
        : from;
    const live = exploring === null ? travel : exploreCamera(exploring, explore.fromEarth, dt, reduced);
    // Entrée et sortie de l'exploration : la caméra glisse de l'image affichée à la caméra vivante (vol compris).
    transitionT = reduced ? 1 : Math.min(1, transitionT + dt / EXPLORE_TRANSITION_S);
    const state = transitionT < 1 ? mixCameras(transitionFrom, live, smootherstep(transitionT), camMixed) : live;
    Object.assign(shownCamera, state);
    cameraShown = true;
    fromEarthShown = explore.fromEarth;
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
    // Jamais à la verticale de la cible (le haut de l'écran y serait indéfini) : la borne de l'exploration.
    const elevation = clamp(state.elev + parallax.y * 0.03, -ORBIT_MAX_ELEV, ORBIT_MAX_ELEV);
    const horizontal = state.dist * Math.cos(elevation);
    camera.position.set(
      state.tx + horizontal * Math.cos(azimuth),
      state.ty + state.dist * Math.sin(elevation),
      state.tz + horizontal * Math.sin(azimuth),
    );
    // Certains vols entre le Soleil et Mercure passeraient dans le Soleil : on le contourne.
    const clearance = sunClearance(realScale, state.zoom);
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
    const pixelsPerTangent = view.height / (2 * Math.tan((camera.fov * DEG) / 2));
    if (weights.galaxy > 0) updateGalaxyDetail(pixelsPerTangent);
    updateExtragalacticDetail(pixelsPerTangent);
    fitShellsToScreen(pixelsPerTangent);
    // Éblouissement : discret près du Soleil, plus large quand on le regarde de loin (distance ramenée à
    // l'échelle du système solaire : réduit par le zoom, il est vu de très loin).
    sun.coronaUniforms.uGlare.value = lerp(0.08, 0.32, smoothstep(60, 420, camera.position.length() / scale));

    // L'orbite de l'escale en cours ressort dans sa couleur, les autres s'effacent. Orbites et ceintures
    // s'éteignent ensuite avec le poids du système solaire : réduites, elles s'agglutineraient en une tache.
    // Au repos sur une planète, son orbite s'estompe autour d'elle, sur quelques rayons affichés (fadeOrbitNear),
    // et les autres planètes s'assombrissent (planetBrightness) ; en vol, rien ne change.
    const focus = journey.current;
    const focusOnPlanet = isPlanetKey(focus);
    const fade = easeFactor(dt, 4);
    const solarWeight = weights.solar;
    const shrink = lerp(1, REAL_SCALE_PLANET_SHRINK, realScale);
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
      fadeOrbitNear(body, restWeight(journey, body.planet.key), body.planet.displayRadius * shrink);
      setPlanetBrightness(body, planetBrightness(journey, body.planet.key));
    });
    orbitsSettled = !fadingOrbits;
    belts.forEach((belt, i) => {
      belt.points.material.opacity = BELT_SPECS[i].opacity * solarWeight;
      belt.points.visible = solarWeight > 0;
    });
  }

  /** Projette `at` (coordonnées monde) : position à l'écran dans `onScreen` (px), profondeur dans `projected.z`. */
  function project(at: Vector3): void {
    projected.copy(at).project(camera);
    onScreen.x = ((projected.x + 1) / 2) * view.width;
    onScreen.y = ((1 - projected.y) / 2) * view.height;
  }

  /**
   * Pose le bouton d'étiquette entier sur son ancre (coordonnées monde) avec l'opacité `alpha`, s'il y tient sans
   * recouvrir une étiquette plus prioritaire ; renvoie faux sinon, sans rien changer.
   */
  function fitSlot(slot: LabelSlot, at: Vector3, alpha: number): boolean {
    project(at);
    const box = placeLabel(
      { x: onScreen.x, y: onScreen.y, depth: projected.z, width: slot.width, height: slot.height },
      view.width,
      view.height,
      occupied,
    );
    if (!box) return false;
    occupied.push(box);
    setLabelForm(slot, false, false);
    showLabel(slot, box[0], box[1], alpha);
    return true;
  }

  /**
   * Pose une étiquette à repère : repère exactement sur l'astre, texte dans la première disposition qui tient
   * (placeMarkedLabel) ; texte et repère sont alors réservés. Renvoie faux sinon, sans rien changer.
   */
  function fitMarkedSlot(slot: LabelSlot, at: Vector3, alpha: number): boolean {
    const { marker } = slot;
    if (!marker) return false;
    project(at);
    const { x, y } = onScreen;
    const index = placeMarkedLabel({ x, y, depth: projected.z }, marker.layouts, view.width, view.height, occupied);
    if (index === null) return false;
    const layout = marker.layouts[index];
    const halfWidth = marker.dotWidth / 2;
    const halfHeight = marker.dotHeight / 2;
    occupied.push(anchoredBox(layout.box, x, y), [x - halfWidth, y - halfHeight, x + halfWidth, y + halfHeight]);
    setLabelForm(slot, layout.mirrored, layout.short);
    setLabelBeside(slot, false);
    showLabel(slot, x - layout.dotX, y - marker.dotY, alpha);
    return true;
  }

  /** Rayon à l'écran (px) d'un disque de `radius` unités de scène centré en `at` : écart projeté de son bord. */
  function discRadiusPx(at: Vector3, radius: number): number {
    discEdge.setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(radius).add(at);
    project(discEdge);
    const edgeX = onScreen.x;
    project(at);
    return Math.abs(edgeX - onScreen.x);
  }

  /**
   * Pose le nom d'une galaxie à côté de son disque, de `radius` px de rayon à l'écran : texte à GALAXY_LABEL_GAP_PX
   * du bord, à droite ou à gauche (première disposition qui tient), repère effacé ; seul le texte est réservé.
   * Renvoie faux sinon, sans rien changer.
   */
  function fitBesideSlot(slot: LabelSlot, at: Vector3, alpha: number, radius: number): boolean {
    const { marker } = slot;
    if (!marker) return false;
    project(at);
    const { x, y } = onScreen;
    const clearance = radius + GALAXY_LABEL_GAP_PX;
    const index = placeMarkedLabel(
      { x, y, depth: projected.z },
      marker.layouts,
      view.width,
      view.height,
      occupied,
      clearance,
    );
    if (index === null) return false;
    const layout = marker.layouts[index];
    const shift = clearanceShift(layout.box, clearance);
    occupied.push(anchoredBox(layout.box, x + shift, y));
    setLabelForm(slot, layout.mirrored, layout.short);
    setLabelBeside(slot, true);
    showLabel(slot, x + shift - layout.dotX, y - marker.dotY, alpha);
    return true;
  }

  /**
   * Étiquette d'une galaxie de rayon `radius` (unités de scène) : à côté de son disque dès qu'il déborde du repère,
   * qui le couvrirait ; sinon, ou si aucun côté ne tient, sur son repère comme les autres ; masquée sous
   * LABEL_MIN_ALPHA ou si rien ne tient.
   */
  function placeGalaxySlot(slot: LabelSlot | undefined, at: Vector3, alpha: number, radius: number): void {
    if (!slot) return;
    if (alpha < LABEL_MIN_ALPHA) {
      setLabelShown(slot, false);
      return;
    }
    const discPx = discRadiusPx(at, radius);
    const covered = discPx > (slot.marker?.dotWidth ?? 0) / 2;
    if (covered && fitBesideSlot(slot, at, alpha, discPx)) return;
    if (!fitMarkedSlot(slot, at, alpha)) setLabelShown(slot, false);
  }

  /** Place le bouton d'étiquette sur son ancre s'il y tient ; sinon, ou sous LABEL_MIN_ALPHA, le masque. */
  function placeSlot(slot: LabelSlot | undefined, at: Vector3, alpha: number): void {
    if (!slot) return;
    if (alpha < LABEL_MIN_ALPHA || !fitSlot(slot, at, alpha)) setLabelShown(slot, false);
  }

  /** Place l'étiquette à repère sur son ancre si elle y tient ; sinon, ou sous LABEL_MIN_ALPHA, la masque. */
  function placeMarkedSlot(slot: LabelSlot | undefined, at: Vector3, alpha: number): void {
    if (!slot) return;
    if (alpha < LABEL_MIN_ALPHA || !fitMarkedSlot(slot, at, alpha)) setLabelShown(slot, false);
  }

  /** Réserve le point de `size` px posé en `at` (coordonnées monde) : nulle étiquette du ciel profond ne le recouvre. */
  function reservePoint(at: Vector3, size: number): void {
    project(at);
    if (projected.z <= 1) occupied.push(pointBox(onScreen.x, onScreen.y, size));
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
        if (fitMarkedSlot(slot, anchor.set(radius * Math.cos(around), 0, radius * Math.sin(around)), alpha)) return;
      }
    }
    setLabelShown(slot, false);
  }

  /**
   * Opacité d'une étiquette extragalactique : les galaxies avec le Groupe local ; la toile et le fond diffus avec leur
   * couche, effacés quand paraît le multivers (« Notre univers observable » nomme alors la bulle) ; notre univers et
   * les autres avec le multivers. Les étiquettes du fond diffus, de notre univers et des autres s'effacent avec leur
   * coquille quand elle ne tient pas dans l'espace libre.
   */
  function extragalacticAlpha(key: ExtragalacticLabelKey): number {
    if (key.startsWith("lg:")) return weights.localGroup;
    if (key === "web") return weights.web * (1 - weights.multiverse);
    if (key === "cmb") return weights.cmb * (1 - weights.multiverse) * cmbFit;
    if (key === "our-universe") return weights.multiverse * cmbFit;
    return weights.multiverse * (bubbleFits[labelledBubble] ?? 1);
  }

  function updateLabels(): void {
    // Vue rapprochée : les étiquettes s'effacent ; en échelle réelle, elles sont le seul repère.
    const alpha = realScale > 0.5 ? 1 : smoothstep(28, 95, cameraDistance);
    const solarScale = solarRoot.scale.x;
    const lightYear = cosmos.group.scale.x;
    /*
     * « Soleil » et « Vous êtes ici » partagent l'ancre du Soleil : le premier s'efface pendant la première
     * moitié de l'arrivée de la galaxie (sunLabel), le second apparaît pendant la seconde (here) et reste jusqu'au
     * multivers ; jamais l'un sur l'autre.
     */
    const sunFade = weights.sunLabel;
    occupied.length = 0;
    occupied.push(...obstacleBoxes);
    for (const key of LABEL_PRIORITY) {
      if (key !== "sun") {
        placeSlot(bodySlots.get(key), anchor.copy(bodyOf(key).position).multiplyScalar(solarScale), alpha * weights.planetLabels);
      } else if (weights.sunPoint > 0) {
        // Le Soleil devenu un point parmi les étoiles : « Soleil » prend la disposition du ciel profond (seul son
        // texte occupe la place, à droite ou à gauche du point). Son bouton entier chasserait Proxima du Centaure.
        placeMarkedSlot(sunSlot, anchor.set(0, 0, 0), alpha * sunFade);
      } else {
        placeSlot(sunSlot, anchor.set(0, 0, 0), alpha * sunFade);
      }
    }
    /*
     * Points visibles : nulle pastille du ciel profond ne les recouvre. « Soleil », texte sans pastille opaque qui ne
     * masque aucun point, est placé avant eux : sur téléphone, les points qui serrent le Soleil (Lacaille 9352,
     * Lalande 21185, Epsilon Indi, Luyten 726-8) ne lui laisseraient aucune place.
     */
    if (weights.sunPoint > 0) {
      reservePoint(sunPointPosition(cosmos, anchor).multiplyScalar(lightYear), SUN_POINT_SIZE_PX);
    }
    if (weights.stars > 0) {
      for (const { position, size } of stars) {
        reservePoint(anchor.set(position.x, position.y, position.z).multiplyScalar(lightYear), size);
      }
    }
    // Ciel profond : non interactif, placé après les astres.
    // « Vous êtes ici » suit le point-Soleil, à sa place dans la galaxie grossie au Groupe local.
    const here = sunPointPosition(cosmos, anchor).multiplyScalar(lightYear);
    placeMarkedSlot(deepSlots.get("here"), here, weights.here);
    const center = anchor.copy(galacticCenterLy).multiplyScalar(lightYear);
    placeMarkedSlot(deepSlots.get("center"), center, weights.galaxyLabels);
    // Au-delà : galaxies, toile, fond diffus, univers, chacun dans le repère de son groupe.
    for (const { key, slot, group, position, radius } of extragalacticLabels) {
      const scale = group === "cosmos" ? lightYear : group === "localGroup" ? lightYear * 1e3 : lightYear * 1e9;
      const at = anchor.set(position.x, position.y, position.z).multiplyScalar(scale);
      // Une galaxie est dessinée grossie (galaxyMagnification) : son nom se pose à côté du disque dessiné.
      if (radius === undefined) placeMarkedSlot(slot, at, extragalacticAlpha(key));
      else placeGalaxySlot(slot, at, extragalacticAlpha(key), radius * scale * magnification);
    }
    for (const { slot, position } of stars) {
      placeMarkedSlot(slot, anchor.set(position.x, position.y, position.z).multiplyScalar(lightYear), weights.stars);
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
      }
      // La galaxie se prépare dès l'au-delà de Neptune (une seule planification), le reste du ciel profond à sa suite.
      if (GALAXY_PREPARE_STOPS.has(journey.current)) galaxyBuild.schedule();
      const clock = getClock();
      const now = clock.now();
      const snapshot = clock.snapshot();
      const explore = exploreStore.get();
      const moving =
        needsRender ||
        journey.from !== lastFrom ||
        journey.to !== lastTo ||
        journey.t !== lastT ||
        realScale !== (snapshot.realScale ? 1 : 0) ||
        (!reduced && (parallax.x !== parallax.targetX || parallax.y !== parallax.targetY)) ||
        !orbitsSettled ||
        !layoutSettled ||
        // Exploration : entrée, sortie, bascule « vu depuis la Terre », fondu, gestes en attente, vue qui s'ajuste.
        explore.stop !== exploring ||
        explore.fromEarth !== fromEarthShown ||
        transitionT < 1 ||
        exploreStore.hasInput() ||
        (exploring !== null && !sameView(orbitShown, orbitView));
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
      updateCamera(step, journey, explore, reduced);
      updateBelts();
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
      galaxyBuild.cancel();
      localGroupBuild.cancel();
      universeBuild.cancel();
      for (const slot of labelSlots) slot.element.style.visibility = "hidden";
      textures.dispose();
      scene.traverse(disposeObject);
      placeholder.dispose();
      sun.coronaUniforms.uField.value.dispose();
      releaseRenderer(renderer);
    },
  };
}
