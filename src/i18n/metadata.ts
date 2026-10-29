import type { Metadata } from "next";
import { SITE_NAME } from "@/components/site/site.strings";
import { getCommonContent } from "@/content/common/content";
import { LOCALES, OG_LOCALE, type Locale } from "./locales";
import { negotiatedPathFor, pathFor, type PageKey } from "./routes";

/** Origine hors Vercel : `next dev` et `next start` en local. */
const LOCAL_ORIGIN = "http://localhost:3000";

/**
 * Origine absolue du site, base des adresses des métadonnées (canonique, hreflang, Open Graph) :
 * `https://${VERCEL_PROJECT_PRODUCTION_URL}`, domaine de production que Vercel fournit au build (domaine personnalisé
 * compris), sinon http://localhost:3000. Lue à chaque appel ; les pages statiques la figent au build.
 */
export function siteOrigin(): URL {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return new URL(host ? `https://${host}` : LOCAL_ORIGIN);
}

/**
 * Métadonnées du layout racine `[lang]` : base des adresses relatives, gabarit des titres des pages
 * (« Tailles des étoiles · Astronomie », « Astronomie » seul par défaut) et description du site dans la langue.
 */
export function rootMetadata(locale: Locale): Metadata {
  return {
    metadataBase: siteOrigin(),
    title: { template: `%s · ${SITE_NAME}`, default: SITE_NAME },
    description: getCommonContent(locale).description,
  };
}

/**
 * Métadonnées d'une page dans une langue, adresses relatives (composées avec `metadataBase`) :
 * - titre absolu pour l'accueil, qui nomme déjà le site ; ailleurs, le gabarit du layout y ajoute « · Astronomie » ;
 * - adresse canonique, hreflang des trois langues, et x-default vers le chemin sans langue, que le proxy négocie
 *   (« /voyage ») ;
 * - Open Graph : langue de la page (« en_GB »), les deux autres en variantes, titre sans le nom du site, que porte
 *   `og:site_name`.
 */
export function pageMetadata(page: PageKey, locale: Locale): Metadata {
  const { title, description } = getCommonContent(locale).pages[page];
  const path = pathFor(page, locale);
  return {
    title: page === "home" ? { absolute: title } : title,
    description,
    alternates: {
      canonical: path,
      languages: {
        ...Object.fromEntries(LOCALES.map((other) => [other, pathFor(page, other)])),
        "x-default": negotiatedPathFor(page),
      },
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: OG_LOCALE[locale],
      alternateLocale: LOCALES.filter((other) => other !== locale).map((other) => OG_LOCALE[other]),
      url: path,
      title,
      description,
    },
  };
}
