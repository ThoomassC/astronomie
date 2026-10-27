import { ExplainerModule } from "@/components/modules/ExplainerModule";
import type { BodyStop } from "@/content/stops";
import { cssVars } from "./cssVars";
import { LiveDistance } from "./LiveDistance";

/** « L'étoile au centre », ou « 1ʳᵉ / 3ᵉ planète en partant du Soleil » avec l'ordinal en exposant. */
function Rank({ rank }: { rank: BodyStop["rank"] }) {
  return (
    <p className="rank">
      <i aria-hidden="true" />
      {rank.ordinal !== undefined && (
        <>
          {rank.ordinal}
          <sup>{rank.ordinal === 1 ? "re" : "e"}</sup>{" "}
        </>
      )}
      {rank.label}
    </p>
  );
}

/** Escale d'un astre : plaque de lecture, fiche avec la ligne « ce jour », module explicatif. */
export function StopPlate({ stop }: { stop: BodyStop }) {
  const titleId = `${stop.id}-titre`;
  return (
    <section className="stop" id={stop.id} data-stop={stop.key} tabIndex={-1} aria-labelledby={titleId}>
      <article className="plate" style={cssVars({ "--c": stop.color })}>
        <Rank rank={stop.rank} />
        <h2 id={titleId}>{stop.name}</h2>
        <p className="hook">{stop.hook}</p>
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
          <div className="live">
            <dt>{stop.live.label}</dt>
            <LiveDistance target={stop.key} />
          </div>
        </dl>
        <figure className="module">
          <h3>{stop.module.title}</h3>
          <p>{stop.module.intro}</p>
          <ExplainerModule kind={stop.module.kind} />
        </figure>
      </article>
    </section>
  );
}
