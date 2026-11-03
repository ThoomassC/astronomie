import { Color, Matrix3, Mesh, PlaneGeometry, ShaderMaterial, Vector3, type Camera } from "three";
import { ISCO_RS } from "@/lib/astro/schwarzschild";
import { BLACK_HOLE_FRAGMENT, BLACK_HOLE_VERTEX } from "./blackHoleShaders";
import type { Uniform } from "./materials";
import type { StarfieldUniforms } from "./starfield";

/*
 * Trou noir de l'onglet « Tailles » : un rectangle face caméra, dont le shader trace la lumière dans le repère du trou
 * noir, en r_s (rayon de Schwarzschild), autour d'un trou noir sans rotation. Un aspect (`BlackHoleLook`) dit ce qui
 * brille autour de l'ombre ; l'encombrement (`extentRs`) borne tout ce qui est lumineux, et sert à la disposition et
 * au cadrage. Le ciel vient du fond étoilé (starfield.ts), dont il partage la fonction et les uniformes. Pour l'heure,
 * le shader n'est qu'un squelette analytique (blackHoleShaders.ts) : ombre noire, anneau fin, cercle de l'horizon.
 */

/** Rayon minimal de la sphère tracée en champ fort, en r_s : au-delà, le champ faible du fond prend le relais. */
export const LENS_QUAD_RS = 10;

/**
 * Ordre de dessin d'un trou noir : après le fond, avant les étoiles. Une étoile voisine se dessine par-dessus le ciel
 * lentillé, ce qui est juste : elle est à côté du trou noir, pas derrière.
 */
export const BLACK_HOLE_RENDER_ORDER = -10;

/** Disque, ou flot, qui brille autour de l'ombre. Distances en r_s. */
export interface BlackHoleDisk {
  /** Bords de la zone émissive : intérieur ≥ PHOTON_SPHERE_RS (ISCO_RS pour un disque mince), extérieur > intérieur. */
  innerRs: number;
  outerRs: number;
  /** Couleurs linéaires (HDR permis) au bord intérieur et au bord extérieur. */
  innerColor: Color;
  outerColor: Color;
  /** Éclat d'ensemble. */
  gain: number;
  /** Opacité par traversée, dans ]0 ; 1] : 1 disque mince et opaque, moins : flot ténu (anneau). */
  opacity: number;
}

/** Jet le long de l'axe du disque, côté qui s'approche ; le contre-jet, à l'opposé, en est une fraction. */
export interface BlackHoleJet {
  gain: number;
  /** Demi-ouverture du cône, en degrés. */
  halfAngleDeg: number;
  /** Éclat du contre-jet rapporté à celui du jet, dans [0 ; 1[. */
  counterRatio: number;
  /** Longueur, en r_s. */
  lengthRs: number;
  /** Couleur linéaire. */
  color: Color;
}

/**
 * Lueur au-delà de l'ombre, selon le paramètre d'impact b du rayon : gain × exp(−(b − ombre) / scaleRs), éteinte avant
 * reachRs. Halo d'un quasar, ou lumière des étoiles de la galaxie hôte, déviée autour d'un trou noir dormant.
 */
export interface BlackHoleGlow {
  gain: number;
  scaleRs: number;
  reachRs: number;
  /** Couleur linéaire. */
  color: Color;
}

/** Aspect d'un trou noir, rendu calculé. Distances en r_s. */
export interface BlackHoleLook {
  /** Angle entre l'axe du disque et la ligne de visée, en degrés : 0 vu de face, 90 par la tranche. */
  inclinationDeg: number;
  /** Rotation de l'axe du disque dans le plan de l'image, en degrés, sens direct ; 0 : axe vers le haut. */
  positionAngleDeg: number;
  /** Disque ou flot lumineux (null : aucun, trou noir dormant). */
  disk: BlackHoleDisk | null;
  /** Jet le long de l'axe (null : aucun). */
  jet: BlackHoleJet | null;
  /** Lueur au-delà de l'ombre (null : aucune). */
  glow: BlackHoleGlow | null;
}

export type BlackHoleLookName = "x-ray-binary" | "faint-ring" | "jet-ring" | "dormant";

