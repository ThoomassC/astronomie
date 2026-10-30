"use client";

import { useLocale } from "@/i18n/LocaleProvider";
import { useCurrentStop } from "@/lib/journey/store";
import { JOURNEY_STRINGS } from "./journey.strings";
import { stopColor, stopName } from "./stopMeta";

/**
 * « Escale » + pastille + nom de l'escale affichée, dans la langue de la page. Pas de région live : un saut du Soleil
 * à Neptune ferait annoncer chaque escale traversée ; les sections ont leur propre nom.
 */
export function CurrentStop() {
  const locale = useLocale();
  const key = useCurrentStop();
  return (
    <p className="where">
      <span>{JOURNEY_STRINGS[locale].currentStop}</span>
      <i aria-hidden="true" style={{ background: stopColor(key) }} />
      <b>{stopName(key, locale)}</b>
    </p>
  );
}
