"use client";

import dynamic from "next/dynamic";

/** Three.js ne s'exécute que dans le navigateur : la scène n'est ni prérendue ni hydratée. */
const SolarScene = dynamic(() => import("./SolarScene"), { ssr: false });

export function SceneMount() {
  return <SolarScene />;
}
