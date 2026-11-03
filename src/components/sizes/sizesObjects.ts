import { Group, PlaneGeometry, SphereGeometry, type Camera } from "three";
import { BLACK_HOLE_LOOKS, createBlackHoleMesh, type BlackHoleLookName, type BlackHoleMesh } from "@/components/scene/blackHole";
import type { Uniform } from "@/components/scene/materials";
import { MAX_STARFIELD_LENSES, type StarfieldLens, type StarfieldUniforms } from "@/components/scene/starfield";
import type { BlackHoleKey } from "@/lib/astro/blackHoles";
import type { PlacedObject } from "@/lib/sizes/layout";
import { BLACK_HOLE_EXTENT_RS, type ComparedObject } from "@/lib/sizes/objects";
import { haloOpacity, visibleObjectCount } from "@/lib/sizes/sizesCamera";
import { createStarMesh, type SizesStarMesh, type SunSpots } from "./starMeshes";

/*
 * Adaptateur commun du moteur des tailles : un maillage par astre, étoile (starMeshes.ts) ou trou noir (blackHole.ts),
 * alignés sur la disposition. Il dit lesquels sont dessinés à chaque image, avec quelle opacité (fondu d'arrivée,
 * effacement près de la règle), et quelles lentilles les trous noirs dessinés imposent au fond étoilé.
 */

/** Un astre de la scène : étoile (corps, halo, surface) ou trou noir (rectangle de lancer de rayons). */
export type SizesObjectMesh = ({ kind: "star" } & SizesStarMesh) | { kind: "black-hole"; key: BlackHoleKey; hole: BlackHoleMesh };

/** Aspect de chaque trou noir : binaire X, anneau ténu, anneau et jet, trou noir dormant. */
export const BLACK_HOLE_LOOK_OF: Readonly<Record<BlackHoleKey, BlackHoleLookName>> = {
  "cygnus-x-1": "x-ray-binary",
  "sagittarius-a-star": "faint-ring",
  "m87-star": "jet-ring",
  "cosmic-horseshoe": "dormant",
};

/** Sous ce rayon apparent d'encombrement, en px, un trou noir n'est pas dessiné : son étiquette à anneau le marque. */
const HIDDEN_BLACK_HOLE_PX = 0.5;

/**
 * Un maillage par astre, alignés sur `placed` (même ordre que `objects`, celui de COMPARED_OBJECTS), dans un seul
 * groupe : étoiles par createStarMesh (une sphère et un carré partagés), trous noirs par createBlackHoleMesh, à leur
 * aspect (BLACK_HOLE_LOOK_OF) et leur encombrement (BLACK_HOLE_EXTENT_RS), qui lisent les uniformes du ciel du fond
 * (`starfield`). Au départ, seul le plus petit est dessiné.
 */
export function createSizesObjects(
  objects: readonly ComparedObject[],
  placed: readonly PlacedObject[],
  options: { time: Uniform<number>; lite: boolean; sunSpots: SunSpots | null; starfield: StarfieldUniforms },
): { group: Group; items: SizesObjectMesh[] } {
  const { time, lite, sunSpots, starfield } = options;
  const group = new Group();
  const sphere = new SphereGeometry(1, 96, 64);
  const square = new PlaneGeometry(2, 2);
  const items = placed.map((place, i): SizesObjectMesh => {
    const object = objects[i];
    if (object.kind === "star") {
      const star = createStarMesh(object, place, { time, lite, sunSpots, sphere, square });
      group.add(star.body, star.halo);
      return { kind: "star", ...star };
    }
    const hole = createBlackHoleMesh({
      look: BLACK_HOLE_LOOKS[BLACK_HOLE_LOOK_OF[object.key]],
      radius: object.radiusSolar,
      extentRs: BLACK_HOLE_EXTENT_RS[object.key],
      time,
      starfield,
      lite,
    });
    hole.mesh.position.x = place.x;
    group.add(hole.mesh);
    return { kind: "black-hole", key: object.key, hole };
  });
  showObjects(items, 0, 0, 0);
  return { group, items };
}

/**
 * Astres dessinés pendant le vol `fromIndex` → `toIndex` à l'avancement `t` (visibleObjectCount), et leur opacité : fondu
 * d'arrivée (haloOpacity : le halo d'une étoile, tout un trou noir) × effacement près de la règle (`fits[i]`, 1 par
 * défaut), qui s'applique aussi au corps d'une étoile. Un astre effacé tout à fait n'est pas dessiné, ni un trou noir de
 * moins d'un demi-pixel (`radiiPx[i]`, rayon apparent de son encombrement) ; un halo éteint non plus.
 */
export function showObjects(
  items: readonly SizesObjectMesh[],
  fromIndex: number,
  toIndex: number,
  t: number,
  fits?: readonly number[],
  radiiPx?: readonly number[],
): void {
  const count = visibleObjectCount(fromIndex, toIndex, t);
  items.forEach((item, i) => {
    const fit = fits?.[i] ?? 1;
    const shown = i < count && fit > 0;
    const fade = shown ? haloOpacity(i, fromIndex, toIndex, t) : 0;
    if (item.kind === "star") {
      item.body.visible = shown;
      item.surface.uOpacity.value = fit;
      item.haloOpacity.value = fade * fit;
      item.halo.visible = item.haloOpacity.value > 0;
      return;
    }
    const tiny = (radiiPx?.[i] ?? Infinity) < HIDDEN_BLACK_HOLE_PX;
    item.hole.mesh.visible = shown && !tiny;
    item.hole.opacity.value = fade * fit;
  });
}

/**
 * Avant le rendu, après showObjects : chaque trou noir dessiné suit la caméra (BlackHoleMesh.update, matrices du monde à
 * jour) ; renvoie ses lentilles pour le fond (`starfield.setLenses`), les plus grandes à l'écran d'abord (`radiiPx`),
 * MAX_STARFIELD_LENSES au plus, de la force de son opacité.
 */
export function updateBlackHoles(items: readonly SizesObjectMesh[], camera: Camera, radiiPx: readonly number[]): StarfieldLens[] {
  const drawn: { lens: StarfieldLens; size: number }[] = [];
  items.forEach((item, i) => {
    if (item.kind !== "black-hole" || !item.hole.mesh.visible) return;
    item.hole.update(camera);
    drawn.push({ lens: { cameraLocal: item.hole.cameraLocal, strength: item.hole.opacity.value }, size: radiiPx[i] ?? 0 });
  });
  return drawn
    .sort((a, b) => b.size - a.size)
    .slice(0, MAX_STARFIELD_LENSES)
    .map(({ lens }) => lens);
}
