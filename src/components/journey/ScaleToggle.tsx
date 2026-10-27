"use client";

import { SCALE_TOGGLE } from "@/content/site";
import { toggleRealScale, useRealScale } from "./realScale";

/** Case dessinée, cochée quand la bascule est active : l'état ne repose pas que sur la couleur. */
export function CheckIcon({ checked }: { checked: boolean }) {
  return (
    <svg className="check" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="1.5" y="1.5" width="13" height="13" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      {checked ? (
        <path
          d="M4.6 8.3l2.3 2.3 4.6-5.1"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
    </svg>
  );
}

/**
 * Bascule « distances réelles » de l'accueil et de l'au-delà, synchronisée avec l'horloge.
 * Un seul codage de l'état : libellé fixe et `aria-pressed`.
 */
export function ScaleToggle({ className }: { className: string }) {
  const real = useRealScale();
  return (
    <button className={className} type="button" aria-pressed={real} onClick={toggleRealScale}>
      <CheckIcon checked={real} />
      {SCALE_TOGGLE.off}
    </button>
  );
}
