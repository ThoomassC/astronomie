import { GoToLink } from "@/components/journey/GoToLink";
import { Plate } from "@/components/journey/Plate";
import { getSizesContent } from "@/content/sizes/content";
import type { Locale } from "@/i18n/locales";
import type { ComparedBlackHole } from "@/lib/astro/blackHoles";
import { radiusKm } from "@/lib/sizes/comparisons";
import { COMPARED_OBJECTS, comparedRadiusSolar } from "@/lib/sizes/objects";
import { SIZE_STOP_IDS, sizeObjectIndex, sizeStopAnchor, type SizeStopKey } from "@/lib/sizes/stops";
import { SIZES_STRINGS, type SizesStrings } from "./sizes.strings";
import { SizesSteps } from "./SizesSteps";
import styles from "./SizesPage.module.css";

/** Sous ce rayon, en R☉ (7 000 km), une longueur s'écrit d'abord en kilomètres, puis en R☉ : « 163 km », « 0,000234 R☉ ». */
const KILOMETRES_BELOW_SOLAR = 0.01;

/**
 * Un rayon de trou noir, en deux unités, à `digits` chiffres significatifs : la plus parlante en valeur (R☉, ou km pour
 * un rayon minuscule), l'autre en dessous.
 */
function radiusParts(radiusSolar: number, digits: number, t: SizesStrings): { value: string; detail: string } {
  const solar = t.solarRadii(radiusSolar, digits);
  const km = t.kilometres(radiusKm(radiusSolar), digits);
  return radiusSolar < KILOMETRES_BELOW_SOLAR ? { value: km, detail: solar } : { value: solar, detail: km };
}

/**
 * Escale d'un trou noir de la page « Tailles », sur le squelette des étoiles (StarPlate) : plaque de lecture (rang parmi
 * les quatorze, accordé au masculin, et catégorie, nom, accroche) et fiche : présentation ; rayon de l'ombre, la taille
 * comparée, et rayon de l'horizon, chacun en R☉ et en km ; masse, avec sa fourchette publiée si elle est débattue ;
 * type ; distance, avec le temps de trajet de la lumière d'un trou noir lointain ; comparaison ; mise en garde ; ce que
 * la vue simplifie (« Rendu calculé ») ; sources. Sur téléphone, la fiche se déplie à la demande. `restartTo` ajoute
 * sous la fiche un lien vers cette escale (le plus petit astre, sur la dernière plaque) ; les astres voisins
 * sont au bout des titres-boutons (SizesSteps, téléphone).
 */
export function BlackHolePlate({ hole, locale, restartTo }: { hole: ComparedBlackHole; locale: Locale; restartTo?: SizeStopKey }) {
  const content = getSizesContent(locale);
  const t = SIZES_STRINGS[locale];
  const text = content.blackHoles[hole.key];
  const name = t.names[hole.key];
  const id = SIZE_STOP_IDS[hole.key];
  const titleId = `${id}-titre`;
  const rank = t.rank(sizeObjectIndex(hole.key) + 1, COMPARED_OBJECTS.length, "masculine");
  const shadow = radiusParts(comparedRadiusSolar(hole), hole.significantDigits, t);
  const horizon = radiusParts(hole.radiusSolar, hole.significantDigits, t);

  return (
    <section className="stop" id={id} data-stop={hole.key} tabIndex={-1} aria-labelledby={titleId}>
      <Plate
        id={id}
        name={name}
        color={hole.color}
        header={
          <>
            <p className={`rank ${styles.rank}`}>
              <i aria-hidden="true" />
              {rank.value}
              {rank.superscript ? <sup>{rank.suffix}</sup> : rank.suffix}
              {rank.total} · {text.kind}
            </p>
            <h2 id={titleId}>{name}</h2>
            <p className="hook">{text.hook}</p>
          </>
        }
        sections={[
          {
            key: "fiche",
            // Le même libellé revient à chaque astre : son nom le distingue à l'oreille.
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
                  <div>
                    <dt>{content.facts.shadow}</dt>
                    <dd>
                      {shadow.value}
                      <small>{shadow.detail}</small>
                    </dd>
                  </div>
                  <div>
                    <dt>{content.facts.horizon}</dt>
                    <dd>
                      {horizon.value}
                      <small>{horizon.detail}</small>
                    </dd>
                  </div>
                  <div>
                    <dt>{content.facts.mass}</dt>
                    <dd>
                      {t.mass(hole.massSolar, hole.significantDigits)}
                      {hole.massRange ? <small>{t.massRange(...hole.massRange, hole.significantDigits)}</small> : null}
                    </dd>
                  </div>
                  <div>
                    <dt>{content.facts.blackHoleType}</dt>
                    <dd>{text.kind}</dd>
                  </div>
                  <div className={styles.wide}>
                    <dt>{content.facts.distance}</dt>
                    <dd>
                      {t.lightYears(hole.distanceLy)}
                      {hole.lightTravelYears ? <small>{t.lightTravel(hole.lightTravelYears)}</small> : null}
                    </dd>
                  </div>
                  <div className={styles.wide}>
                    <dt>{content.facts.comparison}</dt>
                    <dd className={styles.sentence}>{t.comparison(hole)}</dd>
                  </div>
                </dl>
                {text.caveat ? <p className="fact-caveat">{text.caveat}</p> : null}
                <p className="fact-caveat">{text.simplification}</p>
                <p className="fact-source">
                  {content.plate.sources} {hole.sources}.
                </p>
              </>
            ),
          },
        ]}
        steps={<SizesSteps object={hole.key} locale={locale} />}
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
