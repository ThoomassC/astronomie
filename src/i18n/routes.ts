import { isLocale, type Locale } from "./locales";

/** Pages du site, dans l'ordre des onglets. */
export const PAGES = ["home", "voyage", "sizes", "about"] as const;

export type PageKey = (typeof PAGES)[number];

/**
 * Segment d'URL de chaque page, identique dans les trois langues (D2) : le chemin public est le chemin interne
 * (sortie statique, préchargement, `usePathname`), et changer de langue ne remplace que le premier segment.
 */
export const PAGE_SEGMENTS = {
  home: "",
  voyage: "voyage",
  sizes: "tailles",
  about: "a-propos",
} as const satisfies Record<PageKey, string>;

/** Chemin d'une page dans une langue. */
export type LocalizedPath = `/${Locale}` | `/${Locale}/${string}`;

/** « /fr », « /en/voyage », « /es/tailles », « /fr/a-propos ». */
export function pathFor(page: PageKey, locale: Locale): LocalizedPath {
  const segment = PAGE_SEGMENTS[page];
  return segment === "" ? `/${locale}` : `/${locale}/${segment}`;
}

/** Chemin sans langue, négocié par le proxy (x-default) : « / », « /voyage ». */
export function negotiatedPathFor(page: PageKey): string {
  return `/${PAGE_SEGMENTS[page]}`;
}

/**
 * Langue et page d'un chemin (barre finale tolérée) ; null si la langue ou la page est inconnue.
 * « /en/tailles » → { en, sizes } ; « /fr » et « /fr/ » → { fr, home } ; « /de/voyage », « /fr/inconnu » → null.
 */
export function parsePath(pathname: string): { locale: Locale; page: PageKey } | null {
  const [root, locale, segment = "", ...rest] = pathname.replace(/\/$/, "").split("/");
  if (root !== "" || !isLocale(locale) || rest.length > 0) return null;
  const page = PAGES.find((key) => PAGE_SEGMENTS[key] === segment);
  return page === undefined ? null : { locale, page };
}

/**
 * Même chemin dans une autre langue : remplace le premier segment, garde le reste.
 * « /fr/voyage » → « /en/voyage » ; « /fr » → « /es ».
 */
export function switchLocale(pathname: string, locale: Locale): string {
  return pathname.replace(/^\/[^/]*/, `/${locale}`);
}
