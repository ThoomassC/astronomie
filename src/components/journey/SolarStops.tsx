import { SOLAR_STOP_STRUCTURE } from "@/content/voyage/structure";
import type { Locale } from "@/i18n/locales";
import { BeyondPlate } from "./BeyondPlate";
import { Hero } from "./Hero";
import { Interlude } from "./Interlude";
import { StopPlate } from "./StopPlate";

interface SolarStopsProps {
  /** Langue de la page : textes des escales et noms des astres. */
  locale: Locale;
  /** Ancre du Soleil : départ de l'accueil, retour depuis l'au-delà. */
  sunHref: `#${string}`;
}

/**
 * Escales du système solaire, dans l'ordre du voyage : l'accueil, le Soleil et les planètes (la ceinture
 * d'astéroïdes en interlude), puis l'au-delà de Neptune. Sections directement dans `main`, sans enveloppe.
 */
export function SolarStops({ locale, sunHref }: SolarStopsProps) {
  return (
    <>
      <Hero locale={locale} sunHref={sunHref} />
      {SOLAR_STOP_STRUCTURE.map((stop) =>
        stop.kind === "body" ? (
          <StopPlate key={stop.key} locale={locale} stop={stop} />
        ) : (
          <Interlude key={stop.key} locale={locale} stop={stop} />
        ),
      )}
      <BeyondPlate locale={locale} sunHref={sunHref} />
    </>
  );
}
