import type { Vec3 } from "./constants";
import { GALACTIC_CENTER_DISTANCE_LY, GALACTIC_DISK_RADIUS_LY, sceneFromEquatorial } from "./galactic";
import { LY_PER_PARSEC } from "./starMap";

/**
 * Galaxies du Groupe local, à leurs vraies places, pour l'escale « Les galaxies voisines ». Le Groupe local
 * compte plus de 100 galaxies connues, surtout des naines : celles-ci sont les plus connues ou les plus
 * faciles à voir, retenues par la recherche documentaire du 29/10/2026 (catalogue de McConnachie, version
 * de janvier 2021, et mesures de distance récentes citées pour chacune).
 *
 * Positions : ascension droite et déclinaison J2000, comme les étoiles voisines ; la direction de la scène
 * vient de sceneFromEquatorial et la distance la prolonge (galaxyCenterKly). Le groupe de la scène compte en
 * milliers d'années-lumière (kly) : moins de 3 100 kly, aucune perte de précision en float32.
 */

/** Clés des galaxies, dans l'ordre de LOCAL_GROUP (distance croissante). */
export const LOCAL_GROUP_KEYS = [
  "milky-way",
  "sagittarius-dwarf",
  "large-magellanic-cloud",
  "small-magellanic-cloud",
  "fornax-dwarf",
  "ngc-6822",
  "ic-1613",
  "andromeda",
  "m32",
  "ic-10",
  "m110",
  "triangulum",
  "wlm",
] as const;

export type LocalGroupGalaxyKey = (typeof LOCAL_GROUP_KEYS)[number];

/** Clé de galaxie du Groupe local lue hors du typage (DOM, URL). */
export function isLocalGroupGalaxyKey(value: string): value is LocalGroupGalaxyKey {
  return (LOCAL_GROUP_KEYS as readonly string[]).includes(value);
}

/** Forme dessinée : disque à bras, irrégulière (amas d'étoiles, parfois une barre), elliptique ou sphéroïdale naine. */
export type GalaxyShape = "spiral" | "irregular" | "elliptical";

export interface LocalGroupGalaxy {
  /** Identifiant stable, ASCII en kebab-case : clé des étiquettes et des noms traduits. */
  key: LocalGroupGalaxyKey;
  /** Ascension droite et déclinaison J2000 du centre, en degrés. */
  raDeg: number;
  decDeg: number;
  /** Distance au Soleil, en millions d'années-lumière (Voie lactée : distance de son centre). */
  distanceMly: number;
  /** Diamètre retenu, en années-lumière : isophote D25, ou taille apparente × distance. */
  diameterLy: number;
  shape: GalaxyShape;
  /** Disques : inclinaison sur le plan du ciel, en degrés (0 = vu de face, 90 = par la tranche). */
  inclinationDeg?: number;
  /** Angle de position du grand axe sur le ciel, compté du nord vers l'est, en degrés. */
  positionAngleDeg?: number;
  /** Elliptiques, sphéroïdales et irrégulières sans disque mesuré : ellipticité apparente 1 − b/a. */
  ellipticity?: number;
  /** Barre d'étoiles (types SB et IB), dessinée décentrée comme celle du Grand Nuage de Magellan. */
  barred?: boolean;
  /** Magnitude visuelle apparente V, non corrigée de l'extinction ; null pour la Voie lactée, vue de l'intérieur. */
  apparentMagV: number | null;
  /** Sources de la distance, de la taille et de l'orientation. */
  source: string;
}

/**
 * Le Groupe local, de la plus proche à la plus lointaine. Chaque ligne est précédée de ses sources ; les
 * diamètres « calculés » le sont par la recherche (taille apparente NED ou RC3 × distance retenue). Les
 * magnitudes V viennent de McConnachie (2012, catalogue 2021) ou du NED, telles qu'observées.
 */
