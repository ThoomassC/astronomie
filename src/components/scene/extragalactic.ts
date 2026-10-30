import {
  BufferAttribute,
  BufferGeometry,
  Group,
  Mesh,
  Points,
  Sphere,
  SphereGeometry,
  Vector3,
  type ShaderMaterial,
} from "three";
import type { Vec3 } from "@/lib/astro/constants";
import { COSMIC_WEB_REFERENCE_POINTS, COSMIC_WEB_SEED, cosmicWebCloud, cosmicWebLabelAnchor } from "@/lib/astro/cosmicWeb";
import { GALAXY_EXTENT_RATIO, galaxyCloud, galaxySeed } from "@/lib/astro/galaxyShapes";
import {
  galaxyCenterKly,
  galaxyLuminosity,
  galaxyRadiusKly,
  isLocalGroupGalaxyKey,
  type LocalGroupGalaxy,
  type LocalGroupGalaxyKey,
} from "@/lib/astro/localGroup";
import type { PointCloud } from "@/lib/astro/milkyWay";
import { MULTIVERSE_SEED, multiverseBubbles, type Bubble } from "@/lib/astro/multiverse";
import { OBSERVABLE_UNIVERSE_RADIUS_GLY } from "@/lib/astro/universe";
import { createBubbleMaterial, createCmbMaterial } from "./extragalacticMaterials";
import type { LayerWeights } from "./layers";
import { createPointCloudMaterial, type Uniform } from "./materials";
import { smoothstep } from "./math";

/**
 * Au-delà de la Voie lactée : les galaxies du Groupe local, la toile cosmique, le fond diffus cosmologique et les
 * autres bulles du multivers. Deux groupes, que le moteur met à l'échelle du zoom cosmique comme le ciel profond :
 * - `localGroup`, en milliers d'années-lumière (kly) : échelle unitsPerLightYear(zoom) × 1e3 ; positions < 3 100 kly ;
 * - `universe`, en milliards d'années-lumière (Gal) : échelle unitsPerLightYear(zoom) × 1e9 ; positions < 450 Gal.
 * La Voie lactée n'y est pas : son nuage existe déjà (cosmos.galaxy), seule son étiquette est décrite ici.
 *
 * Rien n'est dessiné avant les constructions (buildLocalGroup, buildUniverse), faites une fois, au repos, par le
 * moteur ; rien n'est visible avant la première pesée (weighExtragalactic).
 */

/** Étiquettes : une par galaxie (`lg:<clé>`), la toile, le fond diffus, notre univers, les autres. */
export type ExtragalacticLabelKey = `lg:${LocalGroupGalaxyKey}` | "web" | "cmb" | "our-universe" | "other-universes";

/** Ancre d'une étiquette, dans le repère de son groupe : ciel profond (al), Groupe local (kly) ou Univers (Gal). */
export interface ExtragalacticAnchor {
  group: "cosmos" | "localGroup" | "universe";
  position: Vec3;
}

/** Poids des couches extragalactiques, de 0 à 1 : galaxies du Groupe local, toile, fond diffus, autres bulles. */
export type ExtragalacticWeights = Pick<LayerWeights, "localGroup" | "web" | "cmb" | "multiverse">;

