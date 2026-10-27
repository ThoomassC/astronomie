"use client";

import { AU_KM, type Vec3 } from "@/lib/astro/constants";
import { distance, heliocentric, julianDate } from "@/lib/astro/ephemeris";
import { formatDuration, lightSeconds } from "@/lib/astro/light";
import { PLANET_BY_KEY, type PlanetKey } from "@/lib/astro/planets";
import { formatNumber } from "@/lib/format";
import { useClockValue } from "./useClockValue";

type LiveTarget = "sun" | PlanetKey;

const SUN_POSITION: Vec3 = { x: 0, y: 0, z: 0 };
/** Les deux lignes forment une seule chaîne : l'instantané se compare par valeur. */
const LINE_BREAK = "\n";

/** Dernier texte calculé par astre, pour ne pas refaire le calcul pour un même instant. */
const lastText = new Map<LiveTarget, { ms: number; text: string }>();

/** Distance Terre-astre et temps de lumière, ou distance Terre-Soleil pour la Terre. */
function liveText(target: LiveTarget, ms: number): string {
  const cached = lastText.get(target);
  if (cached && cached.ms === ms) return cached.text;
  const jd = julianDate(ms);
  const earth = heliocentric(PLANET_BY_KEY.earth, jd);
  let text: string;
  if (target === "earth") {
    const au = distance(earth, SUN_POSITION);
    text = `${formatNumber(au, 4)} UA${LINE_BREAK}${formatNumber((au * AU_KM) / 1e6, 1)} millions de km`;
  } else {
    const body = target === "sun" ? SUN_POSITION : heliocentric(PLANET_BY_KEY[target], jd);
    const au = distance(earth, body);
    text = `${formatNumber(au, au < 10 ? 2 : 1)} UA${LINE_BREAK}soit ${formatDuration(lightSeconds(au))} à la vitesse de la lumière`;
  }
  lastText.set(target, { ms, text });
  return text;
}

/**
 * Ligne « ce jour » de la fiche, recalculée avec la date simulée. Le composant ne se
 * re-rend que si le texte affiché change. Avant hydratation : « – » et une seconde
 * ligne réservée, pour que la fiche ne saute pas.
 */
export function LiveDistance({ target }: { target: LiveTarget }) {
  const text = useClockValue<string | null>((snapshot) => liveText(target, snapshot.ms), null);
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
