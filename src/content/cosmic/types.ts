import type { SpectralClass } from "@/lib/astro/starMap";

/** Escales au-delà du système solaire, dans l'ordre du voyage. Cb vérifie l'égalité avec CosmicStopKey (camera.ts). */
export type CosmicContentKey = "stars" | "galaxy" | "localGroup" | "universe" | "multiverse";

/** Ligne de la fiche : libellé, valeur, précision facultative sous la valeur. */
export interface Fact {
  label: string;
  value: string;
  note?: string;
}

/** Textes de la plaque d'une escale lointaine. */
export interface CosmicStopContent {
  /** Surtitre, au-dessus du nom : « Notre galaxie ». */
  rank: string;
  /** Nom de l'escale (titre de la plaque). */
  name: string;
  /** Accroche, sous le nom. */
  hook: string;
  /** Présentation, en tête de la fiche. */
  lede: string;
  facts: readonly Fact[];
  /** Ce que la vue simplifie ou invente (échelle, modèle, rendu artistique), dit sous la fiche. */
  caveat: string;
  /** Sources des faits, sous la fiche (après `plate.sources`). */
  source: string;
  /** Multivers seulement : avertissement mis en tête de la plaque (« Hypothèse : … »). */
  hypothesis?: string;
}

/**
 * Textes des cinq escales lointaines dans une langue, lus par les composants serveur seulement. Les noms des
 * étoiles et des galaxies, que lisent aussi les étiquettes de la scène, sont dans `deepSky.strings.ts`.
 */
export interface CosmicContent {
  stops: Readonly<Record<CosmicContentKey, CosmicStopContent>>;
  /** Tableau des étoiles de la carte, dans la plaque des étoiles voisines. */
  starTable: {
    /** Titre-bouton qui déplie le tableau sur téléphone. */
    button: string;
    caption: string;
    columns: readonly [star: string, distance: string, type: string];
    /** Type de l'étoile en mots simples, selon sa classe spectrale. */
    types: Readonly<Record<SpectralClass, string>>;
    /** Précision lue sous le type, par clé d'étoile (NearbyStar.key) : seulement pour celles qui en ont une. */
    notes: Readonly<Record<string, string>>;
    /** Ce que disent la couleur et la taille des points de la carte. */
    typeNote: string;
  };
  /** Tableau des galaxies de la carte, dans la plaque du Groupe local. */
  galaxyTable: {
    button: string;
    caption: string;
    columns: readonly [galaxy: string, distance: string, size: string];
    /** Ce que mesurent la distance et la taille. */
    note: string;
  };
  /** Bouton de la fiche, lien de retour vers le Soleil, mention qui précède les sources. */
  plate: { story: string; back: string; sources: string };
}
