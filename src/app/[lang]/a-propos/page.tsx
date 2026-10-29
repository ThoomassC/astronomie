import { notFound } from "next/navigation";
import { AboutPage } from "@/components/about/AboutPage";
import { isLocale } from "@/i18n/locales";

/**
 * À propos : une page de lecture, statique, sans scène ni composant client. Les trois langues viennent du layout
 * `[lang]` (`generateStaticParams`) ; une langue inconnue n'arrive pas jusqu'ici, la garde reste par prudence (D4).
 */
export default async function AboutRoute({ params }: PageProps<"/[lang]/a-propos">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return <AboutPage locale={lang} />;
}