export interface ExtragalacticBody {
  /** Galaxies du Groupe local, en kly ; échelle = unitsPerLightYear(zoom) × 1e3, posée par le moteur. */
  localGroup: Group;
  /** Toile, fond diffus, bulles, en Gal ; échelle = unitsPerLightYear(zoom) × 1e9. */
  universe: Group;
  /** Une galaxie par entrée du Groupe local sauf la Voie lactée, chacune posée à son centre ; null avant buildLocalGroup. */
  galaxies: ReadonlyMap<LocalGroupGalaxyKey, Points<BufferGeometry, ShaderMaterial>> | null;
  /** null avant buildUniverse, comme le fond diffus et les bulles. */
  web: Points<BufferGeometry, ShaderMaterial> | null;
  /** Sphère de l'Univers observable, centrée sur nous. */
  cmb: Mesh<SphereGeometry, ShaderMaterial> | null;
  /** Les 14 autres bulles du multivers (la nôtre est le fond diffus). */
  bubbles: readonly Mesh<SphereGeometry, ShaderMaterial>[] | null;
  /** Ancres des étiquettes dans le repère de leur groupe ; « lg:milky-way » vit dans cosmos.group (al). */
  labelAnchors: ReadonlyMap<ExtragalacticLabelKey, ExtragalacticAnchor>;
  /** Gain des galaxies sur les valeurs affichées (1 : aucun) ; la taille à l'écran se règle par fitLocalGroup. */
  localGroupGain: Uniform<number>;
  /** Gain de la toile sur les valeurs affichées (1 : aucun) ; la taille à l'écran se règle par fitWeb. */
  webGain: Uniform<number>;
  /** Rapport de pixels du rendu, partagé avec les nuages du ciel profond (cosmos.pixelRatio). */
  pixelRatio: Uniform<number>;
  /** Galaxies décrites, Voie lactée comprise : buildLocalGroup dessine les autres. */
  members: readonly LocalGroupGalaxy[];
}

/** Points du Groupe local : 14 000 avec une souris, 7 000 sur écran tactile (téléphones, tablettes). */
export const LOCAL_GROUP_POINT_BUDGET = { fine: 14_000, coarse: 7000 } as const;
/** Points de la toile cosmique : 30 000 avec une souris, 12 000 sur écran tactile. */
export const WEB_POINT_BUDGET = { fine: COSMIC_WEB_REFERENCE_POINTS, coarse: 12_000 } as const;
/**
 * Points d'une galaxie au moins, quelle que soit sa luminosité : les naines restent visibles (une tache de
 * quelques pixels au lieu d'un ou deux points), au prix d'une lumière exagérée pour les plus faibles.
 */
export const LOCAL_GROUP_MIN_POINTS = 30;

/*
 * Niveau de détail. Le mélange additif cumule les points dans un tampon 8 bits : un point qui ajoute moins d'un
 * demi-niveau sur 255 ne laisse aucune trace, et des centaines de points serrés partent au blanc. Un simple gain
 * ne suffit donc pas quand une galaxie rapetisse à l'écran : elle passerait d'un coup du blanc au noir. Les points
 * venant dans un ordre aléatoire, le moteur n'en dessine qu'une part (setDrawRange), d'éclat inchangé : la
 * lumière suit (rayon / rayon de pleine finesse)^1,5, comme celle de la Voie lactée, sans perte ni saturation.
 */

/**
 * Rayon apparent d'Andromède grossie (px CSS) à partir duquel le Groupe local brille à plein éclat, tous ses points
 * dessinés. En dessous, sa lumière suit (rayon / 80 px)^1,5 : portée par le gain jusqu'à LOCAL_GROUP_MIN_GAIN, puis
 * par la part des points dessinés (splitLight). À l'escale, Andromède grossie fait 53 px de rayon sur grand écran
 * (lumière 0,54, tous les points) et 27 sur téléphone (gain 0,35, 57 % des points) : cœurs lumineux sans tache blanche.
 */
export const LOCAL_GROUP_FULL_LIGHT_PX = 80;
/** Gain le plus bas des galaxies du Groupe local : au-dessus du demi-niveau qu'efface le tampon 8 bits. */
export const LOCAL_GROUP_MIN_GAIN = 0.35;
/** Rayon apparent de l'Univers observable (px CSS) à partir duquel toute la toile est dessinée. */
export const WEB_FULL_DETAIL_PX = 250;
/** Points dessinés au moins par galaxie : de loin, les naines restent une petite tache. */
export const LOCAL_GROUP_MIN_DRAWN = 12;

/** Segments de la sphère des coquilles : un polygone de 64 côtés ne se voit pas, même à 260 px de rayon. */
const SHELL_SEGMENTS = { width: 64, height: 32 } as const;

/** Étiquette de la galaxie de clé `key`. */
export const galaxyLabelKey = (key: LocalGroupGalaxyKey): ExtragalacticLabelKey => `lg:${key}`;

