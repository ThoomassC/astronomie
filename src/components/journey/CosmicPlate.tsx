import { STAR_LIST, type CosmicStopContent } from "@/content/cosmos";
import { PLATE_MORE } from "@/content/site";
import { spectralClass, spectralColor } from "@/lib/astro/starMap";
import { NEARBY_STARS, type NearbyStar } from "@/lib/astro/stars";
import { formatNumber } from "@/lib/format";
import { cssVars } from "./cssVars";
import { GoToLink } from "./GoToLink";
import { Plate, type PlateSection } from "./Plate";
import { stopColor } from "./stopMeta";

/** Type de l'étoile en mots simples (« naine rouge ») ; le type spectral tel quel si sa classe est inconnue. */
function starType(star: NearbyStar): string {
  const spectral = spectralClass(star.spectralType);
  return spectral ? STAR_LIST.types[spectral] : star.spectralType;
}

/**
 * Les étoiles de la carte, de la plus proche à la plus lointaine : le texte équivalent des points et des
 * étiquettes de la scène (décorative). La pastille reprend la couleur du point.
 */
function StarTable() {
  const [starColumn, distanceColumn, typeColumn] = STAR_LIST.columns;
  return (
    <>
      <table className="star-table">
        <caption>{STAR_LIST.caption}</caption>
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
                {star.name}
              </th>
              <td>{formatNumber(star.distanceLy, 1)} al</td>
              <td>
                {starType(star)}
                {star.note ? <small>{star.note}</small> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="star-note">{STAR_LIST.typeNote}</p>
    </>
  );
}

/**
 * Escale au-delà du système solaire (étoiles voisines, Voie lactée) : plaque de lecture, fiche, ce que la
 * vue simplifie et ses sources ; pour les étoiles voisines (`starList`), le tableau des étoiles de la carte.
 * Sur téléphone, chaque partie se déplie à la demande, comme aux autres escales.
 */
export function CosmicPlate({
  stop,
  sunHref,
  starList = false,
}: {
  stop: CosmicStopContent;
  sunHref: `#${string}`;
  starList?: boolean;
}) {
  const titleId = `${stop.id}-titre`;
  const sections: PlateSection[] = [
    {
      key: "fiche",
      // Le même libellé revient à chaque escale : le nom de l'escale le distingue à l'oreille.
      label: (
        <>
          {PLATE_MORE.story}
          <span className="sr">, {stop.name}</span>
        </>
      ),
      content: (
        <>
          <p className="lede">{stop.lede}</p>
          <dl className="facts">
            {stop.facts.map((fact) => (
              <div key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>
                  {fact.value}
                  {fact.note ? <small>{fact.note}</small> : null}
                </dd>
              </div>
            ))}
          </dl>
          <p className="fact-caveat">{stop.caveat}</p>
          <p className="fact-source">Sources : {stop.source}.</p>
        </>
      ),
    },
  ];
  if (starList) sections.push({ key: "etoiles", label: STAR_LIST.button, content: <StarTable /> });

  return (
    <section className="stop" id={stop.id} data-stop={stop.key} tabIndex={-1} aria-labelledby={titleId}>
      <Plate
        id={stop.id}
        name={stop.name}
        color={stopColor(stop.key)}
        header={
          <>
            <p className="rank">
              <i aria-hidden="true" />
              {stop.rank}
            </p>
            <h2 id={titleId}>{stop.name}</h2>
            <p className="hook">{stop.hook}</p>
          </>
        }
        sections={sections}
        footer={
          <div className="actions">
            <GoToLink className="btn ghost" href={sunHref} stop="sun">
              {stop.back}
            </GoToLink>
          </div>
        }
      />
    </section>
  );
}
