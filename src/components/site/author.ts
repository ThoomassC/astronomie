/**
 * L'auteur du site et ses adresses publiques, celles de son portfolio : rien d'autre, ni téléphone ni adresse
 * postale. Communes aux trois langues ; le pied de page commun (`ContactFooter`) les affiche.
 */
export const AUTHOR = {
  name: "Thomas Caron",
  github: "https://github.com/ThoomassC",
  linkedin: "https://www.linkedin.com/in/thomas-caron27/",
  email: "caronthomas27@gmail.com",
} as const;

/**
 * Année de la mention de droit d'auteur : celle de la première publication, écrite ici plutôt que lue sur l'horloge.
 * Le serveur la rend telle quelle (aucun écart d'hydratation possible), et Cache Components refuse `new Date()`
 * pendant le prérendu des pages statiques.
 */
export const COPYRIGHT_YEAR = 2026;