/**
 * Galaxies nommées dans la scène, par ordre de priorité : les cinq que cadre l'escale du Groupe local. Les naines,
 * d'un pixel ou deux, se serreraient contre Andromède ou la Voie lactée ; le tableau de la plaque les nomme toutes.
 */
export const LABELLED_GALAXIES: readonly LocalGroupGalaxyKey[] = [
  "andromeda",
  "milky-way",
  "triangulum",
  "large-magellanic-cloud",
  "small-magellanic-cloud",
];

/** Étiquettes extragalactiques, dans l'ordre où le moteur les place (les premières gagnent en cas de chevauchement). */
export const EXTRAGALACTIC_LABEL_ORDER: readonly ExtragalacticLabelKey[] = [
  ...LABELLED_GALAXIES.map(galaxyLabelKey),
  "web",
  "cmb",
  "our-universe",
  "other-universes",
];

const OTHER_LABELS: readonly string[] = ["web", "cmb", "our-universe", "other-universes"];

/** Clé d'étiquette extragalactique lue dans le DOM (`data-deep`). */
export function isExtragalacticLabelKey(value: string | undefined): value is ExtragalacticLabelKey {
  if (value === undefined) return false;
  if (OTHER_LABELS.includes(value)) return true;
  return value.startsWith("lg:") && isLocalGroupGalaxyKey(value.slice(3));
}

/**
 * Bulle qui porte l'étiquette « D'autres univers ? » : la plus grande des autres, la plus facile à désigner.
 */
function labelledBubble(bubbles: readonly Bubble[]): Bubble {
  return bubbles.slice(1).reduce((best, bubble) => (bubble.radius > best.radius ? bubble : best));
}

/**
 * Rang, parmi les autres bulles (`bubbles` du corps, la nôtre exclue), de celle qui porte « D'autres univers ? » :
 * son étiquette s'efface avec elle.
 */
export function labelledBubbleIndex(): number {
  const bubbles = multiverseBubbles(MULTIVERSE_SEED);
  return bubbles.indexOf(labelledBubble(bubbles)) - 1;
}

/**
 * Ancres des étiquettes : chaque galaxie à son centre (la Voie lactée au centre galactique, en al, dans le groupe
 * du ciel profond où vit son nuage) ; la toile sur son nœud d'étiquette ; le fond diffus en haut de notre bulle,
 * « Notre univers observable » en bas ; « D'autres univers ? » au centre de la plus grande autre bulle.
 */
function labelAnchorsFor(galaxies: readonly LocalGroupGalaxy[]): Map<ExtragalacticLabelKey, ExtragalacticAnchor> {
  const anchors = new Map<ExtragalacticLabelKey, ExtragalacticAnchor>();
  for (const galaxy of galaxies) {
    const center = galaxyCenterKly(galaxy);
    anchors.set(
      galaxyLabelKey(galaxy.key),
      galaxy.key === "milky-way"
        ? { group: "cosmos", position: { x: center.x * 1000, y: center.y * 1000, z: center.z * 1000 } }
        : { group: "localGroup", position: center },
    );
  }
  const radius = OBSERVABLE_UNIVERSE_RADIUS_GLY;
  anchors.set("web", { group: "universe", position: cosmicWebLabelAnchor(COSMIC_WEB_SEED) });
  anchors.set("cmb", { group: "universe", position: { x: 0, y: radius, z: 0 } });
  anchors.set("our-universe", { group: "universe", position: { x: 0, y: -radius, z: 0 } });
  anchors.set("other-universes", { group: "universe", position: { ...labelledBubble(multiverseBubbles(MULTIVERSE_SEED)).center } });
  return anchors;
}

/**
 * Corps extragalactique vide : deux groupes, ancres des étiquettes (calculées tout de suite, sans tirer un point),
 * gains neutres. `pixelRatio` est celui des nuages du ciel profond ; `galaxies`, le Groupe local (LOCAL_GROUP).
 */
export function createExtragalactic(pixelRatio: Uniform<number>, galaxies: readonly LocalGroupGalaxy[]): ExtragalacticBody {
  return {
    localGroup: new Group(),
    universe: new Group(),
    galaxies: null,
    web: null,
    cmb: null,
    bubbles: null,
    labelAnchors: labelAnchorsFor(galaxies),
    localGroupGain: { value: 1 },
    webGain: { value: 1 },
    pixelRatio,
    members: galaxies,
  };
}

