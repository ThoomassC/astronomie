import type { Viewport } from "next";

/**
 * Fenêtre du site, la même partout : layout `[lang]` et 404 globale, qui ne passe pas par lui. Un seul monde, sombre
 * (contrôles et barres de défilement du navigateur), barre du navigateur couleur de nuit (`--nuit`), page étendue
 * sous les encoches : les marges `env(safe-area-inset-*)` de globals.css s'en chargent.
 */
export const SITE_VIEWPORT: Viewport = {
  themeColor: "#060B18",
  colorScheme: "dark",
  viewportFit: "cover",
};
