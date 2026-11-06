import { Color, Matrix3, Mesh, PlaneGeometry, ShaderMaterial, Vector2, Vector3, type Camera } from "three";
import { DESKTOP_RAY_STEPS, LITE_RAY_STEPS } from "@/lib/astro/photonGeodesic";
import { ISCO_RS } from "@/lib/astro/schwarzschild";
import { BLACK_HOLE_FRAGMENT, BLACK_HOLE_VERTEX } from "./blackHoleShaders";
import type { Uniform } from "./materials";
import { DEG } from "./math";
import type { StarfieldUniforms } from "./starfield";

/*
 * Trou noir de l'onglet « Tailles » : un rectangle face caméra, dont le shader trace la lumière dans le repère du trou
 * noir, en r_s (rayon de Schwarzschild), autour d'un trou noir sans rotation (blackHoleShaders.ts, d'après le modèle
 * exécutable src/lib/astro/photonGeodesic.ts). Un aspect (`BlackHoleLook`) dit ce qui brille autour de l'ombre : disque
 * mince, gaz chaud ténu, jet, lueur. L'encombrement (`extentRs`) borne tout ce qui est lumineux et sert à la
 * disposition et au cadrage. Le ciel vient du fond étoilé (starfield.ts), dont il partage la fonction, les uniformes et
 * les lentilles des autres trous noirs.
 *
 * Réglages à l'écran : les champs nommés de BLACK_HOLE_LOOKS (éclats, températures, inclinaisons, étendues, gain du
 * jet…), relus à chaque rechargement, ou `setLook` sur un maillage déjà créé ; l'éclat du ciel est uStarfieldGain.
 */

/** Rayon minimal de la sphère tracée en champ fort, en r_s : au-delà, le champ faible du fond prend le relais. */
export const LENS_QUAD_RS = 10;

/**
 * Ordre de dessin d'un trou noir : après le fond, avant les étoiles. Une étoile voisine se dessine par-dessus le ciel
 * lentillé, ce qui est juste : elle est à côté du trou noir, pas derrière.
 */
export const BLACK_HOLE_RENDER_ORDER = -10;

/**
 * Disque mince d'accrétion, vu par ses traversées. Température en r^(−3/4) (1 − √(r_in/r))^(1/4), couleur de corps
 * noir à la température observée g T, éclat en g⁴ (effet Doppler relativiste et décalage gravitationnel), turbulence
 * qui tourne à la vitesse képlérienne. Distances en r_s.
 */
export interface BlackHoleDisk {
  /** Bords de la zone émissive : intérieur ≥ PHOTON_SPHERE_RS (ISCO_RS pour un disque mince), extérieur > intérieur. */
  innerRs: number;
  outerRs: number;
  /** Température au plus chaud (r = 49/36 r_in), en kelvins : elle fait la couleur ; le côté qui s'approche bleuit. */
  temperatureK: number;
  /** Éclat d'ensemble (linéaire, avant tone mapping). */
  gain: number;
  /**
   * Opacité sous incidence normale, dans ]0 ; 1] : 1, disque optiquement épais. Elle croît vers la tranche
   * (1 − (1 − opacité)^(1/μ)) et s'efface au bord extérieur, qui devient transparent en douceur.
   */
  opacity: number;
  /** Contraste de la turbulence, de 0 (lisse) à 1 (filaments marqués). */
  turbulence: number;
}

/**
 * Gaz chaud, optiquement mince, qui baigne le trou noir (flot peu lumineux de Sagittarius A* et de M87*, coquille ténue
 * d'un trou noir dormant) : il brille le long des rayons. Émissivité en coquille, nulle aux deux bords et maximale à
 * mi-chemin : un rayon qui la frôle la traverse longuement, un rayon qui plonge vers l'horizon à peine, d'où un anneau
 * brillant autour d'un intérieur sombre, et l'anneau de photons des rayons qui tournent. Couleur de corps noir décalée
 * par g.
 */
