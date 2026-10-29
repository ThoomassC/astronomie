import { smoothstep } from "./math";

/**
 * Poids des couches de la scène selon le zoom cosmique (log10 de la réduction du système solaire),
 * de 0 (rien n'est dessiné) à 1. Chaque couche entre ou sort en douceur (smoothstep) sur sa plage :
 *
 * | Couche       | Plage                                      | z = 0 | z = 4,6 | z = 8 |
 * |--------------|--------------------------------------------|-------|---------|-------|
 * | solar        | 1 → 0 sur [0,3 ; 1,2]                      | 1     | 0       | 0     |
 * | planetLabels | 1 → 0 sur [0,3 ; 0,8]                      | 1     | 0       | 0     |
 * | sunPoint     | 0 → 1 sur [0,8 ; 1,6]                      | 0     | 1       | 1     |
 * | sky          | 1 → 0 sur [5,4 ; 6,8]                      | 1     | 1       | 0     |
 * | stars        | 0 → 1 sur [3 ; 4,2], 1 → 0 sur [5,2 ; 5,9] | 0     | 1       | 0     |
 * | galaxy       | 0 → 1 sur [6 ; 7,2]                        | 0     | 0       | 1     |
 *
 * Entre 1,2 et 3, le Soleil reste seul sur le ciel : c'est le vide entre le système solaire et les étoiles.
 * Au zoom 0, aucune couche nouvelle n'est dessinée : la scène du système solaire reste celle d'avant.
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
  /** Galaxie en points, « Vous êtes ici », centre galactique : 0 → 1 sur [6 ; 7,2]. */
  galaxy: number;
}

/** Au-delà, le système solaire n'est plus dessiné (sa couronne ne fait plus que 1,4 à 2 px) et le plan lointain s'ouvre. */
export const SOLAR_HIDDEN_ZOOM = 2;

/** Poids des couches au zoom donné (plages ci-dessus). Écrit dans `out` s'il est fourni et le renvoie. */
export function layerWeights(
  zoom: number,
  out: LayerWeights = { solar: 0, planetLabels: 0, sunPoint: 0, sky: 0, stars: 0, galaxy: 0 },
): LayerWeights {
  out.solar = 1 - smoothstep(0.3, 1.2, zoom);
  out.planetLabels = 1 - smoothstep(0.3, 0.8, zoom);
  out.sunPoint = smoothstep(0.8, 1.6, zoom);
  out.sky = 1 - smoothstep(5.4, 6.8, zoom);
  out.stars = smoothstep(3, 4.2, zoom) * (1 - smoothstep(5.2, 5.9, zoom));
  out.galaxy = smoothstep(6, 7.2, zoom);
  return out;
}
