"use client";

import { getClock } from "@/lib/sim/clock";
import { FRAME_ORDER, useFrame } from "@/lib/sim/frameLoop";

/** Fait avancer le temps simulé à chaque image, avant tous les autres rappels. Aucun rendu. */
export function ClockDriver(): null {
  useFrame((dt) => getClock().advance(dt), FRAME_ORDER.clock);
  return null;
}
