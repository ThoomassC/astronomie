import { formatNumber } from "@/lib/format";
import type { ReleasesContent } from "./types";

/** Nombre entier écrit en espagnol, comme ailleurs sur le site : « 36.000 ». */
const n = (value: number) => formatNumber(value, 0, "es");

/** Notes de version, en espagnol (d'Espagne, tutoiement) : phrases courtes, sans vocabulaire technique. */
export const RELEASES_ES: ReleasesContent = {
  title: "Notas de la versión",
  intro: "Lo que cambia en el sitio, versión a versión, de la más reciente a la más antigua.",
  toc: "Todas las versiones",
  version: "Versión",
  latest: "Última versión",
  releases: [
    {
      version: "1.1.0",
      summary:
        "Cuatro agujeros negros se suman a las estrellas de Tamaños, el Viaje y el Inicio ganan en detalle, y la navegación en el móvil se ha rediseñado.",
      sections: [
        {
          heading: "Novedades",
          items: [
            "Cuatro agujeros negros en la pestaña Tamaños: Cygnus X-1, Sagitario A*, M87* y el agujero negro de la Herradura Cósmica.",
            "En el móvil, la ficha del astro que estás viendo se queda arriba de la pantalla durante todo el recorrido.",
            "Esta página, Notas de la versión, cuenta lo que cambia en cada versión.",
          ],
        },
        {
          heading: "Tamaños",
          items: [
            "Los agujeros negros se colocan entre las estrellas según el tamaño de su sombra, unas 2,6 veces el de su horizonte.",
            "Cada agujero negro se calcula en pantalla: su sombra, su anillo de luz y las estrellas del fondo, desviadas como por una lupa.",
            "Cygnus X-1 está rodeado por un disco de gas abrasador, M87* lanza un largo chorro y Sagitario A* luce un anillo tenue.",
            `El agujero negro de la Herradura Cósmica, pesado en 2025, es uno de los más grandes conocidos: ${n(36_000)} millones de veces la masa del Sol.`,
            "Cada agujero negro tiene su ficha y sus fuentes, y la regla de tamaños va de una diezmilésima a un millón de radios solares.",
            "Rigel y Sirio, dos estrellas muy calientes, tienen ahora un borde más oscuro y un halo azulado.",
          ],
        },
        {
          heading: "Viaje",
          items: [
            "La regla de distancias se aligera: la escala actual y sus vecinas conservan su nombre, las demás lo muestran al pasar el ratón.",
            "En cada planeta, su órbita se difumina a su alrededor y los demás planetas se oscurecen.",
            "Los nombres de los astros aparecen encima de ellos, y encima de los anillos en Saturno y Urano.",
            "Las estrellas vecinas brillan más; seis de ellas muestran su distancia.",
            "El texto se desvanece con suavidad bajo la barra superior y bajo los controles de abajo.",
            "Los textos son más grandes y las imágenes de los planetas aparecen con un fundido.",
          ],
        },
        {
          heading: "Inicio",
          items: [
            "Las tres puertas llevan ilustración, y la del Viaje pasa delante.",
            "En el planetario, los nombres de los planetas salen del centro, unidos a ellos por una fina línea de latón.",
            "Al abrir la página, los planetas se deslizan hasta su posición de hoy.",
            "Las cifras clave se muestran en letra grande, y la página Acerca de se alinea con la barra superior.",
          ],
        },
        {
          heading: "Móvil",
          items: [
            "En el Viaje y en Tamaños, una tarjeta fija arriba de la pantalla muestra la escala actual, con flechas hacia la anterior y la siguiente.",
            "Al tocar el nombre del astro se despliegan sus detalles, que se desplazan dentro de la tarjeta.",
            "Mientras pasas de una escala a otra, una tarjeta de espera guarda el sitio.",
            "En el Viaje y en Tamaños, la barra superior se queda siempre fija, en vertical y en horizontal.",
            "Los botones de abajo son más fáciles de tocar, y los nombres de los astros evitan la barra.",
          ],
        },
        {
          heading: "Accesibilidad",
          items: [
            "Cuando la tarjeta cambia de escala, el teclado se queda en el sitio correcto.",
            "Un lector de pantalla lee siempre las escalas en el orden de la página.",
            "Sin JavaScript, cada ficha se queda en la página y se lee entera.",
          ],
        },
      ],
    },
    {
      version: "1.0.0",
      summary:
        "La primera versión pública: el sistema solar de hoy, un viaje hasta el multiverso y el tamaño de las estrellas, en tres idiomas.",
      sections: [
        {
          heading: "Inicio",
          items: [
            "Un planetario muestra los ocho planetas en su posición de hoy, con la Tierra marcada «Estás aquí».",
            "Tres puertas llevan al Viaje, a Tamaños y a la página Acerca de.",
            "Cuatro cifras clave dan la escala, de las 109 Tierras en el ancho del Sol a Próxima Centauri, a 4,2 años luz.",
          ],
        },
        {
          heading: "Viaje",
          items: [
            "Diecisiete escalas, del Sol al multiverso, pasando por cada planeta, las estrellas vecinas, la Vía Láctea y las demás galaxias.",
            "Los planetas salen de su posición real de hoy.",
            "Una máquina del tiempo hace pasar los días o los años, y un interruptor muestra las distancias reales.",
            "El Sol se calcula en directo, con sus manchas que siguen el ciclo solar y su corona.",
            "«Girar alrededor» te lleva alrededor de cada astro, y «Visto desde la Tierra» muestra un planeta tal como lo vemos desde aquí.",
            "Una animación por escala: la carrera de la luz, las estaciones, tu peso en cada planeta, el año de Neptuno…",
          ],
        },
        {
          heading: "Tamaños",
          items: [
            "Diez estrellas una al lado de otra y a la misma escala, de la pequeña Próxima Centauri a la inmensa VY Canis Majoris, el Sol incluido.",
            "Cada ficha da el radio, la temperatura y su color, la distancia, y hasta dónde llegaría la estrella en el lugar del Sol.",
            "Una regla de tamaños sitúa cada estrella de un vistazo.",
          ],
        },
        {
          heading: "En todo el sitio",
          items: [
            "La página Acerca de explica por qué existe este sitio y de dónde salen sus cifras.",
            "El sitio habla francés, inglés y español; cambiar de idioma conserva la página y el lugar que estabas viendo.",
            "En el móvil, un menú reúne las pestañas y los idiomas.",
          ],
        },
        {
          heading: "Accesibilidad",
          items: [
            "Todo se recorre con el teclado, con un enlace para ir directamente al contenido.",
            "Las animaciones se calman cuando el dispositivo pide menos movimiento.",
            "Sin JavaScript, las páginas siguen siendo legibles y los enlaces funcionan.",
          ],
        },
      ],
    },
  ],
};
