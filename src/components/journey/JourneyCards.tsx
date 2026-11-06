"use client";

import type { ReactNode } from "react";
import type { StopKey } from "@/lib/journey/camera";
import { journeyStore } from "@/lib/journey/store";
import { CardTrack } from "./CardTrack";

/**
 * Carte fixe du téléphone, au Voyage : les plaques des escales suivent le vol de `journeyStore` ; `cards` dit les
 * escales qui ont une plaque (ni l'accueil ni la ceinture d'astéroïdes).
 */
export function JourneyCards({ cards, children }: { cards: readonly StopKey[]; children: ReactNode }) {
  return (
    <CardTrack store={journeyStore} cards={cards}>
      {children}
    </CardTrack>
  );
}
