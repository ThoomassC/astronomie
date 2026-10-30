/** Bouts de la réglette des températures, en kelvins : de la naine rouge la plus froide à Rigel. */
const SCALE_MIN_K = 2500;
const SCALE_MAX_K = 13_000;

/** Couleur d'une étoile en mots, selon sa température effective (le texte l'accompagne toujours d'une comparaison au Soleil). */
export type TemperatureTint = "orange" | "pale-orange" | "white" | "bluish-white";

/**
 * Arrêts du dégradé de la réglette : couleurs de corps noir de la table de Mitchell Charity (2001), celles des étoiles
 * (données v2, § 1.7), du plus froid au plus chaud.
 */
export const TEMPERATURE_SCALE_STOPS: readonly { temperatureK: number; color: string }[] = [
  { temperatureK: 2800, color: "#ffb25b" },
  { temperatureK: 3500, color: "#ffc987" },
  { temperatureK: 4300, color: "#ffdbaf" },
  { temperatureK: 5800, color: "#fff1e7" },
  { temperatureK: 7000, color: "#f7f5ff" },
  { temperatureK: 9800, color: "#d1dcff" },
  { temperatureK: 12_100, color: "#c2d1ff" },
];

/**
 * Position d'une température sur la réglette, en % de sa largeur, sur une échelle logarithmique :
 * 100 × ln(T / 2 500) / ln(13 000 / 2 500). Le Soleil (5 772 K) tombe au milieu, à 50,8 %.
 */
export function temperatureScalePercent(temperatureK: number): number {
  return (100 * Math.log(temperatureK / SCALE_MIN_K)) / Math.log(SCALE_MAX_K / SCALE_MIN_K);
}

/**
 * Couleur en mots : orangée sous 3 800 K, orange pâle jusqu'à 5 200 K, blanche jusqu'à 7 500 K, blanc bleuté
 * au-delà. Ici, rouge veut dire froid.
 */
export function temperatureTint(temperatureK: number): TemperatureTint {
  if (temperatureK < 3800) return "orange";
  if (temperatureK < 5200) return "pale-orange";
  return temperatureK <= 7500 ? "white" : "bluish-white";
}
