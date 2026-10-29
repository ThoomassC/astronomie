/**
 * Étoiles voisines du Soleil, placées en 3D à l'escale « Les étoiles voisines ».
 * Coordonnées ICRS J2000 (SIMBAD) ; distances tirées des parallaxes citées pour chaque étoile,
 * d (al) = 3 261,564 / ϖ (mas). Les mouvements propres depuis 2000 (Barnard : 0,075°) sont négligés.
 */
export interface NearbyStar {
  /** Identifiant stable, ASCII en kebab-case (« proxima-centauri ») : clé React et des étiquettes. */
  key: string;
  /** Nom affiché, en français (« Proxima du Centaure », « Alpha du Centaure A et B »). */
  name: string;
  /** Ascension droite J2000, en degrés décimaux dans [0, 360[. */
  raDeg: number;
  /** Déclinaison J2000, en degrés décimaux dans [−90, 90]. */
  decDeg: number;
  /** Distance au Soleil, en années-lumière, dans ]4, 20]. */
  distanceLy: number;
  /** Type spectral (« M5.5Ve », « A1V ») ; la première lettre (O, B, A, F, G, K, M) fixe la couleur. */
  spectralType: string;
  /** Magnitude apparente visuelle V (Sirius : −1,46). */
  apparentMag: number;
  /** Précision affichée dans la liste de la plaque (« système triple avec Proxima »), facultative. */
  note?: string;
}

/**
 * Tous les systèmes stellaires connus à moins de 12 années-lumière, plus Altaïr, repère brillant
 * du ciel d'été, triés par distance croissante (c'est aussi la priorité des étiquettes).
 * Une entrée par point affiché : un couple serré n'en fait qu'une, avec le type de la composante
 * la plus brillante, et la magnitude combinée quand elle est publiée (Alpha du Centaure).
 * Les naines brunes (Luhman 16 à 6,5 al, WISE 0855−0714 à 7,4 al) ne sont pas des étoiles : absentes.
 */
