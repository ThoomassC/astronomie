import { ABOUT_URLS, sourcedFigures } from "./structure";
import type { AboutContent } from "./types";

/** Chiffres clés de l'accueil, écrits en espagnol, posés à côté de leurs sources. */
const figures = sourcedFigures("es");

/**
 * Page À propos, en espagnol : tutoiement (public de 12 ans et plus), guillemets « » sans espace. Les noms des liens
 * sont des noms propres, laissés dans leur langue.
 */
export const ABOUT_ES: AboutContent = {
  title: "Acerca de",
  intro: "Un planetario en línea para sentir los tamaños y las distancias reales.",
  external: "sitio externo",
  sections: [
    {
      id: "pourquoi",
      heading: "Por qué este sitio",
      paragraphs: [
        "La Tierra está a casi 150 millones de kilómetros del Sol: una cifra exacta, pero imposible de imaginar. Este sitio te ayuda a sentir las distancias y los tamaños del espacio recorriéndolos.",
        "El Viaje parte del Sol, pasa por cada planeta y se aleja hacia las estrellas vecinas, la Vía Láctea, otras galaxias y más allá. En el Sol y en cada planeta, una animación explica un fenómeno: las estaciones, las órbitas, la velocidad de la luz… La pestaña Tamaños compara diez estrellas y cuatro agujeros negros, del agujero negro estelar Cygnus X-1 al de la Herradura Cósmica, uno de los más masivos jamás pesados.",
      ],
    },
    {
      id: "sources",
      heading: "Fuentes",
      paragraphs: [
        "Las cifras proceden de agencias espaciales y de artículos científicos; estas son las principales fuentes, en inglés. Los radios de las estrellas de la pestaña Tamaños proceden de medidas publicadas, estrella por estrella; las masas de sus agujeros negros, de órbitas de estrellas, de imágenes del Event Horizon Telescope y de una lente gravitatoria.",
      ],
      links: [
        {
          label: "NASA, Sun Fact Sheet",
          href: ABOUT_URLS.nasaSunFactSheet,
          lang: "en",
          description: `Diámetro del Sol: ${figures.sunInEarths} Tierras en fila.`,
        },
        {
          label: "NASA, Planetary Fact Sheet",
          href: ABOUT_URLS.nasaFactSheet,
          lang: "en",
          description: "Datos físicos de los planetas, entre ellos el diámetro de la Tierra.",
        },
        {
          label: "UAI, resolución B2 de 2012",
          href: ABOUT_URLS.iauResolutions,
          description: `La unidad astronómica, más o menos la distancia media de la Tierra al Sol: la luz la recorre en ${figures.sunlight}.`,
        },
        {
          label: "JPL, Approximate Positions of the Planets",
          href: ABOUT_URLS.jplApproximatePositions,
          lang: "en",
          description: "Elementos orbitales de los planetas, válidos de 1800 a 2050: sus posiciones de cada día.",
        },
        {
          label: "ESA, Gaia DR3",
          href: ABOUT_URLS.gaiaDr3,
          description: `Distancias de las estrellas vecinas, entre ellas Próxima Centauri a ${figures.nearestStar}; completadas con Hipparcos y RECONS.`,
        },
        { label: "CDS, SIMBAD", href: ABOUT_URLS.simbad, description: "Posiciones de las estrellas en el cielo." },
        {
          label: "Wittkowski et al., 2012",
          href: ABOUT_URLS.wittkowski2012,
          description: `Radio de VY Canis Majoris, medido por interferometría: ${figures.vyCanisMajoris}.`,
        },
        {
          label: "Miller-Jones et al., 2021",
          href: ABOUT_URLS.millerJones2021,
          description: "Masa de Cygnus X-1, el primer objeto reconocido como un agujero negro.",
        },
        {
          label: "EHT Collaboration, 2019",
          href: ABOUT_URLS.eht2019,
          description: "La primera imagen de un agujero negro, M87*, y su masa.",
        },
        {
          label: "Melo-Carneiro et al., 2025",
          href: ABOUT_URLS.meloCarneiro2025,
          description: "Masa del agujero negro de la Herradura Cósmica, uno de los más masivos jamás pesados.",
        },
        {
          label: "GRAVITY Collaboration, 2022",
          href: ABOUT_URLS.gravity2022,
          description: "Distancia del Sol al centro de la Galaxia, y masa de Sagitario A*, el agujero negro que hay allí.",
        },
        { label: "Reid et al., 2019", href: ABOUT_URLS.reid2019, description: "Forma de los brazos de la Vía Láctea." },
        { label: "McConnachie, 2012", href: ABOUT_URLS.mcConnachie2012, description: "Galaxias del Grupo Local." },
        {
          label: "Planck Collaboration, 2020",
          href: ABOUT_URLS.planck2018,
          description: "Edad y tamaño del Universo observable.",
        },
      ],
    },
  ],
};
