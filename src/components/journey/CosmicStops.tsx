import { COSMIC_STOPS } from "@/content/cosmos";
import type { Locale } from "@/i18n/locales";
import { CosmicPlate } from "./CosmicPlate";

interface CosmicStopsProps {
  /** Langue de la page, pas encore lue : les escales parlent français tant que leurs textes ne sont pas traduits. */
  locale: Locale;
  /** Ancre du Soleil : retour depuis chaque escale lointaine. */
  sunHref: `#${string}`;
}

/**
 * Escales au-delà du système solaire, dans l'ordre du voyage : les étoiles voisines (avec le tableau des étoiles de
 * la carte), puis la Voie lactée. Sections directement dans `main`, sans enveloppe.
 */
export function CosmicStops({ sunHref }: CosmicStopsProps) {
  return (
    <>
      <CosmicPlate stop={COSMIC_STOPS.stars} sunHref={sunHref} starList />
      <CosmicPlate stop={COSMIC_STOPS.galaxy} sunHref={sunHref} />
    </>
  );
}
