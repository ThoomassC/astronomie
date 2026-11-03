import type { Locale } from "@/i18n/locales";
import { withUnit } from "@/i18n/units";
import type { LocalGroupGalaxyKey } from "@/lib/astro/localGroup";
import { formatCompact, formatNumber } from "@/lib/format";

/**
 * Chaînes du ciel profond, lues par les étiquettes de la scène (composant client) et par les plaques des escales
 * lointaines (serveur) : noms officiels des étoiles voisines et des galaxies (données v2, § 6), textes des repères,
 * distances et tailles. Nombres écrits par Intl, unités jointes par `withUnit`.
 */
export interface DeepSkyStrings {
  /** Noms des étoiles de la carte, par clé (NearbyStar.key) ; en français, ceux des données. */
  starNames: Readonly<Record<string, string>>;
  /** Noms des galaxies du Groupe local, Voie lactée comprise. */
  galaxyNames: Readonly<Record<LocalGroupGalaxyKey, string>>;
  /** Repères de la scène sans nom propre. */
  labels: {
    /** Sur l'ancre du Soleil, dès que la galaxie apparaît, jusqu'au multivers. */
    here: string;
    /** Centre de la Voie lactée. */
    center: string;
    web: string;
    cmb: string;
    ourUniverse: string;
    /** Autres bulles du multivers : l'hypothèse est dite dans l'étiquette même. */
    otherUniverses: string;
  };
  /** Cercle de distance : « 5 al ». */
  ring(radiusLy: number): string;
  /** Distance d'une étoile, au dixième, lue après son nom : « · 4,2 al ». */
  starDistance(distanceLy: number): string;
  /** Distance d'une galaxie, à deux chiffres significatifs : « 160 000 al », « 2,5 millions d'al ». */
  galaxyDistance(distanceMly: number): string;
  /** Diamètre d'une galaxie, tel que publié : « 152 000 al ». */
  galaxySize(diameterLy: number): string;
}

/** Années-lumière suivies de leur symbole : « 4,2 al », « 4.2 ly ». */
const lightYears = (value: number, digits: number, locale: Locale) => withUnit(formatNumber(value, digits, locale), "ly", locale);

/** Arrondi à deux chiffres significatifs : 161 700 → 160 000 ; 2 480 000 → 2 500 000. */
const twoDigits = (value: number) => Number(value.toPrecision(2));

/**
 * Distance d'une galaxie en années-lumière, deux chiffres significatifs : en chiffres sous le million, en mots
 * au-delà (Intl compact long), suivis de `millionsUnit` (« d'al », « ly », « de al »).
 */
function galaxyDistance(distanceMly: number, locale: Locale, millionsUnit: string): string {
  const ly = twoDigits(distanceMly * 1e6);
  return ly < 1e6 ? lightYears(ly, 0, locale) : `${formatCompact(ly, locale, 1)} ${millionsUnit}`;
}

