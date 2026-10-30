"use client";

import { useLocale } from "@/i18n/LocaleProvider";
import type { Locale } from "@/i18n/locales";
import { withUnit } from "@/i18n/units";
import { AU_KM, type Vec3 } from "@/lib/astro/constants";
import { distance, heliocentric, julianDate } from "@/lib/astro/ephemeris";
import { formatDuration, lightSeconds } from "@/lib/astro/light";
import { PLANET_BY_KEY, type PlanetKey } from "@/lib/astro/planets";
import { formatNumber } from "@/lib/format";
import { JOURNEY_STRINGS } from "./journey.strings";
import { useClockValue } from "./useClockValue";

type LiveTarget = "sun" | PlanetKey;

const SUN_POSITION: Vec3 = { x: 0, y: 0, z: 0 };
/** Les deux lignes forment une seule chaîne : l'instantané se compare par valeur. */
const LINE_BREAK = "\n";

/** Dernier texte calculé par astre, pour ne pas refaire le calcul pour un même instant dans la même langue. */
const lastText = new Map<LiveTarget, { ms: number; locale: Locale; text: string }>();

/**
 * Distance Terre-astre et temps de lumière (« 0,99 UA » / « soit 8 min 15 s à la vitesse de la lumière »), ou
 * distance Terre-Soleil pour la Terre (« 0,9933 UA » / « 148,6 millions de km »), dans la langue. Distance à deux
 * décimales sous 10 UA, à une au-delà ; quatre pour la Terre, dont la distance varie peu.
 */
function liveText(target: LiveTarget, ms: number, locale: Locale): string {
  const cached = lastText.get(target);
  if (cached && cached.ms === ms && cached.locale === locale) return cached.text;
  const t = JOURNEY_STRINGS[locale].live;
  const inAu = (value: number, digits: number) => withUnit(formatNumber(value, digits, locale), "au", locale);
  const jd = julianDate(ms);
  const earth = heliocentric(PLANET_BY_KEY.earth, jd);
  let text: string;
  if (target === "earth") {
    const au = distance(earth, SUN_POSITION);
    text = `${inAu(au, 4)}${LINE_BREAK}${t.millionKm(formatNumber((au * AU_KM) / 1e6, 1, locale))}`;
  } else {
    const body = target === "sun" ? SUN_POSITION : heliocentric(PLANET_BY_KEY[target], jd);
    const au = distance(earth, body);
    text = `${inAu(au, au < 10 ? 2 : 1)}${LINE_BREAK}${t.lightTime(formatDuration(lightSeconds(au)))}`;
  }
  lastText.set(target, { ms, locale, text });
  return text;
}

/**
 * Ligne « ce jour » de la fiche, recalculée avec la date simulée, dans la langue de la page. Le composant ne se
 * re-rend que si le texte affiché change. Avant hydratation : « – » et une seconde ligne réservée, pour que la
 * fiche ne saute pas.
 */
export function LiveDistance({ target }: { target: LiveTarget }) {
  const locale = useLocale();
  const text = useClockValue<string | null>((snapshot) => liveText(target, snapshot.ms, locale), null);
  if (text === null) {
    return (
      <dd>
        –<small>{"\u00a0"}</small>
      </dd>
    );
  }
  const [value, note] = text.split(LINE_BREAK);
  return (
    <dd>
      {value}
      <small>{note}</small>
    </dd>
  );
}
