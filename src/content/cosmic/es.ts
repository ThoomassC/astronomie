import { DEEP_SKY_STRINGS } from "@/components/scene/deepSky.strings";
import { withUnit } from "@/i18n/units";
import { formatNumber } from "@/lib/format";
import { CMB_AGE_YEARS, CMB_TEMPERATURE_K, OBSERVABLE_UNIVERSE_RADIUS_GLY, UNIVERSE_AGE_GYR } from "@/lib/astro/universe";
import { LOCAL_GROUP_MAGNIFICATION } from "@/lib/astro/scale";
import { MAP_GALAXY_COUNT, MAP_STAR_COUNT, RED_DWARF_COUNT, distanceMlyOf } from "./figures";
import type { CosmicContent } from "./types";

const { starNames, galaxyNames, galaxyDistance } = DEEP_SKY_STRINGS.es;

/** Nombre écrit comme Intl l'écrit en espagnol d'Espagne (point dès 5 chiffres seulement). */
const n = (value: number, digits = 0) => formatNumber(value, digits, "es");
const ly = (value: number, digits = 0) => withUnit(n(value, digits), "ly", "es");
const percent = (value: number) => withUnit(n(value), "percent", "es");

/*
 * Même contenu que le français, rédigé en espagnol (tuteo) pour un public de 12 ans et plus. Les milliards
 * s'écrivent « miles de millones » ; « billón » vaut 10¹² (2 billones de soles).
 */
