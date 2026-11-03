"use client";

import { StopsMenuView, type StopsMenuItem } from "@/components/journey/StopsMenuView";
import { useLocale } from "@/i18n/LocaleProvider";
import { COMPARED_OBJECTS } from "@/lib/sizes/objects";
import { useCurrentSizeStop } from "@/lib/sizes/store";
import { sizeObjectIndex, sizeStopAnchor } from "@/lib/sizes/stops";
import { SIZES_STRINGS } from "./sizes.strings";

/**
 * Menu des astres (StopsMenuView) : là où la règle n'a plus la place, le nom de l'astre affiché, dans la barre haute,
 * ouvre la liste des quatorze astres avec leur taille (l'ombre d'un trou noir). À l'introduction, le bouton dit
 * « Astres ».
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
      currentName={t.names[shown.key]}
      currentColor={shown.color}
      labels={t.menu}
    />
  );
}
