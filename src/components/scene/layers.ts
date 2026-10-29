import { smoothstep } from "./math";

/**
 * Poids des couches de la scène selon le zoom cosmique (log10 de la réduction du système solaire),
 * de 0 (rien n'est dessiné) à 1. Chaque couche entre ou sort en douceur (smoothstep) sur sa plage :
 *
 * | Couche       | Plage                                                    | z = 0 | 4,6 | 8 | 9,7 | 11,2 | 12  | 14 | 15   |
 * |--------------|----------------------------------------------------------|-------|-----|---|-----|------|-----|----|------|
 * | solar        | 1 → 0 sur [0,3 ; 1,2]                                    | 1     | 0   | 0 | 0   | 0    | 0   | 0  | 0    |
 * | planetLabels | 1 → 0 sur [0,3 ; 0,8]                                    | 1     | 0   | 0 | 0   | 0    | 0   | 0  | 0    |
 * | sunPoint     | 0 → 1 sur [0,8 ; 1,6]                                    | 0     | 1   | 1 | 1   | 1    | 1   | 1  | 1    |
 * | sky          | 1 → 0 sur [5,4 ; 6,8]                                    | 1     | 1   | 0 | 0   | 0    | 0   | 0  | 0    |
 * | stars        | 0 → 1 sur [3 ; 4,2], 1 → 0 sur [5,2 ; 5,9]               | 0     | 1   | 0 | 0   | 0    | 0   | 0  | 0    |
 * | galaxy       | 0 → 1 sur [6 ; 7,2], 1 → 0 sur [10,8 ; 11,6]             | 0     | 0   | 1 | 1   | 0,5  | 0   | 0  | 0    |
 * | galaxyLabels | 0 → 1 sur [6 ; 7,2], 1 → 0 sur [8,3 ; 8,9]               | 0     | 0   | 1 | 0   | 0    | 0   | 0  | 0    |
 * | here         | smoothstep(0,5 ; 1 ; smoothstep(6 ; 7,2 ; z)), puis 1    | 0     | 0   | 1 | 1   | 1    | 1   | 1  | 1    |
 * | localGroup   | 0 → 1 sur [8,5 ; 9,3], 1 → 0 sur [10,8 ; 11,6]           | 0     | 0   | 0 | 1   | 0,5  | 0   | 0  | 0    |
 * | web          | 0 → 1 sur [11,2 ; 12,8], × (1 − 0,65 × 0 → 1 sur [14,3 ; 14,9]) | 0 | 0 | 0 | 0 | 0  | 0,5 | 1  | 0,35 |
 * | cmb          | 0 → 1 sur [12,6 ; 13,6]                                  | 0     | 0   | 0 | 0   | 0    | 0   | 1  | 1    |
 * | multiverse   | 0 → 1 sur [14,2 ; 14,9]                                  | 0     | 0   | 0 | 0   | 0    | 0   | 0  | 1    |
 *
 * Entre 1,2 et 3, le Soleil reste seul sur le ciel : c'est le vide entre le système solaire et les étoiles.
 * Au zoom 0, aucune couche nouvelle n'est dessinée : la scène du système solaire reste celle d'avant ; jusqu'au
 * zoom 8 (Voie lactée), les couches d'avant le Groupe local gardent exactement leurs valeurs.
 */
export interface LayerWeights {
  /** Orbites et ceintures (la couronne et les planètes rapetissent avec l'échelle) : 1 → 0 sur [0,3 ; 1,2]. */
  solar: number;
  /** Étiquettes des planètes : 1 → 0 sur [0,3 ; 0,8]. */
  planetLabels: number;
  /** Le Soleil en point lumineux, relais de la couronne devenue trop petite : 0 → 1 sur [0,8 ; 1,6]. */
  sunPoint: number;
  /** Ciel vu depuis le système solaire (Voie lactée photographiée, étoiles de fond) : 1 → 0 sur [5,4 ; 6,8]. */
  sky: number;
  /** Étoiles voisines, cercles de distance et leurs étiquettes : 0 → 1 sur [3 ; 4,2], puis 1 → 0 sur [5,2 ; 5,9]. */
  stars: number;
  /** Galaxie en points : 0 → 1 sur [6 ; 7,2], puis 1 → 0 sur [10,8 ; 11,6], quand elle n'est plus qu'un point. */
  galaxy: number;
  /** « Centre de la Galaxie » : comme la galaxie, mais s'efface sur [8,3 ; 8,9], avant « Voie lactée » (Groupe local). */
  galaxyLabels: number;
  /**
   * « Vous êtes ici » : smoothstep(0,5 ; 1 ; smoothstep(6 ; 7,2 ; z)), puis 1 jusqu'au multivers. Sur l'ancre du
   * Soleil, il prend le relais de « Soleil », qui garde 1 − smoothstep(0 ; 0,5 ; smoothstep(6 ; 7,2 ; z)).
   */
  here: number;
  /** Galaxies du Groupe local et leurs étiquettes, dont « Voie lactée » : 0 → 1 sur [8,5 ; 9,3], 1 → 0 sur [10,8 ; 11,6]. */
  localGroup: number;
  /** Toile cosmique : 0 → 1 sur [11,2 ; 12,8], puis atténuée de 65 % sur [14,3 ; 14,9] (multivers). */
  web: number;
  /** Fond diffus cosmologique, peau de notre bulle : 0 → 1 sur [12,6 ; 13,6]. */
  cmb: number;
  /** Autres bulles du multivers et leurs étiquettes : 0 → 1 sur [14,2 ; 14,9]. */
  multiverse: number;
}

/** Au-delà, le système solaire n'est plus dessiné (sa couronne ne fait plus que 1,4 à 2 px) et le plan lointain s'ouvre. */
export const SOLAR_HIDDEN_ZOOM = 2;

/** Poids des couches au zoom donné (plages ci-dessus). Écrit dans `out` s'il est fourni et le renvoie. */
export function layerWeights(
  zoom: number,
  out: LayerWeights = {
    solar: 0,
    planetLabels: 0,
    sunPoint: 0,
    sky: 0,
    stars: 0,
    galaxy: 0,
    galaxyLabels: 0,
    here: 0,
    localGroup: 0,
    web: 0,
    cmb: 0,
    multiverse: 0,
  },
): LayerWeights {
  const galaxyIn = smoothstep(6, 7.2, zoom);
  const localGroupOut = 1 - smoothstep(10.8, 11.6, zoom);
  out.solar = 1 - smoothstep(0.3, 1.2, zoom);
  out.planetLabels = 1 - smoothstep(0.3, 0.8, zoom);
  out.sunPoint = smoothstep(0.8, 1.6, zoom);
  out.sky = 1 - smoothstep(5.4, 6.8, zoom);
  out.stars = smoothstep(3, 4.2, zoom) * (1 - smoothstep(5.2, 5.9, zoom));
  out.galaxy = galaxyIn * localGroupOut;
  out.galaxyLabels = galaxyIn * (1 - smoothstep(8.3, 8.9, zoom));
  out.here = smoothstep(0.5, 1, galaxyIn);
  out.localGroup = smoothstep(8.5, 9.3, zoom) * localGroupOut;
  out.web = smoothstep(11.2, 12.8, zoom) * (1 - 0.65 * smoothstep(14.3, 14.9, zoom));
  out.cmb = smoothstep(12.6, 13.6, zoom);
  out.multiverse = smoothstep(14.2, 14.9, zoom);
  return out;
}
