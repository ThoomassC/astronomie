import type { PlanetKey } from "@/lib/astro/planets";

export type ModuleKind =
  | "light-race"
  | "kepler"
  | "venus-race"
  | "seasons-earth"
  | "weight"
  | "sizes"
  | "saturn-rings"
  | "seasons-uranus"
  | "neptune-year";

export interface Fact {
  label: string;
  value: string;
  note?: string;
}

export interface BodyStop {
  kind: "body";
  key: "sun" | PlanetKey;
  /** Ancre de la section (#soleil). */
  id: string;
  name: string;
  color: string;
  /** Rang depuis le Soleil : « 3ᵉ planète en partant du Soleil ». */
  rank: { ordinal?: number; label: string };
  hook: string;
  lede: string;
  facts: readonly Fact[];
  /** Ligne recalculée avec la date simulée (distance à la Terre, ou au Soleil pour la Terre). */
  live: { label: string };
  /** `button` : libellé du bouton qui déplie le module sur téléphone. */
  module: { kind: ModuleKind; title: string; intro: string; button: string };
}

export interface InterludeStop {
  kind: "interlude";
  key: "belt";
  id: string;
  text: string;
  cite: string;
}

export type Stop = BodyStop | InterludeStop;

const PLANET_RANK = "planète en partant du Soleil";
const FROM_EARTH = "Ce jour, depuis la Terre";

