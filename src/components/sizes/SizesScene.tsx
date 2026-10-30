"use client";

import { useEffect, useRef } from "react";
import { cssVars } from "@/components/journey/cssVars";
import { setSceneFallback } from "@/components/scene/fallback";
import { useLocale } from "@/i18n/LocaleProvider";
import { COMPARED_STARS, type SizeStarKey } from "@/lib/astro/starSizes";
import { FRAME_ORDER, useFrame } from "@/lib/sim/frameLoop";
import { shownSceneLayout } from "./sceneElements";
import { SIZES_STRINGS } from "./sizes.strings";
import { createSizesScene, type SizesScene as SceneEngine } from "./sizesEngine";
import styles from "./SizesPage.module.css";

const isStarKey = (value: string | undefined): value is SizeStarKey => COMPARED_STARS.some((star) => star.key === value);

/** Éléments `[data-name]` de la couche, rangés par clé d'étoile. */
function labelsBy(layer: HTMLElement, attribute: "ring" | "limb"): Map<SizeStarKey, HTMLElement> {
  const labels = new Map<SizeStarKey, HTMLElement>();
  for (const element of layer.querySelectorAll<HTMLElement>(`[data-${attribute}]`)) {
    const key = element.dataset[attribute];
    if (isStarKey(key)) labels.set(key, element);
  }
  return labels;
}

/**
 * Scène 3D de la page « Tailles » en fond fixe, ses étiquettes et l'échelle graphique, tous décoratifs
 * (`aria-hidden`) : les plaques portent les noms et les nombres. Chargée uniquement dans le navigateur (voir
 * SizesSceneMount) ; le moteur Three vit hors de React et rend dans la boucle commune. Sans WebGL, après une erreur,
 * ou au démontage, la page passe au repli sans scène (`no3d`), puis le retire.
 */
export default function SizesScene() {
  const locale = useLocale();
  const t = SIZES_STRINGS[locale];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<SceneEngine | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const layer = labelsRef.current;
    const scale = scaleRef.current;
    if (!canvas || !layer) return;
    const scaleSun = scale?.querySelector<HTMLElement>("[data-scale-sun]");
    const scaleLine = scale?.querySelector<HTMLElement>("[data-scale-line]");
    const scaleText = scale?.querySelector<HTMLElement>("[data-scale-text]");
    const engine = createSizesScene({
      canvas,
      ringLabels: labelsBy(layer, "ring"),
      limbLabels: labelsBy(layer, "limb"),
      sunMarker: layer.querySelector<HTMLElement>("[data-sun-here]"),
      scaleBar: scale && scaleSun && scaleLine && scaleText ? { root: scale, sun: scaleSun, line: scaleLine, text: scaleText } : null,
      scaleText: t.scaleBar,
      // Seulement la page affichée : Next garde dans le DOM, masquées, des pages quittées (le Voyage).
      layout: shownSceneLayout(),
    });
    if (engine) engineRef.current = engine;
    else setSceneFallback("webgl", true);
    return () => {
      engineRef.current = null;
      engine?.dispose();
      setSceneFallback("webgl", false);
      setSceneFallback("runtime", false);
    };
  }, [t]);

  useFrame((dt) => {
    const engine = engineRef.current;
    if (!engine) return;
    try {
      engine.frame(dt);
    } catch (error) {
      // La scène s'arrête seule et passe au repli ; le reste de la page continue.
      engineRef.current = null;
      engine.dispose();
      setSceneFallback("runtime", true);
      console.error("Scène 3D des tailles arrêtée", error);
    }
  }, FRAME_ORDER.scene);

  const sunName = t.names.sun;
  return (
    <>
      <canvas id="sky" ref={canvasRef} aria-hidden="true" />
      {/* Masquées (visibility) jusqu'à leur premier placement par le moteur. */}
      <div id="labels" ref={labelsRef} aria-hidden="true">
        {COMPARED_STARS.map((star) => (
          <span key={star.key} className="lbl deep" data-ring={star.key} style={cssVars({ "--lc": star.color })}>
            <i />
            <span>
              {t.names[star.key]}
              <span className="dist"> · {t.radius(star.radiusSolar)}</span>
            </span>
          </span>
        ))}
        {COMPARED_STARS.map((star) => (
          <span key={`${star.key}-limb`} className={`lbl deep ${styles.limbLabel}`} data-limb={star.key}>
            <span>
              {t.names[star.key]} · {t.radius(star.radiusSolar)}
            </span>
          </span>
        ))}
        <span className="lbl deep here" data-sun-here="">
          <i />
          <span>
            {sunName}
            <span className="dist"> · {t.radius(1)}</span>
          </span>
        </span>
      </div>
      <div ref={scaleRef} className={styles.scaleBar} aria-hidden="true">
        <div className={styles.scaleRow}>
          <span className={styles.scaleSun} data-scale-sun="" data-mode="ring" />
          <span className={styles.scaleTrack}>
            <span className={styles.scaleLine} data-scale-line="" />
          </span>
        </div>
        <p className={styles.scaleText} data-scale-text="" />
      </div>
    </>
  );
}