export const COSMIC_ES: CosmicContent = {
  stops: {
    stars: {
      rank: "Más allá del sistema solar",
      name: "Las estrellas vecinas",
      hook: "La más cercana está a más de cuatro años luz.",
      lede: `Un año luz es la distancia que recorre la luz en un año: ${n(9.46, 2)} billones de kilómetros. ${starNames["proxima-centauri"]}, la estrella más cercana, está a ${n(4.25, 2)} años luz: su luz tarda 4 años y 3 meses en llegarnos. Incluso a 17 km/s, la sonda Voyager 1 tardaría unos ${n(75_000)} años en recorrer esa distancia. A menos de 10 años luz del Sol solo se conocen otros 7 sistemas estelares.`,
      facts: [
        { label: "Estrella más cercana", value: starNames["proxima-centauri"], note: ly(4.25, 2) },
        { label: "Su luz tarda", value: "4 años y 3 meses" },
        { label: "A bordo de la Voyager 1", value: `≈ ${n(75_000)} años`, note: "a 17 km/s" },
        { label: "La más brillante del cielo", value: starNames.sirius, note: `a ${ly(8.6, 1)}` },
        { label: "Sistemas a menos de 10 al", value: "7", note: "sin contar el Sol" },
        { label: "Enanas rojas del mapa", value: `${RED_DWARF_COUNT} de ${MAP_STAR_COUNT}`, note: "ninguna se ve a simple vista" },
      ],
      caveat: "Aquí las distancias están a escala; solo las estrellas están agrandadas.",
      source: "ESA, Gaia DR3; RECONS; NASA",
    },
    galaxy: {
      rank: "Nuestra galaxia",
      name: "La Vía Láctea",
      hook: "El Sol, una estrella entre cientos de miles de millones.",
      lede: `La Vía Láctea es un disco muy plano de unos ${n(100_000)} años luz de diámetro, con entre ${n(100_000)} y ${n(400_000)} millones de estrellas. El Sol está a unos ${n(27_000)} años luz del centro, en el brazo de Orión, un pequeño brazo encajado entre los de Sagitario y Perseo. Gira alrededor del centro a unos 230 km/s: cada vuelta dura unos 230 millones de años. En el centro se esconde un agujero negro gigante, Sagitario A*, más de 4 millones de veces más masivo que el Sol. Desde la Tierra, la Vía Láctea se ve como una franja lechosa en el cielo: es este disco, visto desde dentro y de canto.`,
      facts: [
        { label: "Diámetro del disco", value: `≈ ${ly(100_000)}` },
        { label: "Grosor del disco", value: `≈ ${ly(1000)}` },
        { label: "El Sol está a", value: `≈ ${ly(27_000)}`, note: "del centro" },
        { label: "Una vuelta al centro", value: "≈ 230 millones de años", note: "a unos 230 km/s" },
        { label: "Estrellas", value: `entre ${n(100_000)} y ${n(400_000)} millones` },
        { label: "En el centro", value: "Sagitario A*", note: "agujero negro de 4 millones de soles" },
        { label: "Estrellas más antiguas", value: `≈ ${n(13_000)} millones de años` },
      ],
      caveat: "Los brazos están dibujados a partir de un modelo simplificado.",
      source: "NASA; ESA; ESO; GRAVITY Collaboration (2022); Event Horizon Telescope (2022); Reid et al. (2019)",
    },
    localGroup: {
      rank: "Nuestras galaxias vecinas",
      name: "El Grupo Local",
      hook: "Andrómeda, nuestra gran vecina, está a 2,5 millones de años luz.",
      lede: `La Vía Láctea no está sola. Con la galaxia de Andrómeda, la galaxia del Triángulo y más de 100 galaxias pequeñas, sobre todo enanas, forma el Grupo Local: una familia de unos 10 millones de años luz de un extremo a otro, de límites difusos. Andrómeda es la más grande: en una noche de otoño bien oscura puedes verla a simple vista, una pequeña mancha borrosa cuya luz ha viajado durante 2,5 millones de años. Andrómeda y la Vía Láctea se acercan. Durante mucho tiempo se pensó que chocarían dentro de 4000 a 5000 millones de años; según un estudio de 2025, en realidad solo hay más o menos un 50 % de probabilidades de que se fusionen en los próximos ${n(10_000)} millones de años.`,
      facts: [
        { label: "Tamaño", value: "≈ 10 millones de al", note: "de un extremo a otro, de límites difusos" },
        { label: "Galaxias conocidas", value: "más de 100", note: "sobre todo enanas" },
        { label: galaxyNames.andromeda, value: galaxyDistance(distanceMlyOf("andromeda")), note: "la más grande, visible a simple vista" },
        { label: galaxyNames.triangulum, value: galaxyDistance(distanceMlyOf("triangulum")), note: "la tercera en masa" },
        {
          label: "Nubes de Magallanes",
          value: `${galaxyDistance(distanceMlyOf("large-magellanic-cloud"))} y ${galaxyDistance(distanceMlyOf("small-magellanic-cloud"))}`,
          note: "visibles desde el hemisferio sur",
        },
        { label: "Masa total", value: "≈ 2 billones de soles", note: "incluida la materia oscura" },
        {
          label: "Futuro con Andrómeda",
          value: `un ${percent(50)} de probabilidades`,
          note: `de fusionarse en ${n(10_000)} millones de años (estudio de 2025)`,
        },
      ],
      caveat: `Las distancias están a escala, las galaxias no: están agrandadas ${LOCAL_GROUP_MAGNIFICATION} veces para que se vean, y sus formas están estilizadas a partir de las mediciones. El mapa muestra ${MAP_GALAXY_COUNT} de las más de 100 galaxias del grupo, y las más pequeñas brillan un poco más que en la realidad.`,
      source:
        "McConnachie (2012, catálogo 2021); Li et al. (2021); Breuval et al. (2023); Pietrzyński et al. (2019); Graczyk et al. (2020); Karachentsev et al. (2009); Sawala et al. (2025); NASA",
    },
    universe: {
      rank: "Hasta donde alcanza nuestra mirada",
      name: "El Universo observable",
      hook: `Una esfera de unos ${n(93_000)} millones de años luz de diámetro, con nosotros en el centro.`,
      lede: `La luz de las galaxias más lejanas lleva viajando hacia nosotros casi ${n(UNIVERSE_AGE_GYR * 1000)} millones de años, la edad del Universo. Durante ese viaje, el propio espacio se ha estirado, como una goma elástica de la que se tira: hoy esas galaxias están a unos ${n(OBSERVABLE_UNIVERSE_RADIUS_GLY * 1000)} millones de años luz. Estamos en el centro de esta esfera simplemente porque es la parte del Universo que vemos, igual de lejos en todas las direcciones; el Universo en sí no tiene un centro conocido. Contiene cientos de miles de millones de galaxias, que dibujan una inmensa red de filamentos alrededor de vacíos gigantescos. En el mismo borde vemos la luz más antigua del Universo: el fondo cósmico de microondas.`,
      facts: [
        { label: "Radio", value: `≈ ${n(OBSERVABLE_UNIVERSE_RADIUS_GLY * 1000)} millones de al`, note: `diámetro ≈ ${n(93_000)} millones de al` },
        { label: "Edad del Universo", value: `${n(UNIVERSE_AGE_GYR * 1000)} millones de años` },
        { label: "Número de galaxias", value: "cientos de miles de millones" },
        {
          label: "Fondo cósmico de microondas",
          value: withUnit(n(CMB_TEMPERATURE_K, 3), "kelvin", "es"),
          note: `es decir, −${n(270.4, 1)} °C, liberado ${n(CMB_AGE_YEARS)} años después del Big Bang`,
        },
        { label: "Materia ordinaria", value: `≈ ${percent(5)}`, note: "estrellas, planetas, gas… y nosotros" },
        { label: "Materia oscura", value: `≈ ${percent(27)}`, note: "invisible, delatada por su gravedad" },
        { label: "Energía oscura", value: `≈ ${percent(68)}`, note: "acelera la expansión" },
      ],
      caveat: "La red está estilizada: la real es mucho más fina, con filamentos de unos 10 millones de años luz de ancho y vacíos de 90 a 240 millones de años luz. Las manchas del fondo cósmico están dibujadas, no tomadas de un mapa.",
      source:
        "Planck Collaboration (2020); Fixsen (2009); ESA; NOIRLab (2021); Cautun et al. (2014); van de Weygaert y Platen (2011)",
    },
    multiverse: {
      hypothesis: "Hipótesis: nadie ha observado nunca otro universo. Esta escala ilustra una idea debatida, no un descubrimiento.",
      rank: "Más allá de lo observable",
      name: "El multiverso",
      hook: "¿Y si existieran otros universos? Nadie lo sabe.",
      lede: "Lo que sabemos: nuestro universo observable tiene un límite, fijado por la edad del Universo y la velocidad de la luz. Más allá, el espacio muy probablemente continúa, pero no podemos verlo. Lo que se supone: algunas teorías, como la inflación eterna, la teoría de cuerdas o una interpretación de la física cuántica, sugieren que podrían existir otros universos, quizá con otras leyes físicas; a ese conjunto se le llama multiverso. Por qué se debate: nadie ha observado nunca uno, y muchos científicos se preguntan si una idea que no se puede comprobar sigue siendo ciencia. Otros buscan pistas, como la huella de un choque entre dos «burbujas» de universo en la luz más antigua del cielo: de momento, nada.",
      facts: [
        { label: "Otros universos observados", value: "ninguno" },
        { label: "Idea más conocida", value: "universos burbuja", note: "nacidos sin fin de la inflación eterna" },
        { label: "Pista buscada", value: "huellas de choques", note: "en el fondo cósmico de microondas: nada encontrado" },
        { label: "Otra vía", value: "la teoría de cuerdas", note: "aún sin confirmar" },
        { label: "Estado", value: "hipótesis debatida", note: "¿ciencia o filosofía?" },
      ],
      caveat: "Recreación artística: las otras burbujas, sus tamaños y sus posiciones son inventados para la imagen. Solo la nuestra, el Universo observable, tiene un tamaño medido.",
      source: "Tegmark (2003); Feeney et al. (2011); Carr y Ellis (2008); Ellis (2011); Quanta Magazine (2014)",
    },
  },
  starTable: {
    button: "Las estrellas del mapa",
    caption: "Las estrellas del mapa, de la más cercana a la más lejana",
    columns: ["Estrella", "Distancia", "Tipo"],
    types: {
      O: "azul",
      B: "blanco azulada",
      A: "blanca",
      F: "blanco amarillenta",
      G: "enana amarilla, como el Sol",
      K: "enana naranja",
      M: "enana roja",
    },
    notes: {
      "proxima-centauri": "la más cercana, ligada a Alfa Centauri A y B",
      "alpha-centauri": "dos estrellas de tamaño parecido al del Sol",
      barnard: "la estrella que más rápido se mueve en nuestro cielo",
      sirius: "la más brillante de nuestro cielo nocturno, con la enana blanca Sirio B",
      "luyten-726-8": "dos enanas rojas, BL Ceti y UV Ceti",
      "61-cygni": "estrella doble",
      procyon: "con la enana blanca Procyon B",
      "struve-2398": "estrella doble",
      "groombridge-34": "estrella doble",
      "epsilon-indi": "con dos enanas marrones",
      altair: "estrella brillante del cielo de verano",
    },
    typeNote:
      "En el mapa, el color de cada punto sigue la temperatura de la estrella: anaranjado para las más frías, las enanas rojas, y blanco azulado para las más calientes, como Sirio. Cuanto más grande es el punto, más luminosa es la estrella en realidad.",
  },
  galaxyTable: {
    button: "Las galaxias del mapa",
    caption: "Las galaxias del mapa, de la más cercana a la más lejana",
    columns: ["Galaxia", "Distancia", "Tamaño"],
    note: "Distancia desde el Sol; para la Vía Láctea, la de su centro. Tamaño: diámetro de la parte más brillante; las estrellas más alejadas suelen llegar más lejos.",
  },
  plate: { story: "Leer la ficha", back: "Volver al Sol", sources: "Fuentes:" },
};
