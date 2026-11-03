/**
 * Instant où le serveur produit la page, en ms : l'origine des temps de son processus (`performance.timeOrigin`).
 * L'accueil est prérendu à la construction du site : c'est l'heure du build (en développement, celle du démarrage du
 * serveur). Le planétaire y pose ses planètes dès le HTML, puis les fait glisser jusqu'aux positions du chargement.
 *
 * Pourquoi pas `Date.now()` : Cache Components refuse de lire l'horloge au prérendu sans `connection()`, qui rendrait la
 * page dynamique, ou sans `use cache`, qui la régénérerait à intervalles. `performance` sert à mesurer et Next ne le
 * surveille pas : la page reste entièrement statique, et la date qu'elle montre avant le script est bien celle de sa
 * génération.
 */
export function pageGenerationTime(): number {
  return Math.round(performance.timeOrigin);
}
