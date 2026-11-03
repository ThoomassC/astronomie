"use client";

import { useLocale } from "@/i18n/LocaleProvider";
import { COMPARED_OBJECTS } from "@/lib/sizes/objects";
import { useCurrentSizeStop } from "@/lib/sizes/store";
import { sizeObjectIndex } from "@/lib/sizes/stops";
import { SIZES_STRINGS } from "./sizes.strings";

/**
 * Sorte (« Étoile », « Trou noir ») + pastille + nom de l'astre que montre la scène (le plus petit dès l'introduction),
 * dans la barre haute. Pas de région live : un saut d'un astre à l'autre ferait annoncer chacun ; les plaques ont leur
 * titre.
 */
export function CurrentObject() {
  const t = SIZES_STRINGS[useLocale()];
  const object = COMPARED_OBJECTS[sizeObjectIndex(useCurrentSizeStop())];
  return (
    <p className="where">
      <span>{t.current[object.kind]}</span>
      <i aria-hidden="true" style={{ background: object.color }} />
      <b>{t.names[object.key]}</b>
    </p>
  );
}