/** Nuage de points du matériau commun (materials.ts), sphère englobante posée d'emblée : rien à calculer au premier rendu. */
function pointCloud(cloud: PointCloud, pixelRatio: Uniform<number>, gain: Uniform<number>, bounds: Sphere): Points<BufferGeometry, ShaderMaterial> {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(cloud.positions, 3));
  geometry.setAttribute("color", new BufferAttribute(cloud.colors, 3));
  geometry.setAttribute("size", new BufferAttribute(cloud.sizes, 1));
  geometry.boundingSphere = bounds;
  const points = new Points(geometry, createPointCloudMaterial(pixelRatio, gain).material);
  // Rien n'est dessiné avant que le moteur ne pèse la couche.
  points.visible = false;
  return points;
}

/**
 * Répartition du budget : LOCAL_GROUP_MIN_POINTS par galaxie (moins si le budget ne le permet pas), le reste en
 * proportion de la luminosité, arrondi par la méthode des plus forts restes : la somme vaut exactement le budget.
 */
function pointShares(galaxies: readonly LocalGroupGalaxy[], budget: number): number[] {
  const floor = Math.min(LOCAL_GROUP_MIN_POINTS, Math.floor(budget / galaxies.length));
  const shared = budget - floor * galaxies.length;
  const luminosities = galaxies.map((galaxy) => galaxyLuminosity(galaxy) ?? 0);
  const total = luminosities.reduce((sum, luminosity) => sum + luminosity, 0);
  const exact = luminosities.map((luminosity) => (total > 0 ? (shared * luminosity) / total : shared / galaxies.length));
  const counts = exact.map(Math.floor);
  const byRemainder = exact.map((value, i) => ({ i, rest: value - counts[i] })).sort((a, b) => b.rest - a.rest);
  let left = shared - counts.reduce((sum, count) => sum + count, 0);
  for (const { i } of byRemainder) {
    if (left <= 0) break;
    counts[i] += 1;
    left -= 1;
  }
  return counts.map((count) => floor + count);
}

/**
 * Construit les galaxies du Groupe local (sauf la Voie lactée, déjà dessinée) et les range dans `localGroup`,
 * chacune à son centre ; sans effet si elles existent déjà. Budget partagé selon pointShares ; toutes reçoivent le
 * même éclat par point (14 000 / budget), leur lumière suit donc leur luminosité sur tous les appareils.
 */
export function buildLocalGroup(body: ExtragalacticBody, budget: number): void {
  if (body.galaxies) return;
  const drawn = body.members.filter((galaxy) => galaxy.key !== "milky-way");
  const counts = pointShares(drawn, budget);
  const glow = LOCAL_GROUP_POINT_BUDGET.fine / budget;
  const galaxies = new Map<LocalGroupGalaxyKey, Points<BufferGeometry, ShaderMaterial>>();
  drawn.forEach((galaxy, i) => {
    const cloud = galaxyCloud(galaxy, counts[i], galaxySeed(galaxy.key), glow);
    const bounds = new Sphere(new Vector3(), GALAXY_EXTENT_RATIO * galaxyRadiusKly(galaxy));
    const points = pointCloud(cloud, body.pixelRatio, body.localGroupGain, bounds);
    const center = galaxyCenterKly(galaxy);
    points.position.set(center.x, center.y, center.z);
    body.localGroup.add(points);
    galaxies.set(galaxy.key, points);
  });
  body.galaxies = galaxies;
}

/**
 * Construit la toile cosmique (`webBudget` points), le fond diffus (sphère de l'Univers observable) et les 14 autres
 * bulles du multivers, rangés dans `universe` ; sans effet s'ils existent déjà. Les coquilles partagent une sphère
 * unité, mise à l'échelle par chaque maillage ; chaque bulle a son opacité (elle s'efface seule en sortant de
 * l'espace libre, fitShells), toutes le même programme.
 */
