import { ABOUT_URLS, ccByUrl } from "@/content/about/structure";
import { bodyName } from "@/i18n/names";
import { plural, type PluralForms } from "@/i18n/plural";
import { formatNumber } from "@/lib/format";
import { nearbyStarsSource } from "./structure";
import type { BeyondMarkTexts, Ordinal, VoyageContent } from "./types";

const PLANET_RANK = "planeta desde el Sol";
const FROM_EARTH = "En esta fecha, desde la Tierra";
const HOURS: PluralForms = { one: "hora", other: "horas" };
const MINUTES: PluralForms = { one: "minuto", other: "minutos" };

/**
 * Abréviation ordinale accordée à « planeta » (masculin), selon la RAE : un point, puis les lettres en exposant.
 * « primero » et « tercero » s'apocopent devant le nom (1.ᵉʳ, 3.ᵉʳ, 13.ᵉʳ, 21.ᵉʳ), pas « undécimo » (11.º) ; les autres
 * rangs prennent l'indicateur º, déjà en haut de ligne : 2.º, 4.º.
 */
function ordinal(n: number): Ordinal {
  const number = formatNumber(n, 0, "es");
  const apocope = (n % 10 === 1 || n % 10 === 3) && n % 100 !== 11;
  return apocope ? { number: `${number}.`, suffix: "er" } : { number: `${number}.º`, suffix: "" };
}

/**
 * Durée lue à voix haute : « ≈ 7 h » → « unas 7 horas », « 4 h 10 min » → « 4 horas y 10 minutos ». « unas » s'accorde
 * à « horas » : les durées approchées de l'échelle dépassent toutes une heure.
 */
function spoken(value: string): string {
  return value
    .replace("≈", "unas")
    .replace(
      /(\d+) h(?: (\d+) min)?/,
      (_match: string, hours: string, minutes: string | undefined) =>
        `${hours} ${plural("es", Number(hours), HOURS)}` +
        (minutes ? ` y ${minutes} ${plural("es", Number(minutes), MINUTES)}` : ""),
    );
}

