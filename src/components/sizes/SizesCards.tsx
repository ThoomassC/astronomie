"use client";

import type { ReactNode } from "react";
import { CardTrack } from "@/components/journey/CardTrack";
import { sizesStore } from "@/lib/sizes/store";
import type { SizeStopKey } from "@/lib/sizes/stops";

/**
 * Carte fixe du téléphone, à Tailles : les plaques des astres suivent le vol de `sizesStore` ; `cards` dit les escales
 * qui ont une plaque (toutes, sauf l'introduction).
 */
export function SizesCards({ cards, children }: { cards: readonly SizeStopKey[]; children: ReactNode }) {
  return (
    <CardTrack store={sizesStore} cards={cards}>
      {children}
    </CardTrack>
  );
}
