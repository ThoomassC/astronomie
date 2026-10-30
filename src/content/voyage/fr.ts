import { ABOUT_URLS, ccByUrl } from "@/content/about/structure";
import { bodyName } from "@/i18n/names";
import { plural, type PluralForms } from "@/i18n/plural";
import { formatNumber } from "@/lib/format";
import { nearbyStarsSource } from "./structure";
import type { BeyondMarkTexts, VoyageContent } from "./types";

const PLANET_RANK = "planète en partant du Soleil";
const FROM_EARTH = "Ce jour, depuis la Terre";
const HOURS: PluralForms = { one: "heure", other: "heures" };

/** Durée lue à voix haute : « ≈ 7 h » → « environ 7 heures », « 4 h 10 » → « 4 heures 10 ». */
function spoken(value: string): string {
  return value
    .replace("≈", "environ")
    .replace(
      /(\d+) h(?: (\d+))?/,
      (_match: string, hours: string, minutes: string | undefined) =>
        `${hours} ${plural("fr", Number(hours), HOURS)}${minutes ? ` ${minutes}` : ""}`,
    );
}

/*
 * Textes d'origine du voyage, repris mot pour mot des anciens contenus (`src/content/stops.ts`, `site.ts`), espaces
 * comprises ; `fr.test.ts` le garde jusqu'à la clôture.
 */
