export const SITE = {
  name: "Astronomia",
  description:
    "Le système solaire en mouvement : voyage du Soleil à Neptune, positions réelles des planètes et animations pour comprendre les saisons, les orbites et les distances.",
};

export const HERO = {
  title: "Huit planètes, une étoile, et beaucoup de vide.",
  text: "Chaque planète part de sa vraie place du jour. Faites défiler pour quitter le Soleil et rejoindre Neptune, à quatre heures-lumière de là.",
  stampPrefix: "Positions réelles au départ :",
  start: "Partir du Soleil",
};

export const SCALE_TOGGLE = {
  off: "Voir les distances réelles",
  on: "Revenir aux distances compressées",
  note: "Distances à l'échelle : la Terre est à 1 UA du Soleil, Neptune à 30. À cette échelle, les planètes seraient plus petites qu'un pixel : un cercle signale chacune.",
};

export const BEYOND = {
  id: "au-dela",
  rank: "Au-delà de Neptune",
  name: "Le grand vide",
  hook: "Les distances, enfin à l'échelle.",
  lede: "Au-delà de Neptune s'étend la ceinture de Kuiper : des milliers de corps glacés, dont Pluton, classée planète naine depuis 2006. Plus loin encore voyage Voyager 1, lancée en 1977. En novembre 2026, elle atteindra un jour-lumière de la Terre : 25,9 milliards de km.",
  scaleTitle: "Distances en temps de lumière depuis le Soleil",
  /** Repères de l'échelle 0-24 h ; `hours` fixe la position. */
  marks: [
    { label: "Neptune", value: "4 h 10", hours: 4.17, color: "#5878E8" },
    { label: "Pluton", value: "5 h 28", hours: 5.47, color: "#B5ADA3" },
    { label: "Kuiper", value: "≈ 7 h", hours: 6.93, color: "#C2A36B" },
    { label: "Voyager 2", value: "≈ 20 h", hours: 19.9, color: "#959EB5" },
    { label: "Voyager 1", value: "≈ 24 h", hours: 24, color: "#FFB547" },
  ],
  back: "Revenir au Soleil",
};

export const FOOTER = {
  sources:
    "Sources : NASA, Planetary Fact Sheet ; JPL, éléments orbitaux approchés des planètes (valables de 1800 à 2050) ; nombres de lunes : NASA et UAI, 2025.",
  scale:
    "Sauf en mode « distances réelles », les tailles sont agrandies et les distances compressées pour que tout tienne à l'écran.",
  /** Crédit des cartes photographiques, comme le demande la licence CC BY 4.0 : auteur, licence, modifications. */
  textures: {
    before: "Cartes des astres : ",
    source: { label: "Solar System Scope", href: "https://www.solarsystemscope.com/textures/" },
    between: ", d'après des données de la NASA, redimensionnées pour le site. Licence ",
    license: { label: "CC BY 4.0", href: "https://creativecommons.org/licenses/by/4.0/deed.fr" },
    after: ".",
  },
};
