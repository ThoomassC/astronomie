import { getVoyageContent } from "@/content/voyage/content";
import type { InterludeStructure } from "@/content/voyage/structure";
import type { Locale } from "@/i18n/locales";
import { STOP_IDS } from "@/lib/journey/stopIds";
import { JourneySteps } from "./StopSteps";

/**
 * Interlude sans plaque (ceinture d'astéroïdes) : une citation sur fond de scène, dans la langue de la page. Il n'a
 * pas de titre visible : le sien, masqué à l'œil, nomme la section pour les lecteurs d'écran. Escale de la règle et du
 * menu, il a ses escales voisines, sous la citation, comme les plaques (téléphone).
 */
export function Interlude({ locale, stop }: { locale: Locale; stop: InterludeStructure }) {
  const { interlude } = getVoyageContent(locale);
  const id = STOP_IDS[stop.key];
  const titleId = `${id}-titre`;
  return (
    <section className="interlude" id={id} data-stop={stop.key} tabIndex={-1} aria-labelledby={titleId}>
      <h2 className="sr" id={titleId}>
        {interlude.title}
      </h2>
      <blockquote>
        <p>{interlude.text}</p>
        <cite>{interlude.cite}</cite>
      </blockquote>
      <JourneySteps stop={stop.key} locale={locale} />
    </section>
  );
}
