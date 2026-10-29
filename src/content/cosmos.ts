import { spectralClass, type SpectralClass } from "@/lib/astro/starMap";
import { NEARBY_STARS } from "@/lib/astro/stars";
import type { CosmicStopKey } from "@/lib/journey/camera";
import type { Fact } from "./stops";

/** Plaques des escales au-delà du système solaire. Rendues sur le serveur seulement. */
export interface CosmicStopContent {
  key: CosmicStopKey;
  /** Ancre de la section. */
  id: "etoiles-voisines" | "voie-lactee";
  rank: string;
  name: string;
  hook: string;
  lede: string;
  facts: readonly Fact[];
  /** Ce que la vue simplifie (tailles exagérées, modèle), dit sous la fiche. */
  caveat: string;
  /** Sources des faits, affichées sous la fiche. */
  source: string;
  back: string;
}

/** Naines rouges (classe M) parmi les étoiles de la carte : les plus nombreuses, même tout près du Soleil. */
const RED_DWARF_COUNT = NEARBY_STARS.filter((star) => spectralClass(star.spectralType) === "M").length;

export const COSMIC_STOPS: Record<CosmicStopKey, CosmicStopContent> = {
  stars: {
    key: "stars",
    id: "etoiles-voisines",
    rank: "Au-delà du système solaire",
    name: "Les étoiles voisines",
    hook: "La plus proche est à plus de quatre années-lumière.",
    lede: "Une année-lumière, c'est la distance que parcourt la lumière en un an : 9 460 milliards de kilomètres. Proxima du Centaure, l'étoile la plus proche, est à 4,25 années-lumière : sa lumière met 4 ans et 3 mois à nous parvenir. Même à 17 km/s, la sonde Voyager 1 mettrait environ 75 000 ans pour franchir cette distance. À moins de 10 années-lumière du Soleil, on ne connaît que 7 autres systèmes d'étoiles.",
    facts: [
      { label: "Étoile la plus proche", value: "Proxima du Centaure", note: "4,25 al" },
      { label: "Sa lumière met", value: "4 ans et 3 mois" },
      { label: "En sonde Voyager 1", value: "≈ 75 000 ans", note: "à 17 km/s" },
      { label: "La plus brillante du ciel", value: "Sirius", note: "à 8,6 al" },
      { label: "Systèmes à moins de 10 al", value: "7", note: "sans compter le Soleil" },
      {
        label: "Naines rouges de la carte",
        value: `${RED_DWARF_COUNT} sur ${NEARBY_STARS.length}`,
        note: "aucune n'est visible à l'œil nu",
      },
    ],
    caveat: "Ici, les distances sont à l'échelle ; seules les étoiles sont grossies.",
    source: "ESA, Gaia DR3 ; RECONS ; NASA",
    back: "Revenir au Soleil",
  },
  galaxy: {
    key: "galaxy",
    id: "voie-lactee",
    rank: "Notre galaxie",
    name: "La Voie lactée",
    hook: "Le Soleil, une étoile parmi des centaines de milliards.",
    lede: "La Voie lactée est un disque très plat d'environ 100 000 années-lumière de diamètre, qui compte entre 100 et 400 milliards d'étoiles. Le Soleil se trouve à environ 27 000 années-lumière du centre, dans le bras d'Orion, un petit bras coincé entre ceux du Sagittaire et de Persée. Il fait le tour du centre à environ 230 km/s : un tour prend environ 230 millions d'années. Au centre se cache un trou noir géant, Sagittarius A*, plus de 4 millions de fois plus massif que le Soleil. Vue du ciel de la Terre, la Voie lactée est une bande laiteuse : c'est ce disque, vu de l'intérieur, par la tranche.",
    facts: [
      { label: "Diamètre du disque", value: "≈ 100 000 al" },
      { label: "Épaisseur du disque", value: "≈ 1 000 al" },
      { label: "Le Soleil est à", value: "≈ 27 000 al", note: "du centre" },
      { label: "Un tour du centre", value: "≈ 230 millions d'années", note: "à environ 230 km/s" },
      { label: "Étoiles", value: "100 à 400 milliards" },
      { label: "Au centre", value: "Sagittarius A*", note: "trou noir de 4 millions de Soleils" },
      { label: "Plus vieilles étoiles", value: "≈ 13 milliards d'années" },
    ],
    caveat: "Les bras sont dessinés d'après un modèle simplifié.",
    source:
      "NASA ; ESA ; ESO ; GRAVITY Collaboration (2022) ; Event Horizon Telescope (2022) ; Reid et al. (2019)",
    back: "Revenir au Soleil",
  },
};

/** Tableau des étoiles de la carte, dans la plaque des étoiles voisines. */
export const STAR_LIST: {
  /** Titre-bouton qui déplie le tableau sur téléphone. */
  button: string;
  caption: string;
  columns: readonly [star: string, distance: string, type: string];
  /** Type de l'étoile en mots simples, selon sa classe spectrale. */
  types: Readonly<Record<SpectralClass, string>>;
  /** Ce que disent la couleur et la taille des points de la carte. */
  typeNote: string;
} = {
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
  typeNote:
    "Sur la carte, la couleur d'un point suit la température de l'étoile : orangée pour les plus froides, les naines rouges, blanc bleuté pour les plus chaudes, comme Sirius. Plus le point est gros, plus l'étoile est lumineuse en réalité.",
};
