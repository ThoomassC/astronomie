import type { InterludeStop } from "@/content/stops";

/** L'interlude n'a pas de titre visible : celui-ci nomme la section pour les lecteurs d'écran. */
const INTERLUDE_TITLE = "La ceinture d'astéroïdes";

/** Interlude sans plaque (ceinture d'astéroïdes) : une citation sur fond de scène. */
export function Interlude({ stop }: { stop: InterludeStop }) {
  const titleId = `${stop.id}-titre`;
  return (
    <section className="interlude" id={stop.id} data-stop={stop.key} tabIndex={-1} aria-labelledby={titleId}>
      <h2 className="sr" id={titleId}>
        {INTERLUDE_TITLE}
      </h2>
      <blockquote>
        <p>{stop.text}</p>
        <cite>{stop.cite}</cite>
      </blockquote>
    </section>
  );
}
