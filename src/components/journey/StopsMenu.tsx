"use client";

import { useCurrentStop } from "@/lib/journey/store";
import type { RailStop } from "./DistanceRail";
import { StopsMenuView, type StopsMenuItem } from "./StopsMenuView";
import { railDistanceLabel, stopColor, stopName } from "./stopMeta";

/** Libellés du menu des escales du voyage. */
const LABELS = { nav: "Escales", home: "Escales", choose: "choisir une escale", change: "changer d'escale" } as const;

/**
 * Menu des escales du voyage (StopsMenuView) : le nom de l'escale en cours, dans la barre haute, ouvre la liste des
 * escales, avec leur distance au Soleil. Il remplace la règle des distances là où elle n'a plus que des pastilles
 * sans nom. À la vue d'ensemble, absente de la liste, le bouton dit « Escales ».
 */
export function StopsMenu({ stops }: { stops: readonly RailStop[] }) {
  const current = useCurrentStop();
  const items: StopsMenuItem[] = stops.map(({ key, au, href }) => ({
    key,
    href,
    name: stopName(key),
    sub: railDistanceLabel(key, au),
    color: stopColor(key),
  }));
  return (
    <StopsMenuView
      items={items}
      current={current}
      homeKey="hero"
      currentName={stopName(current)}
      currentColor={stopColor(current)}
      labels={LABELS}
    />
  );
}