export const LOCAL_GROUP: readonly LocalGroupGalaxy[] = [
  // Centre galactique (l = 0°, b = 0°) en J2000 d'après la définition des coordonnées galactiques (ESA 1997,
  // Hipparcos, vol. 1, § 1.5.3) ; distance GRAVITY 2022 (8 277 ± 9 pc) ; disque de 100 000 al (NASA, ESA).
  {
    key: "milky-way", raDeg: 266.404_99, decDeg: -28.936_17, distanceMly: GALACTIC_CENTER_DISTANCE_LY / 1e6,
    diameterLy: 2 * GALACTIC_DISK_RADIUS_LY, shape: "spiral", barred: true, apparentMagV: null,
    source: "GRAVITY Collaboration (2022) ; NASA ; ESA",
  },
  // Vasiliev et Belokurov 2020 (26,5 kpc) ; corps principal seulement (450′ × 26,5 kpc, calculé), sans le
  // courant d'étoiles arrachées qui fait le tour de la Voie lactée ; dSph, PA 102°, e 0,64, V 4,5 (McConnachie).
  {
    key: "sagittarius-dwarf", raDeg: 283.8313, decDeg: -30.5453, distanceMly: 0.086, diameterLy: 11_000,
    shape: "elliptical", positionAngleDeg: 102, ellipticity: 0.64, apparentMagV: 4.5,
    source: "Vasiliev et Belokurov (2020) ; McConnachie (2012, catalogue 2021)",
  },
  // Pietrzyński et al. 2019 (49,59 kpc, binaires à éclipses) ; D25 32 200 al ; SB(s)m ; disque incliné de
  // 26,2°, ligne des nœuds à 154,5° (van der Marel et Kallivayalil 2014) ; V 0,5 : milieu des mesures
  // publiées (0,1 à 0,9), l'objet couvrant plusieurs degrés du ciel.
  {
    key: "large-magellanic-cloud", raDeg: 80.8938, decDeg: -69.7561, distanceMly: 0.1617, diameterLy: 32_200,
    shape: "irregular", inclinationDeg: 26.2, positionAngleDeg: 154.5, barred: true, apparentMagV: 0.5,
    source: "Pietrzyński et al. (2019) ; van der Marel et Kallivayalil (2014) ; McConnachie (2012, catalogue 2021)",
  },
  // Graczyk et al. 2020 (62,44 kpc) ; D25 18 900 al ; allongé le long de la ligne de visée (≈ 7 kpc de
  // profondeur), sans orientation de disque publiée ; V 2,7.
  {
    key: "small-magellanic-cloud", raDeg: 13.1867, decDeg: -72.8286, distanceMly: 0.2037, diameterLy: 18_900,
    shape: "irregular", apparentMagV: 2.7,
    source: "Graczyk et al. (2020) ; McConnachie (2012, catalogue 2021)",
  },
  // McConnachie (143 à 147 kpc) ; 2 × rayon de demi-lumière (18,4′) × 147 kpc, calculé ; dSph (dE0),
  // PA 46°, e 0,28, V 9,3.
  {
    key: "fornax-dwarf", raDeg: 39.9971, decDeg: -34.4492, distanceMly: 0.47, diameterLy: 5000,
    shape: "elliptical", positionAngleDeg: 46, ellipticity: 0.28, apparentMagV: 9.3,
    source: "McConnachie (2012, catalogue 2021)",
  },
  // Galaxie de Barnard. McConnachie (459 ± 17 kpc) ; 15,5′ × 459 kpc, calculé ; IB(s)m, PA 150°, e 0,24, V 9,3.
  {
    key: "ngc-6822", raDeg: 296.2358, decDeg: -14.7892, distanceMly: 1.5, diameterLy: 7000,
    shape: "irregular", positionAngleDeg: 150, ellipticity: 0.24, barred: true, apparentMagV: 9.3,
    source: "McConnachie (2012, catalogue 2021)",
  },
  // McConnachie (730 à 755 kpc) ; 16,2′ × 755 kpc, calculé ; IB(s)m, PA 50°, e 0,11, V 9,9.
  {
    key: "ic-1613", raDeg: 16.1992, decDeg: 2.1178, distanceMly: 2.4, diameterLy: 11_000,
    shape: "irregular", positionAngleDeg: 50, ellipticity: 0.11, barred: true, apparentMagV: 9.9,
    source: "McConnachie (2012, catalogue 2021)",
  },
  // Li et al. 2021 (761 ± 11 kpc, céphéides du HST) ; position NED ; D25 152 000 al (le disque d'étoiles va
  // au-delà) ; SA(s)b ; inclinaison 77°, PA 38° (Chemin, Carignan et Foster 2009) ; V 3,44.
  {
    key: "andromeda", raDeg: 10.6846, decDeg: 41.2692, distanceMly: 2.48, diameterLy: 152_000,
    shape: "spiral", inclinationDeg: 77, positionAngleDeg: 38, apparentMagV: 3.44,
    source: "Li et al. (2021) ; Chemin, Carignan et Foster (2009) ; NED",
  },
  // Satellite d'Andromède, 2,46 à 2,63 Mal (fluctuations de brillance de surface, sommet de la branche des
  // géantes rouges) ; 8,7′ × 763 kpc, calculé ; cE2, PA 159°, e 0,25, V 8,1.
  {
    key: "m32", raDeg: 10.6742, decDeg: 40.8653, distanceMly: 2.5, diameterLy: 6500,
    shape: "elliptical", positionAngleDeg: 159, ellipticity: 0.25, apparentMagV: 8.1,
    source: "McConnachie (2012, catalogue 2021) ; NED",
  },
  // McConnachie (794 ± 45 kpc ; 750 ± 150 kpc ailleurs) ; 6,8′ × 750 kpc, calculé ; irrégulière à sursaut de
  // formation d'étoiles, e 0,19, sans angle de position publié ; V ≈ 10,4, très rougie par la poussière de la
  // Voie lactée (sa luminosité est donc sous-estimée).
  {
    key: "ic-10", raDeg: 5.0721, decDeg: 59.3039, distanceMly: 2.5, diameterLy: 5000,
    shape: "irregular", ellipticity: 0.19, apparentMagV: 10.4,
    source: "McConnachie (2012, catalogue 2021)",
  },
  // McConnachie (824 ± 27 kpc) ; 21,9′ × 824 kpc, calculé ; E5 pec, PA 28°, e 0,43, V 8,5.
  {
    key: "m110", raDeg: 10.0921, decDeg: 41.6853, distanceMly: 2.69, diameterLy: 17_000,
    shape: "elliptical", positionAngleDeg: 28, ellipticity: 0.43, apparentMagV: 8.5,
    source: "McConnachie (2012, catalogue 2021)",
  },
  // Breuval et al. 2023 (840 ± 11 kpc, céphéides du HST) ; position SIMBAD ; D25 61 100 al ; SA(s)cd ;
  // inclinaison 54°, PA 22° (Corbelli et al. 2014, Kam et al. 2017) ; V 5,72.
  {
    key: "triangulum", raDeg: 23.4584, decDeg: 30.6602, distanceMly: 2.74, diameterLy: 61_100,
    shape: "spiral", inclinationDeg: 54, positionAngleDeg: 22, apparentMagV: 5.72,
    source: "Breuval et al. (2023) ; Corbelli et al. (2014) ; SIMBAD",
  },
  // Wolf-Lundmark-Melotte, aux confins du Groupe local. McConnachie (933 à 989 kpc) ; 11,5′ × 933 à 989 kpc,
  // calculé ; IB(s)m, PA 179°, e 0,55, V 11,0.
  {
    key: "wlm", raDeg: 0.4925, decDeg: -15.4608, distanceMly: 3, diameterLy: 10_000,
    shape: "irregular", positionAngleDeg: 179, ellipticity: 0.55, barred: true, apparentMagV: 11,
    source: "McConnachie (2012, catalogue 2021)",
  },
];

