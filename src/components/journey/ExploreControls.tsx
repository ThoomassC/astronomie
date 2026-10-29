"use client";

import type { ReactNode } from "react";
import type { Announcement } from "@/components/modules/useAnnouncer";
import { EXPLORE } from "@/content/explore";
import { isEarthViewTarget } from "@/lib/astro/earthView";
import { exploreStore } from "@/lib/journey/explore";
import { KEY_ROTATE_STEP, KEY_TILT_STEP, KEY_ZOOM_STEP, type ExploreStop } from "@/lib/journey/orbit";
import { getClock } from "@/lib/sim/clock";
import { earthReading } from "./earthReading";
import { EarthReadingPanel } from "./EarthReadingPanel";
import { EXPLORE_GROUP_ID } from "./ids";
import { CheckIcon } from "./ScaleToggle";
import { stopColor, stopName } from "./stopMeta";

/** Pictogrammes du pavé, tracés au trait (18 × 18). */
const PAD_ICONS = {
  left: <path d="M11 4 6 9l5 5" />,
  right: <path d="m7 4 5 5-5 5" />,
  up: <path d="m4 11 5-5 5 5" />,
  down: <path d="m4 7 5 5 5-5" />,
  closer: <path d="M9 4v10M4 9h10" />,
  farther: <path d="M4 9h10" />,
  recenter: (
    <>
      <circle cx="9" cy="9" r="4.5" />
      <path d="M9 1.5v3M9 13.5v3M1.5 9h3M13.5 9h3" />
    </>
  ),
} satisfies Record<string, ReactNode>;

/** Bouton rond du pavé : le pictogramme seul, son nom pour les technologies d'assistance. */
function PadButton({ label, icon, onPress }: { label: string; icon: keyof typeof PAD_ICONS; onPress: () => void }) {
  return (
    <button type="button" className="ibtn" aria-label={label} onClick={onPress}>
      <svg
        viewBox="0 0 18 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {PAD_ICONS[icon]}
      </svg>
    </button>
  );
}

interface ExploreControlsProps {
  stop: ExploreStop;
  fromEarth: boolean;
  /** Annonceur de la couche d'exploration (une seule région status pour tout le mode). */
  announce: (next: Announcement) => void;
}

/**
 * Commandes de l'exploration, groupées sous un nom qui dit ce qu'on explore (le groupe reçoit le focus à l'entrée) :
 * en haut, la barre (escale, rappel des gestes sur grand écran, bascule « Vu depuis la Terre » pour les sept autres
 * planètes, « Terminer ») et la lecture du jour quand la bascule est enfoncée ; en bas, au-dessus du dock, le pavé
 * (tourner, distance, recentrer) qui fait au clic ce que font les gestes et le clavier.
 */
export function ExploreControls({ stop, fromEarth, announce }: ExploreControlsProps) {
  const target = EXPLORE.targets[stop];

  const toggleEarthView = () => {
    if (!isEarthViewTarget(stop)) return;
    const on = !exploreStore.get().fromEarth;
    exploreStore.setFromEarth(on);
    // La phrase est calculée au moment de l'annonce : la date simulée a pu avancer pendant le calme de l'annonceur.
    if (on) announce(() => earthReading(stop, getClock().now()).spoken);
  };

  return (
    <div id={EXPLORE_GROUP_ID} className="explore-controls" role="group" tabIndex={-1} aria-label={EXPLORE.group(target)}>
      <div className="explore-bar">
        <p className="explore-where">
          <i aria-hidden="true" style={{ background: stopColor(stop) }} />
          <b>{stopName(stop)}</b>
        </p>
        <p className="explore-hint">{EXPLORE.hint}</p>
        {isEarthViewTarget(stop) ? (
          <button type="button" className="explore-earth" aria-pressed={fromEarth} onClick={toggleEarthView}>
            <CheckIcon checked={fromEarth} />
            {EXPLORE.fromEarth}
          </button>
        ) : null}
        <button type="button" className="explore-done" onClick={() => exploreStore.exit()}>
          {EXPLORE.done}
        </button>
      </div>
      {fromEarth && isEarthViewTarget(stop) ? <EarthReadingPanel target={stop} /> : null}
      <div className="explore-pad">
        <PadButton label={EXPLORE.rotateLeft} icon="left" onPress={() => exploreStore.rotate(-KEY_ROTATE_STEP, 0)} />
        <PadButton label={EXPLORE.rotateUp} icon="up" onPress={() => exploreStore.rotate(0, -KEY_TILT_STEP)} />
        <PadButton label={EXPLORE.rotateDown} icon="down" onPress={() => exploreStore.rotate(0, KEY_TILT_STEP)} />
        <PadButton label={EXPLORE.rotateRight} icon="right" onPress={() => exploreStore.rotate(KEY_ROTATE_STEP, 0)} />
        <PadButton label={EXPLORE.farther} icon="farther" onPress={() => exploreStore.zoom(KEY_ZOOM_STEP)} />
        <PadButton label={EXPLORE.closer} icon="closer" onPress={() => exploreStore.zoom(-KEY_ZOOM_STEP)} />
        <PadButton label={EXPLORE.recenter} icon="recenter" onPress={() => exploreStore.recenter()} />
      </div>
    </div>
  );
}
