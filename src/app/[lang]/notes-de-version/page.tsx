import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReleasesFooter, ReleasesPage } from "@/components/releases/ReleasesPage";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SkipToContent } from "@/components/site/SkipToContent";
import { isLocale } from "@/i18n/locales";
import { pageMetadata } from "@/i18n/metadata";

/** Titre, description, adresse canonique et hreflang de la page, dans sa langue. */
export async function generateMetadata({ params }: PageProps<"/[lang]/notes-de-version">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return pageMetadata("releases", lang);
}

/**
 * Notes de version : une page de lecture, statique, sans scène, comme À propos. Dans l'ordre du DOM : lien
 * d'évitement, barre commune (qui suit la page, sans `data-pinned`), contenu (`main#contenu`), pied de page. Les trois
 * langues viennent du layout `[lang]` (`generateStaticParams`) ; la garde de la langue reste par prudence (D4).
 */
export default async function ReleasesRoute({ params }: PageProps<"/[lang]/notes-de-version">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return (
    <>
      <SkipToContent locale={lang} />
      <SiteHeader locale={lang} page="releases" />
      <ReleasesPage locale={lang} />
      <ReleasesFooter locale={lang} />
    </>
  );
}