export interface BlackHoleFlow {
  /** Bords de l'émission, en r_s : intérieur ≥ PHOTON_SPHERE_RS ; le maximum est à mi-chemin. */
  innerRs: number;
  outerRs: number;
  /** Température de couleur, en kelvins ; pour un anneau vu en ondes radio, convention de fausses couleurs. */
  temperatureK: number;
  /** Éclat d'ensemble. */
  gain: number;
  /** Écart type de la latitude du gaz, en radians : petit, un tore aplati ; 1 ou plus, presque une sphère. */
  thickness: number;
  /** Rotation du gaz, en fraction de la vitesse képlérienne de l'équateur, de 0 à 1 : un côté plus brillant. */
  rotation: number;
  /** Amplitude des sursauts lents, des taches plus vives qui naissent, tournent et s'éteignent, de 0 à 1. */
  flicker: number;
}

/**
 * Jet le long de l'axe du disque, côté qui s'approche ; le contre-jet, à l'opposé, en est une fraction. Faisceau fin
 * et collimaté, nœuds brillants qui filent vers l'extérieur, éclat qui s'estompe. Il peut déborder de l'encombrement :
 * le rectangle du trou noir s'agrandit pour lui, et hors du cœur tracé sa lumière s'ajoute au fond.
 */
export interface BlackHoleJet {
  gain: number;
  /** Longueur, en r_s. */
  lengthRs: number;
  /** Largeur (écart type) au pied, en r_s. */
  widthRs: number;
  /** Demi-ouverture de l'évasement, en degrés. */
  halfAngleDeg: number;
  /** Éclat du contre-jet rapporté à celui du jet, dans [0 ; 1[. */
  counterRatio: number;
  /** Contraste des nœuds, de 0 (jet lisse) à 1. */
  knots: number;
  /** Couleur linéaire. */
  color: Color;
}

/**
 * Lueur au-delà de l'ombre, selon le paramètre d'impact b du rayon : lumière diffuse des vieilles étoiles de la galaxie
 * hôte d'un trou noir dormant, vue à travers la lentille. gain × (exp(−Δ / scaleRs) + ring × exp(−Δ / ringWidthRs)),
 * Δ = b − ombre, éteinte avant reachRs : une lueur chaude qui borde l'ombre et, serré contre elle, l'anneau d'Einstein
 * des rayons qui ont fait le tour du trou noir (anneau de photons). Seuls les rayons hors de l'ombre la portent :
 * l'ombre reste parfaitement noire.
 */
export interface BlackHoleGlow {
  gain: number;
  scaleRs: number;
  reachRs: number;
  /** Éclat de l'anneau de photons, rapporté à celui de la lueur au bord de l'ombre. */
  ring: number;
  /** Largeur de l'anneau de photons, en r_s de paramètre d'impact : très fin, quelques centièmes. */
  ringWidthRs: number;
  /** Couleur linéaire. */
  color: Color;
}

/** Aspect d'un trou noir, rendu calculé. Distances en r_s. */
export interface BlackHoleLook {
  /** Angle entre l'axe du disque et la ligne de visée, en degrés : 0 vu de face, 90 par la tranche. */
  inclinationDeg: number;
  /** Rotation de l'axe du disque dans le plan de l'image, en degrés, sens direct ; 0 : axe vers le haut. */
  positionAngleDeg: number;
  /** Rotation du gaz vue de la caméra : vrai, sens horaire (M87*, Sagittarius A*) ; faux, sens direct. */
  clockwise: boolean;
  /** Période affichée d'une orbite à la dernière orbite stable (3 r_s), en secondes ; ailleurs, loi de Kepler (r^1,5). */
  orbitPeriodS: number;
  /** Disque mince lumineux (null : aucun). */
  disk: BlackHoleDisk | null;
  /** Gaz chaud ténu (null : aucun). */
  flow: BlackHoleFlow | null;
  /** Jet le long de l'axe (null : aucun). */
  jet: BlackHoleJet | null;
  /** Lueur au-delà de l'ombre (null : aucune). */
  glow: BlackHoleGlow | null;
}

export type BlackHoleLookName = "x-ray-binary" | "faint-ring" | "jet-ring" | "dormant";

/** Couleur « #rrggbb » (sRGB) en linéaire, multipliée par `gain` (HDR au-delà de 1). */
const hdr = (hex: string, gain: number) => new Color(hex).multiplyScalar(gain);

