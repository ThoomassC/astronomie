import type { Vec3 } from "./constants";
import { GALACTIC_CENTER_DISTANCE_LY, GALACTIC_DISK_RADIUS_LY, sceneFromGalacticXYZ } from "./galactic";

/**
 * Voie lactée procédurale, vue de l'extérieur à l'escale « La Voie lactée » : bulbe barré, cinq bras
 * log-spiraux et disque, tirés au hasard d'une graine fixe. Modèle simplifié, pas une carte.
 *
 * Repère galactocentrique : origine au centre, X vers l = 0° (du Soleil vers le centre, et au-delà),
 * Y vers l = 90°, Z vers le pôle nord galactique ; azimut φ compté de +X vers +Y, sens direct vu du nord.
 * Le Soleil est en φ = 180°, à R = MILKY_WAY.sunRadiusLy du centre : il voit le point (X, Y, Z) en
 * (X + R, Y, Z), coordonnées galactiques héliocentriques que sceneFromGalacticXYZ range dans la scène.
 */

export type ArmKey = "scutum-centaurus" | "perseus" | "sagittarius-carina" | "norma-outer" | "local";

export interface ArmSpec {
  key: ArmKey;
  /** Point de référence : azimut galactocentrique (degrés) du centre du bras au rayon `refRadiusLy`. */
  refAzimuthDeg: number;
  refRadiusLy: number;
  /** Étendue radiale tracée, en années-lumière. */
  innerRadiusLy: number;
  outerRadiusLy: number;
  /** Angle d'enroulement (pas de la spirale), en degrés. */
  pitchDeg: number;
  /** Écart type de la largeur du bras, en années-lumière. */
  widthLy: number;
  /** Part des points de la galaxie. */
  share: number;
  /** Bras majeur : plus dense, plus bleu, semé de régions HII. */
  major: boolean;
}

/**
 * Dimensions du modèle. Sources : NASA (disque de 100 000 al) ; GRAVITY Collaboration 2022 (Soleil à
 * 27 000 al du centre) ; Bland-Hawthorn et Gerhard 2016 (barre à 27° de la ligne Soleil–centre ; sa longueur,
 * 26 000 al ici, est publiée entre 23 000 et 33 000 al). Le bulbe (barre comprise) et le disque prennent
 * ces parts des points ; les bras, le reste (voir ARMS).
 */
export const MILKY_WAY = {
  sunRadiusLy: GALACTIC_CENTER_DISTANCE_LY,
  diskRadiusLy: GALACTIC_DISK_RADIUS_LY,
  /** Angle entre l'axe de la barre et la ligne Soleil–centre ; son bout proche est aux longitudes positives. */
  barAngleDeg: 27,
  barHalfLengthLy: 13_000,
  /** Échelle de la loi exponentielle du rayon des points du disque. */
  diskScaleLengthLy: 11_000,
  bulgeShare: 0.22,
  diskShare: 0.18,
} as const;

/**
 * Bras de la Voie lactée (Reid et al. 2019, ApJ 885, 131, simplifiés), calés pour qu'à l'azimut du Soleil
 * (180°) on croise le bras du Sagittaire–Carène à 21 300 al du centre, le Soleil dans le bras local (d'Orion),
 * puis le bras de Persée à 31 200 al. Les deux bras majeurs partent des bouts de la barre (153° et 333°),
 * les deux mineurs entre eux ; le bras local, court, passe exactement par le Soleil.
 */
export const ARMS: readonly ArmSpec[] = [
  {
    key: "scutum-centaurus", refAzimuthDeg: 153, refRadiusLy: 13_000, innerRadiusLy: 13_000, outerRadiusLy: 50_000,
    pitchDeg: 13.6, widthLy: 1_100, share: 0.19, major: true,
  },
  {
    key: "perseus", refAzimuthDeg: 333, refRadiusLy: 13_000, innerRadiusLy: 13_000, outerRadiusLy: 50_000,
    pitchDeg: 13.6, widthLy: 1_100, share: 0.19, major: true,
  },
  {
    key: "sagittarius-carina", refAzimuthDeg: 63, refRadiusLy: 13_000, innerRadiusLy: 13_000, outerRadiusLy: 45_000,
    pitchDeg: 13.6, widthLy: 900, share: 0.09, major: false,
  },
  {
    key: "norma-outer", refAzimuthDeg: 243, refRadiusLy: 13_000, innerRadiusLy: 13_000, outerRadiusLy: 50_000,
    pitchDeg: 13.6, widthLy: 900, share: 0.09, major: false,
  },
  {
    key: "local", refAzimuthDeg: 180, refRadiusLy: GALACTIC_CENTER_DISTANCE_LY, innerRadiusLy: 25_000, outerRadiusLy: 29_500,
    pitchDeg: 11.4, widthLy: 600, share: 0.04, major: false,
  },
];

