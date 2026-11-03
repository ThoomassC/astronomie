"use client";

import dynamic from "next/dynamic";

/** Three.js ne s'exécute que dans le navigateur : la scène des tailles n'est ni prérendue ni hydratée. */
const SizesScene = dynamic(() => import("./SizesScene"), { ssr: false });

export function SizesSceneMount() {
  return <SizesScene />;
}