/**
 * Aspects de départ, réglés à l'œil à la vérification visuelle, d'après la fiche documentaire des trous noirs. Les
 * anneaux de Sagittarius A* et de M87*, vus en ondes radio, sont en fausses couleurs (la palette orangée des images de
 * l'EHT, plus claire là où l'anneau brille), à dire.
 */
export const BLACK_HOLE_LOOKS: Readonly<Record<BlackHoleLookName, BlackHoleLook>> = {
  // Binaire X (Cygnus X-1) : disque mince et très chaud, sans jet visible, vu presque par la tranche pour montrer
  // l'image du disque par-dessus et par-dessous l'ombre (angle choisi pour la vue ; l'orbite publiée n'est inclinée que
  // de 27,5°). Température d'affichage : le vrai disque dépasse le million de kelvins, dont la couleur limite (≈ #95b1ff)
  // ne varie plus avec l'effet Doppler ; à 8 000 K au plus chaud, il se voit aussi dans la couleur : le côté qui
  // s'approche brille et bleuit, celui qui s'éloigne s'assombrit et tire vers l'orangé, le bord intérieur paraît
  // presque blanc. Couronne chaude (≈ 10⁶ K, bleutée) en halo doux autour du disque ; anneau de photons fin et vif.
  "x-ray-binary": {
    inclinationDeg: 84,
    positionAngleDeg: 0,
    clockwise: false,
    orbitPeriodS: 5,
    disk: { innerRs: ISCO_RS, outerRs: 8, temperatureK: 8000, gain: 0.45, opacity: 1, turbulence: 0.85 },
    flow: { innerRs: ISCO_RS, outerRs: 9, temperatureK: 1e6, gain: 0.007, thickness: 0.6, rotation: 0.5, flicker: 0 },
    jet: null,
    glow: { gain: 0.03, scaleRs: 0.5, reachRs: 3.5, ring: 22, ringWidthRs: 0.03, color: hdr("#cfdcff", 1) },
  },
  // Anneau ténu (Sagittarius A*) : flot chaud, optiquement mince, en tore épais serré autour de la sphère des photons,
  // vu plutôt de face (i ≤ 30° favorisé par l'EHT), orangé ; il tourne dans le sens horaire (éruptions suivies par
  // GRAVITY) et s'éclaire de taches qui naissent et s'éteignent. Anneau vers 2,7-2,9 r_s comme sur l'image de l'EHT,
  // intérieur sombre ; ni disque éclatant ni jet.
  "faint-ring": {
    inclinationDeg: 30,
    positionAngleDeg: 0,
    clockwise: true,
    orbitPeriodS: 12,
    disk: null,
    flow: { innerRs: 1.6, outerRs: 2.2, temperatureK: 3200, gain: 1, thickness: 0.45, rotation: 0.6, flicker: 0.7 },
    jet: null,
    glow: null,
  },
  // Anneau et jet (M87*) : anneau épais vers 2,7-3 r_s comme sur l'image de l'EHT, intérieur sombre, plus brillant au
  // sud (rotation horaire vue de la Terre : ce côté s'approche) ; jet bleuté (synchrotron) vers l'ouest-nord-ouest
  // (angle de position ≈ 288°), fin et collimaté, long de 40 r_s, nœuds qui filent, évasement léger ; contre-jet presque
  // invisible. Vu à 40° pour que le jet s'étende à l'écran ; publié : 17°.
  "jet-ring": {
    inclinationDeg: 40,
    positionAngleDeg: 288,
    clockwise: true,
    orbitPeriodS: 10,
    disk: null,
    flow: { innerRs: 1.7, outerRs: 3, temperatureK: 3600, gain: 0.7, thickness: 0.35, rotation: 0.9, flicker: 0.25 },
    jet: {
      gain: 0.1,
      lengthRs: 40,
      widthRs: 0.25,
      halfAngleDeg: 1.2,
      counterRatio: 0.01,
      knots: 0.8,
      color: hdr("#9fc3ff", 1),
    },
    glow: null,
  },
  // Trou noir dormant (Fer à cheval cosmique) : il n'avale rien, ni disque ni jet ni gaz. L'ombre parfaitement noire se
  // découpe sur la lueur jaune orangé des vieilles étoiles de sa galaxie (≈ 4 300 K), qui s'y serre en un anneau de
  // photons très fin ; autour, le ciel fortement dévié.
  dormant: {
    inclinationDeg: 0,
    positionAngleDeg: 0,
    clockwise: false,
    orbitPeriodS: 10,
    disk: null,
    flow: null,
    jet: null,
    glow: { gain: 0.08, scaleRs: 1.2, reachRs: 9, ring: 7, ringWidthRs: 0.03, color: hdr("#ffdab3", 1) },
  },
};

