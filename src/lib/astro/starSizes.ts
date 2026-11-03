/**
 * Étoiles de l'onglet « Tailles », comparées de la plus petite à la plus grande, de la naine rouge
 * Proxima du Centaure à l'hypergéante VY Canis Majoris.
 */
export type SizeStarKey =
  | "proxima-centauri"
  | "sun"
  | "sirius-a"
  | "pollux"
  | "arcturus"
  | "aldebaran"
  | "rigel"
  | "antares-a"
  | "betelgeuse"
  | "vy-canis-majoris";

export interface ComparedStar {
  kind: "star";
  key: SizeStarKey;
  /** Rayon, en rayons solaires nominaux (UAI 2015 : 1 R☉ = 695 700 km). */
  radiusSolar: number;
  /** Fourchette publiée quand la mesure est incertaine (supergéantes variables), en R☉. */
  radiusRange?: readonly [low: number, high: number];
  /** Température effective, en kelvins. */
  temperatureK: number;
  /** Distance au Soleil, en années-lumière (0 pour le Soleil). */
  distanceLy: number;
  /** Type spectral (« M5.5Ve », « G2V ») ; la première lettre (O, B, A, F, G, K, M) donne la classe. */
  spectralType: string;
  /**
   * Couleur d'affichage (plaque, règle, menu) : celle d'un corps noir à la température effective, au pas de 100 K
   * (table de Mitchell Charity, 2001). Pâle, comme l'œil voit les étoiles : bleutée pour les chaudes, orangée pour
   * les froides.
   */
  color: string;
  /** Sources du rayon, de la température et de la distance. */
  sources: string;
}

/** Rayon solaire nominal (UAI 2015, résolution B3), en km : l'unité R☉ des rayons de ce module. */
export const SOLAR_RADIUS_KM = 695_700;

/**
 * Les dix étoiles du comparateur, triées par rayon strictement croissant (c'est l'ordre des escales).
 * Rayons tirés de diamètres angulaires mesurés (interférométrie) et de distances ; pour les supergéantes,
 * dont la « surface » est floue et la distance incertaine, la fourchette publiée accompagne la valeur retenue.
 * Distances : parallaxes (Gaia DR3, Hipparcos, masers). Températures effectives des mêmes études, sauf mention.
 */
