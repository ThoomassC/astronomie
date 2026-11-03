"use client";

import { useLocale } from "@/i18n/LocaleProvider";
import { COMPARED_STARS } from "@/lib/astro/starSizes";
import { useCurrentSizeStop } from "@/lib/sizes/store";
import { sizeStarIndex } from "@/lib/sizes/stops";
import { SIZES_STRINGS } from "./sizes.strings";

/**
 * « Étoile » + pastille + nom de l'étoile que montre la scène (la plus petite dès l'introduction), dans la barre
 * haute. Pas de région live : un saut d'une étoile à l'autre ferait annoncer chacune ; les plaques ont leur titre.
 */
export function CurrentStar() {
  const t = SIZES_STRINGS[useLocale()];
  const star = COMPARED_STARS[sizeStarIndex(useCurrentSizeStop())];
  return (
    <p className="where">
      <span>{t.current[star.kind]}</span>
      <i aria-hidden="true" style={{ background: star.color }} />
      <b>{t.names[star.key]}</b>
    </p>
  );
}
