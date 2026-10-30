import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Bodoni_Moda } from "next/font/google";
import { notFound } from "next/navigation";
import { FocusOnNavigation } from "@/components/site/FocusOnNavigation";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { isLocale, LOCALES, type Locale } from "@/i18n/locales";
import { rootMetadata } from "@/i18n/metadata";
import { SITE_VIEWPORT } from "@/lib/site/viewport";
import "../globals.css";

/** Titres : Didone à axe optique, en romain (préchargée : titre de l'accueil). */
const display = Bodoni_Moda({
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
  variable: "--font-bodoni",
});

/** Italique des accroches et de l'interlude : plus bas dans la page, chargée sans préchargement. */
const displayItalic = Bodoni_Moda({
  subsets: ["latin"],
  style: "italic",
  axes: ["opsz"],
  display: "swap",
  preload: false,
  variable: "--font-bodoni-italic",
});

/**
 * Texte et interface : police variable conçue pour la lisibilité. Next ne connaît pas
 * ses métriques : pas de police de repli ajustée (sinon avertissement à chaque démarrage).
 */
const text = Atkinson_Hyperlegible_Next({
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: false,
  variable: "--font-atkinson",
});

/**
 * Toutes les pages, dans toutes les langues, sont produites au build : `next dev` et `next build` échouent si l'une
 * d'elles lit la requête (`cookies()`, `headers()`). C'est le proxy, en amont, qui négocie la langue.
 */
export const ensureStatic = "navigation";

/** Les trois langues du site, produites au build ; toute autre valeur du segment donne la 404. */
export function generateStaticParams(): { lang: Locale }[] {
  return LOCALES.map((lang) => ({ lang }));
}

/** Base des adresses, gabarit des titres des pages et description du site, dans la langue de l'adresse. */
export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return rootMetadata(lang);
}

export const viewport: Viewport = SITE_VIEWPORT;

/**
 * Layout racine, sous le segment de la langue (/fr, /en, /es) : la langue du document et celle que lisent les
 * composants client (`useLocale`). Les pages restent des composants serveur, qui reçoivent la langue en prop. Après
 * chaque navigation entre les pages, le focus rejoint le contenu de la page affichée (`FocusOnNavigation`, sans rendu,
 * après les pages : une page qui pose elle-même le focus en garde la main).
 */
export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return (
    <html
      lang={lang}
      className={`${display.variable} ${displayItalic.variable} ${text.variable}`}
      data-scroll-behavior="smooth"
    >
      <body>
        <LocaleProvider locale={lang}>{children}</LocaleProvider>
        <FocusOnNavigation />
      </body>
    </html>
  );
}
