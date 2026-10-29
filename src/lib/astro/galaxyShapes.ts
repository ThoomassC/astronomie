import type { Vec3 } from "./constants";
import { diskFrame, galaxyRadiusKly, type DiskFrame, type LocalGroupGalaxy, type LocalGroupGalaxyKey } from "./localGroup";
import { gaussianSampler, seededRandom, srgbToLinear, truncatedExponential, type PointCloud } from "./milkyWay";

/**
 * Galaxies du Groupe local en points, procédurales et déterministes : spirale (bulbe, deux bras, disque),
 * irrégulière (amas d'étoiles, barre décentrée pour les barrées) ou elliptique (sphéroïde aplati). Ce sont des
 * silhouettes à l'échelle, pas des cartes : seules la taille, l'orientation et l'ellipticité viennent des données.
 *
 * Mêmes tableaux que milkyWayCloud, mais les positions sont en milliers d'années-lumière (kly), relatives au
 * centre de la galaxie, dans les axes de scène : le moteur pose chaque nuage à son centre (galaxyCenterKly).
 * Tous les points tiennent dans GALAXY_EXTENT_RATIO × le rayon : la sphère englobante se pose sans calcul.
 * La composante de chaque point (bulbe, bras, disque, barre, amas) est tirée au sort, point par point : les
 * points viennent dans un ordre aléatoire, et tout début du nuage en est un échantillon fidèle. Le moteur peut
 * ainsi n'en dessiner qu'une partie quand la galaxie est petite à l'écran (setDrawRange).
 *
 * Éclat : chaque population a une teinte affichée (sRGB, de 0 à 1) ; `glow` la multiplie, borne le produit à 1
 * et le ramène en linéaire, comme pour la Voie lactée. Le moteur donne à chaque galaxie une part du budget
 * proportionnelle à sa luminosité et un même `glow` à toutes (budget de référence / budget) : la lumière d'une
 * galaxie suit sa luminosité, quel que soit l'appareil.
 */

/** Tous les points tiennent dans ce multiple du rayon de la galaxie (les tirages au-delà sont refaits). */
export const GALAXY_EXTENT_RATIO = 1.25;

/** Graine de base des galaxies du Groupe local ; chacune en dérive la sienne de sa clé (galaxySeed). */
export const LOCAL_GROUP_SEED = 20_261_101;

type Rgb = readonly [red: number, green: number, blue: number];

/** Population d'étoiles : teinte affichée d'un point seul (sRGB, à glow = 1) et taille tirée entre deux bornes (px CSS). */
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

/** Bulbes, barres et elliptiques : vieilles étoiles jaune orangé. */
const OLD_STARS: Population = { display: shade(1, 0.76, 0.46, 0.09), minSize: 1, maxSize: 1.6 };
/** Bras : jeunes étoiles bleues (85 %), régions HII rose-rouge (6 %), étoiles plus vieilles, jaune pâle (9 %). */
const ARM_STARS: readonly { share: number; population: Population }[] = [
  { share: 0.85, population: { display: shade(0.52, 0.66, 1, 0.12), minSize: 1, maxSize: 1.8 } },
  { share: 0.06, population: { display: shade(1, 0.3, 0.42, 0.16), minSize: 1.6, maxSize: 2 } },
  { share: 0.09, population: { display: shade(1, 0.86, 0.66, 0.08), minSize: 1, maxSize: 1.6 } },
];
/** Disque entre les bras : lueur diffuse, chaude et faible. */
const DISK_STARS: Population = { display: shade(1, 0.8, 0.58, 0.05), minSize: 1, maxSize: 1.6 };
/** Irrégulières : étoiles jeunes, bleu-blanc (90 %), et régions HII (10 %), nombreuses dans ces galaxies. */
const IRREGULAR_STARS: readonly { share: number; population: Population }[] = [
  { share: 0.9, population: { display: shade(0.62, 0.74, 1, 0.12), minSize: 1, maxSize: 1.8 } },
  { share: 0.1, population: { display: shade(1, 0.36, 0.5, 0.16), minSize: 1.6, maxSize: 2.2 } },
];

