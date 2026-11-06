/**
 * Heure de génération de l'accueil, en ms : celle du build, que next.config.ts fixe (`env.BUILD_TIME`, date ISO) et que
 * Next inscrit telle quelle dans le code compilé. Rien ne lit l'horloge au rendu : la page prérendue reste statique, et
 * son planétaire montre, avant le script, les positions de ce jour-là, puis les fait glisser jusqu'à celles du
 * chargement.
 *
 * Sans BUILD_TIME lisible, la configuration est cassée : mieux vaut le dire au build que dater la page au hasard.
 */
export function pageGenerationTime(): number {
  const builtAt = Date.parse(process.env.BUILD_TIME ?? "");
  if (Number.isNaN(builtAt)) {
    throw new Error("BUILD_TIME absente ou illisible : next.config.ts doit la fixer (env), au format ISO.");
  }
  return builtAt;
}
