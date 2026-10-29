import { DEEP_SKY_STRINGS } from "@/components/scene/deepSky.strings";
import { withUnit } from "@/i18n/units";
import { formatNumber } from "@/lib/format";
import { CMB_AGE_YEARS, CMB_TEMPERATURE_K, OBSERVABLE_UNIVERSE_RADIUS_GLY, UNIVERSE_AGE_GYR } from "@/lib/astro/universe";
import { MAP_GALAXY_COUNT, MAP_STAR_COUNT, RED_DWARF_COUNT, distanceMlyOf } from "./figures";
import type { CosmicContent } from "./types";

const { starNames, galaxyNames, galaxyDistance } = DEEP_SKY_STRINGS.fr;

/** Nombre écrit comme Intl l'écrit en français (espace fine insécable dès 4 chiffres). */
const n = (value: number, digits = 0) => formatNumber(value, digits, "fr");
const ly = (value: number, digits = 0) => withUnit(n(value, digits), "ly", "fr");
const percent = (value: number) => withUnit(n(value), "percent", "fr");

/*
 * Étoiles voisines et Voie lactée : textes arrêtés et sourcés de la première version, repris mot pour mot (seuls
 * les nombres passent par Intl). Groupe local, Univers observable et multivers : données v2 (§ 2 à 4) et arbitrages
 * de la rédaction (Groupe local d'environ 10 millions d'al, Univers de 46 et 93 milliards d'al, avenir de la Voie
 * lactée et d'Andromède selon Sawala et al. 2025, multivers présenté comme une hypothèse).
 */