const DEG = Math.PI / 180;
/** Pôle nord céleste, dans les axes de scène : il fixe le nord local sur le ciel (angles de position). */
const CELESTIAL_NORTH: Readonly<Vec3> = sceneFromEquatorial(0, 90);
/** Point vernal : repli du nord local pour une ligne de visée qui passerait exactement par un pôle céleste. */
const VERNAL_POINT: Readonly<Vec3> = sceneFromEquatorial(0, 0);

/** Centre de la galaxie, en milliers d'années-lumière, axes de scène : sceneFromEquatorial(α, δ) × distanceMly × 1 000. */
export function galaxyCenterKly(galaxy: LocalGroupGalaxy, out: Vec3 = { x: 0, y: 0, z: 0 }): Vec3 {
  sceneFromEquatorial(galaxy.raDeg, galaxy.decDeg, out);
  const kly = galaxy.distanceMly * 1000;
  out.x *= kly;
  out.y *= kly;
  out.z *= kly;
  return out;
}

/** Rayon de la galaxie, en milliers d'années-lumière : la moitié de son diamètre. */
export function galaxyRadiusKly(galaxy: LocalGroupGalaxy): number {
  return galaxy.diameterLy / 2000;
}

/**
 * Luminosité relative en lumière visible : 10^(−0,4 M_V), avec M_V = m − 5 log10(d / 10 pc). Seules comptent
 * les proportions entre galaxies (part des points de chacune). L'extinction n'est pas corrigée : une galaxie
 * vue à travers la poussière de la Voie lactée (IC 10) paraît moins lumineuse qu'elle n'est. null sans magnitude.
 */