/** Encombrement minimal, en r_s : l'ombre (SHADOW_RADIUS_RS ≈ 2,6), taille comparée, et son anneau. */
const MIN_EXTENT_RS = 3;
/** Marge au-delà de l'image lentillée du bord du disque ou du gaz, en r_s. */
const DISK_MARGIN_RS = 0.2;
/** Marge au-delà de la portée de la lueur, en r_s. */
const REACH_MARGIN_RS = 1;

/** b(r) = r / √(1 − 1/r) : borne du rayon apparent de la lumière émise au rayon r (r_s = 1, r > 1). */
function lensedRadiusBound(radiusRs: number): number {
  return radiusRs / Math.sqrt(1 - 1 / radiusRs);
}

/**
 * Encombrement minimal (r_s) d'un aspect, arrondi au 0,1 supérieur : max(3, b(disk.outerRs) + 0,2,
 * b(flow.outerRs) + 0,2, glow.reachRs + 1), où b(r) = r / √(1 − 1/r) borne le rayon apparent de l'image lentillée de
 * ce qui brille au rayon r. Le jet n'y compte pas : faisceau de lumière additive, il peut déborder de l'encombrement.
 */
export function requiredExtentRs(look: BlackHoleLook): number {
  const reach = Math.max(
    MIN_EXTENT_RS,
    look.disk ? lensedRadiusBound(look.disk.outerRs) + DISK_MARGIN_RS : 0,
    look.flow ? lensedRadiusBound(look.flow.outerRs) + DISK_MARGIN_RS : 0,
    look.glow ? look.glow.reachRs + REACH_MARGIN_RS : 0,
  );
  // Une erreur d'arrondi ne doit pas pousser 10 à 10,1.
  return Math.ceil(reach * 10 - 1e-9) / 10;
}

/**
 * Axe du disque dans le repère du trou noir (axes du monde ; la caméra des tailles regarde vers −z) :
 * Rz(angle de position) × (0, sin i, cos i). Vu de face, vers la caméra ; par la tranche, vers le haut ; l'angle de
 * position le tourne en sens direct (90° : vers la gauche). Côté du jet qui s'approche.
 */
export function diskAxis(inclinationDeg: number, positionAngleDeg: number, out: Vector3 = new Vector3()): Vector3 {
  const i = inclinationDeg * DEG;
  const p = positionAngleDeg * DEG;
  return out.set(-Math.sin(i) * Math.sin(p), Math.sin(i) * Math.cos(p), Math.cos(i));
}

/** Flottant GLSL d'un define : toujours un point décimal (« 1.0 », « 0.08 »). */
const glslFloat = (value: number) => (Number.isInteger(value) ? value.toFixed(1) : String(value));

/**
 * Defines du tracé, tirés de DESKTOP_RAY_STEPS ou de LITE_RAY_STEPS (écran tactile, avec BH_LITE) : les mêmes pour tous
 * les trous noirs d'une variante, un seul programme compilé.
 */
export function rayDefines(lite: boolean): Record<string, string> {
  const steps = lite ? LITE_RAY_STEPS : DESKTOP_RAY_STEPS;
  return {
    BH_STEPS: String(steps.maxSteps),
    BH_STEP_FACTOR: glslFloat(steps.stepFactor),
    BH_MIN_STEP: glslFloat(steps.minStep),
    BH_MAX_STEP: glslFloat(steps.maxStep),
    BH_FAR_STEP_FACTOR: glslFloat(steps.farStepFactor),
    BH_MAX_CROSSINGS: String(steps.maxCrossings),
    ...(lite ? { BH_LITE: "" } : {}),
  };
}

