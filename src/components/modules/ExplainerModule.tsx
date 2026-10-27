import type { ModuleKind } from "@/content/stops";
import { KeplerAreas } from "./KeplerAreas";
import { LightRace } from "./LightRace";
import { NeptuneYear } from "./NeptuneYear";
import { PlanetSizes } from "./PlanetSizes";
import { SaturnRings } from "./SaturnRings";
import { Seasons } from "./Seasons";
import { VenusRace } from "./VenusRace";
import { WeightScales } from "./WeightScales";

/**
 * Contrat : rend le canvas, les commandes et la ligne de lecture du module explicatif `kind`.
 * Le titre et l'introduction sont rendus par la plaque de l'escale, pas ici.
 *
 * Simple aiguillage, sans état : utilisable depuis un composant serveur ou client.
 * Chaque module est lui-même un composant client.
 */
export function ExplainerModule({ kind }: { kind: ModuleKind }) {
  switch (kind) {
    case "light-race":
      return <LightRace />;
    case "kepler":
      return <KeplerAreas />;
    case "venus-race":
      return <VenusRace />;
    case "seasons-earth":
      return <Seasons planet="earth" />;
    case "weight":
      return <WeightScales />;
    case "sizes":
      return <PlanetSizes />;
    case "saturn-rings":
      return <SaturnRings />;
    case "seasons-uranus":
      return <Seasons planet="uranus" />;
    case "neptune-year":
      return <NeptuneYear />;
    default:
      return unknownModule(kind);
  }
}

/** Contrôle d'exhaustivité : un `ModuleKind` non aiguillé ne compile pas ; à l'exécution, rien n'est affiché. */
function unknownModule(kind: never): null {
  console.warn(`ExplainerModule : module inconnu « ${String(kind)} ».`);
  return null;
}