export const VOYAGE_FR: VoyageContent = {
  hero: {
    title: "Huit planètes, une étoile, et beaucoup de vide.",
    text: "Chaque planète part de sa vraie place du jour. Faites défiler pour quitter le Soleil, rejoindre Neptune, à quatre heures-lumière de là, puis les étoiles voisines et la Voie lactée.",
    sceneDescription:
      "En arrière-plan, une vue 3D du système solaire aux positions du jour ; la caméra suit le défilement.",
    stampPrefix: "Positions réelles au départ :",
    start: "Partir du Soleil",
  },
  plate: { story: "Lire la fiche", more: "Lire la suite" },
  // Accordé à « planète », féminin : 1re, puis 2e, 3e…
  ordinal: (n) => ({ number: formatNumber(n, 0, "fr"), suffix: n === 1 ? "re" : "e" }),
  bodies: {
    sun: {
      rank: "L'étoile au centre",
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
      live: FROM_EARTH,
      module: {
        title: "La course de la lumière",
        intro:
          "Un éclair part du Soleil. Les distances sont à l'échelle : regardez où se trouvent les quatre premières planètes.",
        button: "La course de la lumière",
      },
    },
    mercury: {
      rank: PLANET_RANK,
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
      live: FROM_EARTH,
      module: {
        title: "La loi des aires",
        intro:
          "Kepler, 1609 : une planète balaie des aires égales en des temps égaux. Chaque secteur dure 8 jours. Près du Soleil, Mercure accélère.",
        button: "Pourquoi Mercure accélère",
      },
    },
    venus: {
      rank: PLANET_RANK,
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
      live: FROM_EARTH,
      module: {
        title: "Qui boucle son tour en premier ?",
        intro: "À gauche, le tour du Soleil. À droite, le tour de Vénus sur elle-même. Même horloge pour les deux.",
        button: "Le jour contre l'année",
      },
    },
    earth: {
      rank: PLANET_RANK,
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
      live: "Ce jour, distance au Soleil",
      module: {
        title: "Pourquoi des saisons ?",
        intro:
          "En haut ou à gauche, la Terre sur son orbite, vue d'en haut. Vue de côté : la part du tour passée au soleil à la latitude de Paris.",
        button: "Pourquoi des saisons ?",
      },
    },
    mars: {
      rank: PLANET_RANK,
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
      live: FROM_EARTH,
      module: {
        title: "Ce qu'afficherait une balance",
        intro: "Votre masse reste la même partout. Le poids, lui, dépend de la gravité de l'astre.",
        button: "Votre poids sur chaque astre",
      },
    },
    jupiter: {
      rank: PLANET_RANK,
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
      live: FROM_EARTH,
      module: {
        title: "Les tailles, enfin à l'échelle",
        intro: "Survolez ou touchez une planète pour lire son diamètre.",
        button: "Comparer les tailles",
      },
    },
    saturn: {
      rank: PLANET_RANK,
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
      live: FROM_EARTH,
      module: {
        title: "Les anneaux vus depuis la Terre",
        intro:
          "Selon l'endroit de son orbite de 29 ans, on voit les anneaux par-dessus, par-dessous ou par la tranche.",
        button: "Les anneaux vus de la Terre",
      },
    },
    uranus: {
      rank: PLANET_RANK,
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
      live: FROM_EARTH,
      module: {
        title: "Les saisons d'Uranus",
        intro:
          "Le même schéma que pour la Terre, avec un axe incliné de 98°. Latitude de référence : 49° nord, comme Paris.",
        button: "Les saisons d'Uranus",
      },
    },
    neptune: {
      rank: PLANET_RANK,
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
      live: FROM_EARTH,
      module: {
        title: "Une seule année neptunienne",
        intro:
          "Le cadran représente un tour complet de Neptune autour du Soleil, depuis sa découverte. Situez votre vie dessus.",
        button: "Votre âge sur Neptune",
      },
    },
  },
  interlude: {
    title: "La ceinture d'astéroïdes",
    text: "Entre Mars et Jupiter, plus d'un million d'astéroïdes connus. Réunis, ils pèseraient à peine 3 % de la Lune.",
    cite: "La ceinture principale, entre 2,1 et 3,3 UA du Soleil",
  },
  beyond: {
    rank: "Au-delà de Neptune",
    name: "Le grand vide",
    hook: "Les distances, enfin à l'échelle.",
    lede: "Au-delà de Neptune s'étend la ceinture de Kuiper : des milliers de corps glacés, dont Pluton, classée planète naine depuis 2006. Plus loin encore voyage Voyager 1, lancée en 1977. En novembre 2026, elle atteindra un jour-lumière de la Terre : 25,9 milliards de km.",
    scaleTitle: "Distances en temps de lumière depuis le Soleil",
    marks: {
      neptune: { label: bodyName("neptune", "fr"), value: "4 h 10" },
      pluto: { label: "Pluton", value: "5 h 28" },
      kuiper: { label: "Kuiper", value: "≈ 7 h" },
      voyager2: { label: "Voyager 2", value: "≈ 20 h" },
      voyager1: { label: "Voyager 1", value: "≈ 24 h" },
    },
    scaleStart: "Soleil, 0 h",
    spoken,
    spokenScale: (marks: readonly BeyondMarkTexts[]) =>
      `${marks.map(({ label, value }) => `${label} : ${spoken(value)}`).join(" ; ")}.`,
    back: "Revenir au Soleil",
  },
  footer: {
    sources: `Sources : NASA, Planetary Fact Sheet ; JPL, éléments orbitaux approchés des planètes (valables de 1800 à 2050) ; nombres de lunes : NASA et UAI, 2025. Étoiles voisines : ${nearbyStarsSource("fr")}. Voie lactée : modèle simplifié d'après Reid et al. (2019), GRAVITY Collaboration (2022) et la NASA.`,
    scale:
      "Sauf en mode « distances réelles », les tailles sont agrandies et les distances compressées pour que tout tienne à l'écran.",
    textures: {
      before: "Cartes des astres : ",
      source: { label: "Solar System Scope", href: ABOUT_URLS.solarSystemScope },
      between: ", d'après des données de la NASA, redimensionnées pour le site. Licence ",
      license: { label: "CC BY 4.0", href: ccByUrl("fr") },
      after: ".",
    },
  },
  skipToDock: "Aller à la machine à remonter le temps",
};
