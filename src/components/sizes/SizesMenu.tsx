"use client";

import { StopsMenuView, type StopsMenuItem } from "@/components/journey/StopsMenuView";
import { useLocale } from "@/i18n/LocaleProvider";
import { COMPARED_STARS } from "@/lib/astro/starSizes";
import { useCurrentSizeStop } from "@/lib/sizes/store";
import { sizeStarIndex, sizeStopAnchor } from "@/lib/sizes/stops";
import { SIZES_STRINGS } from "./sizes.strings";

/**
 * Menu des étoiles (StopsMenuView) : là où la règle n'a plus la place, le nom de l'étoile affichée, dans la barre
 * haute, ouvre la liste des dix étoiles avec leur rayon. À l'introduction, le bouton dit « Étoiles ».
 */
export function SizesMenu() {
  const t = SIZES_STRINGS[useLocale()];
  const current = useCurrentSizeStop();
  const items: StopsMenuItem[] = COMPARED_STARS.map((star) => ({
    key: star.key,
    href: sizeStopAnchor(star.key),
    name: t.names[star.key],
    sub: t.radius(star.radiusSolar),
    color: star.color,
  }));
  const shown = COMPARED_STARS[sizeStarIndex(current)];
  return (
    <StopsMenuView
      items={items}
      current={current}
      homeKey="intro"
      currentName={t.names[shown.key]}
      currentColor={shown.color}
      labels={t.menu}
    />
  );
}
