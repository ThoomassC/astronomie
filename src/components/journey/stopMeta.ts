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
    default:
      return PLANET_BY_KEY[key].name;
  }
}

/** Couleur propre à l'escale (pastilles de la barre haute et de la règle). */
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
    default:
      return PLANET_BY_KEY[key].color;
  }
}

/** Distance au Soleil affichée sous le nom d'un repère de la règle. */
export function railDistanceLabel(key: StopKey, au: number): string {
  if (au === 0) return "le centre";
  if (key === "belt") return "2,1 à 3,3 UA";
  if (key === "beyond") return "plus de 30 UA";
  return `${formatNumber(au, au < 10 ? 2 : 1)} UA`;
}
