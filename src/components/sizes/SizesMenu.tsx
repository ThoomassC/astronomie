"use client";

import { StopsMenuView, type StopsMenuItem } from "@/components/journey/StopsMenuView";
import { useLocale } from "@/i18n/LocaleProvider";
import { COMPARED_OBJECTS } from "@/lib/sizes/objects";
import { useCurrentSizeStop } from "@/lib/sizes/store";
import { sizeObjectIndex, sizeStopAnchor } from "@/lib/sizes/stops";
import { SIZES_STRINGS } from "./sizes.strings";

/**
 * Menu des astres (StopsMenuView) : là où la règle n'a plus la place, le nom de l'astre affiché, dans la barre haute,
 * ouvre la liste des quatorze astres avec leur taille (l'ombre d'un trou noir). Le bouton prend le nom court d'un astre
 * au nom long (`shortNames`), qui tient sans être coupé à 375 px ; la liste, le nom entier. À l'introduction, le bouton
 * dit « Astres ».
 */
export function SizesMenu() {
  const t = SIZES_STRINGS[useLocale()];
  const current = useCurrentSizeStop();
  const items: StopsMenuItem[] = COMPARED_OBJECTS.map((object) => ({
    key: object.key,
    href: sizeStopAnchor(object.key),
    name: t.names[object.key],
    sub: t.size(object),
    color: object.color,
  }));
  const shown = COMPARED_OBJECTS[sizeObjectIndex(current)];
  return (
    <StopsMenuView
      items={items}
      current={current}
      homeKey="intro"
      currentName={t.shortNames[shown.key] ?? t.names[shown.key]}
      currentColor={shown.color}
      labels={t.menu}
    />
  );
}
