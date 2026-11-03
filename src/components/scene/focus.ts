import type { Vec3 } from "@/lib/astro/constants";
import { PLANETS, type PlanetKey } from "@/lib/astro/planets";
import type { StopKey } from "@/lib/journey/camera";
import { smoothstep } from "./math";

/*
 * Mise en avant de l'astre visité, au repos de la caméra sur son escale : son orbite s'efface autour de lui (elle
 * barrerait le globe et les anneaux), les autres planètes s'assombrissent. Rien ne change en plein vol ni aux escales
 * sans planète (vue d'ensemble, Soleil, ceinture, au-delà).
 */

/** Vol publié par le suivi du défilement : escales de départ et d'arrivée, avancement brut (0 au repos). */
export interface RestFlight {
  from: StopKey;
  to: StopKey;
  t: number;
}

/**
 * Part du vol sur laquelle le repos se défait au départ, et se refait à l'arrivée. La caméra suit smootherstep(t) :
 * à t = 0,2, elle n'a parcouru que 6 % du chemin, l'astre est encore cadré.
 */
export const REST_RAMP = 0.2;
/** Rayons de l'astre (affichés) en deçà desquels son orbite est effacée : le globe, et les anneaux de Saturne (2,34). */
export const ORBIT_CLEAR_RADII = 2.5;
/** Rayons de l'astre au-delà desquels son orbite est entière. */
export const ORBIT_FADE_RADII = 6;
/** Éclat des planètes non visitées, au repos sur une escale planétaire (valeur affichée). */
export const UNVISITED_BRIGHTNESS = 0.35;

const PLANET_STOPS: ReadonlySet<StopKey> = new Set(PLANETS.map((planet) => planet.key));

/**
 * Repos de la caméra sur l'escale `key`, de 0 à 1 : 1 posée dessus ; au départ, retombe à 0 sur les premiers REST_RAMP
 * du vol ; à l'arrivée, remonte à 1 sur les derniers (smoothstep) ; 0 en plein vol et pour une escale étrangère au vol.
 * Il suit le défilement, déjà lissé : en douceur, et à rebours quand on remonte.
 */
export function restWeight({ from, to, t }: RestFlight, key: StopKey): number {
  if (from === key) return to === key ? 1 : 1 - smoothstep(0, REST_RAMP, t);
  return to === key ? smoothstep(1 - REST_RAMP, 1, t) : 0;
}

/**
 * Opacité relative d'un point de l'orbite à `distance` du centre de l'astre de rayon affiché `radius` (mêmes unités),
 * au repos `rest` : nulle jusqu'à ORBIT_CLEAR_RADII rayons, entière dès ORBIT_FADE_RADII (smoothstep), mêlée à
 * l'orbite entière selon le repos (1 en vol).
 */
export function orbitNearAlpha(distance: number, radius: number, rest: number): number {
  if (rest <= 0 || radius <= 0) return 1;
  const kept = smoothstep(ORBIT_CLEAR_RADII * radius, ORBIT_FADE_RADII * radius, distance);
  return 1 - rest * (1 - kept);
}

/**
 * Écrit dans `colors` (RGBA par sommet, lues par le matériau de l'orbite) l'alpha de chaque sommet de `positions`
 * (XYZ par sommet) : orbitNearAlpha de sa distance au centre `center` de l'astre. La couleur (RGB) n'est pas touchée.
 */
export function writeOrbitAlphas(
  positions: ArrayLike<number>,
  center: Readonly<Vec3>,
  radius: number,
  rest: number,
  colors: { [index: number]: number },
): void {
  for (let i = 0, j = 0; j + 2 < positions.length; i += 4, j += 3) {
    const distance = Math.hypot(positions[j] - center.x, positions[j + 1] - center.y, positions[j + 2] - center.z);
    colors[i + 3] = orbitNearAlpha(distance, radius, rest);
  }
}

/** Repos sur l'escale `stop` quand c'est une autre planète que `key`, 0 sinon. */
const otherPlanetRest = (flight: RestFlight, stop: StopKey, key: PlanetKey) =>
  stop !== key && PLANET_STOPS.has(stop) ? restWeight(flight, stop) : 0;

/**
 * Éclat de la planète `key` (valeur affichée, de UNVISITED_BRIGHTNESS à 1) : 1, sauf quand la caméra se repose sur
 * une autre planète, où il tombe à UNVISITED_BRIGHTNESS en suivant ce repos. L'astre visité reste entier ; en plein vol
 * et aux escales sans planète, rien ne change.
 */
export function planetBrightness(flight: RestFlight, key: PlanetKey): number {
  const focus = Math.max(otherPlanetRest(flight, flight.from, key), otherPlanetRest(flight, flight.to, key));
  return 1 - (1 - UNVISITED_BRIGHTNESS) * focus;
}
