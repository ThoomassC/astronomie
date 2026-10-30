"use client";

import { RAIL_ID } from "@/components/journey/ids";
import { RailView, type RailMarker } from "@/components/journey/RailView";
import { useLocale } from "@/i18n/LocaleProvider";
import { COMPARED_STARS } from "@/lib/astro/starSizes";
import { SIZE_RAIL_TICKS, sizeRailPercent } from "@/lib/sizes/sizeRail";
import { sizesStore, useCurrentSizeStop } from "@/lib/sizes/store";
import { sizeStopAnchor } from "@/lib/sizes/stops";
import { SIZES_STRINGS } from "./sizes.strings";
import styles from "./SizesPage.module.css";

/** Axe continu de la règle des tailles, de 0,1 à 2 000 R☉ (4 à 96 %), sans rupture. */
const AXIS = [{ from: 4, to: 96 }] as const;

/**
 * Règle des tailles (RailView) : sommaire des dix étoiles, de la plus petite à la plus grande, sur une échelle
 * logarithmique des rayons, et repère du vol. L'introduction se place comme la plus petite étoile. Dessous, une légende
 * décorative rappelle que chaque graduation multiplie le rayon par 10 ; elle part avec la règle sur petit écran.
 */
export function SizesRail() {
  const t = SIZES_STRINGS[useLocale()];
  const current = useCurrentSizeStop();
  const markers: RailMarker[] = COMPARED_STARS.map((star) => ({
    key: star.key,
    href: sizeStopAnchor(star.key),
    name: t.names[star.key],
    sub: t.radius(star.radiusSolar),
    color: star.color,
    percent: sizeRailPercent(star.radiusSolar),
  }));
  return (
    <>
      <RailView
        id={RAIL_ID}
        label={t.railLabel}
        markers={markers}
        ticks={SIZE_RAIL_TICKS}
        axis={AXIS}
        current={current}
        readFlight={sizesStore.get}
      />
      <p className={styles.railLegend} aria-hidden="true">
        {t.railLegend}
      </p>
    </>
  );
}
