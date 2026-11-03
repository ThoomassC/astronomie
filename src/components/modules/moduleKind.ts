/**
 * Module explicatif d'une escale, un par astre ; celui des saisons sert à la Terre et à Uranus. Le type vit à côté de
 * `ExplainerModule`, qui l'aiguille : les contenus des escales l'importent d'ici, quelle que soit leur langue.
 */
export type ModuleKind =
  | "light-race"
  | "kepler"
  | "venus-race"
  | "seasons-earth"
  | "weight"
  | "sizes"
  | "saturn-rings"
  | "seasons-uranus"
  | "neptune-year";
