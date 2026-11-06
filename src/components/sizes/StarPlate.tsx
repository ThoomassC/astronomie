import { cssVars } from "@/components/journey/cssVars";
import { GoToLink } from "@/components/journey/GoToLink";
import { Plate } from "@/components/journey/Plate";
import { getSizesContent } from "@/content/sizes/content";
import type { SizesContent } from "@/content/sizes/types";
import type { Locale } from "@/i18n/locales";
import { withUnit } from "@/i18n/units";
import type { ComparedStar } from "@/lib/astro/starSizes";
import { formatNumber } from "@/lib/format";
import { radiusKm, roundSignificant } from "@/lib/sizes/comparisons";
import { COMPARED_OBJECTS } from "@/lib/sizes/objects";
import { SIZE_STOP_IDS, sizeObjectIndex, sizeStopAnchor, type SizeStopKey } from "@/lib/sizes/stops";
import { TEMPERATURE_SCALE_STOPS, temperatureScalePercent, temperatureTint } from "@/lib/sizes/temperature";
import { SIZES_STRINGS } from "./sizes.strings";
import { SizesSteps } from "./SizesSteps";
import styles from "./SizesPage.module.css";

/** Chiffres significatifs du rayon en kilomètres : les rayons mesurés ne sont pas plus précis. */
const KM_SIGNIFICANT_DIGITS = 4;
/** Température effective du Soleil (UAI 2015), repère de la réglette et de la comparaison. */
const SUN_TEMPERATURE_K = 5772;

/** Position sur la réglette, au dixième de pourcent : la même au rendu serveur et dans le navigateur. */
const scalePercent = (temperatureK: number) => `${temperatureScalePercent(temperatureK).toFixed(1)}%`;

/** Dégradé de la réglette : couleurs de corps noir à leur position, du plus froid au plus chaud. */
const THERMO_GRADIENT = `linear-gradient(to right, ${TEMPERATURE_SCALE_STOPS.map(
  ({ temperatureK, color }) => `${color} ${scalePercent(temperatureK)}`,
).join(", ")})`;

/**
 * Réglette des températures, décorative (la fiche dit tout en mots) : dégradé des couleurs de corps noir sur une
 * échelle logarithmique, triangle de l'étoile au-dessus, trait du Soleil dessous (sauf sur sa propre plaque), et les
 * mots « plus froide » et « plus chaude » aux deux bouts : ici, rouge veut dire froid.
 */
function TemperatureScale({ star, words, sunName }: { star: ComparedStar; words: SizesContent["thermo"]; sunName: string }) {
  return (
    <div className={styles.thermo} aria-hidden="true">
      <div className={styles.thermoTrack} style={cssVars({ "--thermo-gradient": THERMO_GRADIENT })}>
        <span className={styles.thermoStar} style={cssVars({ "--at": scalePercent(star.temperatureK) })} />
        {star.key === "sun" ? null : (
          <span className={styles.thermoSun} style={cssVars({ "--at": scalePercent(SUN_TEMPERATURE_K) })}>
            <span>{sunName}</span>
          </span>
        )}
      </div>
      <div className={styles.thermoEnds}>
        <span>{words.cooler}</span>
        <span>{words.hotter}</span>
      </div>
    </div>
  );
}

/**
 * Escale d'une étoile de la page « Tailles » (design v2, § 4.4) : plaque de lecture (rang parmi les quatorze astres,
 * accordé au féminin, et catégorie,
 * nom, accroche) et fiche : présentation ; rayon, avec ses kilomètres (4 chiffres significatifs) et sa fourchette
 * publiée s'il est débattu ; type ; température, sa couleur en mots et la réglette ; distance ; comparaison ; mise en
 * garde ; sources. Sur téléphone, la fiche se déplie à la demande, comme au voyage. `restartTo` ajoute sous la fiche
 * un lien vers cette escale (le plus petit astre, sur la dernière plaque) ; les astres voisins
 * encadrent son nom (SizesSteps, téléphone).
 */
export function StarPlate({ star, locale, restartTo }: { star: ComparedStar; locale: Locale; restartTo?: SizeStopKey }) {
  const content = getSizesContent(locale);
  const t = SIZES_STRINGS[locale];
  const text = content.stars[star.key];
  const name = t.names[star.key];
  const id = SIZE_STOP_IDS[star.key];
  const titleId = `${id}-titre`;
  const rank = t.rank(sizeObjectIndex(star.key) + 1, COMPARED_OBJECTS.length, "feminine");
  const km = withUnit(formatNumber(roundSignificant(radiusKm(star.radiusSolar), KM_SIGNIFICANT_DIGITS), 0, locale), "km", locale);
  const tint = content.tints[temperatureTint(star.temperatureK)];
  const versusSun =
    star.key === "sun"
      ? content.vsSun.reference
      : star.temperatureK < SUN_TEMPERATURE_K
        ? content.vsSun.cooler
        : content.vsSun.hotter;

  return (
    <section className="stop" id={id} data-stop={star.key} tabIndex={-1} aria-labelledby={titleId}>
      <Plate
        id={id}
        stop={star.key}
        name={name}
        color={star.color}
        header={
          <p className={`rank ${styles.rank}`}>
            <i aria-hidden="true" />
            {rank.value}
            {rank.superscript ? <sup>{rank.suffix}</sup> : rank.suffix}
            {rank.total} · {text.kind}
          </p>
        }
        titleId={titleId}
        hook={text.hook}
        sections={[
          {
            key: "fiche",
            // Le même libellé revient à chaque étoile : son nom la distingue à l'oreille.
            label: content.plate.story,
            context: name,
            icon: "story",
            content: (
              <>
                <p className="lede">{text.lede}</p>
                <dl className="facts">
                  <div>
                    <dt>{content.facts.radius}</dt>
                    <dd>
                      {t.radius(star.radiusSolar)}
                      <small>{km}</small>
                      {star.radiusRange ? <small>{t.radiusRange(...star.radiusRange)}</small> : null}
                    </dd>
                  </div>
                  <div>
                    <dt>{content.facts.type}</dt>
                    <dd>
                      {text.kind}
                      <small>{star.spectralType}</small>
                    </dd>
                  </div>
                  <div className={styles.wide}>
                    <dt>{content.facts.temperature}</dt>
                    <dd>
                      {withUnit(formatNumber(star.temperatureK, 0, locale), "kelvin", locale)}
                      <small>
                        {tint}, {versusSun}
                      </small>
                      <TemperatureScale star={star} words={content.thermo} sunName={t.names.sun} />
                    </dd>
                  </div>
                  <div>
                    <dt>{content.facts.distance}</dt>
                    <dd>{star.key === "sun" ? content.facts.sunDistance : t.lightYears(star.distanceLy)}</dd>
                  </div>
                  <div className={styles.wide}>
                    <dt>{content.facts.comparison}</dt>
                    <dd className={styles.sentence}>{t.comparison(star)}</dd>
                  </div>
                </dl>
                {text.caveat ? <p className="fact-caveat">{text.caveat}</p> : null}
                <p className="fact-source">
                  {content.plate.sources} {star.sources}.
                </p>
              </>
            ),
          },
        ]}
        steps={<SizesSteps object={star.key} locale={locale} />}
        footer={
          restartTo ? (
            <div className="actions">
              <GoToLink className="btn ghost" href={sizeStopAnchor(restartTo)} stop={restartTo}>
                {content.plate.restart}
              </GoToLink>
            </div>
          ) : undefined
        }
      />
    </section>
  );
}