export interface BlackHoleMeshOptions {
  look: BlackHoleLook;
  /** Rayon de Schwarzschild, en unités de la scène (R☉ dans Tailles). */
  radius: number;
  /**
   * Encombrement, en r_s : ce qui est lumineux s'y éteint, le jet excepté (RangeError s'il est inférieur à
   * requiredExtentRs(look)). Le cœur tracé est la sphère de rayon max(extentRs, LENS_QUAD_RS) ; le rectangle s'agrandit
   * au-delà pour un jet.
   */
  extentRs: number;
  /** Temps affiché partagé, en secondes : rotation du disque et sursauts (n'avance que pendant un vol). */
  time: Uniform<number>;
  /** Uniformes du ciel : `createStarfieldBackground().uniforms`, les mêmes objets. */
  starfield: StarfieldUniforms;
  /** Écran tactile : variante allégée du tracé (define BH_LITE, LITE_RAY_STEPS). */
  lite: boolean;
}

export interface BlackHoleMesh {
  /** Rectangle face caméra ; l'appelant le place (`mesh.position`) et le montre (`mesh.visible`). */
  mesh: Mesh<PlaneGeometry, ShaderMaterial>;
  /** Opacité d'ensemble, de 0 à 1 : fondu d'arrivée × effacement près de la règle. */
  opacity: Uniform<number>;
  /**
   * Repère de l'horizon (r_s), non lentillé, au cœur de l'ombre : cercle fin de laiton en pointillés, discret comme un
   * trait d'instrument ; 0 caché, 1 (défaut) à son opacité nominale (35 %). L'horizon n'est pas la taille comparée
   * (l'ombre l'est) ; le cercle montre où il se trouve.
   */
  horizonMark: Uniform<number>;
  /** Caméra dans le repère du trou noir, en r_s, mise à jour par `update` ; le fond la lit pour sa lentille faible. */
  readonly cameraLocal: Vector3;
  /**
   * Avant chaque rendu, matrices de la caméra à jour : caméra dans le repère du trou noir, en r_s (uCamLocal), et
   * rotation de l'espace vue vers ce repère (uViewToWorld), calculées en double précision. Aucune allocation.
   */
  update(camera: Camera): void;
  /**
   * Change l'aspect sans recompiler (réglage à l'écran) : réécrit les uniformes. RangeError si l'aspect exige plus que
   * l'encombrement du maillage.
   */
  setLook(look: BlackHoleLook): void;
}

/** Uniformes de l'aspect, réécrits par setLook. */
interface LookUniforms {
  /** Rayon de la sphère que couvre le rectangle, en r_s : le cœur tracé, ou plus pour contenir un jet. */
  uQuadRs: Uniform<number>;
  /** Axe du disque, côté du jet qui s'approche. */
  uAxis: Uniform<Vector3>;
  /** Moment cinétique du gaz : ±uAxis. */
  uSpin: Uniform<Vector3>;
  /** Base directe du plan du disque (e1 × e2 = uSpin) : l'azimut croît dans le sens de rotation. */
  uDiskE1: Uniform<Vector3>;
  uDiskE2: Uniform<Vector3>;
  /** Vitesse angulaire affichée à 3 r_s, en rad par seconde affichée. */
  uOrbitRate: Uniform<number>;
  uDiskRadii: Uniform<Vector2>;
  uDiskTemperature: Uniform<number>;
  uDiskGain: Uniform<number>;
  /** Épaisseur optique verticale τ = −ln(1 − opacité), bornée à DISK_OPAQUE_DEPTH. */
  uDiskDepth: Uniform<number>;
  uDiskTurbulence: Uniform<number>;
  uFlowRadii: Uniform<Vector2>;
  uFlowTemperature: Uniform<number>;
  uFlowGain: Uniform<number>;
  /** 1 / (2 σ²), σ = épaisseur angulaire : aplatissement du gaz. */
  uFlowFlatten: Uniform<number>;
  uFlowRotation: Uniform<number>;
  uFlowFlicker: Uniform<number>;
  uJetGain: Uniform<number>;
  uJetLength: Uniform<number>;
  uJetWidth: Uniform<number>;
  /** Tangente de la demi-ouverture. */
  uJetTan: Uniform<number>;
  uJetCounter: Uniform<number>;
  uJetKnots: Uniform<number>;
  uJetColor: Uniform<Color>;
  uGlowGain: Uniform<number>;
  uGlowScale: Uniform<number>;
  uGlowReach: Uniform<number>;
  uGlowRing: Uniform<number>;
  uGlowRingWidth: Uniform<number>;
  uGlowColor: Uniform<Color>;
}

