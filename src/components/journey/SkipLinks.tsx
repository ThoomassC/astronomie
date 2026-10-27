import { DOCK_ID, MAIN_ID } from "./ids";

/** Liens d'évitement, visibles au focus : vers le contenu et vers la machine à remonter le temps. */
export function SkipLinks() {
  return (
    <div className="skip-links">
      <a className="skip" href={`#${MAIN_ID}`}>
        Aller au contenu
      </a>
      <a className="skip" href={`#${DOCK_ID}`}>
        Aller à la machine à remonter le temps
      </a>
    </div>
  );
}