export const STOPS: readonly Stop[] = [
  {
    kind: "body", key: "sun", id: "soleil", name: "Soleil", color: "#FFB13B",
    rank: { label: "L'étoile au centre" },
    hook: "Une étoile ordinaire, vue de très près.",
    lede: "Le Soleil concentre 99,86 % de la masse du système solaire. En son cœur, à 15 millions de degrés, il transforme chaque seconde environ 600 millions de tonnes d'hydrogène en hélium. Sa lumière met 8 minutes et 19 secondes à nous parvenir : on voit toujours le Soleil tel qu'il était un peu plus tôt.",
    facts: [
      { label: "Diamètre", value: "1 392 700 km", note: "109 Terres côte à côte" },
      { label: "Masse", value: "333 000 Terres", note: "99,86 % du système" },
      { label: "Surface", value: "5 500 °C" },
      { label: "Cœur", value: "15 millions °C" },
      { label: "Un tour sur lui-même", value: "25 jours", note: "à l'équateur, 35 aux pôles" },
      { label: "Âge", value: "4,6 milliards d'années" },
    ],
    live: { label: FROM_EARTH },
    module: { kind: "light-race", title: "La course de la lumière", button: "La course de la lumière", intro: "Un éclair part du Soleil. Les distances sont à l'échelle : regardez où se trouvent les quatre premières planètes." },
  },
  {
    kind: "body", key: "mercury", id: "mercure", name: "Mercure", color: "#B5ADA3",
    rank: { ordinal: 1, label: PLANET_RANK },
    hook: "La plus petite, et la plus rapide.",
    lede: "Mercure fait le tour du Soleil en 88 jours, à 47 km/s en moyenne. Son orbite est la plus allongée des huit : sa distance au Soleil varie de 46 à 70 millions de km. Sans atmosphère pour garder la chaleur, sa surface passe de 430 °C le jour à −180 °C la nuit.",
    facts: [
      { label: "Distance au Soleil", value: "0,39 UA", note: "57,9 millions de km" },
      { label: "Diamètre", value: "4 879 km", note: "0,38 Terre" },
      { label: "Une année", value: "88 jours" },
      { label: "Un jour, de lever à lever", value: "176 jours" },
      { label: "Températures", value: "−180 à 430 °C" },
      { label: "Gravité", value: "0,38 g" },
      { label: "Lunes", value: "0" },
      { label: "Vitesse moyenne", value: "47,4 km/s" },
    ],
    live: { label: FROM_EARTH },
    module: { kind: "kepler", title: "La loi des aires", button: "Pourquoi Mercure accélère", intro: "Kepler, 1609 : une planète balaie des aires égales en des temps égaux. Chaque secteur dure 8 jours. Près du Soleil, Mercure accélère." },
  },
  {
    kind: "body", key: "venus", id: "venus", name: "Vénus", color: "#E6CB94",
    rank: { ordinal: 2, label: PLANET_RANK },
    hook: "Un jour plus long que son année.",
    lede: "Vénus tourne sur elle-même en 243 jours, plus lentement qu'elle ne fait le tour du Soleil (225 jours). Elle tourne aussi dans l'autre sens : là-bas, le Soleil se lève à l'ouest. Son atmosphère épaisse de gaz carbonique piège la chaleur : 464 °C au sol, plus que sur Mercure.",
    facts: [
      { label: "Distance au Soleil", value: "0,72 UA", note: "108,2 millions de km" },
      { label: "Diamètre", value: "12 104 km", note: "0,95 Terre" },
      { label: "Une année", value: "225 jours" },
      { label: "Un tour sur elle-même", value: "243 jours", note: "dans l'autre sens" },
      { label: "Température au sol", value: "464 °C" },
      { label: "Gravité", value: "0,90 g" },
      { label: "Lunes", value: "0" },
      { label: "Pression au sol", value: "92 bar", note: "92 fois celle de la Terre" },
    ],
    live: { label: FROM_EARTH },
    module: { kind: "venus-race", title: "Qui boucle son tour en premier ?", button: "Le jour contre l'année", intro: "À gauche, le tour du Soleil. À droite, le tour de Vénus sur elle-même. Même horloge pour les deux." },
  },
  {
    kind: "body", key: "earth", id: "terre", name: "Terre", color: "#5B9BE6",
    rank: { ordinal: 3, label: PLANET_RANK },
    hook: "Inclinée de 23,44°, d'où les saisons.",
    lede: "Les saisons ne viennent pas de la distance au Soleil : la Terre en est même au plus près début janvier. Elles viennent de l'inclinaison de son axe, qui pointe toujours dans la même direction. En juin, l'hémisphère nord reçoit le Soleil plus haut et plus longtemps ; en décembre, c'est l'inverse.",
    facts: [
      { label: "Distance au Soleil", value: "1 UA", note: "149,6 millions de km" },
      { label: "Diamètre", value: "12 756 km" },
      { label: "Une année", value: "365,25 jours" },
      { label: "Un jour", value: "24 h" },
      { label: "Température moyenne", value: "15 °C" },
      { label: "Gravité", value: "1 g", note: "9,81 m/s²" },
      { label: "Lunes", value: "1" },
      { label: "Inclinaison de l'axe", value: "23,44°" },
    ],
    live: { label: "Ce jour, distance au Soleil" },
    module: { kind: "seasons-earth", title: "Pourquoi des saisons ?", button: "Pourquoi des saisons ?", intro: "En haut ou à gauche, la Terre sur son orbite, vue d'en haut. Vue de côté : la part du tour passée au soleil à la latitude de Paris." },
  },
  {
    kind: "body", key: "mars", id: "mars", name: "Mars", color: "#DA6A43",
    rank: { ordinal: 4, label: PLANET_RANK },
    hook: "Un désert froid, couleur de rouille.",
    lede: "Sa couleur vient de l'oxyde de fer, la rouille, qui recouvre ses roches et sa poussière. Mars porte Olympus Mons, le plus haut volcan connu : environ 22 km, deux fois et demie l'Everest. Sa gravité ne vaut que 38 % de celle de la Terre.",
    facts: [
      { label: "Distance au Soleil", value: "1,52 UA", note: "227,9 millions de km" },
      { label: "Diamètre", value: "6 792 km", note: "0,53 Terre" },
      { label: "Une année", value: "687 jours" },
      { label: "Un jour", value: "24 h 40 min" },
      { label: "Température moyenne", value: "−65 °C" },
      { label: "Gravité", value: "0,38 g" },
      { label: "Lunes", value: "2", note: "Phobos et Déimos" },
      { label: "Plus haut volcan", value: "≈ 22 km" },
    ],
    live: { label: FROM_EARTH },
    module: { kind: "weight", title: "Ce qu'afficherait une balance", button: "Votre poids sur chaque astre", intro: "Votre masse reste la même partout. Le poids, lui, dépend de la gravité de l'astre." },
  },
  {
    kind: "interlude", key: "belt", id: "ceinture",
    text: "Entre Mars et Jupiter, plus d'un million d'astéroïdes connus. Réunis, ils pèseraient à peine 3 % de la Lune.",
    cite: "La ceinture principale, entre 2,1 et 3,3 UA du Soleil",
  },
  {
    kind: "body", key: "jupiter", id: "jupiter", name: "Jupiter", color: "#D8A878",
    rank: { ordinal: 5, label: PLANET_RANK },
    hook: "Deux fois et demie plus massive que toutes les autres planètes réunies.",
    lede: "Jupiter est une géante gazeuse : pas de sol, mais des couches de nuages emportées par des vents violents. On pourrait aligner 11 Terres sur son diamètre. Sa Grande Tache rouge est une tempête plus large que la Terre, observée depuis plus de 150 ans.",
    facts: [
      { label: "Distance au Soleil", value: "5,20 UA", note: "778,5 millions de km" },
      { label: "Diamètre", value: "142 984 km", note: "11,2 Terres" },
      { label: "Une année", value: "11,9 ans" },
      { label: "Un jour", value: "9 h 56 min", note: "le plus court" },
      { label: "Sommet des nuages", value: "−110 °C" },
      { label: "Gravité", value: "2,53 g" },
      { label: "Lunes", value: "95 connues" },
      { label: "Volume", value: "1 321 Terres" },
    ],
    live: { label: FROM_EARTH },
    module: { kind: "sizes", title: "Les tailles, enfin à l'échelle", button: "Comparer les tailles", intro: "Survolez ou touchez une planète pour lire son diamètre." },
  },
  {
    kind: "body", key: "saturn", id: "saturne", name: "Saturne", color: "#E2C98F",
    rank: { ordinal: 6, label: PLANET_RANK },
    hook: "Des anneaux larges de 270 000 km, épais d'une dizaine de mètres.",
    lede: "Les anneaux sont faits de milliards de blocs de glace, du grain de poussière à la taille d'une maison. Ils sont si fins que, vus par la tranche, ils disparaissent presque : c'est arrivé depuis la Terre en mars 2025. Saturne elle-même est moins dense que l'eau.",
    facts: [
      { label: "Distance au Soleil", value: "9,54 UA", note: "1,43 milliard de km" },
      { label: "Diamètre", value: "120 536 km", note: "9,4 Terres" },
      { label: "Une année", value: "29,4 ans" },
      { label: "Un jour", value: "10 h 34 min" },
      { label: "Sommet des nuages", value: "−140 °C" },
      { label: "Gravité", value: "1,07 g" },
      { label: "Lunes", value: "274 connues" },
      { label: "Densité", value: "0,69", note: "l'eau : 1" },
    ],
    live: { label: FROM_EARTH },
    module: { kind: "saturn-rings", title: "Les anneaux vus depuis la Terre", button: "Les anneaux vus de la Terre", intro: "Selon l'endroit de son orbite de 29 ans, on voit les anneaux par-dessus, par-dessous ou par la tranche." },
  },
  {
    kind: "body", key: "uranus", id: "uranus", name: "Uranus", color: "#9ED9DE",
    rank: { ordinal: 7, label: PLANET_RANK },
    hook: "Elle tourne autour du Soleil couchée sur le côté.",
    lede: "Son axe est incliné de 98° : chaque pôle connaît environ 42 ans de jour, puis 42 ans de nuit. Sa couleur bleu-vert vient du méthane, qui absorbe la lumière rouge. C'est la première planète découverte au télescope, par William Herschel en 1781.",
    facts: [
      { label: "Distance au Soleil", value: "19,2 UA", note: "2,87 milliards de km" },
      { label: "Diamètre", value: "51 118 km", note: "4 Terres" },
      { label: "Une année", value: "84 ans" },
      { label: "Un jour", value: "17 h 14 min", note: "dans l'autre sens" },
      { label: "Sommet des nuages", value: "−195 °C" },
      { label: "Gravité", value: "0,90 g" },
      { label: "Lunes", value: "29 connues" },
      { label: "Inclinaison de l'axe", value: "97,8°" },
    ],
    live: { label: FROM_EARTH },
    module: { kind: "seasons-uranus", title: "Les saisons d'Uranus", button: "Les saisons d'Uranus", intro: "Le même schéma que pour la Terre, avec un axe incliné de 98°. Latitude de référence : 49° nord, comme Paris." },
  },
  {
    kind: "body", key: "neptune", id: "neptune", name: "Neptune", color: "#5878E8",
    rank: { ordinal: 8, label: PLANET_RANK },
    hook: "Trouvée par le calcul avant d'être vue.",
    lede: "En 1846, Urbain Le Verrier constate qu'Uranus s'écarte de la route prévue. Il en déduit la position d'une planète inconnue. Le 23 septembre, Johann Galle pointe son télescope à l'endroit indiqué : Neptune est là, à environ un degré de la prédiction. Depuis, elle n'a bouclé qu'un seul tour du Soleil, en 2011.",
    facts: [
      { label: "Distance au Soleil", value: "30,1 UA", note: "4,5 milliards de km" },
      { label: "Diamètre", value: "49 528 km", note: "3,9 Terres" },
      { label: "Une année", value: "164,8 ans" },
      { label: "Un jour", value: "16 h 06 min" },
      { label: "Sommet des nuages", value: "−200 °C" },
      { label: "Gravité", value: "1,14 g" },
      { label: "Lunes", value: "16 connues" },
      { label: "Vents", value: "jusqu'à 2 100 km/h" },
    ],
    live: { label: FROM_EARTH },
    module: { kind: "neptune-year", title: "Une seule année neptunienne", button: "Votre âge sur Neptune", intro: "Le cadran représente un tour complet de Neptune autour du Soleil, depuis sa découverte. Situez votre vie dessus." },
  },
];
