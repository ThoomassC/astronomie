"use client";

import { useLocale } from "@/i18n/LocaleProvider";
import { useCurrentStop } from "@/lib/journey/store";
import type { RailStop } from "./DistanceRail";
import { JOURNEY_STRINGS } from "./journey.strings";
import { StopsMenuView, type StopsMenuItem } from "./StopsMenuView";
import { railDistanceLabel, stopColor, stopName } from "./stopMeta";

/**
 * Menu des escales du voyage (StopsMenuView) : le nom de l'escale en cours, dans la barre haute, ouvre la liste des
 * escales, avec leur distance au Soleil, dans la langue de la page. Il remplace la règle des distances là où elle n'a
 * plus que des pastilles sans nom. À la vue d'ensemble, absente de la liste, le bouton dit « Escales ».
 */
export function StopsMenu({ stops }: { stops: readonly RailStop[] }) {
  const locale = useLocale();
  const current = useCurrentStop();
  const items: StopsMenuItem[] = stops.map(({ key, au, href }) => ({
    key,
    href,
    name: stopName(key, locale),
    sub: railDistanceLabel(key, au, locale),
    color: stopColor(key),
  }));
  return (
    <StopsMenuView
      items={items}
      current={current}
      homeKey="hero"
      currentName={stopName(current, locale)}
      currentColor={stopColor(current)}
      labels={JOURNEY_STRINGS[locale].stopsMenu}
    />
  );
}
