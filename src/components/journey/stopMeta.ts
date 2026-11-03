import { DEFAULT_LOCALE, type Locale } from "@/i18n/locales";
import { bodyName } from "@/i18n/names";
import { withUnit } from "@/i18n/units";
import { AU_PER_LIGHT_YEAR } from "@/lib/astro/constants";
import { PLANET_BY_KEY, SUN } from "@/lib/astro/planets";
import type { StopKey } from "@/lib/journey/camera";
import { formatNumber } from "@/lib/format";
import { DEEP_SKY_STRINGS } from "@/components/scene/deepSky.strings";
import { JOURNEY_STRINGS, type NonBodyStopKey } from "./journey.strings";

/** Étendue de la ceinture principale d'astéroïdes, en UA. */
const BELT_AU = { inner: 2.1, outer: 3.3 } as const;
/** Début de l'au-delà, à l'orbite de Neptune, en UA. */
const BEYOND_AU = 30;

/** Escale nommée par les chaînes du voyage, et non par `bodyName` (le Soleil et les planètes). */
function isNonBodyStop(key: StopKey): key is NonBodyStopKey {
  return Object.hasOwn(JOURNEY_STRINGS[DEFAULT_LOCALE].stopNames, key);
}

/**
 * Nom affiché d'une escale (barre haute, règle des distances, menu des escales, exploration), dans la langue :
 * « Vue d'ensemble », « Overview », « Vista general » ; le Soleil et les planètes par `bodyName`.
 */
export function stopName(key: StopKey, locale: Locale): string {
  return isNonBodyStop(key) ? JOURNEY_STRINGS[locale].stopNames[key] : bodyName(key, locale);
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
    case "localGroup":
      return "#A9B8E8";
    case "universe":
      return "#E7A6C1";
    case "multiverse":
      return "#7FD8C8";
    default:
      return PLANET_BY_KEY[key].color;
  }
}

/**
 * Distance au Soleil affichée sous le nom d'un repère de la règle, dans la langue. En UA dans le système solaire :
 * « 1,52 UA », « 1.52 AU » ; une distance entière sans décimales, comme
 * dans la fiche (« 1 UA ») ; deux décimales sous 10 UA, une au-delà. En années-lumière au-delà : « dès 4,2 al »
 * (l'étoile la plus proche), « centre à 27 000 al » ; en toutes lettres au-delà du million, à deux chiffres
 * significatifs : « Andromède à 2,5 millions d'al », « rayon de 46 milliards d'al ». Le multivers, à l'infini :
 * « hypothèse ». Le Soleil (distance nulle) : « le centre ».
 */
export function railDistanceLabel(key: StopKey, au: number, locale: Locale): string {
  const t = JOURNEY_STRINGS[locale].distance;
  const inAu = (value: number, digits: number) => withUnit(formatNumber(value, digits, locale), "au", locale);
  const inLy = (value: number, digits: number) =>
    withUnit(formatNumber(value / AU_PER_LIGHT_YEAR, digits, locale), "ly", locale);
  if (au === 0) return t.centre;
  if (key === "belt") return t.range(formatNumber(BELT_AU.inner, 1, locale), inAu(BELT_AU.outer, 1));
  if (key === "beyond") return t.beyond(inAu(BEYOND_AU, 0));
  if (key === "stars") return t.from(inLy(au, 1));
  if (key === "galaxy") return t.centreAt(inLy(au, 0));
  // Au-delà du million d'années-lumière, les mots du ciel profond : « 2,5 millions d'al ».
  const inWords = () => DEEP_SKY_STRINGS[locale].galaxyDistance(au / AU_PER_LIGHT_YEAR / 1e6);
  if (key === "localGroup") return t.andromedaAt(inWords());
  if (key === "universe") return t.radius(inWords());
  if (key === "multiverse") return t.hypothesis;
  return inAu(au, Number.isInteger(au) ? 0 : au < 10 ? 2 : 1);
}