export const COSMIC_FR: CosmicContent = {
  stops: {
    stars: {
      rank: "Au-delà du système solaire",
      name: "Les étoiles voisines",
      hook: "La plus proche est à plus de quatre années-lumière.",
      lede: `Une année-lumière, c'est la distance que parcourt la lumière en un an : ${n(9460)} milliards de kilomètres. ${starNames["proxima-centauri"]}, l'étoile la plus proche, est à ${n(4.25, 2)} années-lumière : sa lumière met 4 ans et 3 mois à nous parvenir. Même à 17 km/s, la sonde Voyager 1 mettrait environ ${n(75_000)} ans pour franchir cette distance. À moins de 10 années-lumière du Soleil, on ne connaît que 7 autres systèmes d'étoiles.`,
      facts: [
        { label: "Étoile la plus proche", value: starNames["proxima-centauri"], note: ly(4.25, 2) },
        { label: "Sa lumière met", value: "4 ans et 3 mois" },
        { label: "En sonde Voyager 1", value: `≈ ${n(75_000)} ans`, note: "à 17 km/s" },
        { label: "La plus brillante du ciel", value: starNames.sirius, note: `à ${ly(8.6, 1)}` },
        { label: "Systèmes à moins de 10 al", value: "7", note: "sans compter le Soleil" },
        { label: "Naines rouges de la carte", value: `${RED_DWARF_COUNT} sur ${MAP_STAR_COUNT}`, note: "aucune n'est visible à l'œil nu" },
      ],
      caveat: "Ici, les distances sont à l'échelle ; seules les étoiles sont grossies.",
      source: "ESA, Gaia DR3 ; RECONS ; NASA",
    },
    galaxy: {
      rank: "Notre galaxie",
      name: "La Voie lactée",
      hook: "Le Soleil, une étoile parmi des centaines de milliards.",
      lede: `La Voie lactée est un disque très plat d'environ ${n(100_000)} années-lumière de diamètre, qui compte entre 100 et 400 milliards d'étoiles. Le Soleil se trouve à environ ${n(27_000)} années-lumière du centre, dans le bras d'Orion, un petit bras coincé entre ceux du Sagittaire et de Persée. Il fait le tour du centre à environ 230 km/s : un tour prend environ 230 millions d'années. Au centre se cache un trou noir géant, Sagittarius A*, plus de 4 millions de fois plus massif que le Soleil. Vue du ciel de la Terre, la Voie lactée est une bande laiteuse : c'est ce disque, vu de l'intérieur, par la tranche.`,
      facts: [
        { label: "Diamètre du disque", value: `≈ ${ly(100_000)}` },
        { label: "Épaisseur du disque", value: `≈ ${ly(1000)}` },
        { label: "Le Soleil est à", value: `≈ ${ly(27_000)}`, note: "du centre" },
        { label: "Un tour du centre", value: "≈ 230 millions d'années", note: "à environ 230 km/s" },
        { label: "Étoiles", value: "100 à 400 milliards" },
        { label: "Au centre", value: "Sagittarius A*", note: "trou noir de 4 millions de Soleils" },
        { label: "Plus vieilles étoiles", value: "≈ 13 milliards d'années" },
      ],
      caveat: "Les bras sont dessinés d'après un modèle simplifié.",
      source: "NASA ; ESA ; ESO ; GRAVITY Collaboration (2022) ; Event Horizon Telescope (2022) ; Reid et al. (2019)",
    },
    localGroup: {
      rank: "Nos galaxies voisines",
      name: "Le Groupe local",
      hook: "Andromède, notre grande voisine, est à 2,5 millions d'années-lumière.",
      lede: "La Voie lactée n'est pas seule. Avec la galaxie d'Andromède, la galaxie du Triangle et plus de 100 petites galaxies, surtout des naines, elle forme le Groupe local : une famille d'environ 10 millions d'années-lumière d'un bout à l'autre, aux limites floues. Andromède est la plus grande : par une nuit d'automne bien noire, on la voit à l'œil nu, petite tache floue dont la lumière a voyagé 2,5 millions d'années. Andromède et la Voie lactée se rapprochent. On a longtemps cru qu'elles se heurteraient dans 4 à 5 milliards d'années ; selon une étude de 2025, il n'y a en fait qu'environ une chance sur deux qu'elles fusionnent d'ici 10 milliards d'années.",
      facts: [
        { label: "Taille", value: "≈ 10 millions d'al", note: "d'un bout à l'autre, aux limites floues" },
        { label: "Galaxies connues", value: "plus de 100", note: "surtout des naines" },
        { label: galaxyNames.andromeda, value: galaxyDistance(distanceMlyOf("andromeda")), note: "la plus grande, visible à l'œil nu" },
        { label: galaxyNames.triangulum, value: galaxyDistance(distanceMlyOf("triangulum")), note: "la troisième par la masse" },
        {
          label: "Nuages de Magellan",
          value: `${galaxyDistance(distanceMlyOf("large-magellanic-cloud"))} et ${galaxyDistance(distanceMlyOf("small-magellanic-cloud"))}`,
          note: "visibles depuis l'hémisphère Sud",
        },
        { label: "Masse totale", value: `≈ ${n(2000)} milliards de Soleils`, note: "matière noire comprise" },
        { label: "Avenir avec Andromède", value: "une chance sur deux", note: "de fusionner d'ici 10 milliards d'années (étude de 2025)" },
      ],
      caveat: `Positions, distances et tailles sont à l'échelle ; les formes sont stylisées d'après les mesures. La carte montre ${MAP_GALAXY_COUNT} des plus de 100 galaxies du groupe, et les plus petites y brillent un peu plus qu'en réalité.`,
      source:
        "McConnachie (2012, catalogue 2021) ; Li et al. (2021) ; Breuval et al. (2023) ; Pietrzyński et al. (2019) ; Graczyk et al. (2020) ; Karachentsev et al. (2009) ; Sawala et al. (2025) ; NASA",
    },
    universe: {
      rank: "Aussi loin que porte notre regard",
      name: "L'Univers observable",
      hook: "Une sphère d'environ 93 milliards d'années-lumière de diamètre, dont nous occupons le centre.",
      lede: `La lumière des galaxies les plus lointaines voyage vers nous depuis presque ${n(UNIVERSE_AGE_GYR, 1)} milliards d'années, l'âge de l'Univers. Pendant ce voyage, l'espace lui-même s'est étiré, comme un élastique qu'on tire : aujourd'hui, ces galaxies sont à environ ${n(OBSERVABLE_UNIVERSE_RADIUS_GLY)} milliards d'années-lumière. Nous sommes au centre de cette sphère simplement parce que c'est la partie de l'Univers que nous voyons, aussi loin dans toutes les directions ; l'Univers, lui, n'a pas de centre connu. Il contient des centaines de milliards de galaxies, qui dessinent une immense toile de filaments autour de vides gigantesques. Tout au bord, on voit la plus vieille lumière de l'Univers : le fond diffus cosmologique.`,
      facts: [
        { label: "Rayon", value: `≈ ${n(OBSERVABLE_UNIVERSE_RADIUS_GLY)} milliards d'al`, note: "diamètre ≈ 93 milliards d'al" },
        { label: "Âge de l'Univers", value: `${n(UNIVERSE_AGE_GYR, 1)} milliards d'années` },
        { label: "Nombre de galaxies", value: "des centaines de milliards" },
        {
          label: "Fond diffus cosmologique",
          value: withUnit(n(CMB_TEMPERATURE_K, 3), "kelvin", "fr"),
          note: `soit −${n(270.4, 1)} °C, libéré ${n(CMB_AGE_YEARS)} ans après le Big Bang`,
        },
        { label: "Matière ordinaire", value: `≈ ${percent(5)}`, note: "étoiles, planètes, gaz… et nous" },
        { label: "Matière noire", value: `≈ ${percent(27)}`, note: "invisible, trahie par sa gravité" },
        { label: "Énergie noire", value: `≈ ${percent(68)}`, note: "elle accélère l'expansion" },
      ],
      caveat: "La toile est stylisée : la vraie est bien plus fine, avec des filaments larges d'environ 10 millions d'années-lumière et des vides de 90 à 240 millions d'années-lumière. Les taches du fond diffus sont dessinées, pas tirées d'une carte.",
      source:
        "Planck Collaboration (2020) ; Fixsen (2009) ; ESA ; NOIRLab (2021) ; Cautun et al. (2014) ; van de Weygaert et Platen (2011)",
    },
    multiverse: {
      hypothesis: "Hypothèse : personne n'a jamais observé d'autre univers. Cette escale illustre une idée débattue, pas une découverte.",
      rank: "Au-delà de l'observable",
      name: "Le multivers",
      hook: "Et s'il existait d'autres univers ? Personne ne le sait.",
      lede: "Ce qu'on sait : notre univers observable a une limite, fixée par l'âge de l'Univers et la vitesse de la lumière. Au-delà, l'espace continue très probablement, mais nous ne pouvons pas le voir. Ce qu'on suppose : certaines théories, comme l'inflation éternelle, la théorie des cordes ou une interprétation de la physique quantique, suggèrent qu'il pourrait exister d'autres univers, peut-être avec d'autres lois de la physique ; on appelle cet ensemble le multivers. Pourquoi c'est débattu : personne n'en a jamais observé, et beaucoup de scientifiques se demandent si une idée qu'on ne peut pas tester relève encore de la science. D'autres cherchent des indices, comme la trace d'une collision entre deux « bulles » d'univers dans la plus vieille lumière du ciel : rien pour l'instant.",
      facts: [
        { label: "Autres univers observés", value: "aucun" },
        { label: "Idée la plus connue", value: "des univers-bulles", note: "nés sans fin de l'inflation éternelle" },
        { label: "Indice cherché", value: "des traces de collisions", note: "dans le fond diffus : aucune trouvée" },
        { label: "Autre piste", value: "la théorie des cordes", note: "elle-même pas encore confirmée" },
        { label: "Statut", value: "hypothèse débattue", note: "science ou philosophie ?" },
      ],
      caveat: "Rendu artistique : les autres bulles, leurs tailles et leurs places sont inventées pour l'image. Seule la nôtre, l'Univers observable, a une taille mesurée.",
      source: "Tegmark (2003) ; Feeney et al. (2011) ; Carr et Ellis (2008) ; Ellis (2011) ; Quanta Magazine (2014)",
    },
  },
  starTable: {
    button: "Les étoiles de la carte",
    caption: "Les étoiles de la carte, de la plus proche à la plus lointaine",
    columns: ["Étoile", "Distance", "Type"],
    types: {
      O: "bleue",
      B: "bleu-blanc",
      A: "blanche",
      F: "blanc-jaune",
      G: "naine jaune, comme le Soleil",
      K: "naine orange",
      M: "naine rouge",
    },
    notes: {
      "proxima-centauri": "la plus proche, liée à Alpha du Centaure A et B",
      "alpha-centauri": "deux étoiles proches du Soleil par la taille",
      barnard: "l'étoile qui se déplace le plus vite dans notre ciel",
      sirius: "la plus brillante de notre ciel nocturne, avec la naine blanche Sirius B",
      "luyten-726-8": "deux naines rouges, BL Ceti et UV Ceti",
      "61-cygni": "étoile double",
      procyon: "avec la naine blanche Procyon B",
      "struve-2398": "étoile double",
      "groombridge-34": "étoile double",
      "epsilon-indi": "avec deux naines brunes",
      altair: "étoile brillante du ciel d'été",
    },
    typeNote:
      "Sur la carte, la couleur d'un point suit la température de l'étoile : orangée pour les plus froides, les naines rouges, blanc bleuté pour les plus chaudes, comme Sirius. Plus le point est gros, plus l'étoile est lumineuse en réalité.",
  },
  galaxyTable: {
    button: "Les galaxies de la carte",
    caption: "Les galaxies de la carte, de la plus proche à la plus lointaine",
    columns: ["Galaxie", "Distance", "Taille"],
    note: "Distance depuis le Soleil ; pour la Voie lactée, celle de son centre. Taille : diamètre de la partie la plus lumineuse ; les étoiles les plus lointaines vont souvent au-delà.",
  },
  plate: { story: "Lire la fiche", back: "Revenir au Soleil", sources: "Sources :" },
};
