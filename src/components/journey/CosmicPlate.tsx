import { DEEP_SKY_STRINGS } from "@/components/scene/deepSky.strings";
import type { CosmicContent } from "@/content/cosmic/types";
import type { Locale } from "@/i18n/locales";
import { withUnit } from "@/i18n/units";
import { LOCAL_GROUP } from "@/lib/astro/localGroup";
import { spectralClass, spectralColor } from "@/lib/astro/starMap";
import { NEARBY_STARS, type NearbyStar } from "@/lib/astro/stars";
import { formatNumber } from "@/lib/format";
import type { CosmicStopKey } from "@/lib/journey/camera";
import { STOP_IDS } from "@/lib/journey/stopIds";
import { cssVars } from "./cssVars";
import { GoToLink } from "./GoToLink";
import { Plate, type PlateSection } from "./Plate";
import { stopColor } from "./stopMeta";

/** Type de l'étoile en mots simples (« naine rouge ») ; le type spectral tel quel si sa classe est inconnue. */
function starType(star: NearbyStar, table: CosmicContent["starTable"]): string {
  const spectral = spectralClass(star.spectralType);
  return spectral ? table.types[spectral] : star.spectralType;
}

/**
 * Les étoiles de la carte, de la plus proche à la plus lointaine : le texte équivalent des points et des
 * étiquettes de la scène (décorative). La pastille reprend la couleur du point.
 */
function StarTable({ table, locale }: { table: CosmicContent["starTable"]; locale: Locale }) {
  const [starColumn, distanceColumn, typeColumn] = table.columns;
  const { starNames } = DEEP_SKY_STRINGS[locale];
  return (
    <>
      <table className="star-table">
        <caption>{table.caption}</caption>
        <thead>
          <tr>
            <th scope="col">{starColumn}</th>
            <th scope="col">{distanceColumn}</th>
            <th scope="col">{typeColumn}</th>
          </tr>
        </thead>
        <tbody>
          {NEARBY_STARS.map((star) => (
            <tr key={star.key}>
              <th scope="row">
                <i aria-hidden="true" style={cssVars({ "--lc": spectralColor(star.spectralType) })} />
                {starNames[star.key]}
              </th>
              <td>{withUnit(formatNumber(star.distanceLy, 1, locale), "ly", locale)}</td>
              <td>
                {starType(star, table)}
                {table.notes[star.key] ? <small>{table.notes[star.key]}</small> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="star-note">{table.typeNote}</p>
    </>
  );
}

/**
 * Les galaxies de la carte, de la plus proche à la plus lointaine : nom, distance au Soleil (celle de son centre
 * pour la Voie lactée), diamètre. Le texte équivalent de la scène, où seules les cinq principales sont nommées.
 */
function GalaxyTable({ table, locale }: { table: CosmicContent["galaxyTable"]; locale: Locale }) {
  const [galaxyColumn, distanceColumn, sizeColumn] = table.columns;
  const { galaxyNames, galaxyDistance, galaxySize } = DEEP_SKY_STRINGS[locale];
  return (
    <>
      <table className="star-table">
        <caption>{table.caption}</caption>
        <thead>
          <tr>
            <th scope="col">{galaxyColumn}</th>
            <th scope="col">{distanceColumn}</th>
            <th scope="col">{sizeColumn}</th>
          </tr>
        </thead>
        <tbody>
          {LOCAL_GROUP.map((galaxy) => (
            <tr key={galaxy.key}>
              <th scope="row">{galaxyNames[galaxy.key]}</th>
              <td>{galaxyDistance(galaxy.distanceMly)}</td>
              <td>{galaxySize(galaxy.diameterLy)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="star-note">{table.note}</p>
    </>
  );
}

interface CosmicPlateProps {
  stop: CosmicStopKey;
  /** Textes des escales lointaines, dans la langue de la page. */
  content: CosmicContent;
  locale: Locale;
  /** Ancre du Soleil : retour depuis l'escale. */
  sunHref: `#${string}`;
}

/**
 * Escale au-delà du système solaire, dans la langue de la page : plaque de lecture, fiche, ce que la vue simplifie
 * et ses sources ; le tableau des étoiles de la carte aux étoiles voisines, celui des galaxies au Groupe local. Au
 * multivers, l'avertissement d'hypothèse passe avant tout le reste, rang et titre compris. Sur téléphone, chaque
 * partie se déplie à la demande, comme aux autres escales.
 */
export function CosmicPlate({ stop, content, locale, sunHref }: CosmicPlateProps) {
  const text = content.stops[stop];
  const id = STOP_IDS[stop];
  const titleId = `${id}-titre`;
  const sections: PlateSection[] = [
    {
      key: "fiche",
      // Le même libellé revient à chaque escale : le nom de l'escale le distingue à l'oreille.
      label: (
        <>
          {content.plate.story}
          <span className="sr">, {text.name}</span>
        </>
      ),
      content: (
        <>
          <p className="lede">{text.lede}</p>
          <dl className="facts">
            {text.facts.map((fact) => (
              <div key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>
                  {fact.value}
                  {fact.note ? <small>{fact.note}</small> : null}
                </dd>
              </div>
            ))}
          </dl>
          <p className="fact-caveat">{text.caveat}</p>
          <p className="fact-source">{`${content.plate.sources} ${text.source}.`}</p>
        </>
      ),
    },
  ];
  if (stop === "stars") {
    sections.push({
      key: "etoiles",
      label: content.starTable.button,
      content: <StarTable table={content.starTable} locale={locale} />,
    });
  }
  if (stop === "localGroup") {
    sections.push({
      key: "galaxies",
      label: content.galaxyTable.button,
      content: <GalaxyTable table={content.galaxyTable} locale={locale} />,
    });
  }

  return (
    <section className="stop" id={id} data-stop={stop} tabIndex={-1} aria-labelledby={titleId}>
      <Plate
        id={id}
        name={text.name}
        color={stopColor(stop)}
        header={
          <>
            {text.hypothesis ? <p className="hypothesis">{text.hypothesis}</p> : null}
            <p className="rank">
              <i aria-hidden="true" />
              {text.rank}
            </p>
            <h2 id={titleId}>{text.name}</h2>
            <p className="hook">{text.hook}</p>
          </>
        }
        sections={sections}
        footer={
          <div className="actions">
            <GoToLink className="btn ghost" href={sunHref} stop="sun">
              {content.plate.back}
            </GoToLink>
          </div>
        }
      />
    </section>
  );
}