/** Couleur « #rrggbb » (sRGB) en linéaire, multipliée par `gain` (HDR au-delà de 1). */
const hdr = (hex: string, gain: number) => new Color(hex).multiplyScalar(gain);

/**
 * Aspects de départ, réglés à l'œil à la vérification visuelle. Couleurs d'un corps noir (fiche documentaire des trous
 * noirs) ; celles des anneaux de Sagittarius A* et de M87*, vus en ondes radio, sont des fausses couleurs, à dire.
 */
export const BLACK_HOLE_LOOKS: Readonly<Record<BlackHoleLookName, BlackHoleLook>> = {
  // Binaire X (Cygnus X-1) : disque mince et très chaud, bleu-blanc limite d'un corps noir au-delà d'un million de
  // kelvins, sans jet visible. Vu à 70° pour montrer l'image du disque au-dessus de l'ombre ; l'orbite publiée est
  // inclinée de 27,5° seulement (angle choisi pour la vue).
  "x-ray-binary": {
    inclinationDeg: 70,
    positionAngleDeg: 0,
    disk: {
      innerRs: ISCO_RS,
      outerRs: 8,
      innerColor: hdr("#95b1ff", 2.4),
      outerColor: hdr("#aabfff", 0.9),
      gain: 1,
      opacity: 1,
    },
    jet: null,
    glow: null,
  },
  // Anneau ténu (Sagittarius A*) : flot chaud et épais, vu plutôt de face (i ≤ 30° favorisé par l'EHT), orangé ; ni
  // disque éclatant ni jet.
  "faint-ring": {
    inclinationDeg: 30,
    positionAngleDeg: 0,
    disk: {
      innerRs: 1.6,
      outerRs: 2.2,
      innerColor: hdr("#ffb36b", 1.2),
      outerColor: hdr("#e8692a", 0.8),
      gain: 0.6,
      opacity: 0.35,
    },
    jet: null,
    glow: null,
  },
  // Anneau et jet (M87*) : anneau orangé, jet bleuté (synchrotron) qui s'approche à 17° de la ligne de visée, vers
  // l'ouest-nord-ouest (angle de position ≈ 288°) ; contre-jet très faible.
  "jet-ring": {
    inclinationDeg: 17,
    positionAngleDeg: 288,
    disk: {
      innerRs: 2,
      outerRs: 6,
      innerColor: hdr("#ffc07a", 1.4),
      outerColor: hdr("#e8692a", 0.7),
      gain: 1,
      opacity: 0.8,
    },
    jet: { gain: 0.35, halfAngleDeg: 8, counterRatio: 0.08, lengthRs: 9, color: hdr("#9fc3ff", 1) },
    glow: null,
  },
  // Trou noir dormant (Fer à cheval cosmique) : il n'avale rien, ni disque ni jet ; son ombre se découpe sur la lumière
  // jaune orangé des vieilles étoiles de sa galaxie (≈ 4 300 K), déviée.
  dormant: {
    inclinationDeg: 0,
    positionAngleDeg: 0,
    disk: null,
    jet: null,
    glow: { gain: 0.35, scaleRs: 3, reachRs: 9, color: hdr("#ffdab3", 1) },
  },
};

/** Encombrement minimal, en r_s : l'ombre (SHADOW_RADIUS_RS ≈ 2,6), taille comparée, et son anneau. */
const MIN_EXTENT_RS = 3;
/** Marge au-delà de l'image lentillée du bord du disque, en r_s. */
const DISK_MARGIN_RS = 0.2;
/** Marge au-delà du bout du jet et de la portée de la lueur, en r_s. */
const REACH_MARGIN_RS = 1;

/** b(r) = r / √(1 − 1/r) : borne du rayon apparent de la lumière émise au rayon r (r_s = 1, r > 1). */
function lensedRadiusBound(radiusRs: number): number {
  return radiusRs / Math.sqrt(1 - 1 / radiusRs);
}

/**
 * Encombrement minimal (r_s) d'un aspect, arrondi au 0,1 supérieur : max(3, b(disk.outerRs) + 0,2, jet.lengthRs + 1,
 * glow.reachRs + 1), où b(r) = r / √(1 − 1/r) borne le rayon apparent de l'image lentillée du bord du disque.
 */
