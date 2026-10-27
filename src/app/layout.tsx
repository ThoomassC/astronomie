import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Bodoni_Moda } from "next/font/google";
import { SITE } from "@/content/site";
import "./globals.css";

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

export const metadata: Metadata = {
  title: SITE.name,
  description: SITE.description,
};

export const viewport: Viewport = {
  themeColor: "#060B18",
  colorScheme: "dark",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${display.variable} ${displayItalic.variable} ${text.variable}`}
      data-scroll-behavior="smooth"
    >
      <body>{children}</body>
    </html>
  );
}
