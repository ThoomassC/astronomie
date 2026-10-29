import type { PageKey } from "@/i18n/routes";

/**
 * Textes communs aux quatre pages, lus côté serveur seulement : métadonnées (`src/i18n/metadata.ts`) et page
 * introuvable (404 globale, trilingue). Les libellés des onglets vivent ailleurs (`site.strings.ts`) : les composants
 * client les lisent aussi.
 */
export interface CommonContent {
  /** Description par défaut du site (balise `description` du layout racine), 160 caractères au plus. */
  description: string;
  /**
   * Titre et description de chaque page (balises du document et Open Graph). Le titre de l'accueil s'affiche tel
   * quel et nomme le site ; les autres reçoivent le suffixe « · Astronomie ». Titre affiché : 60 caractères au plus ;
   * description : 160 au plus, au-delà desquels les moteurs de recherche les coupent.
   */
  pages: Readonly<Record<PageKey, { title: string; description: string }>>;
  /** Page introuvable : titre, phrase d'explication, lien de retour vers l'accueil de la langue. */
  notFound: { title: string; text: string; back: string };
}
