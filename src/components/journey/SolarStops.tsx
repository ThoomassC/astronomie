import { STOPS } from "@/content/stops";
import type { Locale } from "@/i18n/locales";
import { BeyondPlate } from "./BeyondPlate";
import { Hero } from "./Hero";
import { Interlude } from "./Interlude";
import { StopPlate } from "./StopPlate";

interface SolarStopsProps {
  /** Langue de la page, pas encore lue : les escales parlent français tant que leurs textes ne sont pas traduits. */
  locale: Locale;
  /** Ancre du Soleil : départ de l'accueil, retour depuis l'au-delà. */
  sunHref: `#${string}`;
}

/**
 * Escales du système solaire, dans l'ordre du voyage : l'accueil, le Soleil et les planètes (la ceinture
 * d'astéroïdes en interlude), puis l'au-delà de Neptune. Sections directement dans `main`, sans enveloppe.
 */
export function SolarStops({ sunHref }: SolarStopsProps) {
  return (
    <>
      <Hero sunHref={sunHref} />
      {STOPS.map((stop) =>
        stop.kind === "body" ? <StopPlate key={stop.key} stop={stop} /> : <Interlude key={stop.key} stop={stop} />,
      )}
      <BeyondPlate sunHref={sunHref} />
    </>
  );
}