export function galaxyLuminosity(galaxy: LocalGroupGalaxy): number | null {
  if (galaxy.apparentMagV === null) return null;
  const parsecs = (galaxy.distanceMly * 1e6) / LY_PER_PARSEC;
  return 10 ** (-0.4 * (galaxy.apparentMagV - 5 * Math.log10(parsecs / 10)));
}

/** Repère d'une galaxie : grand axe (posé sur le ciel), second axe du disque, normale ; orthonormé direct. */
export interface DiskFrame {
  /** Grand axe, sur le plan du ciel, à l'angle de position. */
  major: Vec3;
  /** Second axe du disque : normal × grand axe ; vu de face, il se confond avec le petit axe apparent. */
  minor: Vec3;
  /** Normale du disque. */
  normal: Vec3;
}

/**
 * Repère du disque, déduit de la ligne de visée s (du Soleil vers la galaxie), de l'inclinaison i et de
 * l'angle de position PA. Sur le ciel : nord local n (pôle nord céleste projeté perpendiculairement à s),
 * est local e = n × s (ascension droite croissante). Grand axe a = cos PA · n + sin PA · e, petit axe
 * apparent b = −sin PA · n + cos PA · e. Normale = cos i · (−s) + sin i · b : vue de face (i = 0), elle pointe
 * vers le Soleil. Le côté proche du disque n'est pas dans les données : par convention, la normale penche vers
 * PA + 90°. Sans inclinaison ni angle de position publiés, 0.
 */
export function diskFrame(galaxy: LocalGroupGalaxy): DiskFrame {
  const sight = sceneFromEquatorial(galaxy.raDeg, galaxy.decDeg);
  const north = alongSky(CELESTIAL_NORTH, sight) ?? alongSky(VERNAL_POINT, sight) ?? { x: 1, y: 0, z: 0 };
  const east = cross(north, sight);
  const angle = (galaxy.positionAngleDeg ?? 0) * DEG;
  const tilt = (galaxy.inclinationDeg ?? 0) * DEG;
  const major = combine(Math.cos(angle), north, Math.sin(angle), east);
  const apparentMinor = combine(-Math.sin(angle), north, Math.cos(angle), east);
  const normal = combine(-Math.cos(tilt), sight, Math.sin(tilt), apparentMinor);
  return { major, minor: cross(normal, major), normal };
}

/** Normale du disque, axes de scène (voir diskFrame). Écrit dans `out` s'il est fourni et le renvoie. */
export function diskNormal(galaxy: LocalGroupGalaxy, out: Vec3 = { x: 0, y: 0, z: 0 }): Vec3 {
  const { normal } = diskFrame(galaxy);
  out.x = normal.x;
  out.y = normal.y;
  out.z = normal.z;
  return out;
}

/** Composante unitaire de `v` perpendiculaire à la direction unitaire `sight` ; null si `v` lui est parallèle. */
function alongSky(v: Readonly<Vec3>, sight: Vec3): Vec3 | null {
  const along = v.x * sight.x + v.y * sight.y + v.z * sight.z;
  const x = v.x - along * sight.x;
  const y = v.y - along * sight.y;
  const z = v.z - along * sight.z;
  const length = Math.hypot(x, y, z);
  return length < 1e-9 ? null : { x: x / length, y: y / length, z: z / length };
}

const cross = (a: Vec3, b: Vec3): Vec3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });

const combine = (ka: number, a: Vec3, kb: number, b: Vec3): Vec3 => ({
  x: ka * a.x + kb * b.x,
  y: ka * a.y + kb * b.y,
  z: ka * a.z + kb * b.z,
});