export const DEEP_SKY_STRINGS: Readonly<Record<Locale, DeepSkyStrings>> = {
  fr: {
    starNames: {
      "proxima-centauri": "Proxima du Centaure",
      "alpha-centauri": "Alpha du Centaure A et B",
      barnard: "Étoile de Barnard",
      "wolf-359": "Wolf 359",
      "lalande-21185": "Lalande 21185",
      sirius: "Sirius",
      "luyten-726-8": "Luyten 726-8",
      "ross-154": "Ross 154",
      "ross-248": "Ross 248",
      "epsilon-eridani": "Epsilon Eridani",
      "lacaille-9352": "Lacaille 9352",
      "ross-128": "Ross 128",
      "61-cygni": "61 du Cygne",
      procyon: "Procyon",
      "struve-2398": "Struve 2398",
      "groombridge-34": "Groombridge 34",
      "epsilon-indi": "Epsilon Indi",
      "tau-ceti": "Tau Ceti",
      altair: "Altaïr",
    },
    galaxyNames: {
      "milky-way": "Voie lactée",
      "sagittarius-dwarf": "Galaxie naine du Sagittaire",
      "large-magellanic-cloud": "Grand Nuage de Magellan",
      "small-magellanic-cloud": "Petit Nuage de Magellan",
      "fornax-dwarf": "Galaxie naine du Fourneau",
      "ngc-6822": "Galaxie de Barnard",
      "ic-1613": "IC 1613",
      andromeda: "Galaxie d'Andromède",
      m32: "M32",
      "ic-10": "IC 10",
      m110: "M110",
      triangulum: "Galaxie du Triangle",
      wlm: "Galaxie de Wolf-Lundmark-Melotte",
    },
    labels: {
      here: "Vous êtes ici",
      center: "Centre de la Galaxie",
      web: "Toile cosmique",
      cmb: "Fond diffus cosmologique",
      ourUniverse: "Notre univers observable",
      otherUniverses: "D'autres univers ? (hypothèse)",
    },
    ring: (radiusLy) => lightYears(radiusLy, 0, "fr"),
    starDistance: (distanceLy) => ` · ${lightYears(distanceLy, 1, "fr")}`,
    galaxyDistance: (distanceMly) => galaxyDistance(distanceMly, "fr", "d'al"),
    galaxySize: (diameterLy) => lightYears(diameterLy, 0, "fr"),
  },
  en: {
    starNames: {
      "proxima-centauri": "Proxima Centauri",
      "alpha-centauri": "Alpha Centauri A and B",
      barnard: "Barnard's Star",
      "wolf-359": "Wolf 359",
      "lalande-21185": "Lalande 21185",
      sirius: "Sirius",
      "luyten-726-8": "Luyten 726-8",
      "ross-154": "Ross 154",
      "ross-248": "Ross 248",
      "epsilon-eridani": "Epsilon Eridani",
      "lacaille-9352": "Lacaille 9352",
      "ross-128": "Ross 128",
      "61-cygni": "61 Cygni",
      procyon: "Procyon",
      "struve-2398": "Struve 2398",
      "groombridge-34": "Groombridge 34",
      "epsilon-indi": "Epsilon Indi",
      "tau-ceti": "Tau Ceti",
      altair: "Altair",
    },
    galaxyNames: {
      "milky-way": "Milky Way",
      "sagittarius-dwarf": "Sagittarius Dwarf Spheroidal Galaxy",
      "large-magellanic-cloud": "Large Magellanic Cloud",
      "small-magellanic-cloud": "Small Magellanic Cloud",
      "fornax-dwarf": "Fornax Dwarf Galaxy",
      "ngc-6822": "Barnard's Galaxy",
      "ic-1613": "IC 1613",
      andromeda: "Andromeda Galaxy",
      m32: "M32",
      "ic-10": "IC 10",
      m110: "M110",
      triangulum: "Triangulum Galaxy",
      wlm: "Wolf–Lundmark–Melotte",
    },
    labels: {
      here: "You are here",
      center: "Galactic Centre",
      web: "Cosmic web",
      cmb: "Cosmic microwave background",
      ourUniverse: "Our observable Universe",
      otherUniverses: "Other universes? (hypothesis)",
    },
    ring: (radiusLy) => lightYears(radiusLy, 0, "en"),
    starDistance: (distanceLy) => ` · ${lightYears(distanceLy, 1, "en")}`,
    galaxyDistance: (distanceMly) => galaxyDistance(distanceMly, "en", "ly"),
    galaxySize: (diameterLy) => lightYears(diameterLy, 0, "en"),
  },
  es: {
    starNames: {
      "proxima-centauri": "Próxima Centauri",
      "alpha-centauri": "Alfa Centauri A y B",
      barnard: "Estrella de Barnard",
      "wolf-359": "Wolf 359",
      "lalande-21185": "Lalande 21185",
      sirius: "Sirio",
      "luyten-726-8": "Luyten 726-8",
      "ross-154": "Ross 154",
      "ross-248": "Ross 248",
      "epsilon-eridani": "Épsilon Eridani",
      "lacaille-9352": "Lacaille 9352",
      "ross-128": "Ross 128",
      "61-cygni": "61 Cygni",
      procyon: "Procyon",
      "struve-2398": "Struve 2398",
      "groombridge-34": "Groombridge 34",
      "epsilon-indi": "Épsilon Indi",
      "tau-ceti": "Tau Ceti",
      altair: "Altair",
    },
    galaxyNames: {
      "milky-way": "Vía Láctea",
      "sagittarius-dwarf": "Galaxia enana elíptica de Sagitario",
      "large-magellanic-cloud": "Gran Nube de Magallanes",
      "small-magellanic-cloud": "Pequeña Nube de Magallanes",
      "fornax-dwarf": "Galaxia enana de Fornax",
      "ngc-6822": "Galaxia de Barnard",
      "ic-1613": "IC 1613",
      andromeda: "Galaxia de Andrómeda",
      m32: "M32",
      "ic-10": "IC 10",
      m110: "M110",
      triangulum: "Galaxia del Triángulo",
      wlm: "Wolf-Lundmark-Melotte",
    },
    labels: {
      here: "Estás aquí",
      center: "Centro de la Galaxia",
      web: "Red cósmica",
      cmb: "Fondo cósmico de microondas",
      ourUniverse: "Nuestro universo observable",
      otherUniverses: "¿Otros universos? (hipótesis)",
    },
    ring: (radiusLy) => lightYears(radiusLy, 0, "es"),
    starDistance: (distanceLy) => ` · ${lightYears(distanceLy, 1, "es")}`,
    galaxyDistance: (distanceMly) => galaxyDistance(distanceMly, "es", "de al"),
    galaxySize: (diameterLy) => lightYears(diameterLy, 0, "es"),
  },
};
