import { Plate } from "@/components/journey/Plate";
import { getSizesContent } from "@/content/sizes/content";
import type { Locale } from "@/i18n/locales";
import { withUnit } from "@/i18n/units";
import type { ComparedStar } from "@/lib/astro/starSizes";
import { formatNumber } from "@/lib/format";
import { radiusKm, roundSignificant } from "@/lib/sizes/comparisons";
import { SIZE_STOP_IDS } from "@/lib/sizes/stops";
import { SIZES_STRINGS } from "./sizes.strings";

/** Chiffres significatifs du rayon en kilomètres : les rayons mesurés ne sont pas plus précis. */
const KM_SIGNIFICANT_DIGITS = 4;
/** Sous cette distance, en années-lumière, une décimale (4,2 al) ; au-delà, entière (548 al). */
const ONE_DECIMAL_BELOW_LY = 10;

/**
 * Escale d'une étoile de la page « Tailles » : plaque de lecture (catégorie, nom, accroche) et fiche (présentation,
 * rayon et sa fourchette publiée s'il est débattu, rayon en kilomètres, température, distance, type spectral,
 * comparaison, mise en garde, sources). Sur téléphone, la fiche se déplie à la demande, comme au voyage.
 * `restartHref` ajoute sous la fiche un lien vers la plus petite étoile ; ancre simple, suivie par le navigateur.
 */
export function StarPlate({ star, locale, restartHref }: { star: ComparedStar; locale: Locale; restartHref?: `#${string}` }) {
  const content = getSizesContent(locale);
  const strings = SIZES_STRINGS[locale];
  const text = content.stars[star.key];
  const name = strings.names[star.key];
  const id = SIZE_STOP_IDS[star.key];
  const titleId = `${id}-titre`;
  const distance =
    star.key === "sun"
      ? content.facts.sunDistance
      : withUnit(formatNumber(star.distanceLy, star.distanceLy < ONE_DECIMAL_BELOW_LY ? 1 : 0, locale), "ly", locale);
  const facts = [
    {
      label: content.facts.radius,
      value: strings.radius(star.radiusSolar),
      note: star.radiusRange ? strings.radiusRange(...star.radiusRange) : null,
    },
    {
      label: content.facts.radiusKm,
      value: withUnit(formatNumber(roundSignificant(radiusKm(star.radiusSolar), KM_SIGNIFICANT_DIGITS), 0, locale), "km", locale),
    },
    { label: content.facts.temperature, value: withUnit(formatNumber(star.temperatureK, 0, locale), "kelvin", locale) },
    { label: content.facts.distance, value: distance },
    { label: content.facts.type, value: star.spectralType },
    { label: content.facts.comparison, value: strings.comparison(star) },
  ];

  return (
    <section className="stop" id={id} data-stop={star.key} tabIndex={-1} aria-labelledby={titleId}>
      <Plate
        id={id}
        name={name}
        color={star.color}
        header={
          <>
            <p className="rank">
              <i aria-hidden="true" />
              {text.rank}
            </p>
            <h2 id={titleId}>{name}</h2>
            <p className="hook">{text.hook}</p>
          </>
        }
        sections={[
          {
            key: "fiche",
            // Le même libellé revient à chaque étoile : son nom la distingue à l'oreille.
            label: (
              <>
                {content.plate.story}
                <span className="sr">, {name}</span>
              </>
            ),
            content: (
              <>
                <p className="lede">{text.lede}</p>
                <dl className="facts">
                  {facts.map((fact) => (
                    <div key={fact.label}>
                      <dt>{fact.label}</dt>
                      <dd>
                        {fact.value}
                        {fact.note ? <small>{fact.note}</small> : null}
                      </dd>
                    </div>
                  ))}
                </dl>
                {text.caveat ? <p className="fact-caveat">{text.caveat}</p> : null}
                <p className="fact-source">
                  {content.plate.sources} {star.sources}.
                </p>
              </>
            ),
          },
        ]}
        footer={
          restartHref ? (
            <div className="actions">
              <a className="btn ghost" href={restartHref}>
                {content.plate.restart}
              </a>
            </div>
          ) : undefined
        }
      />
    </section>
  );
}
