import { act, render, type RenderResult } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { vi } from "vitest";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import type { Locale } from "@/i18n/locales";

/*
 * Outils partagés par les tests des modules explicatifs. Les frontières navigateur que jsdom ne fournit pas
 * (contexte 2D, IntersectionObserver, matchMedia) sont simulées ici, une seule fois.
 */

/** Calme exigé par l'annonceur avant de parler, en ms (`useAnnouncer`). */
export const CALM_MS = 450;

/** Rend `ui` dans la langue donnée, comme le fait le layout `[lang]` autour de la page. */
export function renderIn(locale: Locale, ui: ReactElement): RenderResult {
  return render(ui, {
    wrapper: ({ children }: { children: ReactNode }) => <LocaleProvider locale={locale}>{children}</LocaleProvider>,
  });
}

/** Texte posé sur le canevas par `fillText`. */
export interface DrawnText {
  text: string;
  x: number;
  y: number;
  /** Largeur maximale demandée au navigateur (texte condensé au-delà), si le module en donne une. */
  maxWidth: number | undefined;
}

/** Largeur d'un caractère pour le faux `measureText`, en px. */
const CHAR_WIDTH = 6;

/**
 * Frontière navigateur : jsdom ne dessine pas (`getContext` rend null). Le faux contexte 2D accepte les tracés des
 * modules sans rien peindre et garde les textes posés par `fillText` depuis le dernier `clearRect`, c'est-à-dire ceux
 * de la dernière image (chaque dessin commence par effacer le canevas). `measureText` compte 6 px par caractère.
 */
export function stubCanvas(): { drawn: () => readonly DrawnText[]; texts: () => string[] } {
  const drawn: DrawnText[] = [];
  const noop = () => {};
  const gradient = { addColorStop: noop };
  const context = {
    font: "",
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    textAlign: "start",
    textBaseline: "alphabetic",
    globalAlpha: 1,
    setTransform: noop,
    clearRect: () => {
      drawn.length = 0;
    },
    fillRect: noop,
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    arc: noop,
    ellipse: noop,
    fill: noop,
    stroke: noop,
    setLineDash: noop,
    save: noop,
    restore: noop,
    clip: noop,
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    measureText: (text: string) => ({ width: text.length * CHAR_WIDTH }),
    fillText: (text: string, x: number, y: number, maxWidth?: number) => {
      drawn.push({ text, x, y, maxWidth });
    },
  };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    context as unknown as CanvasRenderingContext2D,
  );
  return { drawn: () => drawn, texts: () => drawn.map((entry) => entry.text) };
}

/**
 * Frontière navigateur : jsdom ne met rien en page (largeur 0, d'où 300 px supposés par `useCanvasModule`). Le canevas
 * mesure ici `width` px de large : 280 px pour un téléphone de 375 px, 560 px pour la mise en page large.
 */
export function stubCanvasWidth(width: number): void {
  vi.spyOn(HTMLCanvasElement.prototype, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    width,
    height: 0,
    top: 0,
    left: 0,
    right: width,
    bottom: 0,
    toJSON: () => ({}),
  });
}

/** Étendue horizontale qu'un texte borné (`maxWidth`) peut occuper, selon son alignement. */
export function textBox(entry: DrawnText, align: "left" | "center" | "right"): { left: number; right: number } {
  const width = entry.maxWidth ?? Number.POSITIVE_INFINITY;
  if (align === "left") return { left: entry.x, right: entry.x + width };
  if (align === "right") return { left: entry.x - width, right: entry.x };
  return { left: entry.x - width / 2, right: entry.x + width / 2 };
}

/** Texte posé sur le canevas, trouvé par son contenu ; échoue s'il n'a pas été dessiné. */
export function drawnText(drawn: readonly DrawnText[], text: string): DrawnText {
  const entry = drawn.find((candidate) => candidate.text === text);
  if (!entry) throw new Error(`Texte absent du canevas : « ${text} »`);
  return entry;
}

/**
 * Frontière navigateur : jsdom n'a pas IntersectionObserver. Le canevas se dit visible dès qu'il est observé, ce qui
 * ouvre la boucle d'images des modules animés (images simulées par `vi.useFakeTimers`, toutes les 16 ms).
 */
export function stubVisibleCanvas(): void {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      readonly #callback: IntersectionObserverCallback;
      constructor(callback: IntersectionObserverCallback) {
        this.#callback = callback;
      }
      observe(target: Element) {
        const entry = { isIntersecting: true, target } as IntersectionObserverEntry;
        this.#callback([entry], this as unknown as IntersectionObserver);
      }
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    },
  );
}

/** Frontière navigateur : jsdom n'a pas matchMedia ; `reduced` répond à « prefers-reduced-motion: reduce ». */
export function stubMatchMedia({ reduced }: { reduced: boolean }): void {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduced && query.includes("reduce"),
    media: query,
    addEventListener() {},
    removeEventListener() {},
  }));
}

/** Laisse s'écouler `ms` de temps simulé : minuteurs de l'annonceur et images de la boucle d'animation. */
export function elapse(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

/** Calme de l'annonceur écoulé : l'annonce en attente est posée dans la région `status`. */
export function settle(): void {
  elapse(CALM_MS);
}
