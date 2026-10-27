"use client";

import { useCurrentStop } from "@/lib/journey/store";
import { stopColor, stopName } from "./stopMeta";

/**
 * « Escale » + pastille + nom de l'escale affichée. Pas de région live : un saut du Soleil
 * à Neptune ferait annoncer chaque escale traversée ; les sections ont leur propre nom.
 */
export function CurrentStop() {
  const key = useCurrentStop();
  return (
    <p className="where">
      <span>Escale</span>
      <i aria-hidden="true" style={{ background: stopColor(key) }} />
      <b>{stopName(key)}</b>
    </p>
  );
}