export function buildUniverse(body: ExtragalacticBody, webBudget: number): void {
  if (body.web) return;
  const radius = OBSERVABLE_UNIVERSE_RADIUS_GLY;
  const web = pointCloud(cosmicWebCloud(webBudget, COSMIC_WEB_SEED), body.pixelRatio, body.webGain, new Sphere(new Vector3(), radius));
  const sphere = new SphereGeometry(1, SHELL_SEGMENTS.width, SHELL_SEGMENTS.height);
  const cmb = new Mesh(sphere, createCmbMaterial().material);
  cmb.scale.setScalar(radius);
  cmb.visible = false;
  const bubbles = multiverseBubbles(MULTIVERSE_SEED)
    .slice(1)
    .map((bubble) => {
      const mesh = new Mesh(sphere, createBubbleMaterial(bubble.hue, { value: 1 }).material);
      mesh.position.set(bubble.center.x, bubble.center.y, bubble.center.z);
      mesh.scale.setScalar(bubble.radius);
      mesh.visible = false;
      return mesh;
    });
  body.universe.add(web, cmb, ...bubbles);
  body.web = web;
  body.cmb = cmb;
  body.bubbles = bubbles;
}

/**
 * Part des points à dessiner pour un rayon apparent : min(1, (rayon / rayon de pleine finesse)^1,5) ; 1 pour un
 * rayon infini (caméra dedans), 0 pour un rayon nul, négatif ou indéfini.
 */
export function detailFraction(radiusPx: number, fullDetailPx: number): number {
  if (!(radiusPx > 0)) return 0;
  return Math.min(1, (radiusPx / fullDetailPx) ** 1.5);
}

/**
 * Partage d'une lumière (de 0 à 1, rapportée à celle de pleine finesse) entre gain et part des points dessinés : le
 * gain la porte seul tant qu'il reste au-dessus de `minGain` (tous les points dessinés, comme avant) ; en dessous, il
 * s'arrête à `minGain` et la part des points dessinés fait le reste (gain × part = lumière). Chaque point reste ainsi
 * au-dessus du demi-niveau que le tampon 8 bits efface. Lumière nulle ou indéfinie : rien de dessiné.
 */
export function splitLight(light: number, minGain: number): { gain: number; fraction: number } {
  if (!(light > 0)) return { gain: minGain, fraction: 0 };
  return light >= minGain ? { gain: light, fraction: 1 } : { gain: minGain, fraction: light / minGain };
}

/** Dessine les `count` premiers points du nuage (tous au-delà de son effectif). */
function drawFirst(points: Points<BufferGeometry, ShaderMaterial>, count: number): void {
  points.geometry.setDrawRange(0, Math.min(count, points.geometry.getAttribute("position").count));
}

/**
 * Lumière du Groupe local, d'après le rayon apparent d'Andromède grossie (px CSS, mesuré par le moteur à la distance
 * de son centre ; Infinity quand la caméra est dedans) : min(1, (rayon / LOCAL_GROUP_FULL_LIGHT_PX)^1,5), partagée
 * entre le gain commun (jusqu'à LOCAL_GROUP_MIN_GAIN) et la part de points que dessine chaque galaxie, au moins
 * LOCAL_GROUP_MIN_DRAWN. Les proportions de lumière entre galaxies restent celles de leurs luminosités. Sans effet
 * avant buildLocalGroup.
 */
export function fitLocalGroup(body: ExtragalacticBody, andromedaRadiusPx: number): void {
  if (!body.galaxies) return;
  const light = andromedaRadiusPx > 0 ? Math.min(1, (andromedaRadiusPx / LOCAL_GROUP_FULL_LIGHT_PX) ** 1.5) : 0;
  const { gain, fraction } = splitLight(light, LOCAL_GROUP_MIN_GAIN);
  body.localGroupGain.value = gain;
  for (const points of body.galaxies.values()) {
    const total = points.geometry.getAttribute("position").count;
    drawFirst(points, Math.max(LOCAL_GROUP_MIN_DRAWN, Math.round(fraction * total)));
  }
}

