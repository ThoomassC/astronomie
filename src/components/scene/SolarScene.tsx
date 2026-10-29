"use client";

import { useEffect, useRef } from "react";
import { cssVars } from "@/components/journey/cssVars";
import { RAIL_ID } from "@/components/journey/ids";
import { goTo, isStopKey } from "@/components/journey/navigation";
import { useRealScale } from "@/components/journey/realScale";
import { DEEP_SKY_LABELS } from "@/content/site";
import { PLANETS, SUN } from "@/lib/astro/planets";
import { spectralColor } from "@/lib/astro/starMap";
import { NEARBY_STARS } from "@/lib/astro/stars";
import { formatNumber } from "@/lib/format";
import type { StopKey } from "@/lib/journey/camera";
import { FRAME_ORDER, useFrame } from "@/lib/sim/frameLoop";
import { DISTANCE_RINGS_LY, isDeepLabelKey, ringLabelKey, starLabelKey, type DeepLabelKey } from "./cosmos";
import { createSolarScene, type BodyKey, type SolarScene as SceneEngine } from "./engine";
import { setSceneFallback } from "./fallback";

const LABELS: readonly { key: BodyKey; name: string; color: string }[] = [
  { key: "sun", name: SUN.name, color: SUN.color },
  ...PLANETS.map((planet) => ({ key: planet.key, name: planet.name, color: planet.color })),
];

const isBodyKey = (value: string | undefined): value is BodyKey => LABELS.some((label) => label.key === value);

interface DeepLabel {
  key: DeepLabelKey;
  text: string;
  /** Précision qui suit le nom (« · 4,2 al ») ; la scène la retire quand le nom seul tient. */
  detail?: string;
  variant?: "here" | "center" | "ring";
  color?: string;
}

/**
 * Étiquettes du ciel profond : étoiles voisines (nom et distance, repère de la couleur du point), « Vous êtes
 * ici », centre galactique, cercles de distance. Non interactives : la plaque des étoiles en donne la liste.
 */
const DEEP_LABELS: readonly DeepLabel[] = [
  ...NEARBY_STARS.map((star) => ({
    key: starLabelKey(star.key),
    text: star.name,
    detail: ` · ${formatNumber(star.distanceLy, 1)} al`,
    color: spectralColor(star.spectralType),
  })),
  { key: "here", text: DEEP_SKY_LABELS.here, variant: "here" },
  { key: "center", text: DEEP_SKY_LABELS.center, variant: "center" },
  ...DISTANCE_RINGS_LY.map((radius) => ({ key: ringLabelKey(radius), text: `${radius} al`, variant: "ring" as const })),
];

/**
 * Scène 3D en fond fixe et étiquettes des astres. Chargée uniquement dans le navigateur
 * (voir SceneMount) ; le moteur Three vit hors de React et rend dans la boucle commune.
 */
export default function SolarScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<SceneEngine | null>(null);
  const realScale = useRealScale();

  useEffect(() => {
    const canvas = canvasRef.current;
    const labelLayer = labelsRef.current;
    if (!canvas || !labelLayer) return;
    const labels = new Map<BodyKey, HTMLElement>();
    for (const element of labelLayer.querySelectorAll<HTMLElement>("[data-body]")) {
      const key = element.dataset.body;
      if (isBodyKey(key)) labels.set(key, element);
    }
    const deepLabels = new Map<DeepLabelKey, HTMLElement>();
    for (const element of labelLayer.querySelectorAll<HTMLElement>("[data-deep]")) {
      const key = element.dataset.deep;
      if (isDeepLabelKey(key)) deepLabels.set(key, element);
    }
    const plates = new Map<StopKey, HTMLElement>();
    for (const plate of document.querySelectorAll<HTMLElement>("[data-stop] > .plate")) {
      const key = plate.parentElement?.dataset.stop;
      if (isStopKey(key)) plates.set(key, plate);
    }
    const rail = document.getElementById(RAIL_ID);
    const engine = createSolarScene({
      canvas,
      labels,
      obstacles: rail ? [rail] : [],
      plates,
      bar: document.querySelector(".bar"),
      rail,
      note: document.querySelector<HTMLElement>(".scale-note"),
      deepLabels,
      onPick: goTo,
    });
    if (engine) engineRef.current = engine;
    else setSceneFallback("webgl", true);
    return () => {
      engineRef.current = null;
      engine?.dispose();
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
      console.error("Scène 3D arrêtée", error);
    }
  }, FRAME_ORDER.scene);

  return (
    <>
      <canvas id="sky" ref={canvasRef} aria-hidden="true" />
      {/*
        Raccourcis pour la souris et le doigt, hors de l'ordre de tabulation et du lecteur
        d'écran : la règle des distances offre la même navigation au clavier. Les étiquettes
        du ciel profond ne sont que des repères : la plaque des étoiles en donne la liste.
        Masquées (visibility) jusqu'à leur premier placement par le moteur.
      */}
      <div id="labels" ref={labelsRef} className={realScale ? "real" : undefined} aria-hidden="true">
        {LABELS.map(({ key, name, color }) => (
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
            <span>{name}</span>
          </button>
        ))}
        {DEEP_LABELS.map(({ key, text, detail, variant, color }) => (
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
