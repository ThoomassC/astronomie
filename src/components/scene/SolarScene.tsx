"use client";

import { useEffect, useRef } from "react";
import { cssVars } from "@/components/journey/cssVars";
import { goTo } from "@/components/journey/navigation";
import { useRealScale } from "@/components/journey/realScale";
import { stopColor } from "@/components/journey/stopMeta";
import { useLocale } from "@/i18n/LocaleProvider";
import type { Locale } from "@/i18n/locales";
import { bodyName } from "@/i18n/names";
import { PLANETS, SUN } from "@/lib/astro/planets";
import { spectralColor } from "@/lib/astro/starMap";
import { NEARBY_STARS } from "@/lib/astro/stars";
import { exploreStore } from "@/lib/journey/explore";
import { FRAME_ORDER, useFrame } from "@/lib/sim/frameLoop";
import { DISTANCE_RINGS_LY, isDeepLabelKey, ringLabelKey, starLabelKey, type DeepLabelKey } from "./cosmos";
import { DEEP_SKY_STRINGS } from "./deepSky.strings";
import { createSolarScene, type BodyKey, type SolarScene as SceneEngine } from "./engine";
import {
  LABELLED_GALAXIES,
  galaxyLabelKey,
  isExtragalacticLabelKey,
  type ExtragalacticLabelKey,
} from "./extragalactic";
import { setSceneFallback } from "./fallback";
import { shownJourneyLayout } from "./sceneElements";

/** Astres étiquetés, couleur de leur repère ; leur nom vient de `bodyName`, dans la langue de la page. */
const BODIES: readonly { key: BodyKey; color: string }[] = [
  { key: "sun", color: SUN.color },
  ...PLANETS.map((planet) => ({ key: planet.key, color: planet.color })),
];

const isBodyKey = (value: string | undefined): value is BodyKey => BODIES.some((body) => body.key === value);

interface DeepLabel {
  key: DeepLabelKey | ExtragalacticLabelKey;
  text: string;
  /** Précision qui suit le nom (« · 4,2 al ») ; la scène la retire quand le nom seul tient. */
  detail?: string;
  /** `minor` : étoile peu connue, son nom seul, plus discret (la plaque donne sa distance). */
  variant?: "here" | "center" | "ring" | "galaxy" | "hypothesis" | "minor";
  /** Couleur du repère (`--lc`) : celle du point de l'étoile, ou celle de l'escale au-delà de la Voie lactée. */
  color?: string;
}

/**
 * Étiquettes du ciel profond, dans la langue de la page : étoiles voisines (repère de la couleur du point ; nom et
 * distance des remarquables, nom seul et plus discret des autres), « Vous êtes ici », centre galactique, galaxies
 * cadrées au Groupe local, toile, fond diffus, notre univers et les autres (une hypothèse, dite dans l'étiquette),
 * cercles de distance. Non interactives : les plaques des étoiles et du Groupe local en donnent la liste.
 */
function deepLabels(locale: Locale): DeepLabel[] {
  const { starNames, galaxyNames, labels, ring, starDistance } = DEEP_SKY_STRINGS[locale];
  const universe = stopColor("universe");
  return [
    ...NEARBY_STARS.map(
      (star): DeepLabel => ({
        key: starLabelKey(star.key),
        text: starNames[star.key],
        ...(star.notable ? { detail: starDistance(star.distanceLy) } : { variant: "minor" }),
        color: spectralColor(star.spectralType),
      }),
    ),
    { key: "here", text: labels.here, variant: "here" },
    { key: "center", text: labels.center, variant: "center" },
    ...LABELLED_GALAXIES.map((galaxy) => ({
      key: galaxyLabelKey(galaxy),
      text: galaxyNames[galaxy],
      variant: "galaxy" as const,
      color: stopColor("localGroup"),
    })),
    { key: "web", text: labels.web, color: universe },
    { key: "cmb", text: labels.cmb, color: universe },
    { key: "our-universe", text: labels.ourUniverse, color: universe },
    { key: "other-universes", text: labels.otherUniverses, variant: "hypothesis", color: stopColor("multiverse") },
    ...DISTANCE_RINGS_LY.map((radius) => ({ key: ringLabelKey(radius), text: ring(radius), variant: "ring" as const })),
  ];
}

