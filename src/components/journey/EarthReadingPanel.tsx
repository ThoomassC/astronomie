"use client";

import { EXPLORE } from "@/content/explore";
import type { EarthViewTarget } from "@/lib/astro/earthView";
import { earthReading } from "./earthReading";
import { useClockValue } from "./useClockValue";

/** Les deux lignes forment une seule chaîne : l'instantané se compare par valeur. */
const LINE_BREAK = "\n";

/** Dernière lecture calculée, pour ne pas refaire le calcul pour un même instant. */
let lastReading: { target: EarthViewTarget; ms: number; text: string } | null = null;

function readingText(target: EarthViewTarget, ms: number): string {
  if (lastReading && lastReading.target === target && lastReading.ms === ms) return lastReading.text;
  const text = earthReading(target, ms).lines.join(LINE_BREAK);
  lastReading = { target, ms, text };
  return text;
}

/**
 * Lecture « vu depuis la Terre », sous la barre d'exploration : fraction éclairée, diamètre apparent et élongation,
 * puis quand regarder. Recalculée avec la date simulée (le dock du temps reste utilisable), elle ne se re-rend que si
 * son texte change. Pas de région live : la phrase complète n'est annoncée qu'à l'activation.
 */
export function EarthReadingPanel({ target }: { target: EarthViewTarget }) {
  const text = useClockValue<string | null>((snapshot) => readingText(target, snapshot.ms), null);
  // Avant l'horloge (rendu serveur) : un tiret et une seconde ligne réservée, pour que la lecture ne saute pas.
  const [figures, whenToLook] = text === null ? ["–", "\u00a0"] : text.split(LINE_BREAK);
  return (
    <div className="earth-reading">
      <p className="earth-reading-title">{EXPLORE.reading.title}</p>
      <p>{figures}</p>
      <p>{whenToLook}</p>
    </div>
  );
}