/* Même contenu que le français, en espagnol d'Espagne, au tutoiement, pour 12 ans et plus. */
export const VOYAGE_ES: VoyageContent = {
  hero: {
    title: "Ocho planetas, una estrella y mucho vacío.",
    text: "Cada planeta sale de su posición real de hoy. Desplázate para dejar atrás el Sol y llegar a Neptuno, a cuatro horas luz de allí, y después a las estrellas vecinas y a la Vía Láctea.",
    sceneDescription:
      "Al fondo, una vista en 3D del sistema solar con las posiciones del día; la cámara sigue el desplazamiento.",
    stampPrefix: "Posiciones reales a la salida:",
    start: "Partir del Sol",
  },
  plate: { story: "Leer la ficha", more: "Leer más" },
  steps: {
    previous: (name) => `Escala anterior: ${name}`,
    next: (name) => `Escala siguiente: ${name}`,
  },
  ordinal,
  bodies: {
    sun: {
      rank: "La estrella del centro",
      hook: "Una estrella corriente, vista muy de cerca.",
      lede: "El Sol concentra el 99,86 % de la masa del sistema solar. En su núcleo, a 15 millones de grados, transforma cada segundo unos 600 millones de toneladas de hidrógeno en helio. Su luz tarda 8 minutos y 19 segundos en llegarnos: siempre vemos el Sol tal como era un poco antes.",
      facts: [
        { label: "Diámetro", value: "1.392.700 km", note: "109 Tierras en fila" },
        { label: "Masa", value: "333.000 Tierras", note: "99,86 % del sistema" },
        { label: "Superficie", value: "5500 °C" },
        { label: "Núcleo", value: "15 millones de °C" },
        { label: "Una vuelta sobre su eje", value: "25 días", note: "en el ecuador, 35 en los polos" },
        { label: "Edad", value: "4600 millones de años" },
      ],
      live: FROM_EARTH,
      module: {
        title: "La carrera de la luz",
        intro: "Un destello sale del Sol. Las distancias están a escala: mira dónde están los cuatro primeros planetas.",
        button: "La carrera de la luz",
      },
    },
    mercury: {
      rank: PLANET_RANK,
      hook: "El más pequeño y el más rápido.",
      lede: "Mercurio da la vuelta al Sol en 88 días, a 47 km/s de media. Su órbita es la más alargada de las ocho: su distancia al Sol varía de 46 a 70 millones de km. Sin atmósfera que retenga el calor, su superficie pasa de 430 °C de día a −180 °C de noche.",
      facts: [
        { label: "Distancia al Sol", value: "0,39 UA", note: "57,9 millones de km" },
        { label: "Diámetro", value: "4879 km", note: "0,38 Tierras" },
        { label: "Un año", value: "88 días" },
        { label: "Un día, de amanecer a amanecer", value: "176 días" },
        { label: "Temperaturas", value: "−180 a 430 °C" },
        { label: "Gravedad", value: "0,38 g" },
        { label: "Lunas", value: "0" },
        { label: "Velocidad media", value: "47,4 km/s" },
      ],
      live: FROM_EARTH,
      module: {
        title: "La ley de las áreas",
        intro:
          "Kepler, 1609: un planeta barre áreas iguales en tiempos iguales. Cada sector dura 8 días. Cerca del Sol, Mercurio acelera.",
        button: "Por qué Mercurio acelera",
      },
    },
    venus: {
      rank: PLANET_RANK,
      hook: "Un día más largo que su año.",
      lede: "Venus tarda 243 días en dar una vuelta sobre su eje, más de lo que tarda en dar la vuelta al Sol (225 días). Además, gira en sentido contrario: allí, el Sol sale por el oeste. Su espesa atmósfera de dióxido de carbono atrapa el calor: 464 °C en la superficie, más que en Mercurio.",
      facts: [
        { label: "Distancia al Sol", value: "0,72 UA", note: "108,2 millones de km" },
        { label: "Diámetro", value: "12.104 km", note: "0,95 Tierras" },
        { label: "Un año", value: "225 días" },
        { label: "Una vuelta sobre su eje", value: "243 días", note: "en sentido contrario" },
        { label: "Temperatura en la superficie", value: "464 °C" },
        { label: "Gravedad", value: "0,90 g" },
        { label: "Lunas", value: "0" },
        { label: "Presión en la superficie", value: "92 bar", note: "92 veces la de la Tierra" },
      ],
      live: FROM_EARTH,
      module: {
        title: "¿Quién completa antes su vuelta?",
        intro: "A la izquierda, la vuelta al Sol. A la derecha, la vuelta de Venus sobre su eje. El mismo reloj para las dos.",
        button: "El día contra el año",
      },
    },
    earth: {
      rank: PLANET_RANK,
      hook: "Inclinada 23,44°, de ahí las estaciones.",
      lede: "Las estaciones no se deben a la distancia al Sol: la Tierra está incluso en su punto más cercano a principios de enero. Se deben a la inclinación de su eje, que apunta siempre en la misma dirección. En junio, el hemisferio norte recibe el Sol más alto y durante más tiempo; en diciembre, ocurre lo contrario.",
      facts: [
        { label: "Distancia al Sol", value: "1 UA", note: "149,6 millones de km" },
        { label: "Diámetro", value: "12.756 km" },
        { label: "Un año", value: "365,25 días" },
        { label: "Un día", value: "24 h" },
        { label: "Temperatura media", value: "15 °C" },
        { label: "Gravedad", value: "1 g", note: "9,81 m/s²" },
        { label: "Lunas", value: "1" },
        { label: "Inclinación del eje", value: "23,44°" },
      ],
      live: "En esta fecha, distancia al Sol",
      module: {
        title: "¿Por qué hay estaciones?",
        intro:
          "Arriba o a la izquierda, la Tierra en su órbita, vista desde arriba. Vista lateral: la parte de cada rotación que pasa al sol a la latitud de París.",
        button: "¿Por qué hay estaciones?",
      },
    },
    mars: {
      rank: PLANET_RANK,
      hook: "Un desierto frío, de color óxido.",
      lede: "Su color se debe al óxido de hierro, la herrumbre, que cubre sus rocas y su polvo. En Marte está el Olympus Mons, el volcán más alto que se conoce: unos 22 km, dos veces y media el Everest. Su gravedad es solo el 38 % de la de la Tierra.",
      facts: [
        { label: "Distancia al Sol", value: "1,52 UA", note: "227,9 millones de km" },
        { label: "Diámetro", value: "6792 km", note: "0,53 Tierras" },
        { label: "Un año", value: "687 días" },
        { label: "Un día", value: "24 h 40 min" },
        { label: "Temperatura media", value: "−65 °C" },
        { label: "Gravedad", value: "0,38 g" },
        { label: "Lunas", value: "2", note: "Fobos y Deimos" },
        { label: "Volcán más alto", value: "≈ 22 km" },
      ],
      live: FROM_EARTH,
      module: {
        title: "Lo que marcaría una báscula",
        intro: "Tu masa es la misma en todas partes. El peso, en cambio, depende de la gravedad del astro.",
        button: "Tu peso en cada astro",
      },
    },
    jupiter: {
      rank: PLANET_RANK,
      hook: "Dos veces y media más masivo que todos los demás planetas juntos.",
      lede: "Júpiter es un gigante gaseoso: no tiene suelo, sino capas de nubes arrastradas por vientos violentos. Cabrían 11 Tierras en fila a lo largo de su diámetro. Su Gran Mancha Roja es una tormenta más ancha que la Tierra, observada desde hace más de 150 años.",
      facts: [
        { label: "Distancia al Sol", value: "5,20 UA", note: "778,5 millones de km" },
        { label: "Diámetro", value: "142.984 km", note: "11,2 Tierras" },
        { label: "Un año", value: "11,9 años" },
        { label: "Un día", value: "9 h 56 min", note: "el más corto" },
        { label: "Cima de las nubes", value: "−110 °C" },
        { label: "Gravedad", value: "2,53 g" },
        { label: "Lunas", value: "95 conocidas" },
        { label: "Volumen", value: "1321 Tierras" },
      ],
      live: FROM_EARTH,
      module: {
        title: "Los tamaños, por fin a escala",
        intro: "Pasa el puntero sobre un planeta o tócalo para leer su diámetro.",
        button: "Comparar los tamaños",
      },
    },
    saturn: {
      rank: PLANET_RANK,
      hook: "Anillos de 270.000 km de ancho y una decena de metros de grosor.",
      lede: "Los anillos están hechos de miles de millones de bloques de hielo, desde granos de polvo hasta trozos del tamaño de una casa. Son tan finos que, vistos de canto, casi desaparecen: así se vieron desde la Tierra en marzo de 2025. El propio Saturno es menos denso que el agua.",
      facts: [
        { label: "Distancia al Sol", value: "9,54 UA", note: "1430 millones de km" },
        { label: "Diámetro", value: "120.536 km", note: "9,4 Tierras" },
        { label: "Un año", value: "29,4 años" },
        { label: "Un día", value: "10 h 34 min" },
        { label: "Cima de las nubes", value: "−140 °C" },
        { label: "Gravedad", value: "1,07 g" },
        { label: "Lunas", value: "274 conocidas" },
        { label: "Densidad", value: "0,69", note: "el agua: 1" },
      ],
      live: FROM_EARTH,
      module: {
        title: "Los anillos vistos desde la Tierra",
        intro:
          "Según el punto de su órbita de 29 años en el que esté Saturno, vemos los anillos desde arriba, desde abajo o de canto.",
        button: "Los anillos desde la Tierra",
      },
    },
    uranus: {
      rank: PLANET_RANK,
      hook: "Gira alrededor del Sol tumbado de lado.",
      lede: "Su eje está inclinado 98°: cada polo vive unos 42 años de día y luego 42 años de noche. Su color verde azulado se debe al metano, que absorbe la luz roja. Fue el primer planeta descubierto con telescopio, por William Herschel en 1781.",
      facts: [
        { label: "Distancia al Sol", value: "19,2 UA", note: "2870 millones de km" },
        { label: "Diámetro", value: "51.118 km", note: "4 Tierras" },
        { label: "Un año", value: "84 años" },
        { label: "Un día", value: "17 h 14 min", note: "en sentido contrario" },
        { label: "Cima de las nubes", value: "−195 °C" },
        { label: "Gravedad", value: "0,90 g" },
        { label: "Lunas", value: "29 conocidas" },
        { label: "Inclinación del eje", value: "97,8°" },
      ],
      live: FROM_EARTH,
      module: {
        title: "Las estaciones de Urano",
        intro: "El mismo esquema que para la Tierra, con un eje inclinado 98°. Latitud de referencia: 49° norte, como París.",
        button: "Las estaciones de Urano",
      },
    },
    neptune: {
      rank: PLANET_RANK,
      hook: "Descubierto por el cálculo antes de ser visto.",
      lede: "En 1846, Urbain Le Verrier comprobó que Urano se apartaba de la ruta prevista. Dedujo de ello la posición de un planeta desconocido. El 23 de septiembre, Johann Galle apuntó su telescopio al lugar indicado: allí estaba Neptuno, a más o menos un grado de lo previsto. Desde entonces, solo ha completado una vuelta al Sol, en 2011.",
      facts: [
        { label: "Distancia al Sol", value: "30,1 UA", note: "4500 millones de km" },
        { label: "Diámetro", value: "49.528 km", note: "3,9 Tierras" },
        { label: "Un año", value: "164,8 años" },
        { label: "Un día", value: "16 h 06 min" },
        { label: "Cima de las nubes", value: "−200 °C" },
        { label: "Gravedad", value: "1,14 g" },
        { label: "Lunas", value: "16 conocidas" },
        { label: "Vientos", value: "hasta 2100 km/h" },
      ],
      live: FROM_EARTH,
      module: {
        title: "Un solo año neptuniano",
        intro:
          "El dial representa una vuelta completa de Neptuno alrededor del Sol desde su descubrimiento. Sitúa tu vida en él.",
        button: "Tu edad en Neptuno",
      },
    },
  },
  interlude: {
    title: "El cinturón de asteroides",
    text: "Entre Marte y Júpiter, más de un millón de asteroides conocidos. Juntos, pesarían apenas el 3 % de lo que pesa la Luna.",
    cite: "El cinturón principal, entre 2,1 y 3,3 UA del Sol",
  },
  beyond: {
    rank: "Más allá de Neptuno",
    name: "El gran vacío",
    hook: "Las distancias, por fin a escala.",
    lede: "Más allá de Neptuno se extiende el cinturón de Kuiper: miles de cuerpos helados, entre ellos Plutón, clasificado como planeta enano desde 2006. Aún más lejos viaja la Voyager 1, lanzada en 1977. En noviembre de 2026, llegará a un día luz de la Tierra: 25.900 millones de km.",
    scaleTitle: "Distancias en tiempo de luz desde el Sol",
    marks: {
      neptune: { label: bodyName("neptune", "es"), value: "4 h 10 min" },
      pluto: { label: "Plutón", value: "5 h 28 min" },
      kuiper: { label: "Kuiper", value: "≈ 7 h" },
      voyager2: { label: "Voyager 2", value: "≈ 20 h" },
      voyager1: { label: "Voyager 1", value: "≈ 24 h" },
    },
    scaleStart: "Sol, 0 h",
    spoken,
    spokenScale: (marks: readonly BeyondMarkTexts[]) =>
      `${marks.map(({ label, value }) => `${label}: ${spoken(value)}`).join("; ")}.`,
    back: "Volver al Sol",
  },
  footer: {
    sources: `Fuentes: NASA, Planetary Fact Sheet; JPL, elementos orbitales aproximados de los planetas (válidos de 1800 a 2050); número de lunas: NASA y UAI, 2025. Estrellas vecinas: ${nearbyStarsSource("es")}. Vía Láctea: modelo simplificado basado en Reid et al. (2019), GRAVITY Collaboration (2022) y la NASA.`,
    scale:
      "Salvo en el modo «distancias reales», los tamaños están ampliados y las distancias comprimidas para que todo quepa en la pantalla.",
    textures: {
      before: "Mapas de los planetas y de la Luna: ",
      source: { label: "Solar System Scope", href: ABOUT_URLS.solarSystemScope },
      between: ", a partir de datos de la NASA, redimensionados para el sitio. Licencia ",
      license: { label: "CC BY 4.0", href: ccByUrl("es") },
      after: ".",
    },
  },
  skipToDock: "Ir a la máquina del tiempo",
};