/** Spirales : parts du bulbe et des deux bras, le disque prend le reste. */
const SPIRAL = {
  bulgeShare: 0.2,
  armShare: 0.42,
  /** Écarts types du bulbe (gaussien), en rayons de la galaxie : dans le plan, sur la normale. */
  bulgeSigma: { plane: 0.07, normal: 0.05 },
  /** Angle d'enroulement des bras, en degrés. */
  pitchDeg: 16,
  /** Bras tracés de ce rayon au bord, loi exponentielle d'échelle armScale (en rayons de la galaxie). */
  armInner: 0.12,
  armScale: 0.3,
  /** Écart type de la largeur des bras (en travers ; deux fois moins le long), en rayons de la galaxie. */
  armWidth: 0.045,
  /** Disque : loi exponentielle d'échelle diskScale entre diskInner et diskOuter, en rayons de la galaxie. */
  diskScale: 0.25,
  diskInner: 0.03,
  diskOuter: 1.05,
  /** Écart type de la hauteur des bras et du disque au-dessus du plan, en rayons de la galaxie. */
  height: 0.02,
} as const;

/** Irrégulières : nombre d'amas, dispersion de leurs centres et bornes de leur taille, en rayons de la galaxie. */
const IRREGULAR = {
  clumps: 5,
  clumpSpread: 0.28,
  clumpSigma: { min: 0.14, max: 0.28 },
  /** Barrées : part des points dans la barre, décalage de son centre et écarts types (long, travers), en rayons. */
  barShare: 0.3,
  barOffset: 0.2,
  barSigma: { along: 0.25, across: 0.07 },
  /** Aplatissement sur la normale d'un disque irrégulier incliné (Grand Nuage de Magellan). */
  diskFlattening: 0.35,
} as const;

/** Elliptiques : rayon caractéristique du profil de Plummer, en rayons de la galaxie (91 % de sa masse à moins d'un rayon). */
const PLUMMER_SCALE = 0.25;

/** Essais d'un tirage avant de ramener le point au bord de la sphère englobante. */
const MAX_DRAWS = 16;
const DEG = Math.PI / 180;

/**
 * Graine propre à une galaxie : LOCAL_GROUP_SEED mêlée au hachage FNV-1a 32 bits de sa clé. Le même nuage à
 * chaque visite, indépendant de l'ordre de la liste.
 */
export function galaxySeed(key: LocalGroupGalaxyKey): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) hash = Math.imul(hash ^ key.charCodeAt(i), 0x01000193);
  return (LOCAL_GROUP_SEED ^ hash) >>> 0;
}

/**
 * Tampon d'écriture commun aux trois formes : chaque point est donné dans le repère de la galaxie (le long du
 * grand axe, du second axe et de la normale, en kly), rangé dans les axes de scène, tenu dans la sphère
 * englobante, coloré selon sa population.
 */
function cloudWriter(count: number, frame: DiskFrame, limit: number, glow: number, random: () => number) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const linearColors = new Map<Population, Rgb>();
  const { major, minor, normal } = frame;
  let index = 0;

  /** Couleur linéaire d'une population pour ce glow (éclat affiché × glow, borné à 1). */
  const linearColorOf = (population: Population): Rgb => {
    let color = linearColors.get(population);
    if (!color) {
      const [red, green, blue] = population.display.map((value) => srgbToLinear(Math.min(1, value * glow)));
      color = [red, green, blue];
      linearColors.set(population, color);
    }
    return color;
  };

  return {
    /**
     * Range un point tiré par `draw` (repère de la galaxie, kly), retiré tant qu'il sort de la sphère englobante ;
     * après MAX_DRAWS essais, le dernier est ramené sur son bord.
     */
    emit(draw: () => Vec3, population: Population): void {
      let local = draw();
      for (let attempt = 1; Math.hypot(local.x, local.y, local.z) > limit && attempt < MAX_DRAWS; attempt++) local = draw();
      const length = Math.hypot(local.x, local.y, local.z);
      const k = length > limit ? limit / length : 1;
      const i3 = index * 3;
      positions[i3] = k * (local.x * major.x + local.y * minor.x + local.z * normal.x);
      positions[i3 + 1] = k * (local.x * major.y + local.y * minor.y + local.z * normal.y);
      positions[i3 + 2] = k * (local.x * major.z + local.y * minor.z + local.z * normal.z);
      const color = linearColorOf(population);
      colors[i3] = color[0];
      colors[i3 + 1] = color[1];
      colors[i3 + 2] = color[2];
      sizes[index] = population.minSize + random() * (population.maxSize - population.minSize);
      index += 1;
    },
    cloud: (): PointCloud => ({ count, positions, colors, sizes }),
  };
}

/** Population tirée au sort selon les parts d'un mélange. */
function pick(random: () => number, mix: readonly { share: number; population: Population }[]): Population {
  let draw = random();
  for (const { share, population } of mix) {
    if (draw < share) return population;
    draw -= share;
  }
  return mix[0].population;
}

