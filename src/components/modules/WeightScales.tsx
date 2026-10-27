"use client";

import { useState, type CSSProperties } from "react";
import { MASS_MAX_KG, MASS_MIN_KG, parseMassKg, scaleReadingKg, SURFACE_GRAVITY } from "@/lib/astro/weight";
import { formatNumber } from "@/lib/format";
import { StatusMessage } from "./StatusMessage";
import { useAnnouncer } from "./useAnnouncer";
import { useNumberInput } from "./useNumberInput";
import styles from "./modules.module.css";

const DEFAULT_MASS_KG = 40;
/** Astre de l'escale, mis en avant dans la liste. */
const HERE_KEY = "mars";
/** Les barres comparent les gravités : la plus forte (Jupiter) fait toute la largeur. */
const MAX_G = Math.max(...SURFACE_GRAVITY.map((entry) => entry.g));
const INPUT_ID = "weight-mass";
const HINT_ID = "weight-mass-hint";
const ERROR_ID = "weight-mass-error";

type BarStyle = CSSProperties & Record<"--bc", string>;

const reading = (kg: number) => `${formatNumber(kg, kg < 100 ? 1 : 0)} kg`;

/** Annonce unique après une saisie valide : la ligne de l'escale, puis un renvoi à la liste. */
function summary(massKg: number): string {
  const here = SURFACE_GRAVITY.find((entry) => entry.key === HERE_KEY);
  const lead = here ? `Sur ${here.name}, la balance afficherait ${reading(scaleReadingKg(massKg, here.g))}. ` : "";
  return `${lead}Les autres astres sont dans la liste.`;
}

/** 5. Ce qu'afficherait une balance (Mars) : poids lu sur chaque astre pour une masse saisie. */
export function WeightScales() {
  /** Dernière masse valide : l'affichage la garde pendant une saisie invalide. */
  const [massKg, setMassKg] = useState(DEFAULT_MASS_KG);
  const { message, announce } = useAnnouncer();
  const field = useNumberInput(parseMassKg, (value) => {
    setMassKg(value);
    announce(summary(value));
  });

  return (
    <>
      <div className="ctrls">
        <label htmlFor={INPUT_ID}>
          {"Masse sur Terre "}
          <input
            id={INPUT_ID}
            className={styles.field}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            defaultValue={String(DEFAULT_MASS_KG)}
            aria-invalid={field.error !== null}
            aria-describedby={field.error ? `${ERROR_ID} ${HINT_ID}` : HINT_ID}
            onChange={field.onChange}
            onBlur={field.onBlur}
          />
          {" kg"}
        </label>
        <span id={HINT_ID} className={styles.hint}>
          {`exemple, modifiable (de ${MASS_MIN_KG} à ${MASS_MAX_KG} kg)`}
        </span>
      </div>
      <div id={ERROR_ID} className={styles.error} aria-live="polite">
        {field.error}
      </div>
      <ul className="scales" id="weight-scales">
        {SURFACE_GRAVITY.map((entry) => {
          const here = entry.key === HERE_KEY;
          const bar: BarStyle = { "--bc": entry.color, width: `${((entry.g / MAX_G) * 100).toFixed(1)}%` };
          return (
            <li
              key={entry.key}
              className={here ? `here ${styles.here}` : undefined}
              aria-current={here ? "true" : undefined}
            >
              <span>{entry.name}</span>
              <span className="bar-t">
                <span style={bar} />
              </span>
              <span className={styles.value}>{reading(scaleReadingKg(massKg, entry.g))}</span>
            </li>
          );
        })}
      </ul>
      <p className={`readout ${styles.note}`}>
        {"Pour les géantes gazeuses, gravité au sommet des nuages : on ne peut pas s'y poser."}
      </p>
      <StatusMessage message={message} />
    </>
  );
}
