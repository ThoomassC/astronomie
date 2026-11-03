import { ABOUT_URLS, sourcedFigures } from "./structure";
import type { AboutContent } from "./types";

/** Chiffres clés de l'accueil, écrits en français, posés à côté de leurs sources. */
const figures = sourcedFigures("fr");

/**
 * Page À propos, en français : vouvoiement ; typographie du site (espace insécable avant « : » et dans les guillemets,
 * espace fine insécable avant « ; »). Les noms des liens sont des noms propres, laissés dans leur langue.
 */
export const ABOUT_FR: AboutContent = {
  title: "À propos",
  intro: "Un planétaire en ligne, pour sentir les vraies tailles et les vraies distances.",
  external: "site externe",
  sections: [
    {
      id: "pourquoi",
      heading: "Pourquoi ce site",
      paragraphs: [
        "La Terre est à près de 150 millions de kilomètres du Soleil : le nombre est exact, mais impossible à se représenter. Ce site fait sentir les distances et les tailles de l'espace en les parcourant.",
        "Le Voyage part du Soleil, passe chaque planète, puis s'éloigne vers les étoiles voisines, la Voie lactée, les autres galaxies et au-delà. Au Soleil et à chaque planète, une animation explique un phénomène : les saisons, les orbites, la vitesse de la lumière… L'onglet Tailles compare dix étoiles, de la naine rouge Proxima du Centaure à l'hypergéante VY Canis Majoris.",
      ],
    },
    {
      id: "sources",
      heading: "Sources",
      paragraphs: [
        "Les chiffres viennent des agences spatiales et d'articles scientifiques ; voici les principales sources, en anglais. Les rayons des étoiles de l'onglet Tailles viennent de mesures publiées, étoile par étoile.",
      ],
      links: [
        {
          label: "NASA, Sun Fact Sheet",
          href: ABOUT_URLS.nasaSunFactSheet,
          lang: "en",
          description: `Diamètre du Soleil : ${figures.sunInEarths} Terres côte à côte.`,
        },
        {
          label: "NASA, Planetary Fact Sheet",
          href: ABOUT_URLS.nasaFactSheet,
          lang: "en",
          description: "Données physiques des planètes, dont le diamètre de la Terre.",
        },
        {
          label: "UAI, résolution B2 de 2012",
          href: ABOUT_URLS.iauResolutions,
          description: `L'unité astronomique, à peu près la distance moyenne de la Terre au Soleil : la lumière la parcourt en ${figures.sunlight}.`,
        },
        {
          label: "JPL, Approximate Positions of the Planets",
          href: ABOUT_URLS.jplApproximatePositions,
          lang: "en",
          description: "Éléments orbitaux des planètes, valables de 1800 à 2050 : leurs positions du jour.",
        },
        {
          label: "ESA, Gaia DR3",
          href: ABOUT_URLS.gaiaDr3,
          description: `Distances des étoiles voisines, dont Proxima du Centaure à ${figures.nearestStar} ; complétées par Hipparcos et RECONS.`,
        },
        { label: "CDS, SIMBAD", href: ABOUT_URLS.simbad, description: "Positions des étoiles dans le ciel." },
        {
          label: "Wittkowski et al., 2012",
          href: ABOUT_URLS.wittkowski2012,
          description: `Rayon de VY Canis Majoris, mesuré par interférométrie : ${figures.vyCanisMajoris}.`,
        },
        {
          label: "GRAVITY Collaboration, 2022",
          href: ABOUT_URLS.gravity2022,
          description: "Distance du Soleil au centre de la Galaxie.",
        },
        { label: "Reid et al., 2019", href: ABOUT_URLS.reid2019, description: "Forme des bras de la Voie lactée." },
        { label: "McConnachie, 2012", href: ABOUT_URLS.mcConnachie2012, description: "Galaxies du Groupe local." },
        {
          label: "Planck Collaboration, 2020",
          href: ABOUT_URLS.planck2018,
          description: "Âge et taille de l'Univers observable.",
        },
      ],
    },
  ],
};
