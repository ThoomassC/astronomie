import { INTL_LOCALE, type Locale } from "@/i18n/locales";

/**
 * Ce qui, dans les notes de version, ne dépend pas de la langue : les versions, de la plus récente à la plus ancienne,
 * et leur date de publication. Les fichiers de langue (`fr.ts`, `en.ts`, `es.ts`) n'y ajoutent que du texte.
 */

/** Versions publiées, de la plus récente à la plus ancienne ; date au format ISO (AAAA-MM-JJ), jour de la mise en ligne. */
export const RELEASES = [
  { version: "1.1.0", date: "2026-11-06" },
  { version: "1.0.0", date: "2026-11-03" },
] as const;

export type ReleaseVersion = (typeof RELEASES)[number]["version"];

/** Date ISO d'une version (`RELEASES`). */
export function releaseDate(version: ReleaseVersion): string {
  const found = RELEASES.find((release) => release.version === version);
  if (!found) throw new Error(`Version ${version} absente de RELEASES`);
  return found.date;
}

/**
 * Ancre d'une version, la même dans les trois langues : « 1.1.0 » → « v1-1-0 ». Un identifiant qui commence par une
 * lettre, sans point (un sélecteur CSS y verrait une classe).
 */
export function releaseAnchor(version: ReleaseVersion): string {
  return `v${version.replaceAll(".", "-")}`;
}

/**
 * Date d'une version écrite dans la langue de la page : « 6 novembre 2026 », « 6 November 2026 », « 6 de noviembre
 * de 2026 ». Lue en UTC : le jour ne change pas avec le fuseau du serveur qui rend la page.
 */
export function formatReleaseDate(isoDate: string, locale: Locale): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}