/**
 * Scène 3D en fond fixe et étiquettes des astres. Chargée uniquement dans le navigateur
 * (voir SceneMount) ; le moteur Three vit hors de React et rend dans la boucle commune.
 * Sans scène (pas de WebGL, erreur, contexte perdu, démontage), on ne tourne plus autour de rien :
 * l'exploration prend fin et rend la page, sans quoi le contenu resterait masqué et inerte.
 */
export default function SolarScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<SceneEngine | null>(null);
  const realScale = useRealScale();
  const locale = useLocale();

  useEffect(() => {
    const canvas = canvasRef.current;
    const labelLayer = labelsRef.current;
    if (!canvas || !labelLayer) return;
    const labels = new Map<BodyKey, HTMLElement>();
    for (const element of labelLayer.querySelectorAll<HTMLElement>("[data-body]")) {
      const key = element.dataset.body;
      if (isBodyKey(key)) labels.set(key, element);
    }
    const deepLabelElements = new Map<DeepLabelKey | ExtragalacticLabelKey, HTMLElement>();
    for (const element of labelLayer.querySelectorAll<HTMLElement>("[data-deep]")) {
      const key = element.dataset.deep;
      if (isDeepLabelKey(key) || isExtragalacticLabelKey(key)) deepLabelElements.set(key, element);
    }
    // Seulement la page affichée : Next garde dans le DOM, masquées, des pages quittées (Tailles et sa règle).
    // Obstacles des étiquettes : la règle, et les fondus sous la barre et sous le dock (texte voilé).
    const { bar, rail, note, plates, obstacles } = shownJourneyLayout();
    const engine = createSolarScene({
      canvas,
      labels,
      obstacles,
      plates,
      bar,
      rail,
      note,
      deepLabels: deepLabelElements,
      onPick: goTo,
    });
    if (engine) {
      engineRef.current = engine;
    } else {
      setSceneFallback("webgl", true);
      exploreStore.exit();
    }
    // Contexte WebGL perdu (GPU réinitialisé, onglet repris) : plus d'image jusqu'à sa restauration.
    const leaveExploration = () => exploreStore.exit();
    canvas.addEventListener("webglcontextlost", leaveExploration);
    return () => {
      canvas.removeEventListener("webglcontextlost", leaveExploration);
      engineRef.current = null;
      engine?.dispose();
      exploreStore.exit();
      setSceneFallback("webgl", false);
      setSceneFallback("runtime", false);
    };
  }, []);

  useFrame((dt) => {
    const engine = engineRef.current;
    if (!engine) return;
    try {
      engine.frame(dt);
    } catch (error) {
      // La scène s'arrête seule et passe au repli CSS ; le reste de la page continue.
      engineRef.current = null;
      engine.dispose();
      setSceneFallback("runtime", true);
      exploreStore.exit();
      console.error("Scène 3D arrêtée", error);
    }
  }, FRAME_ORDER.scene);

  return (
    <>
      <canvas id="sky" ref={canvasRef} aria-hidden="true" />
      {/*
        Raccourcis pour la souris et le doigt, hors de l'ordre de tabulation et du lecteur
        d'écran : la règle des distances offre la même navigation au clavier. Les étiquettes
        du ciel profond ne sont que des repères : les plaques des étoiles et du Groupe local en
        donnent la liste. Masquées (visibility) jusqu'à leur premier placement par le moteur.
        Les textes suivent la langue de la page ; le moteur ne garde que les éléments.
      */}
      <div id="labels" ref={labelsRef} className={realScale ? "real" : undefined} aria-hidden="true">
        {BODIES.map(({ key, color }) => (
          <button
            key={key}
            type="button"
            tabIndex={-1}
            className="lbl"
            data-body={key}
            style={cssVars({ "--lc": color })}
            onClick={() => goTo(key)}
          >
            <i />
            <span>{bodyName(key, locale)}</span>
          </button>
        ))}
        {deepLabels(locale).map(({ key, text, detail, variant, color }) => (
          <span
            key={key}
            className={variant ? `lbl deep ${variant}` : "lbl deep"}
            data-deep={key}
            style={color ? cssVars({ "--lc": color }) : undefined}
          >
            <i />
            <span>
              {text}
              {detail ? <span className="dist">{detail}</span> : null}
            </span>
          </span>
        ))}
      </div>
    </>
  );
}