/** Graine de la galaxie : le même nuage à chaque visite. */
export const GALAXY_SEED = 20_261_029;

/** Nombre de points de référence : à ce nombre, chaque point garde l'éclat de sa teinte. */
const REFERENCE_POINT_COUNT = 40_000;
/** Budget sur écran tactile (téléphones, tablettes) : 2,5 fois moins de points, chacun 2,5 fois plus lumineux. */
const COARSE_POINTER_POINT_COUNT = 16_000;

/** Part de la barre dans le bulbe ; le reste forme un sphéroïde. */
const BAR_SHARE_OF_BULGE = 0.6;
/** Écarts types de la barre, en années-lumière : le long de son axe, en travers, en hauteur. */
const BAR_SIGMA_LY = { along: 5_000, across: 2_000, height: 1_200 } as const;
/** Écarts types du sphéroïde du bulbe, en années-lumière : dans le plan, en hauteur. */
const SPHEROID_SIGMA_LY = { plane: 3_500, height: 2_500 } as const;
/** Échelle de la loi exponentielle du rayon des points des bras, en années-lumière. */
const ARM_SCALE_LENGTH_LY = 14_000;
/** Écart type de la hauteur des points des bras au-dessus du plan, en années-lumière. */
const ARM_HEIGHT_SIGMA_LY = 350;
/** Bord intérieur du disque (le bulbe occupe le centre) et écart type de sa hauteur, en années-lumière. */
const DISK_INNER_RADIUS_LY = 3_000;
const DISK_HEIGHT_SIGMA_LY = 450;

type Rgb = readonly [red: number, green: number, blue: number];

/**
 * Population d'étoiles : teinte d'un point seul telle qu'elle s'affiche (sRGB, de 0 à 1) avec 40 000 points,
 * et taille tirée uniformément entre deux bornes, en px CSS.
 *
 * L'éclat se règle en valeurs affichées : le mélange additif du rendu cumule les points après leur encodage
 * sRGB. Des points faibles et saturés se cumulent en couleurs franches là où ils se serrent (bulbe, bras) ;
 * des points vifs y partiraient au blanc. Le nuage multiplie cet éclat par 40 000 / count, ce qui garde la
 * même lumière à l'écran avec 16 000 points, le borne à 1 par point, puis le ramène en linéaire : le shader
 * le ré-encode à la sortie. Teintes réglées pour un disque de 290 px de rayon à l'écran ; plus petit, le moteur
 * les atténue (gain sur les valeurs affichées).
 */
interface Population {
  display: Rgb;
  minSize: number;
  maxSize: number;
}

const shade = (red: number, green: number, blue: number, brightness: number): Rgb => [
  red * brightness,
  green * brightness,
  blue * brightness,
];

/** Bulbe et barre : vieilles étoiles jaune orangé, très serrées, chacune à peine visible seule. */
const BULGE_STARS: Population = { display: shade(1, 0.7, 0.34, 0.1), minSize: 1.6, maxSize: 1.6 };
/**
 * Bras majeurs : jeunes étoiles bleues (85 %), régions HII rose-rouge (7 %), étoiles plus vieilles,
 * jaune pâle (8 %).
 */
const MAJOR_ARM_STARS: readonly { share: number; population: Population }[] = [
  { share: 0.85, population: { display: shade(0.36, 0.55, 1, 0.3), minSize: 1.2, maxSize: 2 } },
  { share: 0.07, population: { display: shade(1, 0.2, 0.3, 0.42), minSize: 2.2, maxSize: 2.2 } },
  { share: 0.08, population: { display: shade(1, 0.84, 0.6, 0.16), minSize: 1.2, maxSize: 2 } },
];
/** Bras mineurs et bras local : bleus, plus discrets. */
const MINOR_ARM_STARS: Population = { display: shade(0.42, 0.6, 1, 0.2), minSize: 1.2, maxSize: 1.8 };
/** Disque entre les bras : lueur diffuse, chaude et faible. */
const DISK_STARS: Population = { display: shade(1, 0.74, 0.46, 0.06), minSize: 1, maxSize: 1.6 };

