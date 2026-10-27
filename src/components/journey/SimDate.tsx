"use client";

import { useEffect, useRef } from "react";
import { getClock } from "@/lib/sim/clock";
import { formatRelativeDate } from "./relativeDate";

const NARROW_QUERY = "(max-width: 640px)";
const TINY_QUERY = "(max-width: 359px)";
/** Formats créés une fois : « 27 octobre 2026 », « 27 oct. 2026 », « 27/10/26 » sous 360 px. */
const LONG_DATE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const SHORT_DATE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });
const COMPACT_DATE = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" });
const RELATIVE = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });

/**
 * Date simulée du dock et écart avec aujourd'hui. L'écart dépend de l'heure réelle :
 * il est calculé dans le rappel de l'horloge, jamais pendant le rendu, et écrit dans le DOM.
 */
export function SimDate() {
  const dateRef = useRef<HTMLSpanElement>(null);
  const relativeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const dateEl = dateRef.current;
    const relativeEl = relativeRef.current;
    if (!dateEl || !relativeEl) return;
    const clock = getClock();
    const narrow = window.matchMedia(NARROW_QUERY);
    const tiny = window.matchMedia(TINY_QUERY);
    const paint = () => {
      const { ms } = clock.snapshot();
      const format = tiny.matches ? COMPACT_DATE : narrow.matches ? SHORT_DATE : LONG_DATE;
      dateEl.textContent = format.format(ms);
      relativeEl.textContent = formatRelativeDate(ms - Date.now(), RELATIVE);
    };
    paint();
    narrow.addEventListener("change", paint);
    tiny.addEventListener("change", paint);
    const unsubscribe = clock.subscribe(paint);
    return () => {
      unsubscribe();
      narrow.removeEventListener("change", paint);
      tiny.removeEventListener("change", paint);
    };
  }, []);

  return (
    <p className="date">
      <span ref={dateRef}>–</span>
      <small ref={relativeRef} />
    </p>
  );
}