/** Épaisseur optique d'un disque d'opacité 1 : e^(−8) ≈ 3 × 10⁻⁴ de transmission. */
const DISK_OPAQUE_DEPTH = 8;

function createLookUniforms(): LookUniforms {
  return {
    uQuadRs: { value: LENS_QUAD_RS },
    uAxis: { value: new Vector3(0, 0, 1) },
    uSpin: { value: new Vector3(0, 0, 1) },
    uDiskE1: { value: new Vector3(1, 0, 0) },
    uDiskE2: { value: new Vector3(0, 1, 0) },
    uOrbitRate: { value: 1 },
    uDiskRadii: { value: new Vector2(ISCO_RS, 2 * ISCO_RS) },
    uDiskTemperature: { value: 6000 },
    uDiskGain: { value: 0 },
    uDiskDepth: { value: 0 },
    uDiskTurbulence: { value: 0 },
    uFlowRadii: { value: new Vector2(1.5, 2) },
    uFlowTemperature: { value: 6000 },
    uFlowGain: { value: 0 },
    uFlowFlatten: { value: 0 },
    uFlowRotation: { value: 0 },
    uFlowFlicker: { value: 0 },
    uJetGain: { value: 0 },
    uJetLength: { value: 1 },
    uJetWidth: { value: 0.3 },
    uJetTan: { value: 0 },
    uJetCounter: { value: 0 },
    uJetKnots: { value: 0 },
    uJetColor: { value: new Color(0, 0, 0) },
    uGlowGain: { value: 0 },
    uGlowScale: { value: 1 },
    uGlowReach: { value: 1 },
    uGlowRing: { value: 0 },
    uGlowRingWidth: { value: 0.05 },
    uGlowColor: { value: new Color(0, 0, 0) },
  };
}

/** Largeurs du jet à son bout, en écarts types, que le rectangle doit contenir. */
const JET_REACH_WIDTHS = 3;

/**
 * Écrit un aspect dans ses uniformes ; copie les couleurs (un réglage du maillage ne touche pas l'aspect partagé).
 * `coreRs` : rayon du cœur tracé, que le rectangle couvre au moins.
 */
