import { schwarzschildRadiusSolar } from "@/lib/astro/schwarzschild";

/*
 * Trous noirs de l'onglet « Tailles », du trou noir stellaire Cygnus X-1 à celui du Fer à cheval cosmique, l'un des plus
 * gros jamais pesés. Valeurs de la fiche documentaire des trous noirs (novembre 2026) : masses publiées, mesurées
 * directement (orbites, image de l'Event Horizon Telescope, lentille et mouvement des étoiles), jamais estimées
 * d'après la lumière d'un quasar. Le rayon de l'horizon se calcule depuis la masse (schwarzschild.ts) ; l'onglet les
 * compare aux étoiles par le rayon de leur ombre (sizes/objects.ts).
 */

export type BlackHoleKey = "cygnus-x-1" | "sagittarius-a-star" | "m87-star" | "cosmic-horseshoe";

/**
 * Classe d'un trou noir selon sa masse : stellaire (quelques dizaines de M☉, né d'une étoile), supermassif (millions à
 * milliards de M☉, au centre d'une galaxie), ultramassif (au-delà de 10 milliards de M☉).
 */
export type BlackHoleClass = "stellar" | "supermassive" | "ultramassive";

export interface ComparedBlackHole {
  kind: "black-hole";
  key: BlackHoleKey;
  /** Masse retenue, en masses solaires (M☉). */
  massSolar: number;
  /** Fourchette publiée, en M☉, quand les études divergent : la plaque la donne et met en garde. */
  massRange?: readonly [low: number, high: number];
  /** Chiffres significatifs de la masse et des rayons affichés : la précision de la mesure. */
  significantDigits: 2 | 3 | 4;
  /** Rayon de l'horizon r_s = 2GM/c², en R☉ : calculé depuis la masse (schwarzschildRadiusSolar), jamais saisi. */
  radiusSolar: number;
  /** Distance à la Terre, en années-lumière ; distance comobile (actuelle) au-delà d'un décalage vers le rouge de 0,1. */
  distanceLy: number;
  /** Temps de trajet de la lumière jusqu'à nous, en années, pour les seuls trous noirs à distance cosmologique. */
  lightTravelYears?: number;
  blackHoleClass: BlackHoleClass;
  /** Couleur d'affichage (pastille, règle, menu, filet de la plaque), celle de son rendu ; 3:1 au moins sur --nuit. */
  color: string;
  /** Sources de la masse et de la distance. */
  sources: string;
}

/** Trou noir des données : son horizon est calculé ici, une fois, depuis sa masse. */
const blackHole = (data: Omit<ComparedBlackHole, "kind" | "radiusSolar">): ComparedBlackHole => ({
  kind: "black-hole",
  ...data,
  radiusSolar: schwarzschildRadiusSolar(data.massSolar),
});

/** Les quatre trous noirs comparés, par masse croissante (et donc par ombre croissante). */
export const COMPARED_BLACK_HOLES: readonly ComparedBlackHole[] = [
  // Masse dynamique et parallaxe radio : 21,2 ± 2,2 M☉ (Miller-Jones et al. 2021) ; une analyse spectrale de l'étoile
  // compagne la trouve plus légère, 12,7 à 17,8 M☉ (Ramachandran et al. 2025). Distance : 2,22 kpc ≈ 7 240 al, arrondie
  // à la précision de la parallaxe (± 0,18 kpc). Couleur : bleu-blanc d'un corps noir de plusieurs millions de kelvins.
  blackHole({
    key: "cygnus-x-1", massSolar: 21.2, massRange: [12.7, 23.4], significantDigits: 3, distanceLy: 7200,
    blackHoleClass: "stellar", color: "#a9c4ff",
    sources: "Miller-Jones et al. 2021, Ramachandran et al. 2025",
  }),
  // Orbites d'étoiles suivies par GRAVITY : 4,297 ± 0,012 (stat) ± 0,040 (sys) millions de M☉, R₀ = 8 277 pc ≈ 27 000 al
  // (GRAVITY Collaboration 2022). Couleur : l'anneau orangé, en fausses couleurs comme l'image de l'EHT (2022).
  blackHole({
    key: "sagittarius-a-star", massSolar: 4.297e6, significantDigits: 3, distanceLy: 27_000,
    blackHoleClass: "supermassive", color: "#ff9f5a",
    sources: "GRAVITY Collaboration 2022, EHT Collaboration 2022",
  }),
  // Anneau de l'EHT : 6,5 ± 0,7 milliards de M☉ à 16,8 Mpc ≈ 55 millions d'al (EHT Collaboration 2019) ; dynamique
  // stellaire : 5,37 (+0,37/−0,25) milliards (Liepold et al. 2023). Couleur : l'anneau, en fausses couleurs.
  blackHole({
    key: "m87-star", massSolar: 6.5e9, massRange: [5.37e9, 7.2e9], significantDigits: 2, distanceLy: 55e6,
    blackHoleClass: "supermassive", color: "#ffc07a",
    sources: "EHT Collaboration 2019, Liepold et al. 2023",
  }),
  // Lentille et dynamique stellaire, détection à 5σ : log M = 10,56, soit 36 milliards de M☉, 26 à 50 milliards avec les
  // incertitudes statistique et systématique (Melo-Carneiro et al. 2025). Galaxie LRG 3-757 à z = 0,44 : lumière partie
  // il y a 4,8 milliards d'années, distance comobile 5,7 milliards d'al (Planck 2018). Dormant : il n'éclaire rien.
  // Couleur : la lumière jaune orangé des vieilles étoiles de sa galaxie (≈ 4 300 K), sur laquelle se découpe son ombre.
  blackHole({
    key: "cosmic-horseshoe", massSolar: 3.6e10, massRange: [2.6e10, 5.0e10], significantDigits: 2,
    distanceLy: 5.7e9, lightTravelYears: 4.8e9, blackHoleClass: "ultramassive", color: "#ffdab3",
    sources: "Melo-Carneiro et al. 2025, Planck Collaboration 2020",
  }),
];

/** Trous noirs comparés, par clé. */
export const COMPARED_BLACK_HOLE_BY_KEY = Object.fromEntries(
  COMPARED_BLACK_HOLES.map((hole) => [hole.key, hole]),
) as Readonly<Record<BlackHoleKey, ComparedBlackHole>>;
