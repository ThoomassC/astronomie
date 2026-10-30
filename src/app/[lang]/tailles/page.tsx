import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SizesPage } from "@/components/sizes/SizesPage";
import { isLocale } from "@/i18n/locales";
import { pageMetadata } from "@/i18n/metadata";

/** Titre, description, adresse canonique et hreflang de la page Tailles, dans la langue de l'adresse. */
export async function generateMetadata({ params }: PageProps<"/[lang]/tailles">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return pageMetadata("sizes", lang);
}

/**
 * Tailles, dans la langue de l'adresse (/fr/tailles, /en/tailles, /es/tailles) : dix étoiles comparées côte à côte.
 * Les trois langues viennent du layout `[lang]` (`generateStaticParams`) ; une langue inconnue n'arrive pas jusqu'ici,
 * la garde reste par prudence (D4).
 */
export default async function TaillesRoute({ params }: PageProps<"/[lang]/tailles">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return <SizesPage locale={lang} />;
}
