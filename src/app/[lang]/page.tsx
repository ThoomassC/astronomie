import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HomePage } from "@/components/home/HomePage";
import { LegacyHashRedirect } from "@/components/home/LegacyHashRedirect";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SkipToContent } from "@/components/site/SkipToContent";
import { isLocale } from "@/i18n/locales";
import { pageMetadata } from "@/i18n/metadata";

/** Titre absolu, description, adresse canonique et hreflang des trois langues. */
export async function generateMetadata({ params }: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return pageMetadata("home", lang);
}

/**
 * Accueil, dans la langue de l'adresse (/fr, /en, /es). Statique : la langue vient des paramètres que génère le layout
 * `[lang]` (generateStaticParams) ; rien n'est lu de la requête. Une langue inconnue donne la 404.
 * Ordre du document : le script des anciens liens d'abord (il s'exécute à l'analyse, avant que rien ne se peigne),
 * puis le lien d'évitement, la barre (sans commandes propres à la page) et l'accueil, pied de page compris.
 */
export default async function HomeRoute({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return (
    <>
      <LegacyHashRedirect locale={lang} />
      <SkipToContent locale={lang} />
      <SiteHeader locale={lang} page="home" />
      <HomePage locale={lang} />
    </>
  );
}