/**
 * Grossit chaque galaxie du Groupe local de `magnification` autour de son centre (1 : vraie taille), comme la Voie
 * lactée (magnifyGalaxy) : les distances ne changent pas. Sans effet avant buildLocalGroup.
 */
export function magnifyLocalGroup(body: ExtragalacticBody, magnification: number): void {
  if (!body.galaxies) return;
  for (const points of body.galaxies.values()) points.scale.setScalar(magnification);
}

/**
 * Niveau de détail de la toile, d'après le rayon apparent de l'Univers observable (px CSS ; Infinity quand la
 * caméra est dedans) : part des points selon detailFraction. Sans effet avant buildUniverse.
 */
export function fitWeb(body: ExtragalacticBody, universeRadiusPx: number): void {
  if (!body.web) return;
  const total = body.web.geometry.getAttribute("position").count;
  drawFirst(body.web, Math.round(detailFraction(universeRadiusPx, WEB_FULL_DETAIL_PX) * total));
}

/** Fondu d'un nuage ou d'une coquille : opacité = poids ; à poids nul, plus aucun appel de dessin. */
function weigh(object: Points<BufferGeometry, ShaderMaterial> | Mesh<SphereGeometry, ShaderMaterial>, weight: number): void {
  object.material.uniforms.uOpacity.value = weight;
  object.visible = weight > 0;
}

/**
 * Opacités et visibilités selon les poids : galaxies ← `localGroup`, toile ← `web`, fond diffus ← `cmb`, autres
 * bulles ← `multiverse`. Poids nul ⇒ `visible = false`. Sans effet sur ce qui n'est pas encore construit.
 */
export function weighExtragalactic(body: ExtragalacticBody, weights: ExtragalacticWeights): void {
  if (body.galaxies) for (const points of body.galaxies.values()) weigh(points, weights.localGroup);
  if (body.web) weigh(body.web, weights.web);
  if (body.cmb) weigh(body.cmb, weights.cmb);
  if (body.bubbles) for (const bubble of body.bubbles) weigh(bubble, weights.multiverse);
}

/**
 * Débord (px CSS) au-delà duquel une coquille a disparu : la marge entre la zone libre et la règle (ZONE_MARGIN_PX de
 * screenLayout). Le fond diffus ou une bulle qui sort de l'espace libre s'efface avant de toucher la plaque ou la
 * règle.
 */
export const SHELL_FIT_MARGIN_PX = 24;

/** Espace libre de l'écran, en px CSS depuis le coin haut gauche : zone du grand écran, bande du téléphone, écran. */
export interface ScreenBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * Part visible d'une coquille dans l'espace libre `free`, d'après son centre projeté (`x`, `y`) et son rayon apparent
 * (`radius`), en px CSS : 1 tant qu'elle y tient, 0 dès qu'elle en déborde de SHELL_FIT_MARGIN_PX, d'un côté ou d'un
 * autre ; 0 quand la caméra est dedans (rayon infini) ou qu'elle est derrière (centre ou rayon indéfini).
 */
export function shellFit(x: number, y: number, radius: number, free: ScreenBox): number {
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(radius) || radius < 0) return 0;
  const overflow = Math.max(
    free.left - (x - radius),
    x + radius - free.right,
    free.top - (y - radius),
    y + radius - free.bottom,
    0,
  );
  return 1 - smoothstep(0, SHELL_FIT_MARGIN_PX, overflow);
}

/**
 * Pèse les coquilles selon la part qui tient dans l'espace libre : fond diffus ← cmb × `cmbFit`, bulle i ← multivers
 * × `bubbleFits[i]` (1 sans valeur). Remplace leur pesée par weighExtragalactic pour l'image en cours. Sans effet
 * avant buildUniverse.
 */
export function fitShells(
  body: ExtragalacticBody,
  weights: Pick<ExtragalacticWeights, "cmb" | "multiverse">,
  cmbFit: number,
  bubbleFits: readonly number[],
): void {
  if (body.cmb) weigh(body.cmb, weights.cmb * cmbFit);
  body.bubbles?.forEach((bubble, i) => weigh(bubble, weights.multiverse * (bubbleFits[i] ?? 1)));
}
