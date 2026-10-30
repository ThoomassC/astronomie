import { formatNumber } from "@/lib/format";
import type { SizesContent } from "./types";

/** Nombre écrit comme Intl l'écrit en français (espace fine insécable dès 4 chiffres). */
const n = (value: number) => formatNumber(value, 0, "fr");

/*
 * Valeurs et comparaisons tirées des données v2 (§ 1), vérifiées ou recalculées : rayons, températures, masses,
 * luminosités, distances, orbites englouties, temps de traversée de la lumière. Introduction, mots de couleur et
 * réglette : design v2, § 4.
 */
export const SIZES_FR: SizesContent = {
  intro: {
    title: "Dix étoiles, côte à côte.",
    text: "Faites défiler : chaque étoile est plus grande que la précédente, et toutes sont à la même échelle. Leur taille se compte en rayons du Soleil (R☉) : 764 R☉, c'est 764 fois le rayon du Soleil.",
    note: "Les tailles sont à l'échelle ; les étoiles, en vrai très éloignées les unes des autres, sont ici rangées côte à côte.",
    sceneDescription:
      "En arrière-plan, une vue 3D aligne les dix étoiles à leurs tailles relatives réelles ; la caméra recule d'une étoile à l'autre au fil du défilement.",
    start: "Commencer par la plus petite",
  },
  stars: {
    "proxima-centauri": {
      kind: "naine rouge",
      hook: "La plus proche voisine du Soleil, à peine une fois et demie la largeur de Jupiter.",
      lede: "Proxima du Centaure est l'étoile la plus proche du Soleil : sa lumière met 4,2 ans à nous parvenir. Cette naine rouge ne fait que 15 % de la taille du Soleil et brille plus de 600 fois moins que lui. Invisible à l'œil nu, elle ne se lève même jamais au-dessus de l'horizon en Europe.",
    },
    sun: {
      kind: "naine jaune",
      hook: "Vu de l'espace, le Soleil est presque blanc.",
      lede: `Les astronomes prennent le rayon du Soleil pour unité : 1 R☉, soit ${n(695_700)} km. Environ 1,3 million de Terres tiendraient dans son volume, et sa lumière met 4,6 secondes à le traverser de part en part. C'est notre air qui le fait paraître jaune, surtout bas sur l'horizon. Ne le regardez jamais directement, même avec des lunettes de soleil.`,
    },
    "sirius-a": {
      kind: "étoile blanche",
      hook: "La plus brillante de nos nuits n'est pas si grande.",
      lede: "Sirius A n'est que 1,7 fois plus large que le Soleil, mais elle est deux fois plus massive et près de 25 fois plus lumineuse. Plus chaude aussi, elle brille d'un blanc bleuté. On l'appelle Sirius A car une petite étoile tourne autour d'elle : la naine blanche Sirius B. Depuis l'Europe, cherchez-la les soirs d'hiver, assez bas vers le sud.",
    },
    pollux: {
      kind: "géante orange",
      hook: "Neuf Soleils côte à côte pour couvrir son diamètre.",
      lede: "Pollux est une géante : elle a épuisé l'hydrogène de son cœur, et ses couches extérieures ont gonflé en se refroidissant, d'où sa teinte orangée. C'est l'étoile la plus brillante des Gémeaux, haute dans le ciel en hiver et au printemps.",
    },
    arcturus: {
      kind: "géante orange",
      hook: "Presque la masse du Soleil, mais 25 fois sa largeur.",
      lede: "Arcturus a presque la masse du Soleil : elle donne une idée de ce que deviendra notre étoile, bien plus tard, quand elle gonflera à son tour. À sa place, sa surface irait à 0,12 UA du centre, soit 30 % du chemin jusqu'à l'orbite de Mercure. Cherchez-la haut dans le ciel au printemps et en été, dans la constellation du Bouvier.",
    },
    aldebaran: {
      kind: "géante orange",
      hook: "Au centre du système solaire, elle irait à mi-chemin de l'orbite de Mercure.",
      lede: `Aldébaran est une autre géante : il faudrait 45 Soleils côte à côte pour couvrir son diamètre. À ${n(3900)} K, sa surface est bien plus froide que celle du Soleil (${n(5772)} K), ce qui lui donne sa couleur orangée. Elle brille dans le Taureau, de novembre à mars.`,
    },
    rigel: {
      kind: "supergéante bleue",
      hook: "Bleutée, brûlante, et des dizaines de milliers de fois plus lumineuse que le Soleil.",
      lede: `Rigel est une supergéante, environ 21 fois plus massive que le Soleil, qui consomme son combustible à toute allure. À ${n(12_100)} K, sa surface est deux fois plus chaude que celle du Soleil, d'où sa teinte bleutée. À sa place, elle frôlerait l'orbite de Mercure. On la voit en hiver, dans Orion.`,
      caveat: `Sa distance fait encore débat : à ${n(1170)} années-lumière plutôt qu'à 860, son rayon approcherait 106 R☉.`,
    },
    "antares-a": {
      kind: "supergéante rouge",
      hook: "Assez grande pour engloutir l'orbite de Mars.",
      lede: "Antarès A est une supergéante rouge, environ 13 fois plus massive que le Soleil et des dizaines de milliers de fois plus lumineuse. À sa place, elle engloutirait Mercure, Vénus, la Terre et Mars, presque jusqu'au bord extérieur de la ceinture d'astéroïdes, et la lumière mettrait 53 minutes à la traverser. Depuis l'Europe, elle reste basse au sud, dans le Scorpion, en juin et juillet.",
      caveat: "L'étoile pulse : son rayon varie d'environ 19 %, et sa distance n'est connue qu'à 17 % près.",
    },
    betelgeuse: {
      kind: "supergéante rouge",
      hook: "Son volume contiendrait environ 450 millions de Soleils.",
      lede: "Bételgeuse, l'épaule d'Orion, est l'une des plus grandes étoiles visibles à l'œil nu. Sa surface n'a pas de bord net : son atmosphère se dilue peu à peu dans l'espace. À la place du Soleil, elle dépasserait la ceinture d'astéroïdes, aux deux tiers du chemin vers Jupiter, et la lumière mettrait environ une heure à la traverser. En 2025, des astronomes ont probablement repéré une petite compagne qui tourne autour d'elle.",
      caveat: "Sa taille dépend de sa distance, encore discutée.",
    },
    "vy-canis-majoris": {
      kind: "hypergéante rouge",
      hook: "La plus grande étoile dont on connaît à la fois le diamètre et la distance.",
      lede: `VY Canis Majoris, dans le Grand Chien, est une hypergéante rouge environ ${n(270_000)} fois plus lumineuse que le Soleil. La lumière mettrait près de 2 heures à la traverser, et un avion de ligne à 900 km/h environ 790 ans à en faire le tour. À côté d'elle, le Soleil n'est plus qu'un point.`,
      caveat: `Avant 2012, les estimations allaient de 600 à ${n(3000)} R☉. D'autres étoiles sont peut-être plus grandes, mais leur taille reste trop incertaine pour les comparer.`,
    },
  },
  facts: {
    radius: "Rayon",
    type: "Type",
    temperature: "Température de surface",
    distance: "Distance de la Terre",
    comparison: "Pour comparer",
    sunDistance: "8,3 minutes-lumière",
  },
  tints: { orange: "orangée", "pale-orange": "orange pâle", white: "blanche", "bluish-white": "blanc bleuté" },
  vsSun: {
    cooler: `plus froide que le Soleil (${n(5772)} K)`,
    hotter: `plus chaude que le Soleil (${n(5772)} K)`,
    reference: "notre référence",
  },
  thermo: { cooler: "plus froide", hotter: "plus chaude" },
  plate: { story: "Lire la fiche", restart: "Revenir à la plus petite étoile", sources: "Sources :" },
};
