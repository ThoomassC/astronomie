import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AboutFooter, AboutPage } from "@/components/about/AboutPage";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SkipToContent } from "@/components/site/SkipToContent";
import { isLocale } from "@/i18n/locales";
import { pageMetadata } from "@/i18n/metadata";

/** Titre, description, adresse canonique et hreflang de la page, dans sa langue. */
export async function generateMetadata({ params }: PageProps<"/[lang]/a-propos">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return pageMetadata("about", lang);
}

/**
 * À propos : une page de lecture, statique, sans scène. Dans l'ordre du DOM : lien d'évitement, barre commune,
 * contenu (`main#contenu`), pied de page. Les trois langues viennent du layout `[lang]` (`generateStaticParams`) ;
 * une langue inconnue n'arrive pas jusqu'ici, la garde reste par prudence (D4).
 */
export default async function AboutRoute({ params }: PageProps<"/[lang]/a-propos">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return (
    <>
      <SkipToContent locale={lang} />
      <SiteHeader locale={lang} page="about" />
      <AboutPage locale={lang} />
      <AboutFooter locale={lang} />
    </>
  );
}
