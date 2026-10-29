import { AU_PER_LIGHT_YEAR } from "@/lib/astro/constants";
import { PLANET_BY_KEY, SUN } from "@/lib/astro/planets";
import type { StopKey } from "@/lib/journey/camera";
import { formatNumber } from "@/lib/format";

/** Nom affiché d'une escale (barre haute, règle des distances). */
export function stopName(key: StopKey): string {
  switch (key) {
    case "hero":
      return "Vue d'ensemble";
    case "sun":
      return SUN.name;
    case "belt":
      return "Astéroïdes";
    case "beyond":
      return "Au-delà";
    case "stars":
      return "Étoiles voisines";
    case "galaxy":
      return "Voie lactée";
    default:
      return PLANET_BY_KEY[key].name;
  }
}

/** Couleur propre à l'escale (pastilles de la barre haute et de la règle, filet de la plaque). */
export function stopColor(key: StopKey): string {
  switch (key) {
    case "hero":
      return "#FFB547";
    case "sun":
      return SUN.color;
    case "belt":
      return "#A89F94";
    case "beyond":
      return "#C2A36B";
    case "stars":
      return "#CFDCFF";
    case "galaxy":
      return "#B3A4EE";
    default:
      return PLANET_BY_KEY[key].color;
  }
}

/**
 * Distance au Soleil affichée sous le nom d'un repère de la règle. En UA dans le système solaire ;
 * en années-lumière au-delà : « dès 4,2 al » (l'étoile la plus proche), « centre à 27 000 al ».
 */
export function railDistanceLabel(key: StopKey, au: number): string {
  if (au === 0) return "le centre";
  if (key === "belt") return "2,1 à 3,3 UA";
  if (key === "beyond") return "plus de 30 UA";
  if (key === "stars") return `dès ${formatNumber(au / AU_PER_LIGHT_YEAR, 1)} al`;
  if (key === "galaxy") return `centre à ${formatNumber(au / AU_PER_LIGHT_YEAR)} al`;
  // Distance entière sans décimales, comme dans la fiche : « 1 UA », pas « 1,00 UA ».
  return `${formatNumber(au, Number.isInteger(au) ? 0 : au < 10 ? 2 : 1)} UA`;
}
