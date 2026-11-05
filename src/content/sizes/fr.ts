import { SHADOW_RADIUS_RS } from "@/lib/astro/schwarzschild";
import { formatNumber } from "@/lib/format";
import type { SizesContent } from "./types";

/** Nombre écrit comme Intl l'écrit en français (espace fine insécable dès 4 chiffres). */
const n = (value: number) => formatNumber(value, 0, "fr");

/** L'ombre, √27/2 ≈ 2,6 fois l'horizon (schwarzschild.ts). */
const shadowTimes = formatNumber(SHADOW_RADIUS_RS, 1, "fr");

/*
 * Valeurs et comparaisons tirées des données v2 (§ 1), vérifiées ou recalculées : rayons, températures, masses,
 * luminosités, distances, orbites englouties, temps de traversée de la lumière. Trous noirs : fiche documentaire des
 * trous noirs (novembre 2026), chaque nombre vérifié par content.test.ts. Introduction, mots de couleur et réglette :
 * design v2, § 4.
 */
export const SIZES_FR: SizesContent = {
  intro: {
    title: "Étoiles et trous noirs, côte à côte.",
    text: `Faites défiler : chaque astre est plus grand que le précédent, et tous sont à la même échelle. Leur taille se compte en rayons du Soleil (R☉) : 764 R☉, c'est 764 fois le rayon du Soleil. Un trou noir n'a pas de surface : on le mesure à son ombre, le disque noir que dessine la lumière qu'il dévie, ${shadowTimes} fois plus large que son horizon.`,
    note: "Les tailles sont à l'échelle ; les astres, en vrai très éloignés les uns des autres, sont ici rangés côte à côte. Les trous noirs sont des rendus calculés : la lumière y suit la courbure de l'espace.",
    sceneDescription:
      "En arrière-plan, une vue 3D aligne dix étoiles et quatre trous noirs à leurs tailles relatives réelles ; la caméra recule d'un astre à l'autre au fil du défilement.",
    start: "Commencer par le plus petit",
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
      caveat: `Sa distance fait encore débat : à ${n(1170)} années-lumière plutôt qu'à 860, son rayon serait d'environ 101 R☉.`,
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
  blackHoles: {
    "cygnus-x-1": {
      kind: "trou noir stellaire",
      hook: "Environ 15 à 20 fois la masse du Soleil, dans une ombre de quelques centaines de kilomètres.",
      lede: "Cygnus X-1 est le premier objet que les astronomes ont reconnu comme un trou noir, au début des années 1970. Il tourne en 5,6 jours autour d'une étoile supergéante bleue, dont il avale le vent. En 1974, le physicien Stephen Hawking avait parié que ce n'en était pas un ; il a reconnu sa défaite en 1990. Son horizon (sans rotation) ne mesure qu'une centaine de kilomètres de diamètre : la Terre est environ cent fois plus large.",
      simplification:
        "Rendu calculé : la lumière suit la courbure de l'espace autour d'un trou noir sans rotation. Le disque, qui brille surtout en rayons X, prend la couleur d'un corps noir de plusieurs millions de degrés ; il est vu plus incliné qu'en réalité, pour montrer son image déviée au-dessus de l'ombre.",
      caveat: "Sa masse fait débat : une étude de 2025 le trouve nettement plus léger que la mesure de 2021 retenue ici.",
    },
    "sagittarius-a-star": {
      kind: "trou noir supermassif",
      hook: "4,3 millions de fois la masse du Soleil, et une ombre à peine plus large qu'Aldébaran.",
      lede: `Sagittarius A* est le trou noir du centre de notre galaxie, à ${n(27_000)} années-lumière. Les astronomes l'ont pesé en suivant les étoiles qui tournent autour de lui : l'étoile S2 en fait le tour en 16 ans. Ce suivi a valu le prix Nobel de physique 2020 à Reinhard Genzel et Andrea Ghez. Très calme, il ne brille en tout qu'à peu près comme quelques centaines de Soleils. Sa première image a été publiée en 2022.`,
      simplification:
        "Rendu calculé : la lumière suit la courbure de l'espace autour d'un trou noir sans rotation. L'anneau, ténu et vu presque de face, est en fausses couleurs, comme l'image de l'Event Horizon Telescope prise en ondes radio : en lumière visible, la poussière de la Galaxie le cache.",
    },
    "m87-star": {
      kind: "trou noir supermassif",
      hook: "Le premier trou noir photographié : son ombre engloutirait tout le système solaire.",
      lede: `M87* est au cœur de la galaxie géante M87, à 55 millions d'années-lumière. Son image, publiée le 10 avril 2019 par l'Event Horizon Telescope, est la première d'un trou noir : il a fallu relier des radiotélescopes de toute la Terre pour obtenir une vue aussi fine. Il pèse environ ${n(1500)} fois plus que celui de notre galaxie et crache un jet de particules presque à la vitesse de la lumière, long d'environ ${n(5000)} années-lumière. Pourtant, il n'avale qu'à peu près l'équivalent d'une planète Jupiter par an.`,
      simplification:
        "Rendu calculé : la lumière suit la courbure de l'espace autour d'un trou noir sans rotation. L'anneau est en fausses couleurs, comme l'image de l'Event Horizon Telescope prise en ondes radio ; le jet, bleuté comme sur les images de Hubble, est bien plus court qu'en réalité.",
      caveat:
        "Sa masse varie selon la méthode : l'anneau de l'Event Horizon Telescope donne 6,5 milliards de masses solaires, le mouvement des étoiles de sa galaxie environ 5,4 milliards.",
    },
    "cosmic-horseshoe": {
      kind: "trou noir ultramassif",
      hook: "L'un des plus gros trous noirs jamais pesés, peut-être le record.",
      lede: `Ce trou noir dort au cœur de la galaxie LRG 3-757, dont la masse dévie la lumière d'une galaxie plus lointaine en un arc presque fermé : le « Fer à cheval cosmique ». En 2025, des astronomes l'ont pesé de deux façons, par cette déviation et par la vitesse des étoiles proches de son centre, près de 400 km/s. Résultat : environ 36 milliards de fois la masse du Soleil, plus de ${n(8000)} fois celui de notre galaxie. Il n'avale presque rien, donc il ne brille pas. Sa lumière a voyagé près de 5 milliards d'années pour nous parvenir.`,
      simplification:
        "Rendu calculé : la lumière suit la courbure de l'espace autour d'un trou noir sans rotation. Il n'avale rien : ni disque ni jet, seulement son ombre sur la lumière déviée des vieilles étoiles jaune orangé de sa galaxie. Le fer à cheval, produit par toute la galaxie et bien plus grand, n'est pas dessiné.",
      caveat:
        "Une seule étude l'a pesé, et sa masse dépend du modèle. TON 618 est souvent présenté comme le plus gros trou noir connu, jusqu'à 66 milliards de Soleils ; mais sa masse n'est qu'estimée d'après la lumière de son quasar, et elle pourrait être bien plus faible.",
    },
  },
  facts: {
    radius: "Rayon",
    type: "Type",
    temperature: "Température de surface",
    distance: "Distance de la Terre",
    comparison: "Pour comparer",
    sunDistance: "8,3 minutes-lumière",
    shadow: "Rayon de l'ombre",
    horizon: "Rayon de l'horizon (sans rotation)",
    mass: "Masse",
    blackHoleType: "Type",
  },
  tints: { orange: "orangée", "pale-orange": "orange pâle", white: "blanche", "bluish-white": "blanc bleuté" },
  vsSun: {
    cooler: `plus froide que le Soleil (${n(5772)} K)`,
    hotter: `plus chaude que le Soleil (${n(5772)} K)`,
    reference: "notre référence",
  },
  thermo: { cooler: "plus froide", hotter: "plus chaude" },
  plate: { story: "Lire la fiche", restart: "Revenir au plus petit", sources: "Sources :" },
  steps: {
    previous: (name) => `Astre précédent : ${name}`,
    next: (name) => `Astre suivant : ${name}`,
  },
};
