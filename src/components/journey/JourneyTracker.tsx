"use client";

import { useEffect, useRef } from "react";
import { scrollState } from "@/lib/journey/camera";
import { journeyStore } from "@/lib/journey/store";
import { FRAME_ORDER, useFrame } from "@/lib/sim/frameLoop";
import { useReducedMotion } from "@/lib/sim/reducedMotion";
import { getSectionRanges, measureSections, takeSkipSmoothing } from "./navigation";

/** Délai avant de remesurer après un redimensionnement, en ms. */
const RESIZE_DEBOUNCE_MS = 120;
/** Taux du lissage exponentiel du défilement, par seconde. */
const SCROLL_SMOOTHING_RATE = 5;

/**
 * Suit le défilement : mesure les escales (montage, redimensionnement, contenu qui change
 * de hauteur, polices chargées), lisse la position à chaque image et publie le vol
 * en cours dans `journeyStore`. Aucun rendu.
 */
export function JourneyTracker(): null {
  const reducedMotion = useReducedMotion();
  const smoothedY = useRef<number | null>(null);

  useEffect(() => {
    measureSections();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(measureSections, RESIZE_DEBOUNCE_MS);
    };
    window.addEventListener("resize", onResize);
    const observer = new ResizeObserver(() => measureSections());
    const main = document.querySelector("main");
    if (main) observer.observe(main);
    let active = true;
    void document.fonts?.ready.then(() => {
      if (active) measureSections();
    });
    return () => {
      active = false;
      clearTimeout(timer);
      window.removeEventListener("resize", onResize);
      observer.disconnect();
    };
  }, []);

  useFrame((dt) => {
    const y = window.scrollY;
    const previous = smoothedY.current ?? y;
    const jump = takeSkipSmoothing() || reducedMotion;
    let next = jump ? y : previous + (y - previous) * (1 - Math.exp(-dt * SCROLL_SMOOTHING_RATE));
    if (Math.abs(y - next) < 0.5) next = y;
    smoothedY.current = next;
    const ranges = getSectionRanges();
    if (ranges.length === 0) return;
    const { from, to, t } = scrollState(ranges, next);
    const state = journeyStore.get();
    const fromKey = ranges[from].key;
    const toKey = ranges[to].key;
    // Au repos, pas de nouvel état : la scène compare ces valeurs pour sauter les images inutiles.
    if (state.from === fromKey && state.to === toKey && state.t === t) return;
    journeyStore.update(fromKey, toKey, t);
  }, FRAME_ORDER.journey);

  return null;
}
