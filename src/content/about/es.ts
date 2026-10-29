import { ABOUT_URLS, ccByUrl, numberSample } from "./structure";
import type { AboutContent } from "./types";

/**
 * Página Acerca de, en español: tuteo (público de 12 años o más), comillas « » sin espacios. Los nombres de los
 * enlaces son nombres propios, en su idioma.
 */
export const ABOUT_ES: AboutContent = {
  title: "Acerca de",
  intro: "Un planetario en línea para sentir los tamaños y las distancias reales.",
  toc: "En esta página",
  external: "sitio externo",
  sections: [
    {
      id: "pourquoi",
      heading: "Por qué este sitio",
      paragraphs: [
        "La Tierra está a casi 150 millones de kilómetros del Sol: una cifra exacta, pero imposible de imaginar. Este sitio te ayuda a sentir las distancias y los tamaños del espacio recorriéndolos.",
        "El Viaje parte del Sol, pasa por cada planeta y se aleja hacia las estrellas vecinas, la Vía Láctea, otras galaxias y más allá. En el Sol y en cada planeta, una animación explica un fenómeno: las estaciones, las órbitas, la velocidad de la luz… La pestaña Tamaños compara diez estrellas, de la enana roja Próxima Centauri a la hipergigante VY Canis Majoris.",
      ],
    },
    {
      id: "pour-qui",
      heading: "Para quién",
      paragraphs: [
        "Para cualquier persona con curiosidad por el cielo, a partir de 12 años. No necesitas conocimientos previos: avanzas a tu ritmo desplazando la página, y las cifras se comparan con cosas conocidas, como las 109 Tierras que harían falta para cruzar el Sol de un borde a otro.",
      ],
    },
    {
      id: "demarche",
      heading: "El método",
      paragraphs: [
        "Los datos son reales y proceden de fuentes publicadas. Al cargar la página, cada planeta está en su posición real del día, calculada con los elementos orbitales del JPL; después, la máquina del tiempo hace pasar los días, hasta un año por segundo.",
        "No todo cabe a escala en una pantalla. En el sistema solar, los planetas están agrandados y las distancias, acortadas; el interruptor «Distancias reales» devuelve las distancias a escala, y entonces ves sobre todo vacío. En las estrellas vecinas, las distancias están a escala, pero las estrellas están agrandadas. En la pestaña Tamaños, conservan sus proporciones reales.",
        "Algunas vistas son ilustraciones: nadie puede fotografiar la Vía Láctea desde fuera, la red cósmica la dibuja un programa y el multiverso es una hipótesis que nunca se ha observado. Sus textos lo indican.",
      ],
    },
    {
      id: "sources",
      heading: "Fuentes",
      paragraphs: [
        "Las cifras proceden de agencias espaciales y de artículos científicos; estas son las principales fuentes, en inglés. Los radios de las estrellas de la pestaña Tamaños proceden de medidas publicadas, estrella por estrella.",
      ],
      links: [
        {
          label: "NASA, Planetary Fact Sheet",
          href: ABOUT_URLS.nasaFactSheet,
          description: "Datos físicos de los planetas.",
        },
        {
          label: "JPL, Approximate Positions of the Planets",
          href: ABOUT_URLS.jplApproximatePositions,
          description: "Elementos orbitales de los planetas, válidos de 1800 a 2050: sus posiciones de cada día.",
        },
        {
          label: "ESA, Gaia DR3",
          href: ABOUT_URLS.gaiaDr3,
          description: "Distancias de las estrellas vecinas, completadas con Hipparcos y RECONS.",
        },
        { label: "CDS, SIMBAD", href: ABOUT_URLS.simbad, description: "Posiciones de las estrellas en el cielo." },
        {
          label: "GRAVITY Collaboration, 2022",
          href: ABOUT_URLS.gravity2022,
          description: "Distancia del Sol al centro de la Galaxia.",
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
    {
      id: "credits",
      heading: "Créditos",
      paragraphs: ["Mapas, tipografías y software que reutiliza el sitio, con sus licencias:"],
      links: [
        {
          label: "Solar System Scope",
          href: ABOUT_URLS.solarSystemScope,
          description:
            "Mapas de los planetas, de la Luna y de la Vía Láctea, a partir de datos de la NASA. Licencia CC BY 4.0; renombrados, redimensionados y uno convertido a JPEG.",
        },
        {
          label: "Licencia CC BY 4.0",
          href: ccByUrl("es"),
          description: "Condiciones para reutilizar los mapas de Solar System Scope.",
        },
        {
          label: "Bodoni Moda",
          href: ABOUT_URLS.bodoniModa,
          description: "Tipografía de los títulos, de Owen Earl. Licencia SIL Open Font License (OFL).",
        },
        {
          label: "Atkinson Hyperlegible Next",
          href: ABOUT_URLS.atkinsonHyperlegibleNext,
          description: "Tipografía del texto, del Braille Institute, pensada para personas con baja visión. Licencia OFL.",
        },
        { label: "Three.js", href: ABOUT_URLS.threeJs, description: "Biblioteca de la escena 3D. Licencia MIT." },
        {
          label: "Next.js",
          href: ABOUT_URLS.nextJs,
          description: "La herramienta con la que está hecho el sitio, basada en React. Licencia MIT, como React.",
        },
      ],
    },
    {
      id: "accessibilite",
      heading: "Accesibilidad",
      paragraphs: [],
      entries: [
        {
          term: "Teclado",
          text: "Los enlaces de salto llevan directamente al contenido, Esc cierra los menús y, en el modo «Girar alrededor», las flechas giran la vista, más y menos ajustan la distancia y 0 la vuelve a centrar.",
        },
        {
          term: "Lectores de pantalla",
          text: "Las páginas se organizan con títulos y puntos de referencia. La escena 3D es decorativa: lo que muestra está escrito en el texto de cada escala.",
        },
        {
          term: "Movimiento reducido",
          text: "Si tu dispositivo lo pide, el tiempo empieza en pausa, las animaciones esperan a que las inicies y las transiciones son inmediatas.",
        },
        {
          term: "Contraste",
          text: "El texto busca un contraste de al menos 4,5:1 con su fondo, y los controles, un tamaño de al menos 44 píxeles.",
        },
        {
          term: "Textos alternativos",
          text: "Cada animación tiene una descripción y sus resultados se anuncian; el mapa de las estrellas vecinas también está en forma de tabla.",
        },
        {
          term: "Límites conocidos",
          text: "La escena y las animaciones siguen siendo sobre todo visuales: sus textos dan lo esencial, no todo. Sin WebGL, un Sol dibujado sustituye a la escena; sin JavaScript, todo el texto se puede leer, pero faltan la escena, las animaciones y el modo «Girar alrededor».",
        },
      ],
      links: [
        {
          label: "Informar de un problema de accesibilidad",
          href: ABOUT_URLS.issues,
          description: "En GitHub, en las incidencias del proyecto.",
        },
      ],
    },
    {
      id: "confidentialite",
      heading: "Privacidad",
      note: "Sin rastreadores ni publicidad. Una sola cookie: el idioma que elijas, guardado un año.",
      paragraphs: [
        "La cookie «lang» solo se guarda si eliges un idioma, y no contiene nada más. El sitio no mide su audiencia.",
        "Lo que escribes, como tu peso o tu año de nacimiento, se calcula en tu navegador y no se envía a ningún sitio. Las tipografías y las imágenes vienen del propio sitio.",
      ],
    },
    {
      id: "langues",
      heading: "Idiomas",
      paragraphs: [
        "El sitio está en francés, inglés y español. El menú de idiomas, arriba en cada página, pasa de uno a otro; en las pestañas Viaje y Tamaños, te quedas en la misma escala.",
        `Cada idioma escribe los números a su manera: ${numberSample("es")} en español, ${numberSample("fr")} en francés, ${numberSample("en")} en inglés.`,
      ],
    },
    {
      id: "code-source",
      heading: "Código fuente",
      paragraphs: [
        "El código del sitio es público: en él puedes leer cómo se calcula cada posición y cada animación, e informar de un error.",
      ],
      links: [
        {
          label: "Código fuente del sitio",
          href: ABOUT_URLS.repository,
          description: "En GitHub. Escrito en TypeScript, con Next.js, React y Three.js.",
        },
        {
          label: "Informar de un error",
          href: ABOUT_URLS.issues,
          description: "En GitHub, en las incidencias del proyecto.",
        },
      ],
    },
  ],
};
