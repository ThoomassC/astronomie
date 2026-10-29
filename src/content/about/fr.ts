import { ABOUT_URLS, ccByUrl, numberSample } from "./structure";
import type { AboutContent } from "./types";

/**
 * Page À propos, en français : vouvoiement ; espace insécable (U+00A0) à l'intérieur des guillemets « » et avant
 * « : » et « ; ». Les noms des liens sont des noms propres, laissés dans leur langue.
 */
export const ABOUT_FR: AboutContent = {
  title: "À propos",
  intro: "Un planétaire en ligne, pour sentir les vraies tailles et les vraies distances.",
  toc: "Sur cette page",
  external: "site externe",
  sections: [
    {
      id: "pourquoi",
      heading: "Pourquoi ce site",
      paragraphs: [
        "La Terre est à près de 150 millions de kilomètres du Soleil : le nombre est exact, mais impossible à se représenter. Ce site fait sentir les distances et les tailles de l'espace en les parcourant.",
        "Le Voyage part du Soleil, passe chaque planète, puis s'éloigne vers les étoiles voisines, la Voie lactée, les autres galaxies et au-delà. Au Soleil et à chaque planète, une animation explique un phénomène : les saisons, les orbites, la vitesse de la lumière… L'onglet Tailles compare dix étoiles, de la naine rouge Proxima du Centaure à l'hypergéante VY Canis Majoris.",
      ],
    },
    {
      id: "pour-qui",
      heading: "Pour qui",
      paragraphs: [
        "Pour toutes les personnes curieuses du ciel, dès 12 ans. Aucune connaissance n'est nécessaire : on avance à son rythme en faisant défiler la page, et les chiffres sont comparés à des choses connues, comme les 109 Terres qu'il faudrait aligner d'un bord à l'autre du Soleil.",
      ],
    },
    {
      id: "demarche",
      heading: "La démarche",
      paragraphs: [
        "Les données sont réelles et viennent de sources publiées. Au chargement, chaque planète est à sa vraie place du jour, calculée à partir des éléments orbitaux du JPL ; la machine à remonter le temps fait ensuite défiler les jours, jusqu'à un an par seconde.",
        "Tout ne tient pas à l'échelle sur un écran. Dans le système solaire, les planètes sont agrandies et les distances resserrées ; la bascule « Distances réelles » remet les distances à l'échelle, et l'on voit surtout du vide. Aux étoiles voisines, les distances sont à l'échelle, mais les étoiles sont grossies. Dans l'onglet Tailles, elles gardent leurs vraies proportions.",
        "Certaines vues sont des illustrations : nul ne peut photographier la Voie lactée de l'extérieur, la toile cosmique est dessinée par un programme, et le multivers reste une hypothèse, jamais observée. Leurs textes le disent.",
      ],
    },
    {
      id: "sources",
      heading: "Sources",
      paragraphs: [
        "Les chiffres viennent des agences spatiales et d'articles scientifiques ; voici les principales sources, en anglais. Les rayons des étoiles de l'onglet Tailles viennent de mesures publiées, étoile par étoile.",
      ],
      links: [
        {
          label: "NASA, Planetary Fact Sheet",
          href: ABOUT_URLS.nasaFactSheet,
          description: "Données physiques des planètes.",
        },
        {
          label: "JPL, Approximate Positions of the Planets",
          href: ABOUT_URLS.jplApproximatePositions,
          description: "Éléments orbitaux des planètes, valables de 1800 à 2050 : leurs positions du jour.",
        },
        {
          label: "ESA, Gaia DR3",
          href: ABOUT_URLS.gaiaDr3,
          description: "Distances des étoiles voisines, complétées par Hipparcos et RECONS.",
        },
        { label: "CDS, SIMBAD", href: ABOUT_URLS.simbad, description: "Positions des étoiles dans le ciel." },
        {
          label: "GRAVITY Collaboration, 2022",
          href: ABOUT_URLS.gravity2022,
          description: "Distance du Soleil au centre de la Galaxie.",
        },
        { label: "Reid et al., 2019", href: ABOUT_URLS.reid2019, description: "Forme des bras de la Voie lactée." },
        { label: "McConnachie, 2012", href: ABOUT_URLS.mcConnachie2012, description: "Galaxies du Groupe local." },
        {
          label: "Planck Collaboration, 2020",
          href: ABOUT_URLS.planck2018,
          description: "Âge et taille de l'Univers observable.",
        },
      ],
    },
    {
      id: "credits",
      heading: "Crédits",
      paragraphs: ["Cartes, polices et logiciels que le site réutilise, avec leur licence :"],
      links: [
        {
          label: "Solar System Scope",
          href: ABOUT_URLS.solarSystemScope,
          description:
            "Cartes des planètes, de la Lune et de la Voie lactée, d'après des données de la NASA. Licence CC BY 4.0 ; renommées, redimensionnées, et l'une convertie en JPEG.",
        },
        {
          label: "Licence CC BY 4.0",
          href: ccByUrl("fr"),
          description: "Conditions de réutilisation des cartes de Solar System Scope.",
        },
        {
          label: "Bodoni Moda",
          href: ABOUT_URLS.bodoniModa,
          description: "Police des titres, d'Owen Earl. Licence SIL Open Font License (OFL).",
        },
        {
          label: "Atkinson Hyperlegible Next",
          href: ABOUT_URLS.atkinsonHyperlegibleNext,
          description: "Police du texte, du Braille Institute, conçue pour les personnes malvoyantes. Licence OFL.",
        },
        { label: "Three.js", href: ABOUT_URLS.threeJs, description: "Bibliothèque de la scène 3D. Licence MIT." },
        {
          label: "Next.js",
          href: ABOUT_URLS.nextJs,
          description: "L'outil qui construit le site, fondé sur React. Licence MIT, comme React.",
        },
      ],
    },
    {
      id: "accessibilite",
      heading: "Accessibilité",
      paragraphs: [],
      entries: [
        {
          term: "Clavier",
          text: "Des liens d'accès rapide mènent au contenu, Échap ferme les menus, et en mode « Tourner autour », les flèches font tourner la vue, plus et moins règlent la distance, 0 recentre.",
        },
        {
          term: "Lecteurs d'écran",
          text: "Les pages sont découpées par des titres et des repères. La scène 3D est décorative : ce qu'elle montre est écrit dans le texte de chaque escale.",
        },
        {
          term: "Mouvement réduit",
          text: "Si votre appareil le demande, le temps reste en pause au départ, les animations attendent qu'on les lance et les transitions sont immédiates.",
        },
        {
          term: "Contrastes",
          text: "Le texte vise un contraste d'au moins 4,5:1 avec son fond, et les commandes une taille d'au moins 44 pixels.",
        },
        {
          term: "Textes équivalents",
          text: "Chaque animation est décrite et ses résultats sont annoncés ; la carte des étoiles voisines existe aussi en tableau.",
        },
        {
          term: "Limites connues",
          text: "La scène et les animations restent surtout visuelles : leurs textes en donnent l'essentiel, pas tout. Sans WebGL, un Soleil dessiné remplace la scène ; sans JavaScript, tout le texte se lit, mais la scène, les animations et le mode « Tourner autour » manquent.",
        },
      ],
      links: [
        {
          label: "Signaler un problème d'accessibilité",
          href: ABOUT_URLS.issues,
          description: "Sur GitHub, dans les tickets du projet.",
        },
      ],
    },
    {
      id: "confidentialite",
      heading: "Confidentialité",
      note: "Aucun traceur, aucune publicité. Un seul cookie : la langue que vous choisissez, gardée un an.",
      paragraphs: [
        "Le cookie « lang » n'est posé que si vous choisissez une langue dans le menu, et il ne contient rien d'autre. Le site ne mesure pas son audience.",
        "Ce que vous saisissez, comme votre poids ou votre année de naissance, est calculé dans votre navigateur et n'est envoyé nulle part. Les polices et les images viennent du site lui-même.",
      ],
    },
    {
      id: "langues",
      heading: "Langues",
      paragraphs: [
        "Le site existe en français, en anglais et en espagnol. Le menu des langues, en haut de chaque page, passe de l'une à l'autre ; dans les onglets Voyage et Tailles, on reste à la même escale.",
        `Chaque langue écrit les nombres à sa façon : ${numberSample("fr")} en français, ${numberSample("en")} en anglais, ${numberSample("es")} en espagnol.`,
      ],
    },
    {
      id: "code-source",
      heading: "Code source",
      paragraphs: [
        "Le code du site est public : on peut y lire comment chaque position et chaque animation sont calculées, et y signaler une erreur.",
      ],
      links: [
        {
          label: "Code source du site",
          href: ABOUT_URLS.repository,
          description: "Sur GitHub. Écrit en TypeScript, avec Next.js, React et Three.js.",
        },
        {
          label: "Signaler une erreur",
          href: ABOUT_URLS.issues,
          description: "Sur GitHub, dans les tickets du projet.",
        },
      ],
    },
  ],
};
