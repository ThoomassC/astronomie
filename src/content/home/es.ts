import type { HomeContent } from "./types";

export const HOME_ES: HomeContent = {
  intro: {
    title: "El sistema solar, hoy.",
    text: "Cada planeta aparece en su posición real de hoy. Viaja del Sol a las galaxias lejanas o compara el tamaño de las estrellas.",
    start: "Empezar el viaje",
  },
  cards: {
    title: "Explorar el sitio",
    items: {
      voyage: {
        title: "Viaje",
        text: "Desplázate para salir del Sol, pasar por cada planeta y llegar a las estrellas y las galaxias. El Sol y cada planeta tienen su ficha y su animación.",
        action: "Empezar el viaje",
      },
      sizes: {
        title: "Tamaños",
        text: "Diez estrellas y cuatro agujeros negros a la misma escala, del diminuto Cygnus X-1 al gigantesco agujero negro de la Herradura Cósmica.",
        action: "Comparar tamaños",
      },
      about: {
        title: "Acerca de",
        text: "Por qué existe este sitio y de dónde salen sus cifras: las fuentes, de las agencias espaciales a los artículos científicos.",
        action: "Saber más",
      },
    },
  },
  figures: {
    title: "En pocas cifras",
    items: {
      sunWidth: { caption: "Tierras en fila para igualar el ancho del Sol" },
      sunlight: {
        caption: "de media, para que la luz del Sol llegue hasta nosotros",
        spoken: "8 minutos y 19 segundos",
      },
      proxima: { unit: "años luz", caption: "hasta la estrella más cercana al Sol, Próxima Centauri" },
      largestStar: { caption: "soles en fila para igualar a VY Canis Majoris, la estrella más grande bien medida" },
    },
    note: { before: "Valores redondeados. Fuentes completas en ", link: "Acerca de", after: "." },
  },
};
