import { getCosmicContent } from "@/content/cosmic/content";
import type { Locale } from "@/i18n/locales";
import { COSMIC_STOPS } from "@/lib/journey/camera";
import { CosmicPlate } from "./CosmicPlate";

interface CosmicStopsProps {
  /** Langue de la page : textes des escales, noms des étoiles et des galaxies. */
  locale: Locale;
  /** Ancre du Soleil : retour depuis chaque escale lointaine. */
  sunHref: `#${string}`;
}

/**
 * Escales au-delà du système solaire, dans l'ordre du voyage : les étoiles voisines (avec le tableau des étoiles de
 * la carte), la Voie lactée, le Groupe local (avec le tableau des galaxies), l'Univers observable et le multivers,
 * présenté comme une hypothèse. Sections directement dans `main`, sans enveloppe.
 */
export function CosmicStops({ locale, sunHref }: CosmicStopsProps) {
  const content = getCosmicContent(locale);
  return (
    <>
      {COSMIC_STOPS.map((stop) => (
        <CosmicPlate key={stop} stop={stop} content={content} locale={locale} sunHref={sunHref} />
      ))}
    </>
  );
}
