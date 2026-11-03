import type { HomeContent } from "./types";

export const HOME_FR: HomeContent = {
  intro: {
    title: "Le système solaire, aujourd'hui.",
    text: "Chaque planète est dessinée à sa vraie place du jour. Voyagez du Soleil jusqu'aux galaxies lointaines, ou comparez la taille des étoiles.",
    start: "Commencer le voyage",
  },
  cards: {
    title: "Explorer le site",
    items: {
      voyage: {
        title: "Voyage",
        text: "Faites défiler pour partir du Soleil, passer chaque planète, puis rejoindre les étoiles et les galaxies. Le Soleil et chaque planète ont leur fiche et leur animation.",
        action: "Commencer le voyage",
      },
      sizes: {
        title: "Tailles",
        text: "Dix étoiles à la même échelle, de la minuscule Proxima du Centaure à l'immense VY Canis Majoris.",
        action: "Comparer les étoiles",
      },
      about: {
        title: "À propos",
        text: "Pourquoi ce site, et d'où viennent ses chiffres : les sources, des agences spatiales aux articles scientifiques.",
        action: "En savoir plus",
      },
    },
  },
  figures: {
    title: "En quelques chiffres",
    items: {
      sunWidth: { caption: "Terres côte à côte pour égaler la largeur du Soleil" },
      sunlight: {
        caption: "en moyenne, pour que la lumière du Soleil arrive jusqu'à nous",
        spoken: "8 minutes et 19 secondes",
      },
      proxima: { unit: "années-lumière", caption: "jusqu'à l'étoile la plus proche du Soleil, Proxima du Centaure" },
      largestStar: {
        caption: "Soleils côte à côte pour égaler VY Canis Majoris, la plus grande étoile bien mesurée",
      },
    },
    note: { before: "Valeurs arrondies. Sources détaillées dans ", link: "À propos", after: "." },
  },
};