export const NEARBY_STARS: readonly NearbyStar[] = [
  // Gaia DR3, ϖ = 768,0665 mas.
  { key: "proxima-centauri", name: "Proxima du Centaure", raDeg: 217.4289, decDeg: -62.6795, distanceLy: 4.2465, spectralType: "M5.5Ve", apparentMag: 11.13, note: "la plus proche, liée à Alpha du Centaure A et B" },
  // Akeson et al. 2021 (orbite ALMA), ϖ = 750,81 mas ; V combinée de A (0,01) et B (1,33).
  { key: "alpha-centauri", name: "Alpha du Centaure A et B", raDeg: 219.9021, decDeg: -60.834, distanceLy: 4.3441, spectralType: "G2V", apparentMag: -0.27, note: "deux étoiles proches du Soleil par la taille" },
  // Gaia DR3, ϖ = 546,9759 mas.
  { key: "barnard", name: "Étoile de Barnard", raDeg: 269.4521, decDeg: 4.6934, distanceLy: 5.9629, spectralType: "M4V", apparentMag: 9.51, note: "l'étoile qui se déplace le plus vite dans notre ciel" },
  // Gaia DR3, ϖ = 415,1794 mas.
  { key: "wolf-359", name: "Wolf 359", raDeg: 164.1205, decDeg: 7.0147, distanceLy: 7.8558, spectralType: "M6V", apparentMag: 13.51 },
  // Gaia DR3, ϖ = 392,7529 mas.
  { key: "lalande-21185", name: "Lalande 21185", raDeg: 165.8341, decDeg: 35.9699, distanceLy: 8.3044, spectralType: "M2V", apparentMag: 7.52 },
  // Bond et al. 2017 (HST), ϖ = 378,9 mas.
  { key: "sirius", name: "Sirius", raDeg: 101.2872, decDeg: -16.7161, distanceLy: 8.608, spectralType: "A1V", apparentMag: -1.46, note: "la plus brillante de notre ciel nocturne, avec la naine blanche Sirius B" },
  // Kervella et al. 2022, ϖ = 371,92 mas (moyenne des deux composantes).
  { key: "luyten-726-8", name: "Luyten 726-8", raDeg: 24.7557, decDeg: -17.9507, distanceLy: 8.7695, spectralType: "M5.5V", apparentMag: 12.61, note: "deux naines rouges, BL Ceti et UV Ceti" },
  // Gaia DR3, ϖ = 336,0266 mas.
  { key: "ross-154", name: "Ross 154", raDeg: 282.4557, decDeg: -23.8362, distanceLy: 9.7063, spectralType: "M3.5Ve", apparentMag: 10.43 },
  // Gaia DR3, ϖ = 316,4812 mas.
  { key: "ross-248", name: "Ross 248", raDeg: 355.4793, decDeg: 44.1774, distanceLy: 10.3057, spectralType: "M5.5V", apparentMag: 12.29 },
  // Benedict et al. 2006 (HST), ϖ = 311,37 mas.
  { key: "epsilon-eridani", name: "Epsilon Eridani", raDeg: 53.2327, decDeg: -9.4583, distanceLy: 10.4749, spectralType: "K2V", apparentMag: 3.73 },
  // Gaia DR3, ϖ = 304,1354 mas.
  { key: "lacaille-9352", name: "Lacaille 9352", raDeg: 346.4668, decDeg: -35.8531, distanceLy: 10.7241, spectralType: "M0.5V", apparentMag: 7.39 },
  // Gaia DR3, ϖ = 296,3053 mas.
  { key: "ross-128", name: "Ross 128", raDeg: 176.935, decDeg: 0.8046, distanceLy: 11.0074, spectralType: "M4V", apparentMag: 11.15 },
  // Gaia DR3 (A), ϖ = 285,9949 mas.
  { key: "61-cygni", name: "61 du Cygne", raDeg: 316.7247, decDeg: 38.7494, distanceLy: 11.4043, spectralType: "K5V", apparentMag: 5.21, note: "étoile double" },
  // Hipparcos (van Leeuwen 2007), ϖ = 284,56 mas.
  { key: "procyon", name: "Procyon", raDeg: 114.8255, decDeg: 5.225, distanceLy: 11.4618, spectralType: "F5IV-V", apparentMag: 0.37, note: "avec la naine blanche Procyon B" },
  // Gaia DR3 (A), ϖ = 283,8401 mas.
  { key: "struve-2398", name: "Struve 2398", raDeg: 280.6946, decDeg: 59.6304, distanceLy: 11.4908, spectralType: "M3V", apparentMag: 8.93, note: "étoile double" },
  // Gaia DR3 (A), ϖ = 280,7068 mas.
  { key: "groombridge-34", name: "Groombridge 34", raDeg: 4.5954, decDeg: 44.023, distanceLy: 11.6191, spectralType: "M1.5V", apparentMag: 8.14, note: "étoile double" },
  // Gaia DR3, ϖ = 274,8431 mas.
  { key: "epsilon-indi", name: "Epsilon Indi", raDeg: 330.8402, decDeg: -56.786, distanceLy: 11.867, spectralType: "K5V", apparentMag: 4.69, note: "avec deux naines brunes" },
  // Gaia DR3, ϖ = 273,8097 mas (Hipparcos donne la même distance).
  { key: "tau-ceti", name: "Tau Ceti", raDeg: 26.017, decDeg: -15.9375, distanceLy: 11.9118, spectralType: "G8V", apparentMag: 3.5 },
  // Hipparcos (van Leeuwen 2007), ϖ = 194,95 mas.
  { key: "altair", name: "Altaïr", raDeg: 297.6958, decDeg: 8.8683, distanceLy: 16.7303, spectralType: "A7V", apparentMag: 0.76, note: "étoile brillante du ciel d'été" },
];

/** Sources des valeurs, citées dans le pied de page. */
export const NEARBY_STARS_SOURCE =
  "ESA, Gaia DR3 ; SIMBAD (CDS) ; Hipparcos (van Leeuwen, 2007) ; Akeson et al. (2021) ; Bond et al. (2017) ; Benedict et al. (2006) ; Kervella et al. (2022) ; RECONS";
