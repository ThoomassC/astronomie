/**
 * L'Univers observable, escales « L'Univers observable » et « Le multivers ». La scène compte en milliards
 * d'années-lumière (Gal) : la sphère de l'Univers observable, la toile cosmique et les bulles du multivers
 * tiennent sous 450 Gal, sans perte de précision en float32.
 */

/**
 * Rayon de l'Univers observable (horizon des particules, distance comobile actuelle), en milliards
 * d'années-lumière : environ 46. Calcul de la recherche documentaire avec les paramètres de Planck 2018
 * (rayonnement et neutrinos compris) : 46,1 à 46,2 Gal ; la valeur usuelle de 46,5 Gal vient de paramètres plus
 * anciens (Planck Collaboration 2020, A&A 641, A6 ; Davis et Lineweaver 2004). Diamètre : environ 93 Gal.
 */
export const OBSERVABLE_UNIVERSE_RADIUS_GLY = 46;

/** Âge de l'Univers, en milliards d'années : 13,797 ± 0,023 (Planck Collaboration 2020, A&A 641, A6). */
export const UNIVERSE_AGE_GYR = 13.8;

/** Température actuelle du fond diffus cosmologique, en kelvins : 2,725 48 ± 0,000 57, soit −270,4 °C (Fixsen 2009, ApJ 707, 916). */
export const CMB_TEMPERATURE_K = 2.725_48;

/**
 * Âge de l'Univers quand le fond diffus a été libéré (l'Univers devient transparent), en années : environ
 * 380 000 (ESA, Planck ; 372 000 environ avec les paramètres de Planck 2018).
 */
export const CMB_AGE_YEARS = 380_000;