/**
 * Spirale : bulbe gaussien (20 % des points en moyenne), deux bras log-spiraux opposés (42 %) qui partent de
 * 0,12 rayon, disque exponentiel (le reste), tous très minces (hauteur 0,02 rayon). Le disque est orienté par
 * diskFrame : inclinaison et angle de position publiés. Le départ des bras est tiré de la graine.
 */
export function spiralGalaxyCloud(galaxy: LocalGroupGalaxy, count: number, seed: number, glow = 1): PointCloud {
  const random = seededRandom(seed);
  const gauss = gaussianSampler(random);
  const radius = galaxyRadiusKly(galaxy);
  const writer = cloudWriter(count, diskFrame(galaxy), GALAXY_EXTENT_RATIO * radius, glow, random);
  const armStart = 2 * Math.PI * random();
  const winding = 1 / Math.tan(SPIRAL.pitchDeg * DEG);
  const height = SPIRAL.height * radius;

  for (let i = 0; i < count; i++) {
    const component = random();
    if (component < SPIRAL.bulgeShare) {
      writer.emit(
        () => ({
          x: gauss(SPIRAL.bulgeSigma.plane * radius),
          y: gauss(SPIRAL.bulgeSigma.plane * radius),
          z: gauss(SPIRAL.bulgeSigma.normal * radius),
        }),
        OLD_STARS,
      );
    } else if (component < SPIRAL.bulgeShare + SPIRAL.armShare) {
      // L'un ou l'autre bras ; écart au centre du bras : radial, tangentiel (deux fois plus serré), vertical.
      const arm = random() < 0.5 ? 0 : 1;
      writer.emit(() => {
        const r = truncatedExponential(random, SPIRAL.armScale * radius, SPIRAL.armInner * radius, radius);
        const azimuth = armStart + arm * Math.PI + winding * Math.log(r / (SPIRAL.armInner * radius));
        const radial = r + gauss(SPIRAL.armWidth * radius);
        const tangential = gauss((SPIRAL.armWidth / 2) * radius);
        const cos = Math.cos(azimuth);
        const sin = Math.sin(azimuth);
        return { x: radial * cos - tangential * sin, y: radial * sin + tangential * cos, z: gauss(height) };
      }, pick(random, ARM_STARS));
    } else {
      writer.emit(() => {
        const r = truncatedExponential(random, SPIRAL.diskScale * radius, SPIRAL.diskInner * radius, SPIRAL.diskOuter * radius);
        const azimuth = 2 * Math.PI * random();
        return { x: r * Math.cos(azimuth), y: r * Math.sin(azimuth), z: gauss(height) };
      }, DISK_STARS);
    }
  }
  return writer.cloud();
}

/**
 * Repère et aplatissement d'une galaxie sans bras : un disque incliné publié garde son repère (aplati à 0,35) ;
 * sinon, une ellipticité publiée fait tourner le repère par la tranche (normale sur le ciel, perpendiculaire au
 * grand axe) et aplatit d'autant (1 − e) : vue du Soleil, la galaxie a l'ellipticité observée. Sans l'un ni
 * l'autre, un amas sans aplatissement.
 */
function bodyShape(galaxy: LocalGroupGalaxy, diskFlattening: number): { frame: DiskFrame; flattening: number } {
  if (galaxy.inclinationDeg !== undefined) return { frame: diskFrame(galaxy), flattening: diskFlattening };
  if (galaxy.ellipticity !== undefined) {
    return { frame: diskFrame({ ...galaxy, inclinationDeg: 90 }), flattening: 1 - galaxy.ellipticity };
  }
  return { frame: diskFrame(galaxy), flattening: 1 };
}

/**
 * Irrégulière : cinq amas gaussiens de tailles et de poids tirés au sort, recentrés pour que leur barycentre
 * pondéré tombe au centre. Barrée (types SB et IB) : 30 % des points en moyenne dans une barre allongée,
 * décentrée de 0,2 rayon, comme celle du Grand Nuage de Magellan. Aplatissement selon bodyShape.
 */
