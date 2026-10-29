import { LOCAL_GROUP, type LocalGroupGalaxyKey } from "@/lib/astro/localGroup";
import { spectralClass } from "@/lib/astro/starMap";
import { NEARBY_STARS } from "@/lib/astro/stars";

/** Nombres tirés des données, communs aux trois langues : les textes les citent sans les recopier. */

/** Étoiles de la carte des étoiles voisines. */
export const MAP_STAR_COUNT = NEARBY_STARS.length;

/** Naines rouges (classe M) parmi les étoiles de la carte : les plus nombreuses, même tout près du Soleil. */
export const RED_DWARF_COUNT = NEARBY_STARS.filter((star) => spectralClass(star.spectralType) === "M").length;

/** Galaxies dessinées sur la carte du Groupe local, Voie lactée comprise. */
export const MAP_GALAXY_COUNT = LOCAL_GROUP.length;

/** Distance d'une galaxie du Groupe local, en millions d'années-lumière (données). */
export function distanceMlyOf(key: LocalGroupGalaxyKey): number {
  const galaxy = LOCAL_GROUP.find((candidate) => candidate.key === key);
  if (!galaxy) throw new Error(`Galaxie absente du Groupe local : ${key}`);
  return galaxy.distanceMly;
}