function writeLook(look: BlackHoleLook, u: LookUniforms, coreRs: number): void {
  const axis = diskAxis(look.inclinationDeg, look.positionAngleDeg, u.uAxis.value);
  const spin = u.uSpin.value.copy(axis).multiplyScalar(look.clockwise ? -1 : 1);
  const reference = Math.abs(spin.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
  const e1 = u.uDiskE1.value.crossVectors(spin, reference).normalize();
  u.uDiskE2.value.crossVectors(spin, e1);
  u.uOrbitRate.value = (2 * Math.PI) / look.orbitPeriodS;

  const { disk, flow, jet, glow } = look;
  u.uDiskGain.value = disk?.gain ?? 0;
  if (disk) {
    u.uDiskRadii.value.set(disk.innerRs, disk.outerRs);
    u.uDiskTemperature.value = disk.temperatureK;
    u.uDiskDepth.value = disk.opacity >= 1 ? DISK_OPAQUE_DEPTH : Math.min(DISK_OPAQUE_DEPTH, -Math.log(1 - disk.opacity));
    u.uDiskTurbulence.value = disk.turbulence;
  }
  u.uFlowGain.value = flow?.gain ?? 0;
  if (flow) {
    u.uFlowRadii.value.set(flow.innerRs, flow.outerRs);
    u.uFlowTemperature.value = flow.temperatureK;
    u.uFlowFlatten.value = 1 / (2 * flow.thickness * flow.thickness);
    u.uFlowRotation.value = flow.rotation;
    u.uFlowFlicker.value = flow.flicker;
  }
  u.uJetGain.value = jet?.gain ?? 0;
  u.uQuadRs.value = coreRs;
  if (jet) {
    const tan = Math.tan(jet.halfAngleDeg * DEG);
    u.uJetLength.value = jet.lengthRs;
    u.uJetWidth.value = jet.widthRs;
    u.uJetTan.value = tan;
    u.uJetCounter.value = jet.counterRatio;
    u.uJetKnots.value = jet.knots;
    u.uJetColor.value.copy(jet.color);
    u.uQuadRs.value = Math.max(coreRs, jet.lengthRs + JET_REACH_WIDTHS * (jet.widthRs + jet.lengthRs * tan));
  }
  u.uGlowGain.value = glow?.gain ?? 0;
  if (glow) {
    u.uGlowScale.value = glow.scaleRs;
    u.uGlowReach.value = glow.reachRs;
    u.uGlowRing.value = glow.ring;
    u.uGlowRingWidth.value = glow.ringWidthRs;
    u.uGlowColor.value.copy(glow.color);
  }
}

/** Laiton des traits d'instrument (--laiton) : cercle de l'horizon. */
const BRASS = "#c2a36b";

/**
 * Trou noir de rayon de Schwarzschild `radius` (unités de la scène). Lève une RangeError si ce rayon n'est pas un nombre
 * fini strictement positif, ou si l'encombrement ne contient pas ce que l'aspect éclaire.
 */
export function createBlackHoleMesh(options: BlackHoleMeshOptions): BlackHoleMesh {
  const { look, radius, extentRs, time, starfield, lite } = options;
  if (!Number.isFinite(radius) || radius <= 0) {
    throw new RangeError(`Rayon de Schwarzschild invalide : ${radius}`);
  }
  const checkLook = (candidate: BlackHoleLook) => {
    const required = requiredExtentRs(candidate);
    if (!Number.isFinite(extentRs) || !(extentRs >= required)) {
      throw new RangeError(`Encombrement de ${extentRs} r_s, sous les ${required} r_s qu'exige l'aspect`);
    }
  };
  checkLook(look);
  const cameraLocal = new Vector3();
  const viewToWorld = new Matrix3();
  const opacity: Uniform<number> = { value: 1 };
  const horizonMark: Uniform<number> = { value: 1 };
  const coreRs = Math.max(extentRs, LENS_QUAD_RS);
  const lookUniforms = createLookUniforms();
  writeLook(look, lookUniforms, coreRs);
  const material = new ShaderMaterial({
    uniforms: {
      ...starfield,
      ...lookUniforms,
      uTime: time,
      uRadius: { value: radius },
      uCoreRs: { value: coreRs },
      uCamLocal: { value: cameraLocal },
      uViewToWorld: { value: viewToWorld },
      uOpacity: opacity,
      uHorizonMark: horizonMark,
      // Linéaire : le tone mapping l'assombrit un peu (décalage des couleurs sombres de PBR Neutral).
      uHorizonColor: { value: new Color(BRASS) },
    },
    defines: rayDefines(lite),
    vertexShader: BLACK_HOLE_VERTEX,
    fragmentShader: BLACK_HOLE_FRAGMENT,
    transparent: true,
    // Le fragment prémultiplie sa couleur : le cœur couvre le fond selon son opacité, le jet hors du cœur s'y ajoute.
    premultipliedAlpha: true,
    depthTest: false,
    depthWrite: false,
  });
  const mesh = new Mesh(new PlaneGeometry(2, 2), material);
  mesh.renderOrder = BLACK_HOLE_RENDER_ORDER;
  mesh.frustumCulled = false;

  const center = new Vector3();
  const eye = new Vector3();
  return {
    mesh,
    opacity,
    horizonMark,
    cameraLocal,
    update(camera) {
      // Positions en double précision (matrices de three en nombres JavaScript), différence faite ici, pas sur le GPU.
      mesh.getWorldPosition(center);
      eye.setFromMatrixPosition(camera.matrixWorld);
      cameraLocal.subVectors(eye, center).divideScalar(radius);
      // Le trou noir n'est pas tourné : son repère a les axes du monde.
      viewToWorld.setFromMatrix4(camera.matrixWorld);
    },
    setLook(next) {
      checkLook(next);
      writeLook(next, lookUniforms, coreRs);
    },
  };
}
