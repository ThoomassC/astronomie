import type { ReleaseVersion } from "./structure";

/** Une rubrique d'une version sous son titre de niveau 3 (« Tailles », « Téléphone ») : ses changements, un par point. */
export interface ReleaseSection {
  heading: string;
  /** Phrases courtes, une par changement, de 3 à 6. */
  items: readonly string[];
}

/** Une version : son numéro (`RELEASES`), une phrase de résumé, puis ses rubriques. */
export interface ReleaseNotes {
  version: ReleaseVersion;
  /** Ce que la version apporte, en une phrase. */
  summary: string;
  sections: readonly ReleaseSection[];
}

/** Textes de la page Notes de version dans une langue (`getReleasesContent`). Côté serveur seulement (ADR 0003). */
export interface ReleasesContent {
  /** Titre de la page (h1), le nom complet de la page ; l'onglet porte un libellé court (`site.strings.ts`). */
  title: string;
  /** Accroche, sous le titre. */
  intro: string;
  /** Nom du sommaire des versions, en tête de page (repère de navigation). */
  toc: string;
  /** Mot qui précède le numéro dans le titre de chaque version : « Version » 1.1.0. */
  version: string;
  /** Étiquette de la version la plus récente : « Dernière version ». */
  latest: string;
  /** Les versions, de la plus récente à la plus ancienne, dans l'ordre de `RELEASES`. */
  releases: readonly ReleaseNotes[];
}
