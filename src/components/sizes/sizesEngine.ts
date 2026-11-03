import {
  Line,
  Mesh,
  NeutralToneMapping,
  PerspectiveCamera,
  Points,
  SRGBColorSpace,
  Scene,
  Vector3,
  type Material,
  type Object3D,
  type WebGLRenderer,
} from "three";
import { anchoredBox, markerLayouts, placeMarkedLabel, pointBox, type LabelBox, type MarkerLayout } from "@/components/scene/labels";
import { createRenderer, releaseRenderer } from "@/components/scene/renderer";
import { COMPACT_LAYOUT_QUERY, createScreenLayout, type ScreenLayoutElements } from "@/components/scene/screenLayout";
import { julianDate } from "@/lib/astro/ephemeris";
import { solarActivity, sunspotLatitude } from "@/lib/astro/solarCycle";
import { COMPARED_STARS, type SizeStarKey } from "@/lib/astro/starSizes";
import { smootherstep } from "@/lib/journey/sections";
import { placeObjects } from "@/lib/sizes/layout";
import { layoutInput } from "@/lib/sizes/objects";
import { pixelsPerSolarRadius, scaleBarFor, scaleBarPlacement, scaleBarSun, type ScaleBar } from "@/lib/sizes/scaleBar";
import {
  SIZES_VIEW_ELEV_DEG,
  screenDisc,
  sizesFlightCamera,
  sizesRestCamera,
  visibleObjectCount,
  type ScreenDisc,
  type SizesCam,
  type SizesFrameContext,
} from "@/lib/sizes/sizesCamera";
import { sizesStore } from "@/lib/sizes/store";
import { sizeStarIndex, type SizeStopKey } from "@/lib/sizes/stops";
import { labelOrder, placeLimbLabel, starLabelMode, sunRinged, type StarLabelMode } from "./sizesLabels";
import { createStarMeshes, showStars } from "./starMeshes";

/** Échelle graphique (DOM, `aria-hidden`) : conteneur, Soleil à l'échelle, trait, texte. */
export interface ScaleBarElements {
  root: HTMLElement;
  sun: HTMLElement;
  line: HTMLElement;
  text: HTMLElement;
}

