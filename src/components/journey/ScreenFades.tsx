"use client";

import { useLayoutEffect } from "react";

/** Marque posée sur <html> tant que les fondus sont affichés : les marges de défilement leur font place (globals.css). */
const FADES_ATTRIBUTE = "data-fades";

/**
 * Fondus fixes du voyage, décoratifs : sous la barre haute, de la nuit vers le transparent, et sous le dock du temps, du
 * transparent vers la nuit. Le texte d'une plaque qui passe dessous s'efface au lieu de croiser la marque ou d'être
 * tranché par le dock. Grand écran seulement, effacés pendant l'exploration (globals.css). La page les déclare sur
 * <html>, avant la peinture : ce qui reçoit le focus s'arrête avant eux. Une page quittée, que Next garde masquée sous
 * <Activity>, nettoie ses effets et retire la marque ; sans JavaScript, ni marque ni fondus.
 */
export function ScreenFades() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.toggleAttribute(FADES_ATTRIBUTE, true);
    return () => root.removeAttribute(FADES_ATTRIBUTE);
  }, []);
  return (
    <>
      <div className="bar-fade" aria-hidden="true" data-hide-on-explore />
      <div className="dock-fade" aria-hidden="true" data-hide-on-explore />
    </>
  );
}