export function irregularGalaxyCloud(galaxy: LocalGroupGalaxy, count: number, seed: number, glow = 1): PointCloud {
  const random = seededRandom(seed);
  const gauss = gaussianSampler(random);
  const radius = galaxyRadiusKly(galaxy);
  const { frame, flattening } = bodyShape(galaxy, IRREGULAR.diskFlattening);
  const writer = cloudWriter(count, frame, GALAXY_EXTENT_RATIO * radius, glow, random);

  const clumps = Array.from({ length: IRREGULAR.clumps }, () => ({
    x: gauss(IRREGULAR.clumpSpread * radius),
    y: gauss(IRREGULAR.clumpSpread * radius),
    sigma: (IRREGULAR.clumpSigma.min + random() * (IRREGULAR.clumpSigma.max - IRREGULAR.clumpSigma.min)) * radius,
    weight: 0.6 + 0.8 * random(),
  }));
  const totalWeight = clumps.reduce((sum, clump) => sum + clump.weight, 0);
  const meanX = clumps.reduce((sum, clump) => sum + clump.weight * clump.x, 0) / totalWeight;
  const meanY = clumps.reduce((sum, clump) => sum + clump.weight * clump.y, 0) / totalWeight;
  for (const clump of clumps) {
    clump.x -= meanX;
    clump.y -= meanY;
  }
  const pickClump = () => {
    let draw = random() * totalWeight;
    for (const clump of clumps) {
      if (draw < clump.weight) return clump;
      draw -= clump.weight;
    }
    return clumps[clumps.length - 1];
  };

  const barShare = galaxy.barred ? IRREGULAR.barShare : 0;
  const barAngle = 2 * Math.PI * random();
  const barCos = Math.cos(barAngle);
  const barSin = Math.sin(barAngle);
  const offsetAngle = 2 * Math.PI * random();
  const barX = IRREGULAR.barOffset * radius * Math.cos(offsetAngle);
  const barY = IRREGULAR.barOffset * radius * Math.sin(offsetAngle);

  for (let i = 0; i < count; i++) {
    if (random() < barShare) {
      writer.emit(() => {
        const along = gauss(IRREGULAR.barSigma.along * radius);
        const across = gauss(IRREGULAR.barSigma.across * radius);
        return {
          x: barX + along * barCos - across * barSin,
          y: barY + along * barSin + across * barCos,
          z: gauss(IRREGULAR.barSigma.across * radius * flattening),
        };
      }, OLD_STARS);
    } else {
      const clump = pickClump();
      writer.emit(
        () => ({ x: clump.x + gauss(clump.sigma), y: clump.y + gauss(clump.sigma), z: gauss(clump.sigma * flattening) }),
        pick(random, IRREGULAR_STARS),
      );
    }
  }
  return writer.cloud();
}

/**
 * Elliptique ou sphéroïdale naine : profil de Plummer de rayon caractéristique 0,25 rayon (tiré par inversion de
 * sa masse cumulée, coupé à la sphère englobante), direction uniforme, puis aplati selon bodyShape : vue du
 * Soleil, elle a l'ellipticité publiée, son grand axe à l'angle de position. Vieilles étoiles jaune orangé.
 */
export function ellipticalGalaxyCloud(galaxy: LocalGroupGalaxy, count: number, seed: number, glow = 1): PointCloud {
  const random = seededRandom(seed);
  const radius = galaxyRadiusKly(galaxy);
  const { frame, flattening } = bodyShape(galaxy, 1);
  const limit = GALAXY_EXTENT_RATIO * radius;
  const writer = cloudWriter(count, frame, limit, glow, random);
  const scale = PLUMMER_SCALE * radius;
  /** Part de la masse de Plummer à moins de `limit` : M(r) = r³ / (r² + a²)^(3/2). */
  const enclosed = limit ** 3 / (limit ** 2 + scale ** 2) ** 1.5;

  for (let i = 0; i < count; i++) {
    writer.emit(() => {
      // M(r) = u ⇔ r = a / √(u^(−2/3) − 1) ; u dans ]0, M(limit)] : le rayon reste fini et sous la limite.
      const u = (1 - random()) * enclosed;
      const r = scale / Math.sqrt(u ** (-2 / 3) - 1);
      const cosPolar = 2 * random() - 1;
      const sinPolar = Math.sqrt(1 - cosPolar * cosPolar);
      const azimuth = 2 * Math.PI * random();
      return { x: r * sinPolar * Math.cos(azimuth), y: r * sinPolar * Math.sin(azimuth), z: r * cosPolar * flattening };
    }, OLD_STARS);
  }
  return writer.cloud();
}

/** Nuage d'une galaxie selon sa forme (spiralGalaxyCloud, irregularGalaxyCloud ou ellipticalGalaxyCloud). */
export function galaxyCloud(galaxy: LocalGroupGalaxy, count: number, seed: number, glow = 1): PointCloud {
  switch (galaxy.shape) {
    case "spiral":
      return spiralGalaxyCloud(galaxy, count, seed, glow);
    case "irregular":
      return irregularGalaxyCloud(galaxy, count, seed, glow);
    case "elliptical":
      return ellipticalGalaxyCloud(galaxy, count, seed, glow);
  }
}
