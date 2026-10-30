import type { StopKey } from "@/lib/journey/camera";

/**
 * Identifiant de section (ancre) de chaque escale du voyage, identique dans les trois langues : les liens partagés
 * (« /#saturne », « /fr/voyage#saturne ») et le changement de langue gardent le fragment tel quel. Ces ancres sont
 * publiques : en changer une casse les liens qui y mènent.
 * hero "accueil", sun "soleil", mercury "mercure", venus "venus", earth "terre", mars "mars", belt "ceinture",
 * jupiter "jupiter", saturn "saturne", uranus "uranus", neptune "neptune", beyond "au-dela",
 * stars "etoiles-voisines", galaxy "voie-lactee", localGroup "groupe-local", universe "univers-observable",
 * multiverse "multivers".
 */
export const STOP_IDS: Readonly<Record<StopKey, string>> = {
  hero: "accueil",
  sun: "soleil",
  mercury: "mercure",
  venus: "venus",
  earth: "terre",
  mars: "mars",
  belt: "ceinture",
  jupiter: "jupiter",
  saturn: "saturne",
  uranus: "uranus",
  neptune: "neptune",
  beyond: "au-dela",
  stars: "etoiles-voisines",
  galaxy: "voie-lactee",
  localGroup: "groupe-local",
  universe: "univers-observable",
  multiverse: "multivers",
};

/** Ancre de l'escale : stopAnchor("saturn") → « #saturne ». */
export function stopAnchor(key: StopKey): `#${string}` {
  return `#${STOP_IDS[key]}`;
}
