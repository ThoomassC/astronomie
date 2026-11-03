import { formatNumber } from "@/lib/format";
import type { SizesContent } from "./types";

/** Nombre écrit comme Intl l'écrit en espagnol d'Espagne (point dès 5 chiffres, aucun séparateur à 4). */
const n = (value: number) => formatNumber(value, 0, "es");

/*
 * Même contenu que le français (valeurs et comparaisons des données v2, § 1 ; introduction et mots de couleur du
 * design v2, § 4), rédigé en espagnol d'Espagne, en tutoyant, pour un public de 12 ans et plus.
 */
export const SIZES_ES: SizesContent = {
  intro: {
    title: "Diez estrellas, en fila.",
    text: "Desplázate: cada estrella es más grande que la anterior y todas están a la misma escala. El tamaño se cuenta en radios solares (R☉): 764 R☉ es 764 veces el radio del Sol.",
    note: "Los tamaños están a escala; las estrellas, en realidad muy lejos unas de otras, aparecen aquí en fila.",
    sceneDescription:
      "Al fondo, una vista en 3D alinea las diez estrellas con sus tamaños relativos reales; la cámara se aleja de una estrella a otra a medida que te desplazas.",
    start: "Empezar por la más pequeña",
  },
  stars: {
    "proxima-centauri": {
      kind: "enana roja",
      hook: "La vecina más cercana del Sol, apenas una vez y media más ancha que Júpiter.",
      lede: "Próxima Centauri es la estrella más cercana al Sol: su luz tarda 4,2 años en llegarnos. Esta enana roja mide solo el 15 % del Sol y brilla más de 600 veces menos que él. No se ve a simple vista y, desde Europa, ni siquiera asoma por encima del horizonte.",
    },
    sun: {
      kind: "enana amarilla",
      hook: "Visto desde el espacio, el Sol es casi blanco.",
      lede: `Los astrónomos usan el radio del Sol como unidad: 1 R☉, es decir, ${n(695_700)} km. En su volumen cabrían unos 1,3 millones de Tierras, y su luz tarda 4,6 segundos en atravesarlo de lado a lado. Es nuestro aire el que lo hace parecer amarillo, sobre todo cerca del horizonte. No lo mires nunca directamente, ni siquiera con gafas de sol.`,
    },
    "sirius-a": {
      kind: "estrella blanca",
      hook: "La estrella más brillante de nuestras noches no es tan grande.",
      lede: "Sirio A es solo 1,7 veces más ancha que el Sol, pero tiene el doble de masa y es casi 25 veces más luminosa. También es más caliente, por eso brilla con un blanco azulado. Se llama Sirio A porque a su alrededor gira una estrella pequeña: la enana blanca Sirio B. Desde Europa, búscala en las noches de invierno, bastante baja hacia el sur.",
    },
    pollux: {
      kind: "gigante naranja",
      hook: "Harían falta nueve soles en fila para cubrir su diámetro.",
      lede: "Pólux es una gigante: ha agotado el hidrógeno de su núcleo y sus capas exteriores se han hinchado y enfriado, por eso se ve anaranjada. Es la estrella más brillante de Géminis, alta en el cielo en invierno y primavera.",
    },
    arcturus: {
      kind: "gigante naranja",
      hook: "Casi la masa del Sol, pero 25 veces más ancha.",
      lede: "Arturo tiene casi la misma masa que el Sol: nos da una idea de en qué se convertirá nuestra estrella, mucho más adelante, cuando también se hinche. En el lugar del Sol, su superficie quedaría a 0,12 UA del centro, el 30 % del camino hasta la órbita de Mercurio. Búscala alta en el cielo en primavera y verano, en la constelación del Boyero.",
    },
    aldebaran: {
      kind: "gigante naranja",
      hook: "En el centro del sistema solar, llegaría a medio camino de la órbita de Mercurio.",
      lede: `Aldebarán es otra gigante: harían falta 45 soles en fila para cubrir su diámetro. A ${n(3900)} K, su superficie es mucho más fría que la del Sol (${n(5772)} K), y eso le da su color anaranjado. Brilla en Tauro de noviembre a marzo.`,
    },
    rigel: {
      kind: "supergigante azul",
      hook: "Azulada, ardiente y decenas de miles de veces más luminosa que el Sol.",
      lede: `Rigel es una supergigante, unas 21 veces más masiva que el Sol, que consume su combustible a toda velocidad. A ${n(12_100)} K, su superficie tiene el doble de temperatura que la del Sol, de ahí su tono azulado. En el lugar del Sol, casi rozaría la órbita de Mercurio. Puedes verla en invierno, en Orión.`,
      caveat: `Su distancia aún se discute: si estuviera a ${n(1170)} años luz en lugar de 860, su radio sería de unos 101 R☉.`,
    },
    "antares-a": {
      kind: "supergigante roja",
      hook: "Tan grande que se tragaría la órbita de Marte.",
      lede: "Antares A es una supergigante roja, unas 13 veces más masiva que el Sol y decenas de miles de veces más luminosa. En el lugar del Sol, se tragaría Mercurio, Venus, la Tierra y Marte, casi hasta el borde exterior del cinturón de asteroides, y la luz tardaría 53 minutos en atravesarla. Desde Europa se ve baja hacia el sur, en Escorpio, en junio y julio.",
      caveat: "La estrella pulsa: su radio varía alrededor de un 19 %, y su distancia solo se conoce con un margen del 17 %.",
    },
    betelgeuse: {
      kind: "supergigante roja",
      hook: "Su volumen podría contener unos 450 millones de soles.",
      lede: "Betelgeuse, el hombro de Orión, es una de las estrellas más grandes que se ven a simple vista. Su superficie no tiene un borde nítido: su atmósfera se diluye poco a poco en el espacio. En el lugar del Sol, llegaría más allá del cinturón de asteroides, a dos tercios del camino hasta Júpiter, y la luz tardaría alrededor de una hora en atravesarla. En 2025, unos astrónomos detectaron, probablemente, una pequeña compañera que gira a su alrededor.",
      caveat: "Su tamaño depende de su distancia, que todavía se discute.",
    },
    "vy-canis-majoris": {
      kind: "hipergigante roja",
      hook: "La estrella más grande de la que se conocen a la vez el diámetro y la distancia.",
      lede: `VY Canis Majoris, en el Can Mayor, es una hipergigante roja unas ${n(270_000)} veces más luminosa que el Sol. La luz tardaría casi 2 horas en atravesarla, y un avión de pasajeros a 900 km/h necesitaría unos 790 años para darle la vuelta. A su lado, el Sol es solo un punto.`,
      caveat: `Antes de 2012, las estimaciones iban de 600 a ${n(3000)} R☉. Puede que otras estrellas sean más grandes, pero su tamaño aún es demasiado incierto para compararlas.`,
    },
  },
  facts: {
    radius: "Radio",
    type: "Tipo",
    temperature: "Temperatura de la superficie",
    distance: "Distancia a la Tierra",
    comparison: "Para comparar",
    sunDistance: "8,3 minutos luz",
  },
  tints: { orange: "anaranjada", "pale-orange": "naranja pálido", white: "blanca", "bluish-white": "blanco azulado" },
  vsSun: {
    cooler: `más fría que el Sol (${n(5772)} K)`,
    hotter: `más caliente que el Sol (${n(5772)} K)`,
    reference: "nuestra referencia",
  },
  thermo: { cooler: "más fría", hotter: "más caliente" },
  plate: { story: "Leer la ficha", restart: "Volver a la estrella más pequeña", sources: "Fuentes:" },
};
