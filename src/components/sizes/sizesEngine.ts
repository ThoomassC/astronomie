import {
  Line,
  Mesh,
  NeutralToneMapping,
  PerspectiveCamera,
  Points,
  SRGBColorSpace,
  Scene,
  type Material,
  type Object3D,
  type WebGLRenderer,
} from "three";
import { markerLayouts, type LabelBox } from "@/components/scene/labels";
import { createRenderer, releaseRenderer } from "@/components/scene/renderer";
import { COMPACT_LAYOUT_QUERY, createScreenLayout, type ScreenLayoutElements } from "@/components/scene/screenLayout";
import { createStarfieldBackground } from "@/components/scene/starfield";
import { julianDate } from "@/lib/astro/ephemeris";
import { solarActivity, sunspotLatitude } from "@/lib/astro/solarCycle";
import { smootherstep } from "@/lib/journey/sections";
import { restingRect } from "@/lib/site/barSlide";
import { placeObjects } from "@/lib/sizes/layout";
import { COMPARED_OBJECTS, layoutInput, visibleShare, type SizeObjectKey } from "@/lib/sizes/objects";
import {
  SCALE_BAR_CHROME_PX,
  pixelsPerSolarRadius,
  scaleBarBox,
  scaleBarFor,
  scaleBarMaxPx,
  scaleBarSpot,
  scaleBarSun,
  type ScaleBar,
} from "@/lib/sizes/scaleBar";
import {
  SIZES_VIEW_ELEV_DEG,
  railSideFade,
  rightEdgePx,
  screenDisc,
  sizesFlightCamera,
  sizesRestCamera,
  visibleObjectCount,
  type ScreenDisc,
  type SizesCam,
  type SizesFrameContext,
} from "@/lib/sizes/sizesCamera";
import { sizesStore } from "@/lib/sizes/store";
import { sizeObjectIndex, type SizeStopKey } from "@/lib/sizes/stops";
import {
  frameBoxes,
  introVeil,
  jetBoxes,
  layoutSizeLabels,
  type LabelPlacement,
  type LimbLabelSize,
  type ObjectLabelMetrics,
  type RingMarker,
  type StarLabelMode,
} from "./sizesLabels";
import { createSizesObjects, labelJetOf, showObjects, updateBlackHoles } from "./sizesObjects";

/** Échelle graphique (DOM, `aria-hidden`) : conteneur, Soleil à l'échelle, trait, texte. */
export interface ScaleBarElements {
  root: HTMLElement;
  sun: HTMLElement;
  line: HTMLElement;
  text: HTMLElement;
}

export interface SizesSceneOptions {
  canvas: HTMLCanvasElement;
  /** Étiquette de chaque astre sur un anneau à sa couleur (petit à l'écran) : repère `<i>` et texte `<span>`. */
  ringLabels: ReadonlyMap<SizeObjectKey, HTMLElement>;
  /**
   * Étiquette de chaque astre posée au-dessus de son limbe (grand à l'écran) : texte seul, le nom puis sa taille dans un
   * `.dist`, que la forme courte masque (`data-short`), avec ce qui encadre le nom court d'un astre au nom long
   * (`[data-long]`).
   */
  limbLabels: ReadonlyMap<SizeObjectKey, HTMLElement>;
  /** Le Soleil devenu un point : anneau « ici » en `--soleil` (`.lbl.deep.here`). */
  sunMarker: HTMLElement | null;
  scaleBar: ScaleBarElements | null;
  /** Texte de l'échelle graphique dans la langue de la page : « 10 Soleils côte à côte », « 500 km ». */
  scaleText(bar: ScaleBar): string;
  /**
   * Ce qui borde la scène : barre haute, règle des tailles, plaques (bandes et zone libres), et l'introduction, dont le
   * texte passe devant la scène : aucune étiquette ne s'affiche dessous.
   */
  layout: Omit<ScreenLayoutElements<SizeStopKey>, "note"> & { intro?: HTMLElement | null };
}

export interface SizesScene {
  /** Met à jour la caméra, les étoiles, les étiquettes et l'échelle, et rend l'image, seulement si quelque chose bouge. */
  frame(dt: number): void;
  /** Libère les ressources GPU, les écouteurs et les observateurs. Idempotent. */
  dispose(): void;
}

