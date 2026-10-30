import { ABOUT_URLS, sourcedFigures } from "./structure";
import type { AboutContent } from "./types";

/** Chiffres clés de l'accueil, écrits en anglais, posés à côté de leurs sources. */
const figures = sourcedFigures("en");

/**
 * Page À propos, en anglais britannique : guillemets “ ”, orthographe britannique (centre, kilometres, licence pour
 * le nom). Les noms des liens sont des noms propres, laissés dans leur langue.
 */
export const ABOUT_EN: AboutContent = {
  title: "About",
  intro: "An online orrery, to get a feel for real sizes and real distances.",
  external: "external site",
  sections: [
    {
      id: "pourquoi",
      heading: "Why this site",
      paragraphs: [
        "The Earth is nearly 150 million kilometres from the Sun: an accurate number, but impossible to picture. This site helps you feel the distances and sizes of space by travelling through them.",
        "The Journey starts at the Sun, passes each planet, then heads out to the nearby stars, the Milky Way, other galaxies and beyond. At the Sun and at each planet, an animation explains a phenomenon: the seasons, orbits, the speed of light… The Sizes tab compares ten stars, from the red dwarf Proxima Centauri to the hypergiant VY Canis Majoris.",
      ],
    },
    {
      id: "sources",
      heading: "Data sources",
      paragraphs: [
        "The numbers come from space agencies and scientific papers; here are the main sources. The radii of the stars in the Sizes tab come from published measurements, star by star.",
      ],
      links: [
        {
          label: "NASA, Sun Fact Sheet",
          href: ABOUT_URLS.nasaSunFactSheet,
          description: `Diameter of the Sun: ${figures.sunInEarths} Earths side by side.`,
        },
        {
          label: "NASA, Planetary Fact Sheet",
          href: ABOUT_URLS.nasaFactSheet,
          description: "Physical data on the planets, including the Earth's diameter.",
        },
        {
          label: "IAU, 2012 Resolution B2",
          href: ABOUT_URLS.iauResolutions,
          description: `The astronomical unit, roughly the average distance from the Earth to the Sun: light covers it in ${figures.sunlight}.`,
        },
        {
          label: "JPL, Approximate Positions of the Planets",
          href: ABOUT_URLS.jplApproximatePositions,
          description: "Orbital elements of the planets, valid from 1800 to 2050: their positions on any given day.",
        },
        {
          label: "ESA, Gaia DR3",
          href: ABOUT_URLS.gaiaDr3,
          description: `Distances to the nearby stars, including Proxima Centauri at ${figures.nearestStar}; supplemented by Hipparcos and RECONS.`,
        },
        { label: "CDS, SIMBAD", href: ABOUT_URLS.simbad, description: "Positions of the stars in the sky." },
        {
          label: "Wittkowski et al., 2012",
          href: ABOUT_URLS.wittkowski2012,
          description: `Radius of VY Canis Majoris, measured by interferometry: ${figures.vyCanisMajoris}.`,
        },
        {
          label: "GRAVITY Collaboration, 2022",
          href: ABOUT_URLS.gravity2022,
          description: "Distance from the Sun to the centre of the Galaxy.",
        },
        { label: "Reid et al., 2019", href: ABOUT_URLS.reid2019, description: "Shape of the Milky Way's spiral arms." },
        { label: "McConnachie, 2012", href: ABOUT_URLS.mcConnachie2012, description: "Galaxies of the Local Group." },
        {
          label: "Planck Collaboration, 2020",
          href: ABOUT_URLS.planck2018,
          description: "Age and size of the observable Universe.",
        },
      ],
    },
  ],
};
