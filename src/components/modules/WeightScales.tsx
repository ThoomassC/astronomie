"use client";

import { useState, type CSSProperties } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import type { Locale } from "@/i18n/locales";
import { bodyName, type NamedBody } from "@/i18n/names";
import { MASS_MAX_KG, MASS_MIN_KG, parseMassKg, scaleReadingKg, SURFACE_GRAVITY } from "@/lib/astro/weight";
import { formatNumber } from "@/lib/format";
import { COMMON_STRINGS } from "./common.strings";
import { StatusMessage } from "./StatusMessage";
import { useAnnouncer } from "./useAnnouncer";
import { useNumberInput } from "./useNumberInput";
import { WEIGHT_STRINGS } from "./weight.strings";
import styles from "./modules.module.css";

const DEFAULT_MASS_KG = 40;
/** Astre de l'escale, mis en avant dans la liste. */
const HERE_KEY: NamedBody = "mars";
/** Bornes rappelées par le message d'erreur, y compris quand la saisie est illisible. */
const MASS_RANGE = { min: MASS_MIN_KG, max: MASS_MAX_KG };
/** Les barres comparent les gravités : la plus forte (Jupiter) fait toute la largeur. */
const MAX_G = Math.max(...SURFACE_GRAVITY.map((entry) => entry.g));
const INPUT_ID = "weight-mass";
const HINT_ID = "weight-mass-hint";
const ERROR_ID = "weight-mass-error";

type BarStyle = CSSProperties & Record<"--bc", string>;

const reading = (kg: number, locale: Locale) => `${formatNumber(kg, kg < 100 ? 1 : 0, locale)} kg`;

/** Annonce unique après une saisie valide : la ligne de l'escale, puis un renvoi à la liste. */
function summary(massKg: number, locale: Locale): string {
  const t = WEIGHT_STRINGS[locale];
  const here = SURFACE_GRAVITY.find((entry) => entry.key === HERE_KEY);
  if (!here) return t.others;
  return `${t.here(bodyName(here.key, locale), reading(scaleReadingKg(massKg, here.g), locale))} ${t.others}`;
}

/** 5. Ce qu'afficherait une balance (Mars) : poids lu sur chaque astre pour une masse saisie. */
export function WeightScales() {
  const locale = useLocale();
  const t = WEIGHT_STRINGS[locale];
  /** Dernière masse valide : l'affichage la garde pendant une saisie invalide. */
  const [massKg, setMassKg] = useState(DEFAULT_MASS_KG);
  const { message, announce } = useAnnouncer();
  const field = useNumberInput(
    parseMassKg,
    (value) => {
      setMassKg(value);
      announce(summary(value, locale));
    },
    (error) => {
      const { min, max } = error.kind === "range" ? error : MASS_RANGE;
      return t.error(formatNumber(min, 0, locale), formatNumber(max, 0, locale));
    },
  );
  const hint = COMMON_STRINGS[locale].example(
    formatNumber(MASS_MIN_KG, 0, locale),
    `${formatNumber(MASS_MAX_KG, 0, locale)} kg`,
  );

  return (
    <>
      <div className="ctrls">
        <label htmlFor={INPUT_ID}>
          {`${t.massLabel} `}
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
          {hint}
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
              <span>{bodyName(entry.key, locale)}</span>
              <span className="bar-t">
                <span style={bar} />
              </span>
              <span className={styles.value}>{reading(scaleReadingKg(massKg, entry.g), locale)}</span>
            </li>
          );
        })}
      </ul>
      <p className={`readout ${styles.note}`}>{t.note}</p>
      <StatusMessage message={message} />
    </>
  );
}