const DEG = Math.PI / 180;
/** En dessous de ce rapport largeur / hauteur, champ de 50° (portrait), sinon 36° : comme au Voyage. */
const PORTRAIT_ASPECT = 0.9;
const RESIZE_DEBOUNCE_MS = 120;
/** Plafonds du rendu, ceux du Voyage : rapport de pixels, et pixels rendus en tout. */
const MAX_PIXEL_RATIO = 1.5;
const MAX_PIXELS = 4_200_000;
/**
 * Rapport de pixels des vols sur écran tactile : une supergéante y remplit l'écran, et chaque pixel calcule sa surface
 * (2,25 fois moins de pixels qu'à 1,5). L'image où le vol se pose, ou la première d'une pause entre deux escales
 * (SHARP_AFTER_STILL_FRAMES), repart au rapport de l'écran.
 */
const FLIGHT_PIXEL_RATIO = 1;
/**
 * Images immobiles d'affilée, entre deux escales, avant de revenir au rapport de l'écran : un glissé lent, qui ne fait
 * avancer le défilement qu'une image sur deux (écran à 120 Hz), ne réalloue pas le tampon d'image à chaque image et
 * n'alterne pas images nettes et floues.
 */
export const SHARP_AFTER_STILL_FRAMES = 8;
/** Fond de la scène : `--nuit`. */
const NIGHT = 0x060b18;
/** Plan proche, en part de la distance à la cible : aucune étoile n'en approche, au repos comme en vol. */
const NEAR_SHARE = 0.01;
/** Marge du plan lointain au-delà de l'étoile dessinée la plus éloignée. */
const FAR_MARGIN = 1.05;
/** Images d'attente au plus pour la compilation des shaders, avant de rendre quand même. */
const MAX_COMPILE_WAIT_FRAMES = 30;
/** Rang du Soleil parmi les astres comparés. */
const SUN_INDEX = COMPARED_OBJECTS.findIndex((object) => object.key === "sun");

/** Étiquette DOM placée par le moteur : seules les valeurs qui changent sont écrites. */
interface LabelSlot {
  element: HTMLElement;
  shown: boolean | null;
  transform: string;
  mirrored: boolean;
  short: boolean;
}

/** Les deux étiquettes d'un astre, telles que le DOM les donne. */
interface StarSlots {
  ring: LabelSlot | null;
  limb: LabelSlot | null;
}

const labelSlot = (element: HTMLElement): LabelSlot => ({
  element,
  shown: null,
  transform: element.style.transform,
  mirrored: element.hasAttribute("data-mirrored"),
  short: element.hasAttribute("data-short"),
});

function setShown(slot: LabelSlot | null, shown: boolean): void {
  if (!slot || slot.shown === shown) return;
  slot.shown = shown;
  slot.element.style.visibility = shown ? "visible" : "hidden";
}

/** Disposition écrite dans l'étiquette : texte à gauche du repère (`data-mirrored`), nom seul (`data-short`). */
function setForm(slot: LabelSlot, mirrored: boolean, short: boolean): void {
  if (slot.mirrored !== mirrored) {
    slot.mirrored = mirrored;
    slot.element.toggleAttribute("data-mirrored", mirrored);
  }
  if (slot.short !== short) {
    slot.short = short;
    slot.element.toggleAttribute("data-short", short);
  }
}

/** Montre l'étiquette, coin haut gauche en (left, top) px ; le style n'est écrit que s'il change. */
function showAt(slot: LabelSlot, left: number, top: number): void {
  const transform = `translate3d(${left.toFixed(1)}px,${top.toFixed(1)}px,0)`;
  if (transform !== slot.transform) {
    slot.transform = transform;
    slot.element.style.transform = transform;
  }
  setShown(slot, true);
}

/** Largeur (px) de ce que la forme courte (`data-short`) masque : la taille (`.dist`), ce qui encadre le nom court. */
function shortenedWidth(element: HTMLElement): number {
  let width = 0;
  for (const part of element.querySelectorAll<HTMLElement>(".dist, [data-long]")) width += part.offsetWidth;
  return width;
}

/** Étiquette de limbe, mesurée dans sa forme complète : sa taille, et la largeur de sa forme courte (le nom court). */
function measureLimb(element: HTMLElement): LimbLabelSize {
  const width = element.offsetWidth;
  return { width, height: element.offsetHeight, shortWidth: width - shortenedWidth(element) };
}

