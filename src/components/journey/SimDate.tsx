"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import { INTL_LOCALE, type Locale } from "@/i18n/locales";
import { getClock } from "@/lib/sim/clock";
import { DOCK_STRINGS } from "./dock.strings";
import { formatRelativeDate } from "./relativeDate";

/**
 * Date courte en dessous de ces largeurs : celle du dock compact (globals.css). En espagnol, dès que les boutons du
 * dock perdent leur libellé (globals.css, 56,25rem) : la date longue (« 30 de septiembre de 2026 ») n'y tient plus.
 */
const NARROW_QUERY: Readonly<Record<Locale, string>> = {
  fr: "(max-width: 47.5rem)",
  en: "(max-width: 47.5rem)",
  es: "(max-width: 56.25rem)",
};
const TINY_QUERY = "(max-width: 359px)";

/** Formats de date du dock, dans une langue. */
export interface DockDateFormats {
  /** « 29 octobre 2026 », « 29 October 2026 », « 29 de octubre de 2026 ». */
  long: Intl.DateTimeFormat;
  /** Dock compact : « 29 oct. 2026 », « 29 Oct 2026 », « 29 oct 2026 ». */
  short: Intl.DateTimeFormat;
  /** Sous 360 px : « 29/10/26 » dans les trois langues. */
  compact: Intl.DateTimeFormat;
  /** Écart avec aujourd'hui : « dans 5 jours », « 3 months ago », « hace 3 meses ». */
  relative: Intl.RelativeTimeFormat;
}

/** Formats déjà construits, par langue : en construire coûte cher, et la date se réécrit à chaque jour simulé. */
const formatsByLocale = new Map<Locale, DockDateFormats>();

/** Formats de date du dock dans la langue, créés à la première demande. */
export function dockDateFormats(locale: Locale): DockDateFormats {
  let formats = formatsByLocale.get(locale);
  if (!formats) {
    const tag = INTL_LOCALE[locale];
    formats = {
      long: new Intl.DateTimeFormat(tag, { day: "numeric", month: "long", year: "numeric" }),
      short: new Intl.DateTimeFormat(tag, { day: "numeric", month: "short", year: "numeric" }),
      compact: new Intl.DateTimeFormat(tag, { day: "2-digit", month: "2-digit", year: "2-digit" }),
      relative: new Intl.RelativeTimeFormat(tag, { numeric: "auto" }),
    };
    formatsByLocale.set(locale, formats);
  }
  return formats;
}

/**
 * Date simulée du dock et écart avec aujourd'hui, dans la langue de la page. L'écart dépend de l'heure réelle :
 * il est calculé dans le rappel de l'horloge, jamais pendant le rendu, et écrit dans le DOM.
 */
export function SimDate() {
  const locale = useLocale();
  const dateRef = useRef<HTMLSpanElement>(null);
  const relativeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const dateEl = dateRef.current;
    const relativeEl = relativeRef.current;
    if (!dateEl || !relativeEl) return;
    const clock = getClock();
    const formats = dockDateFormats(locale);
    const today = DOCK_STRINGS[locale].relativeToday;
    const narrow = window.matchMedia(NARROW_QUERY[locale]);
    const tiny = window.matchMedia(TINY_QUERY);
    const paint = () => {
      const { ms } = clock.snapshot();
      const format = tiny.matches ? formats.compact : narrow.matches ? formats.short : formats.long;
      dateEl.textContent = format.format(ms);
      relativeEl.textContent = formatRelativeDate(ms - Date.now(), formats.relative, today);
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
  }, [locale]);

  return (
    <p className="date">
      <span ref={dateRef}>–</span>
      <small ref={relativeRef} />
    </p>
  );
}
