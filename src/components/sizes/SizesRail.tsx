"use client";

import { RAIL_ID } from "@/components/journey/ids";
import { RailView, type RailMarker } from "@/components/journey/RailView";
import { useLocale } from "@/i18n/LocaleProvider";
import { COMPARED_OBJECTS, comparedRadiusSolar } from "@/lib/sizes/objects";
import { SIZE_RAIL_TICKS, sizeRailPercent } from "@/lib/sizes/sizeRail";
import { sizesStore, useCurrentSizeStop } from "@/lib/sizes/store";
import { sizeStopAnchor } from "@/lib/sizes/stops";
import { SIZES_STRINGS } from "./sizes.strings";
import styles from "./SizesPage.module.css";

/** Axe continu de la règle des tailles, de 10⁻⁴ à 10⁶ R☉ (4 à 96 %), sans rupture. */
const AXIS = [{ from: 4, to: 96 }] as const;

/**
 * Règle des tailles (RailView) : sommaire des quatorze astres, du plus petit au plus grand, sur une échelle
 * logarithmique des tailles comparées (rayon d'une étoile, ombre d'un trou noir), et repère du vol. L'introduction se
 * place comme le plus petit astre. Dessous, une légende décorative rappelle que chaque graduation multiplie la taille par
 * 10 ; elle part avec la règle sur petit écran.
 */
export function SizesRail() {
  const t = SIZES_STRINGS[useLocale()];
  const current = useCurrentSizeStop();
  const markers: RailMarker[] = COMPARED_OBJECTS.map((object) => ({
    key: object.key,
    href: sizeStopAnchor(object.key),
    name: t.names[object.key],
    sub: t.size(object),
    color: object.color,
    percent: sizeRailPercent(comparedRadiusSolar(object)),
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