export function requiredExtentRs(look: BlackHoleLook): number {
  const reach = Math.max(
    MIN_EXTENT_RS,
    look.disk ? lensedRadiusBound(look.disk.outerRs) + DISK_MARGIN_RS : 0,
    look.jet ? look.jet.lengthRs + REACH_MARGIN_RS : 0,
    look.glow ? look.glow.reachRs + REACH_MARGIN_RS : 0,
  );
  // Une erreur d'arrondi ne doit pas pousser 10 à 10,1.
  return Math.ceil(reach * 10 - 1e-9) / 10;
}

export interface BlackHoleMeshOptions {
  look: BlackHoleLook;
  /** Rayon de Schwarzschild, en unités de la scène (R☉ dans Tailles). */
  radius: number;
  /**
   * Encombrement, en r_s : ce qui est lumineux s'y éteint (RangeError s'il est inférieur à requiredExtentRs(look)). Le
   * rectangle couvre la sphère de rayon max(extentRs, LENS_QUAD_RS).
   */
  extentRs: number;
  /** Temps affiché partagé, en secondes : rotation du disque (n'avance que pendant un vol). */
  time: Uniform<number>;
  /** Uniformes du ciel : `createStarfieldBackground().uniforms`, les mêmes objets. */
  starfield: StarfieldUniforms;
  /** Écran tactile : variante allégée du tracé (define BH_LITE). */
  lite: boolean;
}

export interface BlackHoleMesh {
  /** Rectangle face caméra ; l'appelant le place (`mesh.position`) et le montre (`mesh.visible`). */
  mesh: Mesh<PlaneGeometry, ShaderMaterial>;
  /** Opacité d'ensemble, de 0 à 1 : fondu d'arrivée × effacement près de la règle. */
  opacity: Uniform<number>;
  /**
   * Cercle de laiton de l'horizon (r_s), non lentillé, au cœur de l'ombre : 0 caché, 1 plein (défaut). L'horizon n'est
   * pas la taille comparée (l'ombre l'est) ; le cercle montre où il se trouve.
   */
  horizonMark: Uniform<number>;
  /** Caméra dans le repère du trou noir, en r_s, mise à jour par `update` ; le fond la lit pour sa lentille faible. */
  readonly cameraLocal: Vector3;
  /**
   * Avant chaque rendu, matrices de la caméra à jour : caméra dans le repère du trou noir, en r_s (uCamLocal), et
   * rotation de l'espace vue vers ce repère (uViewToWorld), calculées en double précision. Aucune allocation.
   */
  update(camera: Camera): void;
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
  const required = requiredExtentRs(look);
  if (!Number.isFinite(extentRs) || !(extentRs >= required)) {
    throw new RangeError(`Encombrement de ${extentRs} r_s, sous les ${required} r_s qu'exige l'aspect`);
  }
  const cameraLocal = new Vector3();
  const viewToWorld = new Matrix3();
  const opacity: Uniform<number> = { value: 1 };
  const horizonMark: Uniform<number> = { value: 1 };
  // Anneau du squelette : couleur du bord intérieur du disque, sinon de la lueur.
  const ringColor = (look.disk?.innerColor ?? look.glow?.color ?? new Color(1, 1, 1)).clone();
  const defines: Record<string, string> = lite ? { BH_LITE: "" } : {};
  const material = new ShaderMaterial({
    uniforms: {
      ...starfield,
      uTime: time,
      uRadius: { value: radius },
      uQuadRs: { value: Math.max(extentRs, LENS_QUAD_RS) },
      uCamLocal: { value: cameraLocal },
      uViewToWorld: { value: viewToWorld },
      uOpacity: opacity,
      uHorizonMark: horizonMark,
      uRingColor: { value: ringColor },
      // Linéaire : le tone mapping l'assombrit un peu (décalage des couleurs sombres de PBR Neutral).
      uHorizonColor: { value: new Color(BRASS) },
    },
    defines,
    vertexShader: BLACK_HOLE_VERTEX,
    fragmentShader: BLACK_HOLE_FRAGMENT,
    transparent: true,
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
  };
}