export interface SizesSceneOptions {
  canvas: HTMLCanvasElement;
  /** Étiquette de chaque étoile sur un anneau à sa couleur (petite à l'écran) : repère `<i>` et texte `<span>`. */
  ringLabels: ReadonlyMap<SizeStarKey, HTMLElement>;
  /** Étiquette de chaque étoile posée au-dessus de son limbe (grande à l'écran) : texte seul. */
  limbLabels: ReadonlyMap<SizeStarKey, HTMLElement>;
  /** Le Soleil devenu un point : anneau « ici » en `--soleil` (`.lbl.deep.here`). */
  sunMarker: HTMLElement | null;
  scaleBar: ScaleBarElements | null;
  /** Texte de l'échelle graphique dans la langue de la page : « 10 Soleils côte à côte », « 500 km ». */
  scaleText(bar: ScaleBar): string;
  /** Ce qui borde la scène : barre haute, règle des tailles, plaques (bandes et zone libres). */
  layout: Omit<ScreenLayoutElements<SizeStopKey>, "note">;
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
/** Longueur maximale du trait de l'échelle graphique, en px : grand écran, mise en page compacte. */
const SCALE_BAR_MAX_PX = 240;
const SCALE_BAR_MAX_PX_COMPACT = 112;
/**
 * Largeur de la ligne de l'échelle graphique au plus long, hors trait : Soleil de 24 px, écart de 8 px, marges de
 * 12 px et bords de 1 px. La boîte réservée aux étiquettes prend cette largeur au moins : celle du trait change à
 * chaque image d'un vol, et la mesurer à chaque image forcerait une mise en page.
 */
const SCALE_BAR_CHROME_PX = 24 + 8 + 2 * 12 + 2;
/** Sous ce diamètre à l'écran, en px, le disque d'une étoile est réservé : aucune étiquette ne s'y pose. */
const RESERVED_DISC_PX = 24;
/** Rang du Soleil parmi les étoiles comparées. */
const SUN_INDEX = COMPARED_STARS.findIndex((star) => star.key === "sun");

/** Étiquette DOM placée par le moteur : seules les valeurs qui changent sont écrites. */
interface LabelSlot {
  element: HTMLElement;
  shown: boolean | null;
  transform: string;
  mirrored: boolean;
  short: boolean;
}

/** Repère et dispositions d'une étiquette à anneau, mesurés dans sa forme normale. */
interface RingMarker {
  layouts: MarkerLayout[];
  dotY: number;
  dotWidth: number;
  dotHeight: number;
}

/** Les deux étiquettes d'une étoile et la disposition retenue à l'image précédente (hystérésis). */
interface StarLabels {
  ring: LabelSlot | null;
  limb: LabelSlot | null;
  marker: RingMarker | null;
  limbSize: { width: number; height: number };
  mode: StarLabelMode | null;
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
      detailWidth: text.querySelector<HTMLElement>(".dist")?.offsetWidth ?? 0,
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

/** Boîte occupée par un élément de la page, en px de la vue. */
function rectBox(element: Element): LabelBox {
  const rect = element.getBoundingClientRect();
  return [rect.left, rect.top, rect.right, rect.bottom];
}

const emptyCam = (): SizesCam => ({ tx: 0, dist: 1, offX: 0, offY: 0 });

/**
 * Scène 3D de la page « Tailles », légère et séparée du moteur du Voyage : les dix étoiles du comparateur à leur
 * taille vraie, côte à côte (placeObjects), une caméra qui suit le défilement (sizesStore), leurs étiquettes et
 * l'échelle graphique. Elle ne rend une image que si quelque chose bouge (vol, mise en page, taille de la vue) ;
 * la surface des étoiles n'avance que pendant un vol, et jamais en mouvement réduit. Sur écran tactile, les vols se
 * rendent en rapport de pixels 1, l'arrivée nette. Renvoie `null` sans WebGL 2 ou en
 * rendu logiciel : la page passe alors au repli sans scène (createRenderer).
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
  const placed = placeObjects(COMPARED_STARS.map(layoutInput));
  /** Temps affiché de la surface des étoiles, en secondes : il n'avance que pendant un vol. */
  const time = { value: 0 };
  const today = julianDate(Date.now());
  const { group, meshes } = createStarMeshes(COMPARED_STARS, placed, {
    time,
    lite: coarsePointer,
    sunSpots: { activity: solarActivity(today), latitude: sunspotLatitude(today) * DEG },
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
  const projected = new Vector3();
  const onScreen = { x: 0, y: 0 };

  const stars: StarLabels[] = COMPARED_STARS.map((star) => {
    const ring = ringLabels.get(star.key);
    const limb = limbLabels.get(star.key);
    return {
      ring: ring ? labelSlot(ring) : null,
      limb: limb ? labelSlot(limb) : null,
      marker: null,
      limbSize: { width: 0, height: 0 },
      mode: null,
    };
  });
  const sunSlot = sunMarker ? labelSlot(sunMarker) : null;
  let sunRing: RingMarker | null = null;
  /** Étiquettes à anneau : mesurées dans leur forme normale, puis remises dans la leur. */
  const ringSlots = [...stars.map(({ ring }) => ring), sunSlot].filter((slot): slot is LabelSlot => slot !== null);
  const allSlots = [...ringSlots, ...stars.map(({ limb }) => limb).filter((slot): slot is LabelSlot => slot !== null)];
  let obstacleBoxes: LabelBox[] = [];
  const occupied: LabelBox[] = [];
  /**
   * Dernier état écrit de l'échelle graphique (unité, texte, longueur, forme et taille du Soleil, position) ; sa taille,
   * mesurée quand son texte ou son unité change, ou que la mise en page change (`measured` faux).
   */
  const scaleShown = { visible: false, unit: "", text: "", length: "", sunMode: "", sunSize: "", transform: "" };
  const scaleSize = { measured: false, width: 0, height: 0, right: 0, top: 0 };
  /** Disques à l'écran des astres dessinés à cette image (screenDisc), un par astre, réutilisés d'une image à l'autre. */
  const discs: ScreenDisc[] = placed.map(() => ({ x: 0, y: 0, radius: 0 }));
  const drawnDiscs: ScreenDisc[] = [];
  /** Rapport et champ de la caméra de l'image, pour la projection des disques. */
  const lens = { aspect: 1, fovDeg: 36 };

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
   * Une passe de lecture : tailles des étiquettes (anneaux mesurés dans leur forme normale, puis remis dans la
   * leur), boîtes à éviter (barre, règle, échelle graphique), bandes et zone libres.
   */
  function measureLayout(): void {
    const forms = ringSlots.map(({ mirrored, short }) => ({ mirrored, short }));
    for (const slot of ringSlots) setForm(slot, false, false);
    for (const star of stars) {
      star.marker = star.ring ? measureMarker(star.ring.element) : null;
      if (star.limb) star.limbSize = { width: star.limb.element.offsetWidth, height: star.limb.element.offsetHeight };
    }
    sunRing = sunSlot ? measureMarker(sunSlot.element) : null;
    obstacleBoxes = [layout.bar, layout.rail]
      .filter((element): element is Element => element !== null)
      .map(rectBox)
      .filter(([left, top, right, bottom]) => right > left && bottom > top);
    screenLayout.measure(view);
    scaleSize.measured = false;
    layoutSettled = false;
    ringSlots.forEach((slot, i) => setForm(slot, forms[i].mirrored, forms[i].short));
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

  // Compilation des shaders hors du premier rendu, toutes les étoiles visibles (le Soleil a son propre programme, à
  // cause de ses taches) : aucune saccade quand une étoile paraît. En cas d'échec, elle se fera au premier rendu.
  for (const star of meshes) star.body.visible = true;
  const onCompiled = () => {
    compiled = true;
    needsRender = true;
  };
  renderer.compileAsync(scene, camera).then(onCompiled, onCompiled);
  showStars(meshes, 0, 0, 0);

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
    // Plan lointain : au-delà de l'étoile dessinée la plus éloignée de la caméra.
    let farthest = shown.dist;
    for (let i = 0; i < visible; i++) {
      const star = placed[i];
      farthest = Math.max(farthest, Math.hypot(star.x - shown.tx, shown.dist) + star.extent);
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
  /** Position à l'écran (px) du centre de l'étoile `index`, dans `onScreen` ; sa profondeur NDC dans `projected.z`. */
  function project(index: number): void {
    projected.set(placed[index].x, 0, 0).project(camera);
    onScreen.x = ((projected.x + 1) / 2) * view.width;
    onScreen.y = ((1 - projected.y) / 2) * view.height;
  }

  /** Pose une étiquette à anneau sur le centre projeté ; renvoie faux, sans rien changer, si elle ne tient pas. */
  function fitRing(slot: LabelSlot | null, marker: RingMarker | null): boolean {
    if (!slot || !marker) return false;
    const { x, y } = onScreen;
    const index = placeMarkedLabel({ x, y, depth: projected.z }, marker.layouts, view.width, view.height, occupied);
    if (index === null) return false;
    const chosen = marker.layouts[index];
    const halfWidth = marker.dotWidth / 2;
    const halfHeight = marker.dotHeight / 2;
    occupied.push(anchoredBox(chosen.box, x, y), [x - halfWidth, y - halfHeight, x + halfWidth, y + halfHeight]);
    setForm(slot, chosen.mirrored, chosen.short);
    showAt(slot, x - chosen.dotX, y - marker.dotY);
    return true;
  }

  /**
   * Boîtes occupées d'avance : barre, règle, échelle graphique, et la place des plaques (à gauche de la zone libre
   * sur grand écran, sous la bande libre de l'escale en mise en page compacte) ; puis le disque des petites étoiles.
   */
  function reserve(current: SizeStopKey, visible: number, pxPerSolarRadius: number, scaleBox: LabelBox | null): void {
    occupied.length = 0;
    occupied.push(...obstacleBoxes);
    if (scaleBox) occupied.push(scaleBox);
    const zone = screenLayout.zone();
    if (zone) occupied.push([0, 0, zone.left * view.width, view.height]);
    const band = screenLayout.band(current);
    if (band) occupied.push([0, band.bottom * view.height, view.width, view.height]);
    for (let i = 0; i < visible; i++) {
      const diameter = 2 * placed[i].extent * pxPerSolarRadius;
      if (diameter >= RESERVED_DISC_PX) continue;
      project(i);
      if (projected.z <= 1) occupied.push(pointBox(onScreen.x, onScreen.y, diameter));
    }
  }

  /**
   * Étiquettes, dans l'ordre de pose (étoile affichée, précédente, Soleil, puis de la plus grande à la plus petite) :
   * au-dessus du limbe d'une étoile grande à l'écran, sur un anneau pour une petite, anneau « ici » pour le Soleil
   * devenu un point. Une étiquette qui ne tient nulle part n'est pas montrée.
   */
  function updateLabels(current: SizeStopKey, visible: number, pxPerSolarRadius: number, scaleBox: LabelBox | null): void {
    reserve(current, visible, pxPerSolarRadius, scaleBox);
    let sunRingShown = false;
    for (const i of labelOrder(sizeStarIndex(current), SUN_INDEX, stars.length)) {
      const star = stars[i];
      if (i >= visible) {
        setShown(star.ring, false);
        setShown(star.limb, false);
        star.mode = null;
        continue;
      }
      project(i);
      const diameter = 2 * placed[i].extent * pxPerSolarRadius;
      if (i === SUN_INDEX && sunSlot && sunRinged(diameter)) {
        setShown(star.ring, false);
        setShown(star.limb, false);
        star.mode = null;
        sunRingShown = fitRing(sunSlot, sunRing);
        continue;
      }
      star.mode = starLabelMode(diameter, star.mode);
      if (star.mode === "limb") {
        setShown(star.ring, false);
        const anchor = { x: onScreen.x, y: onScreen.y, radiusPx: diameter / 2, depth: projected.z };
        const box = star.limb ? placeLimbLabel(anchor, star.limbSize, view, occupied) : null;
        if (box && star.limb) {
          occupied.push(box);
          showAt(star.limb, box[0], box[1]);
        } else {
          setShown(star.limb, false);
        }
      } else {
        setShown(star.limb, false);
        if (!fitRing(star.ring, star.marker)) setShown(star.ring, false);
      }
    }
    if (!sunRingShown) setShown(sunSlot, false);
  }

  // ---------- Échelle graphique ----------
  /** Disques à l'écran des astres dessinés (les `visible` premiers), vus par la caméra de l'image. */
  function updateDiscs(visible: number): void {
    lens.aspect = camera.aspect;
    lens.fovDeg = camera.fov;
    drawnDiscs.length = 0;
    for (let i = 0; i < visible; i++) drawnDiscs.push(screenDisc(placed[i], shown, lens, view, discs[i]));
  }

  /**
   * Échelle graphique : en Soleils côte à côte quand le Soleil fait 24 px ou moins à l'écran, trait de n × 2 × px par R☉
   * (`--len`, ses deux traits d'extrémité gardent leur épaisseur) et Soleil au bout, à l'échelle de 4 à 24 px, sinon un
   * point dans un anneau ; en kilomètres au-delà, sans Soleil (`data-unit`). Grand écran : posée sous les astres,
   * centrée sur la zone libre (scaleBarPlacement, transform écrit ici) ; mise en page compacte : en haut à droite, sous
   * la barre (feuille de style). Renvoie la boîte qu'elle occupe, réservée avant les étiquettes. Écrit seulement ce qui
   * change ; ne mesure la page que quand son texte, son unité ou la mise en page changent.
   */
  function updateScaleBar(pxPerSolarRadius: number): LabelBox | null {
    if (!scaleBar) return null;
    const wide = !compact.matches;
    const maxPx = wide ? SCALE_BAR_MAX_PX : SCALE_BAR_MAX_PX_COMPACT;
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
    // Hors du grand écran, la feuille de style la place : aucun transform.
    const transform = wide ? scaleShown.transform : "";
    if (!wide && scaleShown.transform !== "") {
      scaleShown.transform = "";
      scaleBar.root.style.removeProperty("transform");
    }
    if (!scaleSize.measured) {
      scaleSize.measured = true;
      const rect = scaleBar.root.getBoundingClientRect();
      scaleSize.width = Math.max(scaleBar.root.offsetWidth, SCALE_BAR_CHROME_PX + maxPx);
      scaleSize.height = scaleBar.root.offsetHeight;
      scaleSize.right = rect.right;
      scaleSize.top = rect.top;
    }
    const { width, height } = scaleSize;
    if (width <= 0 || height <= 0) return null;
    if (!wide) return [scaleSize.right - width, scaleSize.top, scaleSize.right, scaleSize.top + height];
    const zone = screenLayout.zone();
    const free = zone ? { left: zone.left * view.width, right: zone.right * view.width } : { left: 0, right: view.width };
    const { left, top } = scaleBarPlacement(drawnDiscs, free, scaleSize, view);
    // Centrée sur son milieu : sa largeur réelle suit le trait, la boîte réservée prend la plus grande.
    const next = `translate3d(${(left + width / 2).toFixed(1)}px,${top.toFixed(1)}px,0) translateX(-50%)`;
    if (next !== transform) {
      scaleShown.transform = next;
      scaleBar.root.style.transform = next;
    }
    return [left, top, left + width, top + height];
  }

  return {
    frame(dt) {
      if (disposed) return;
      const { from, to, t, current } = sizesStore.get();
      const reduced = reducedMotion.matches;
      const flying = from !== lastFrom || to !== lastTo || t !== lastT;
      applyPixelRatio(flying, t);
      // Rien n'a bougé (défilement immobile, mise en page posée) : pas de nouvelle image.
      if (!needsRender && !flying && layoutSettled) return;
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
      const fromIndex = sizeStarIndex(from);
      const toIndex = sizeStarIndex(to);
      const visible = visibleObjectCount(fromIndex, toIndex, t);
      updateCamera(from, to, t, visible);
      showStars(meshes, fromIndex, toIndex, t);
      renderer.render(scene, camera);
      const pxPerSolarRadius = pixelsPerSolarRadius(view.height, shown.dist, camera.fov);
      updateDiscs(visible);
      const scaleBox = updateScaleBar(pxPerSolarRadius);
      updateLabels(current, visible, pxPerSolarRadius, scaleBox);
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
