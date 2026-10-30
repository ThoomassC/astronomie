import type { BeyondMarkKey, BodyStopKey } from "./structure";

/** Ligne de la fiche d'un astre : libellé, valeur, précision facultative écrite en petit sous la valeur. */
export interface Fact {
  label: string;
  value: string;
  note?: string;
}

/**
 * Rang écrit en chiffres : `number` sur la ligne, `suffix` en exposant (vide quand rien ne monte). « 3 » et « e »
 * (3ᵉ), « 3 » et « rd » (3rd), « 3. » et « er » (3.ᵉʳ), « 2.º » sans exposant (l'indicateur º est déjà en haut).
 */
export interface Ordinal {
  number: string;
  suffix: string;
}

/** Textes de l'escale d'un astre (le Soleil, une planète) ; son nom vient de `bodyName`, sa structure de `structure.ts`. */
export interface BodyStopTexts {
  /** Rang, écrit après l'ordinal s'il y en a un : « planète en partant du Soleil » ; « L'étoile au centre » pour le Soleil. */
  rank: string;
  /** Accroche, sous le nom. */
  hook: string;
  /** Paragraphe d'ouverture de la fiche. */
  lede: string;
  facts: readonly Fact[];
  /** Libellé de la ligne « ce jour », recalculée avec la date simulée (distance à la Terre, ou au Soleil pour la Terre). */
  live: string;
  /** Module explicatif : titre et introduction, et `button`, le bouton qui le déplie sur téléphone. */
  module: { title: string; intro: string; button: string };
}

/** Lien du pied de page vers un autre site, en https. */
export interface FooterLink {
  label: string;
  href: `https://${string}`;
}

/** Durée affichée sur l'échelle de l'au-delà, avec le nom de son repère. */
export interface BeyondMarkTexts {
  /** Nom du repère, en gras : « Pluton », « Kuiper ». */
  label: string;
  /** Distance en temps de lumière : « 5 h 28 », « ≈ 7 h ». */
  value: string;
}

/**
 * Textes du voyage, du Soleil à l'au-delà de Neptune, dans une langue (`getVoyageContent`) : accueil, plaques des
 * astres, interlude de la ceinture, au-delà, pied de page et lien d'évitement vers le dock. Côté serveur seulement
 * (ADR 0003) : les composants client du voyage ont leurs propres tables `*.strings.ts`.
 */
export interface VoyageContent {
  hero: {
    /** Titre de la page (h1). */
    title: string;
    text: string;
    /** Ce que montre la scène 3D, décorative : lu aux lecteurs d'écran à sa place. */
    sceneDescription: string;
    /** Avant la date du chargement : « Positions réelles au départ : ». */
    stampPrefix: string;
    /** Lien de départ vers le Soleil. */
    start: string;
  };
  /** Boutons qui déplient les plaques sur téléphone : la fiche d'un astre, la suite de l'au-delà. */
  plate: { story: string; more: string };
  /** Rang d'une planète, accordé au mot « planète » de la langue : 1ʳᵉ, 1st, 1.ᵉʳ. */
  ordinal: (n: number) => Ordinal;
  bodies: Readonly<Record<BodyStopKey, BodyStopTexts>>;
  /** Interlude de la ceinture d'astéroïdes : titre lu aux lecteurs d'écran seulement, citation et sa source. */
  interlude: { title: string; text: string; cite: string };
  beyond: {
    /** Rang, au-dessus du nom : « Au-delà de Neptune ». */
    rank: string;
    /** Nom de l'escale (h2), lu aussi après « Replier » : « Le grand vide ». */
    name: string;
    hook: string;
    lede: string;
    /** Titre de l'échelle en heures-lumière. */
    scaleTitle: string;
    marks: Readonly<Record<BeyondMarkKey, BeyondMarkTexts>>;
    /** Origine de l'axe de l'échelle : « Soleil, 0 h ». La mi-échelle et la fin s'écrivent « 12 h » et « 24 h » partout. */
    scaleStart: string;
    /** Durée affichée, lue à voix haute : « ≈ 7 h » → « environ 7 heures », « 4 h 10 » → « 4 heures 10 ». */
    spoken: (value: string) => string;
    /**
     * Échelle lue aux lecteurs d'écran, repère par repère dans l'ordre donné, d'une seule phrase :
     * « Neptune : 4 heures 10 ; … ; Voyager 1 : environ 24 heures. »
     */
    spokenScale: (marks: readonly BeyondMarkTexts[]) => string;
    /** Lien de retour vers le Soleil. */
    back: string;
  };
  footer: {
    sources: string;
    /** Avertissement sur les tailles et les distances, hors mode « distances réelles ». */
    scale: string;
    /**
     * Crédit des cartes des astres, comme le demande la licence CC BY 4.0 (auteur, licence, modifications), coupé
     * autour de ses deux liens ; la licence mène à son résumé dans la langue (deed.fr, deed.en, deed.es).
     */
    textures: { before: string; source: FooterLink; between: string; license: FooterLink; after: string };
  };
  /** Lien d'évitement vers la machine à remonter le temps (celui vers le contenu est commun aux pages). */
  skipToDock: string;
}