export const COMPARED_STARS: readonly ComparedStar[] = [
  // Rayon : Boyajian et al. 2012 (interférométrie) ; publiés de 0,145 (Ségransan et al. 2003) à 0,162
  // (prépublication de 2026, non retenue). Température recoupée par la luminosité (Pineda et al. 2021). Distance : Gaia DR3.
  {
    kind: "star",
    key: "proxima-centauri", radiusSolar: 0.154, temperatureK: 2900, distanceLy: 4.2465, spectralType: "M5.5Ve", color: "#ffb662",
    sources: "Boyajian et al. 2012, Ségransan et al. 2003, Pineda et al. 2021, Gaia DR3",
  },
  // Valeurs nominales de l'UAI 2015 (résolution B3) : 695 700 km, 5 772 K. Couleur à 5 800 K.
  {
    kind: "star",
    key: "sun", radiusSolar: 1, temperatureK: 5772, distanceLy: 0, spectralType: "G2V", color: "#fff1e7",
    sources: "Prša et al. 2016, NASA NSSDCA",
  },
  // VLTI/VINCI, θ = 6,039 mas : 1,711 ± 0,013 (Kervella et al. 2003) ; 9 845 K (Davis et al. 2011). Distance : Hipparcos.
  // Couleur à 9 800 K.
  {
    kind: "star",
    key: "sirius-a", radiusSolar: 1.711, temperatureK: 9845, distanceLy: 8.6, spectralType: "A0mA1Va", color: "#d1dcff",
    sources: "Kervella et al. 2003, Davis et al. 2011, van Leeuwen 2007 (Hipparcos)",
  },
  // NPOI, θ = 8,060 mas : 8,97 ± 0,03, 4 796 K (Baines et al. 2025). Distance : Hipparcos. Couleur à 4 800 K.
  {
    kind: "star",
    key: "pollux", radiusSolar: 8.97, temperatureK: 4796, distanceLy: 33.78, spectralType: "K0III", color: "#ffe4c4",
    sources: "Baines et al. 2025, van Leeuwen 2007 (Hipparcos)",
  },
  // 25,4 ± 0,2, 4 286 K (Ramírez & Allende Prieto 2011). Distance : Hipparcos. Couleur à 4 300 K.
  {
    kind: "star",
    key: "arcturus", radiusSolar: 25.4, temperatureK: 4286, distanceLy: 36.7, spectralType: "K1.5III Fe−0.5", color: "#ffdbaf",
    sources: "Ramírez & Allende Prieto 2011, van Leeuwen 2007 (Hipparcos)",
  },
  // θ = 20,58 mas (Richichi & Roccatagliata 2005) : 45,1 ± 0,1 (Hatzes et al. 2015) ; 3 900 K (Strassmeier et al. 2018).
  // Distance : Gatewood 2008 et Hipparcos.
  {
    kind: "star",
    key: "aldebaran", radiusSolar: 45.1, temperatureK: 3900, distanceLy: 65, spectralType: "K5+III", color: "#ffd39c",
    sources: "Hatzes et al. 2015, Richichi & Roccatagliata 2005, Strassmeier et al. 2018, Gatewood 2008, van Leeuwen 2007 (Hipparcos)",
  },
  // NPOI : 74,1 (+6,1/−7,3) (Baines et al. 2018) ; 78,9 ± 7,4 (Moravveji et al. 2012). 12 100 K (Przybilla et al. 2006).
  // Distance : Hipparcos (≈ 1 170 al dans d'autres études ; à diamètre angulaire fixe, θ_LD = 2,606 mas, le rayon suit la
  // distance : 74 × 1 170 / 860 ≈ 101).
  {
    kind: "star",
    key: "rigel", radiusSolar: 74, radiusRange: [70, 79], temperatureK: 12_100, distanceLy: 860, spectralType: "B8Ia",
    color: "#c2d1ff",
    sources: "Baines et al. 2018, Moravveji et al. 2012, Przybilla et al. 2006, van Leeuwen 2007 (Hipparcos)",
  },
  // VLTI/AMBER, θ = 37,38 mas à ≈ 170 pc : 680 (Ohnaka et al. 2013) ; le rayon pulse d'environ 19 %. Couleur à 3 700 K.
  {
    kind: "star",
    key: "antares-a", radiusSolar: 680, radiusRange: [550, 850], temperatureK: 3660, distanceLy: 550, spectralType: "M1.5Iab-Ib",
    color: "#ffce92",
    sources: "Ohnaka et al. 2013",
  },
  // 764 (+116/−62) (Joyce et al. 2020) ; ≈ 1 010 avec la distance radio de Harper et al. 2017 (724 al).
  // 3 600 K (Levesque & Massey 2020).
  {
    kind: "star",
    key: "betelgeuse", radiusSolar: 764, radiusRange: [640, 1010], temperatureK: 3600, distanceLy: 548, spectralType: "M1–M2Ia–ab",
    color: "#ffcb8d",
    sources: "Joyce et al. 2020, Levesque & Massey 2020, Harper et al. 2017",
  },
  // VLTI/AMBER, θ = 11,3 mas : 1 420 ± 120, 3 490 K (Wittkowski et al. 2012). Distance : parallaxes de masers
  // (Choi et al. 2008, Zhang et al. 2012). Couleur à 3 500 K.
  {
    kind: "star",
    key: "vy-canis-majoris", radiusSolar: 1420, radiusRange: [1300, 1540], temperatureK: 3490, distanceLy: 3820, spectralType: "M3–M4.5 I",
    color: "#ffc987",
    sources: "Wittkowski et al. 2012, Zhang et al. 2012, Choi et al. 2008",
  },
];

/**
 * Étoiles du comparateur, par clé. L'accueil et la page À propos y lisent le rayon de VY Canis Majoris, la plus grande
 * étoile bien mesurée : une seule valeur pour tout le site.
 */
export const COMPARED_STAR_BY_KEY = Object.fromEntries(
  COMPARED_STARS.map((star) => [star.key, star]),
) as Readonly<Record<SizeStarKey, ComparedStar>>;
