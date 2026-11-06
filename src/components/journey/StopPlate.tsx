import { ExplainerModule } from "@/components/modules/ExplainerModule";
import { getVoyageContent } from "@/content/voyage/content";
import type { BodyStopStructure } from "@/content/voyage/structure";
import type { Ordinal } from "@/content/voyage/types";
import type { Locale } from "@/i18n/locales";
import { bodyName } from "@/i18n/names";
import { STOP_IDS } from "@/lib/journey/stopIds";
import { LiveDistance } from "./LiveDistance";
import { Plate } from "./Plate";
import { JourneySteps } from "./StopSteps";

/**
 * « L'étoile au centre », ou « 1ʳᵉ / 3ᵉ planète en partant du Soleil » : le rang en chiffres et sa marque ordinale
 * en exposant, quand elle en a une (« 3rd », « 3.ᵉʳ » ; « 2.º » n'en a pas, son indicateur est déjà en haut).
 */
function Rank({ ordinal, label }: { ordinal?: Ordinal; label: string }) {
  return (
    <p className="rank">
      <i aria-hidden="true" />
      {ordinal && (
        <>
          {ordinal.number}
          {ordinal.suffix ? <sup>{ordinal.suffix}</sup> : null}{" "}
        </>
      )}
      {label}
    </p>
  );
}

/**
 * Escale d'un astre, dans la langue de la page : plaque de lecture, fiche avec la ligne « ce jour », module
 * explicatif. Sur téléphone, la fiche et le module se déplient à la demande pour laisser voir l'astre ; les escales
 * voisines encadrent son nom.
 */
export function StopPlate({ locale, stop }: { locale: Locale; stop: BodyStopStructure }) {
  const content = getVoyageContent(locale);
  const texts = content.bodies[stop.key];
  const id = STOP_IDS[stop.key];
  const name = bodyName(stop.key, locale);
  const titleId = `${id}-titre`;
  return (
    <section className="stop" id={id} data-stop={stop.key} tabIndex={-1} aria-labelledby={titleId}>
      <Plate
        id={id}
        name={name}
        color={stop.color}
        header={<Rank ordinal={stop.ordinal === undefined ? undefined : content.ordinal(stop.ordinal)} label={texts.rank} />}
        title={<h2 id={titleId}>{name}</h2>}
        hook={texts.hook}
        sections={[
          {
            key: "fiche",
            // Le même libellé revient à chaque escale : le nom de l'astre le distingue à l'oreille.
            label: (
              <>
                {content.plate.story}
                <span className="sr">, {name}</span>
              </>
            ),
            content: (
              <>
                <p className="lede">{texts.lede}</p>
                <dl className="facts">
                  {texts.facts.map((fact) => (
                    <div key={fact.label}>
                      <dt>{fact.label}</dt>
                      <dd>
                        {fact.value}
                        {fact.note ? <small>{fact.note}</small> : null}
                      </dd>
                    </div>
                  ))}
                  <div className="live">
                    <dt>{texts.live}</dt>
                    <LiveDistance target={stop.key} />
                  </div>
                </dl>
              </>
            ),
          },
          {
            key: "module",
            label: texts.module.button,
            content: (
              <figure className="module">
                <h3>{texts.module.title}</h3>
                <p>{texts.module.intro}</p>
                <ExplainerModule kind={stop.module} />
              </figure>
            ),
          },
        ]}
        steps={<JourneySteps stop={stop.key} locale={locale} />}
      />
    </section>
  );
}