/** Écrit dans les deux étiquettes d'un astre la disposition retenue pour l'image. */
function applyPlacement(slots: StarSlots, placement: LabelPlacement): void {
  if (placement.form === "limb" && slots.limb) {
    setShown(slots.ring, false);
    setForm(slots.limb, false, placement.short);
    showAt(slots.limb, placement.left, placement.top);
  } else if (placement.form === "ring" && slots.ring) {
    setShown(slots.limb, false);
    setForm(slots.ring, placement.mirrored, placement.short);
    showAt(slots.ring, placement.left, placement.top);
  } else {
    setShown(slots.ring, false);
    setShown(slots.limb, false);
  }
}

/** Repère et texte d'une étiquette à anneau, mesurés dans sa forme normale ; null s'il lui manque l'un ou l'autre. */
function measureMarker(element: HTMLElement): RingMarker | null {
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
      detailWidth: shortenedWidth(text),
    }),
    dotY,
    dotWidth: dot.offsetWidth,
    dotHeight: dot.offsetHeight,
  };
}

function disposeMaterials(material: Material | Material[]): void {
  for (const one of Array.isArray(material) ? material : [material]) one.dispose();
}

function disposeObject(object: Object3D): void {
  if (object instanceof Mesh || object instanceof Points || object instanceof Line) {
    object.geometry.dispose();
    disposeMaterials(object.material);
  }
}

/** Boîte occupée à l'écran par un rectangle de la page, en px de la vue. */
function rectBox(rect: DOMRect): LabelBox {
  return [rect.left, rect.top, rect.right, rect.bottom];
}

/**
 * Texte d'une section, en px du document : ses enfants qui se voient, réunis (le paragraphe réservé aux lecteurs
 * d'écran, d'un pixel, n'en est pas) ; null si rien ne se voit.
 */
function documentTextBox(section: HTMLElement): LabelBox | null {
  let [left, top, right, bottom] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const child of section.children) {
    const rect = child.getBoundingClientRect();
    if (rect.width <= 1 || rect.height <= 1) continue;
    left = Math.min(left, rect.left);
    top = Math.min(top, rect.top);
    right = Math.max(right, rect.right);
    bottom = Math.max(bottom, rect.bottom);
  }
  if (!(right > left && bottom > top)) return null;
  return [left, top + window.scrollY, right, bottom + window.scrollY];
}

const emptyCam = (): SizesCam => ({ tx: 0, dist: 1, offX: 0, offY: 0 });

/**
 * Scène 3D de la page « Tailles », légère et séparée du moteur du Voyage : les quatorze astres du comparateur (dix
 * étoiles, quatre trous noirs) à leur taille vraie, côte à côte (placeObjects), sur un fond étoilé que les trous noirs
 * dévient, une caméra qui suit le défilement (sizesStore), leurs étiquettes et l'échelle graphique. Sur grand écran, un
 * astre qui déborde vers la règle s'efface. Elle ne rend une image que si quelque chose bouge (vol, mise en page,
 * taille de la vue) ; la surface des étoiles et le disque des trous noirs n'avancent que pendant un vol, et jamais en
 * mouvement réduit. Sur écran tactile, les vols se rendent en rapport de pixels 1, l'arrivée nette. Renvoie `null`
 * sans WebGL 2 ou en rendu logiciel : la page passe alors au repli sans scène (createRenderer).
 */