/** Valeur linéaire d'une composante sRGB (IEC 61966-2-1). */
function srgbToLinear(value: number): number {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

const DEG = Math.PI / 180;

/**
 * Azimut galactocentrique (degrés, non ramené dans [0, 360[) du centre du bras au rayon `radiusLy` :
 * φref + (180/π) × ln(r / rref) / tan(pas). φ croît avec r : bras traînants d'une galaxie qui tourne
 * dans le sens horaire vue du nord.
 */
export function armAzimuthDeg(arm: ArmSpec, radiusLy: number): number {
  return arm.refAzimuthDeg + Math.log(radiusLy / arm.refRadiusLy) / DEG / Math.tan(arm.pitchDeg * DEG);
}

/** Générateur pseudo-aléatoire déterministe (mulberry32) : valeurs dans [0, 1[, même suite pour la même graine. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** Points de la galaxie : 16 000 sur pointeur tactile (téléphones, tablettes), 40 000 sinon. */
export function galaxyPointBudget(coarsePointer: boolean): number {
  return coarsePointer ? COARSE_POINTER_POINT_COUNT : REFERENCE_POINT_COUNT;
}

export interface PointCloud {
  count: number;
  /** Héliocentriques, en années-lumière, axes de scène : 3 flottants par point. */
  positions: Float32Array;
  /** Linéaires (le shader les encode en sRGB), éclat affiché compris (× 40 000 / count) : 3 flottants par point. */
  colors: Float32Array;
  /** Taille en px CSS : 1 flottant par point. */
  sizes: Float32Array;
}

/** Tirage gaussien centré (Box–Muller) : chaque paire de tirages uniformes donne deux valeurs. */
function gaussianSampler(random: () => number): (sigma: number) => number {
  let spare: number | null = null;
  return (sigma) => {
    if (spare !== null) {
      const value = spare;
      spare = null;
      return value * sigma;
    }
    // 1 − u est dans ]0, 1] : le logarithme reste fini.
    const radius = Math.sqrt(-2 * Math.log(1 - random()));
    const angle = 2 * Math.PI * random();
    spare = radius * Math.sin(angle);
    return radius * Math.cos(angle) * sigma;
  };
}

/** Rayon tiré d'une loi exponentielle d'échelle `scale`, restreinte à [inner, outer[ (inversion de sa fonction de répartition). */
function truncatedExponential(random: () => number, scale: number, inner: number, outer: number): number {
  const atInner = Math.exp(-inner / scale);
  const atOuter = Math.exp(-outer / scale);
  return -scale * Math.log(atInner - random() * (atInner - atOuter));
}

type Component = { kind: "bulge" } | { kind: "arm"; arm: ArmSpec } | { kind: "disk" };

/** Effectif de chaque composant : arrondi(part × count), le dernier (le disque) prend le reste. */
function componentCounts(count: number): readonly { component: Component; count: number }[] {
  const parts: readonly { component: Component; share: number }[] = [
    { component: { kind: "bulge" }, share: MILKY_WAY.bulgeShare },
    ...ARMS.map((arm) => ({ component: { kind: "arm", arm } as const, share: arm.share })),
    { component: { kind: "disk" }, share: MILKY_WAY.diskShare },
  ];
  let left = count;
  return parts.map(({ component, share }, index) => {
    const own = index === parts.length - 1 ? left : Math.min(left, Math.round(share * count));
    left -= own;
    return { component, count: own };
  });
}

/**
 * Nuage de la Voie lactée : `count` points (bulbe barré, cinq bras, disque), déterministe pour une graine
 * donnée. Positions héliocentriques en années-lumière, dans les axes de scène ; l'éclat de chaque point est
 * multiplié par 40 000 / count, pour que la lumière totale ne dépende pas du budget de points.
 */
export function milkyWayCloud(count: number, seed: number): PointCloud {
  const random = seededRandom(seed);
  const gauss = gaussianSampler(random);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const glow = REFERENCE_POINT_COUNT / count;
  const inScene: Vec3 = { x: 0, y: 0, z: 0 };
  /** Couleur linéaire de chaque population pour ce nombre de points (éclat affiché × glow, borné à 1). */
  const linearColors = new Map<Population, Rgb>();
  const linearColorOf = (population: Population): Rgb => {
    let color = linearColors.get(population);
    if (!color) {
      const [red, green, blue] = population.display.map((value) => srgbToLinear(Math.min(1, value * glow)));
      color = [red, green, blue];
      linearColors.set(population, color);
    }
    return color;
  };
  let index = 0;

  /** Range un point galactocentrique (al) dans la scène, vu du Soleil, avec la teinte et une taille de sa population. */
  const emit = (x: number, y: number, z: number, population: Population) => {
    sceneFromGalacticXYZ(x + MILKY_WAY.sunRadiusLy, y, z, inScene);
    const i3 = index * 3;
    positions[i3] = inScene.x;
    positions[i3 + 1] = inScene.y;
    positions[i3 + 2] = inScene.z;
    const color = linearColorOf(population);
    colors[i3] = color[0];
    colors[i3 + 1] = color[1];
    colors[i3 + 2] = color[2];
    sizes[index] = population.minSize + random() * (population.maxSize - population.minSize);
    index += 1;
  };

  // La barre pointe son bout proche vers les longitudes positives : 180° − 27° = 153° d'azimut.
  const barAxis = (180 - MILKY_WAY.barAngleDeg) * DEG;
  const barCos = Math.cos(barAxis);
  const barSin = Math.sin(barAxis);

  const emitBulge = (n: number) => {
    const barCount = Math.round(BAR_SHARE_OF_BULGE * n);
    for (let i = 0; i < n; i++) {
      if (i < barCount) {
        let along = gauss(BAR_SIGMA_LY.along);
        while (Math.abs(along) > MILKY_WAY.barHalfLengthLy) along = gauss(BAR_SIGMA_LY.along);
        const across = gauss(BAR_SIGMA_LY.across);
        const z = gauss(BAR_SIGMA_LY.height);
        emit(along * barCos - across * barSin, along * barSin + across * barCos, z, BULGE_STARS);
      } else {
        const x = gauss(SPHEROID_SIGMA_LY.plane);
        const y = gauss(SPHEROID_SIGMA_LY.plane);
        emit(x, y, gauss(SPHEROID_SIGMA_LY.height), BULGE_STARS);
      }
    }
  };

  const majorPopulation = (): Population => {
    let draw = random();
    for (const { share, population } of MAJOR_ARM_STARS) {
      if (draw < share) return population;
      draw -= share;
    }
    return MAJOR_ARM_STARS[0].population;
  };

  const emitArm = (arm: ArmSpec, n: number) => {
    for (let i = 0; i < n; i++) {
      const radius = truncatedExponential(random, ARM_SCALE_LENGTH_LY, arm.innerRadiusLy, arm.outerRadiusLy);
      const azimuth = armAzimuthDeg(arm, radius) * DEG;
      const cos = Math.cos(azimuth);
      const sin = Math.sin(azimuth);
      // Écart au centre du bras : radial (largeur), tangentiel (deux fois plus serré), vertical.
      const radial = radius + gauss(arm.widthLy);
      const tangential = gauss(arm.widthLy / 2);
      const z = gauss(ARM_HEIGHT_SIGMA_LY);
      emit(radial * cos - tangential * sin, radial * sin + tangential * cos, z, arm.major ? majorPopulation() : MINOR_ARM_STARS);
    }
  };

  const emitDisk = (n: number) => {
    for (let i = 0; i < n; i++) {
      const radius = truncatedExponential(random, MILKY_WAY.diskScaleLengthLy, DISK_INNER_RADIUS_LY, MILKY_WAY.diskRadiusLy);
      const azimuth = 2 * Math.PI * random();
      emit(radius * Math.cos(azimuth), radius * Math.sin(azimuth), gauss(DISK_HEIGHT_SIGMA_LY), DISK_STARS);
    }
  };

  for (const { component, count: n } of componentCounts(count)) {
    if (component.kind === "bulge") emitBulge(n);
    else if (component.kind === "arm") emitArm(component.arm, n);
    else emitDisk(n);
  }
  return { count, positions, colors, sizes };
}