export function createSizesScene(options: SizesSceneOptions): SizesScene | null {
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
  { canvas, ringLabels, limbLabels, sunMarker, scaleBar, scaleText, layout }: SizesSceneOptions,
): SizesScene {
  renderer.outputColorSpace = SRGBColorSpace;
  // La surface sort en HDR : PBR Neutral garde la teinte de chaque étoile et adoucit son éclat.
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.setClearColor(NIGHT, 1);
  // Lire le journal de compilation coûte des allers-retours synchrones avec le GPU : en développement seulement.
  renderer.debug.checkShaderErrors = process.env.NODE_ENV !== "production";

  const scene = new Scene();
  const camera = new PerspectiveCamera(36, 1, 0.01, 10);
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const compact = window.matchMedia(COMPACT_LAYOUT_QUERY);
  const placed = placeObjects(COMPARED_OBJECTS.map(layoutInput));
  /** Temps affiché de la surface des étoiles et des disques des trous noirs, en secondes : il n'avance que pendant un vol. */
  const time = { value: 0 };
  const today = julianDate(Date.now());
  // Fond étoilé : dessiné avant tout le reste, il sort en --nuit et prête son ciel à chaque trou noir.
  const starfield = createStarfieldBackground();
  scene.add(starfield.mesh);
  const { group, items } = createSizesObjects(COMPARED_OBJECTS, placed, {
    time,
    lite: coarsePointer,
    sunSpots: { activity: solarActivity(today), latitude: sunspotLatitude(today) * DEG },
    starfield: starfield.uniforms,
  });
  scene.add(group);
  const screenLayout = createScreenLayout({ ...layout, note: null }, compact);

  // ---------- État ----------
  const view = { width: 1, height: 1 };
  const camFrom = emptyCam();
  const camTo = emptyCam();
  const camBlend = emptyCam();
  let shown: SizesCam = camFrom;
  const contextFrom: SizesFrameContext = { aspect: 1, fovDeg: 36, band: null, zone: null };
  const contextTo: SizesFrameContext = { aspect: 1, fovDeg: 36, band: null, zone: null };
  /** Quelque chose impose une nouvelle image (taille, mesures, shaders prêts). */
  let needsRender = true;
  /** Bandes du cadrage posées sur leur mesure : aucune image à rendre pour elles. */
  let layoutSettled = true;
  /** Rapport de pixels de l'écran, plafonné (resize) : celui de toute image hors des vols sur écran tactile. */
  let sharpPixelRatio = 1;
  /** Vol en cours sur écran tactile, rendu à FLIGHT_PIXEL_RATIO (applyPixelRatio). */
  let inFlight = false;
  /** Images d'affilée où rien n'a bougé. */
  let stillFrames = 0;
  let compiled = false;
  let compileWaitFrames = 0;
  let disposed = false;
  let lastFrom: SizeStopKey | null = null;
  let lastTo: SizeStopKey | null = null;
  let lastT = Number.NaN;
  const slots: StarSlots[] = COMPARED_OBJECTS.map((object) => {
    const ring = ringLabels.get(object.key);
    const limb = limbLabels.get(object.key);
    return { ring: ring ? labelSlot(ring) : null, limb: limb ? labelSlot(limb) : null };
  });
  /** Mesures des étiquettes dans leur forme normale (measureLayout), et disposition de chacune à l'image précédente. */
  const metrics: ObjectLabelMetrics[] = slots.map(() => ({ ring: null, limb: null }));
  const modes: (StarLabelMode | null)[] = slots.map(() => null);
  const sunSlot = sunMarker ? labelSlot(sunMarker) : null;
  let sunRing: RingMarker | null = null;
  /** Toutes les étiquettes : mesurées dans leur forme normale, puis remises dans la leur. */
  const allSlots = [...slots.flatMap(({ ring, limb }) => [ring, limb]), sunSlot].filter((slot): slot is LabelSlot => slot !== null);
  /** Boîtes mesurées de la page, à éviter : barre et règle. */
  let measuredBoxes: LabelBox[] = [];
  /** Bas de la barre haute, en px : l'échelle graphique posée dans un coin se met dessous. */
  let barBottom = 0;
  /** Texte de l'introduction, en px du document (introVeil le replace à l'écran) ; null sans introduction. */
  let introText: LabelBox | null = null;
  /** Défilement à la dernière pose des étiquettes, et texte de l'introduction alors à l'écran (voile). */
  let labelsScrollY = Number.NaN;
  let labelsVeiled = false;
  /** Boîte de l'échelle graphique à la dernière image rendue : les étiquettes reposées entre deux images l'évitent. */
  let lastScaleBox: LabelBox | null = null;
  /**
   * Dernier état écrit de l'échelle graphique (unité, texte, longueur, forme et taille du Soleil, position) ; sa taille,
   * mesurée quand son texte ou son unité change, ou que la mise en page change (`measured` faux).
   */
  const scaleShown = { visible: false, unit: "", text: "", length: "", sunMode: "", sunSize: "", transform: "" };
  const scaleSize = { measured: false, width: 0, height: 0, right: 0, top: 0, bottom: 0 };
  /** Disques à l'écran des astres dessinés à cette image (screenDisc), un par astre, réutilisés d'une image à l'autre. */
  const discs: ScreenDisc[] = placed.map(() => ({ x: 0, y: 0, radius: 0 }));
  const drawnDiscs: ScreenDisc[] = [];
  /** Rayon apparent de l'encombrement de chaque astre, en px (Infinity : non dessiné), et sa part visible près de la règle. */
  const radiiPx: number[] = placed.map(() => Infinity);
  const fits: number[] = placed.map(() => 1);
  /** Rapport et champ de la caméra de l'image, pour la projection des disques. */
  const lens = { aspect: 1, fovDeg: 36 };
  /** Ce qui se voit de chaque astre au-dessus et au-dessous de son centre, en part de son encombrement (étiquettes). */
  const reach = COMPARED_OBJECTS.map(visibleShare);
  /** Jet de chaque trou noir qui en a un (M87*), réservé aux étiquettes ; null sinon. */
  const jets = COMPARED_OBJECTS.map((object) => (object.kind === "black-hole" ? labelJetOf(object.key) : null));

  // ---------- Taille de la vue, mesures du DOM ----------
  function resize(): void {
    view.width = Math.max(1, window.innerWidth);
    view.height = Math.max(1, window.innerHeight);
    const pixelBudget = Math.sqrt(MAX_PIXELS / (view.width * view.height));
    sharpPixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO, pixelBudget);
    renderer.setPixelRatio(sharpPixelRatio);
    renderer.setSize(view.width, view.height, false);
    camera.aspect = view.width / view.height;
    camera.fov = camera.aspect < PORTRAIT_ASPECT ? 50 : 36;
    camera.updateProjectionMatrix();
    needsRender = true;
  }

  /**
   * Rapport de pixels de l'image : FLIGHT_PIXEL_RATIO pendant un vol sur écran tactile (entre deux escales, `t` > 0,
   * hors première image), jusqu'à l'arrivée ou SHARP_AFTER_STILL_FRAMES images immobiles ; sinon celui de l'écran.
   * Seul un vol l'abaisse : une page ouverte entre deux escales reste nette. En changer impose une image.
   */
  function applyPixelRatio(flying: boolean, t: number): void {
    stillFrames = flying ? 0 : stillFrames + 1;
    if (!coarsePointer || !(t > 0) || lastFrom === null || stillFrames >= SHARP_AFTER_STILL_FRAMES) inFlight = false;
    else if (flying) inFlight = true;
    const ratio = inFlight ? Math.min(FLIGHT_PIXEL_RATIO, sharpPixelRatio) : sharpPixelRatio;
    if (ratio === renderer.getPixelRatio()) return;
    renderer.setPixelRatio(ratio);
    needsRender = true;
  }

  /**
   * Une passe de lecture : tailles des étiquettes (mesurées dans leur forme normale, puis remises dans la leur), boîtes
   * à éviter (barre, règle), bas de la barre, texte de l'introduction, bandes et zone libres. La barre, fixe en haut de
   * l'écran, est mesurée à sa place de repos (barSlide.ts) : aucune étiquette ne s'y pose.
   */
  function measureLayout(): void {
    const forms = allSlots.map(({ mirrored, short }) => ({ mirrored, short }));
    for (const slot of allSlots) setForm(slot, false, false);
    slots.forEach(({ ring, limb }, i) => {
      metrics[i] = { ring: ring ? measureMarker(ring.element) : null, limb: limb ? measureLimb(limb.element) : null };
    });
    sunRing = sunSlot ? measureMarker(sunSlot.element) : null;
    const barRect = layout.bar ? restingRect(layout.bar) : null;
    measuredBoxes = [barRect, layout.rail?.getBoundingClientRect() ?? null]
      .filter((rect): rect is DOMRect => rect !== null)
      .map(rectBox)
      .filter(([left, top, right, bottom]) => right > left && bottom > top);
    barBottom = barRect?.bottom ?? 0;
    introText = layout.intro ? documentTextBox(layout.intro) : null;
    screenLayout.measure(view);
    scaleSize.measured = false;
    layoutSettled = false;
    allSlots.forEach((slot, i) => setForm(slot, forms[i].mirrored, forms[i].short));
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
  for (const plate of layout.plates.values()) platesObserver.observe(plate);
  void document.fonts?.ready.then(() => {
    if (!disposed) measureLayout();
  });
  // Contexte WebGL restauré (GPU réinitialisé, onglet repris) : Three renvoie tout au GPU, une image suffit.
  const onContextRestored = () => {
    needsRender = true;
  };
  canvas.addEventListener("webglcontextrestored", onContextRestored);

  // Compilation des shaders hors du premier rendu, tous les astres visibles et le fond (le Soleil a son propre
  // programme, à cause de ses taches ; les trous noirs, le leur) : aucune saccade quand un astre paraît. En cas
  // d'échec, elle se fera au premier rendu.
  for (const item of items) {
    if (item.kind === "star") item.body.visible = item.halo.visible = true;
    else item.hole.mesh.visible = true;
  }
  const onCompiled = () => {
    compiled = true;
    needsRender = true;
  };
  renderer.compileAsync(scene, camera).then(onCompiled, onCompiled);
  showObjects(items, 0, 0, 0);

  // ---------- Caméra ----------
  function frameContext(stop: SizeStopKey, out: SizesFrameContext): SizesFrameContext {
    out.aspect = camera.aspect;
    out.fovDeg = camera.fov;
    out.band = screenLayout.band(stop);
    out.zone = screenLayout.zone();
    return out;
  }

  /** Caméra du vol (repos de départ, d'arrivée, mélange lissé), plans proche et lointain, décalage d'écran. */
  function updateCamera(from: SizeStopKey, to: SizeStopKey, t: number, visible: number): void {
    sizesRestCamera(placed, from, frameContext(from, contextFrom), camFrom);
    shown =
      t > 0
        ? sizesFlightCamera(camFrom, sizesRestCamera(placed, to, frameContext(to, contextTo), camTo), smootherstep(t), camBlend)
        : camFrom;
    const elevation = SIZES_VIEW_ELEV_DEG * DEG;
    camera.position.set(shown.tx, shown.dist * Math.sin(elevation), shown.dist * Math.cos(elevation));
    camera.lookAt(shown.tx, 0, 0);
    // Plan lointain : au-delà de l'astre dessiné le plus éloigné de la caméra, encombrement compris.
    let farthest = shown.dist;
    for (let i = 0; i < visible; i++) {
      const object = placed[i];
      farthest = Math.max(farthest, Math.hypot(object.x - shown.tx, shown.dist) + object.extent);
    }
    camera.near = NEAR_SHARE * shown.dist;
    camera.far = FAR_MARGIN * farthest;
    // Décale la cible à l'écran (offX, offY) pour laisser la place aux plaques ; recalcule la projection.
    camera.setViewOffset(
      view.width,
      view.height,
      -shown.offX * view.width,
      -shown.offY * view.height,
      view.width,
      view.height,
    );
  }

  // ---------- Étiquettes ----------
  /**
   * Étiquettes de l'image (layoutSizeLabels) : chaque astre dessiné réservé, puis posées dans l'ordre (astre affiché,
   * précédent, Soleil, puis du plus grand au plus petit), au-dessus du limbe d'un astre grand à l'écran, sur un anneau
   * pour un petit, anneau « ici » pour le Soleil devenu un point. Barre, règle, échelle graphique et place des plaques
   * (à gauche de la zone libre sur grand écran, carte fixée en haut et bas de l'écran en mise en page compacte) sont réservées
   * d'avance, avec le jet d'un trou noir dessiné, qui sort de son encombrement. L'étiquette d'un trou noir se pose à
   * 8 px de ce qui se voit de lui (`reach`). Une étiquette qui ne tient nulle part n'est pas montrée, ni celle que
   * toucherait le texte de l'introduction (`veil`, à l'écran) : masquée à sa place, elle y revient quand il est passé.
   */
  function updateLabels(current: SizeStopKey, scaleBox: LabelBox | null, veil: LabelBox | null): void {
    const reserved = frameBoxes(view, measuredBoxes, screenLayout.zone(), screenLayout.band(current), scaleBox);
    for (let i = 0; i < drawnDiscs.length; i++) {
      const jet = jets[i];
      if (!jet || fits[i] === 0) continue;
      reserved.push(...jetBoxes({ x: placed[i].x, rs: COMPARED_OBJECTS[i].radiusSolar }, jet, shown, lens, view));
    }
    const placements = layoutSizeLabels({
      discs: drawnDiscs,
      count: slots.length,
      current: sizeObjectIndex(current),
      sun: SUN_INDEX,
      metrics,
      sunMarker: sunRing,
      view,
      reserved,
      modes,
      fits,
      reach,
      veils: veil ? [veil] : undefined,
    });
    placements.objects.forEach((placement, i) => applyPlacement(slots[i], placement));
    if (sunSlot && placements.sun.form === "ring") {
      setForm(sunSlot, placements.sun.mirrored, placements.sun.short);
      showAt(sunSlot, placements.sun.left, placements.sun.top);
    } else {
      setShown(sunSlot, false);
    }
  }

  /** Pose les étiquettes au défilement `scrollY`, sous le voile de l'introduction s'il est à l'écran. */
  function placeLabels(current: SizeStopKey, veil: LabelBox | null, scrollY: number): void {
    updateLabels(current, lastScaleBox, veil);
    labelsScrollY = scrollY;
    labelsVeiled = veil !== null;
  }

  // ---------- Astres à l'écran ----------
  /**
   * Disques à l'écran des astres dessinés (les `visible` premiers), vus par la caméra de l'image ; et, sur grand écran,
   * la part visible de chacun près de la règle : un astre dont la silhouette déborde de la zone libre vers la règle
   * s'efface sur 24 px (railSideFade), au lieu de passer dessous ou d'être coupé par le bord de l'écran.
   */
  function updateDiscs(visible: number): void {
    lens.aspect = camera.aspect;
    lens.fovDeg = camera.fov;
    drawnDiscs.length = 0;
    const zone = screenLayout.zone();
    for (let i = 0; i < placed.length; i++) {
      if (i >= visible) {
        radiiPx[i] = Infinity;
        fits[i] = 1;
        continue;
      }
      const disc = screenDisc(placed[i], shown, lens, view, discs[i]);
      drawnDiscs.push(disc);
      radiiPx[i] = disc.radius;
      fits[i] = zone ? railSideFade(rightEdgePx(placed[i], shown, lens, view.width), zone.right * view.width) : 1;
    }
  }

  // ---------- Échelle graphique ----------

  /**
   * Échelle graphique : en Soleils côte à côte quand le Soleil fait 24 px ou moins à l'écran, trait de n × 2 × px par R☉
   * (`--len`, ses deux traits d'extrémité gardent leur épaisseur) et Soleil au bout, à l'échelle de 4 à 24 px, sinon un
   * point dans un anneau ; en kilomètres au-delà, sans Soleil (`data-unit`). Sa place (scaleBarSpot) : mise en page
   * compacte, la feuille de style la met en haut à droite, sous la barre ; grand écran, posée sous les astres, centrée
   * sur la zone libre ; zone étroite ou vue basse, dans le coin haut droit de l'espace libre (transform écrit ici).
   * Renvoie la boîte qu'elle occupe, réservée avant les étiquettes. Écrit seulement ce qui change ; ne mesure la page
   * que quand son texte, son unité ou la mise en page changent.
   */
  function updateScaleBar(pxPerSolarRadius: number): LabelBox | null {
    if (!scaleBar) return null;
    const zone = screenLayout.zone();
    const free = zone ? { left: zone.left * view.width, right: zone.right * view.width } : null;
    const spot = scaleBarSpot(compact.matches, free, view);
    const maxPx = scaleBarMaxPx(spot);
    const bar = scaleBarFor(pxPerSolarRadius, maxPx);
    if (!scaleShown.visible) {
      scaleShown.visible = true;
      scaleBar.root.setAttribute("data-visible", "");
    }
    if (bar.unit !== scaleShown.unit) {
      scaleShown.unit = bar.unit;
      scaleBar.root.dataset.unit = bar.unit;
      scaleSize.measured = false;
    }
    const text = scaleText(bar);
    if (text !== scaleShown.text) {
      scaleShown.text = text;
      scaleBar.text.textContent = text;
      scaleSize.measured = false;
    }
    const length = `${bar.lengthPx.toFixed(1)}px`;
    if (length !== scaleShown.length) {
      scaleShown.length = length;
      scaleBar.line.style.setProperty("--len", length);
    }
    if (bar.unit === "suns") {
      const sunDiameter = 2 * pxPerSolarRadius;
      const sunMode = scaleBarSun(sunDiameter);
      if (sunMode !== scaleShown.sunMode) {
        scaleShown.sunMode = sunMode;
        scaleBar.sun.dataset.mode = sunMode;
      }
      const sunSize = sunMode === "disc" ? `${sunDiameter.toFixed(1)}px` : "";
      if (sunSize !== scaleShown.sunSize) {
        scaleShown.sunSize = sunSize;
        if (sunSize) scaleBar.sun.style.setProperty("--sun-size", sunSize);
        else scaleBar.sun.style.removeProperty("--sun-size");
      }
    }
    // Mise en page compacte : la feuille de style la place, sans transform, effacé avant de la mesurer.
    if (spot === "css") writeScaleTransform("");
    if (!scaleSize.measured) {
      scaleSize.measured = true;
      const rect = scaleBar.root.getBoundingClientRect();
      scaleSize.width = scaleBar.root.offsetWidth;
      scaleSize.height = scaleBar.root.offsetHeight;
      scaleSize.right = rect.right;
      scaleSize.top = rect.top;
      scaleSize.bottom = rect.bottom;
    }
    // Mise en page compacte : sa boîte vient de sa mesure.
    if (spot === "css") {
      if (scaleSize.bottom <= scaleSize.top) return null;
      const width = Math.max(scaleSize.width, SCALE_BAR_CHROME_PX + maxPx);
      return [scaleSize.right - width, scaleSize.top, scaleSize.right, scaleSize.bottom];
    }
    const measured = scaleSize.width > 0 && scaleSize.height > 0 ? scaleSize : null;
    const box = scaleBarBox({ compact: false, zone: free, view, barBottom, discs: drawnDiscs, measured });
    // Sa largeur réelle suit le trait : centrée sous les astres, alignée à droite dans le coin.
    writeScaleTransform(
      spot === "under"
        ? `translate3d(${((box[0] + box[2]) / 2).toFixed(1)}px,${box[1].toFixed(1)}px,0) translateX(-50%)`
        : `translate3d(${box[2].toFixed(1)}px,${box[1].toFixed(1)}px,0) translateX(-100%)`,
    );
    return box;
  }

  /** Écrit la position de l'échelle graphique, seulement si elle change ; vide : celle de la feuille de style. */
  function writeScaleTransform(transform: string): void {
    if (!scaleBar || transform === scaleShown.transform) return;
    scaleShown.transform = transform;
    if (transform) scaleBar.root.style.transform = transform;
    else scaleBar.root.style.removeProperty("transform");
  }

  return {
    frame(dt) {
      if (disposed) return;
      const { from, to, t, current } = sizesStore.get();
      const reduced = reducedMotion.matches;
      const flying = from !== lastFrom || to !== lastTo || t !== lastT;
      applyPixelRatio(flying, t);
      const scrollY = window.scrollY;
      const veil = introVeil(introText, scrollY, view.height);
      // Rien n'a bougé (défilement immobile, mise en page posée) : pas de nouvelle image.
      if (!needsRender && !flying && layoutSettled) {
        // Au repos, le texte de l'introduction défile encore devant la scène : seules les étiquettes se reposent.
        if (scrollY !== labelsScrollY && (veil !== null || labelsVeiled)) placeLabels(current, veil, scrollY);
        return;
      }
      if (!compiled) {
        if (++compileWaitFrames < MAX_COMPILE_WAIT_FRAMES) return;
        compiled = true;
      }
      // La surface ne bouillonne que pendant un vol, et jamais en mouvement réduit.
      if (flying && lastFrom !== null && !reduced) time.value += dt;
      needsRender = false;
      lastFrom = from;
      lastTo = to;
      lastT = t;
      layoutSettled = screenLayout.settle(dt, reduced);
      const fromIndex = sizeObjectIndex(from);
      const toIndex = sizeObjectIndex(to);
      const visible = visibleObjectCount(fromIndex, toIndex, t);
      updateCamera(from, to, t, visible);
      // Caméra posée à cette image : ses matrices suivent avant de projeter et de placer les trous noirs.
      camera.updateMatrixWorld();
      updateDiscs(visible);
      showObjects(items, fromIndex, toIndex, t, fits, radiiPx);
      starfield.setLenses(updateBlackHoles(items, camera, radiiPx));
      starfield.update(camera, view.height);
      renderer.render(scene, camera);
      const pxPerSolarRadius = pixelsPerSolarRadius(view.height, shown.dist, camera.fov);
      lastScaleBox = updateScaleBar(pxPerSolarRadius);
      placeLabels(current, veil, scrollY);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      clearTimeout(resizeTimer);
      clearTimeout(platesTimer);
      platesObserver.disconnect();
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      for (const slot of allSlots) slot.element.style.visibility = "hidden";
      scaleBar?.root.removeAttribute("data-visible");
      scaleBar?.root.style.removeProperty("transform");
      scene.traverse(disposeObject);
      releaseRenderer(renderer);
    },
  };
}
