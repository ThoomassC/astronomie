/*
 * Parcours au défilement : une section par escale, une caméra posée sur chacune puis en vol vers la suivante.
 * Plages de repos et état du défilement, communs au voyage et à la page Tailles ; la clé est celle de la page.
 */

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export interface SectionBox<K extends string = string> {
  key: K;
  /** Position du haut de la section dans le document, en px. */
  top: number;
  height: number;
}

export interface SectionRange<K extends string = string> {
  key: K;
  /** Défilement à partir duquel la caméra est arrivée sur l'escale. */
  arrive: number;
  /** Défilement à partir duquel elle repart vers l'escale suivante (≥ arrive). */
  depart: number;
}

export interface ScrollState {
  /** Indice de l'escale de départ dans `ranges`. */
  from: number;
  /** Indice de l'escale d'arrivée (= from au repos). */
  to: number;
  /** Avancement du vol entre les deux, de 0 à 1 (non lissé). */
  t: number;
}

/** Courbe 6t⁵ − 15t⁴ + 10t³, t borné à [0, 1]. */
export function smootherstep(t: number): number {
  const x = clamp(t, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

/**
 * Plage de défilement où la caméra est posée sur une section (hors la première) :
 * arrive = top − 0,12 × hauteur de vue ; depart = max(arrive, top + height − hauteur de vue).
 */
export function restRange(box: { top: number; height: number }, viewportHeight: number): { arrive: number; depart: number } {
  const arrive = box.top - 0.12 * viewportHeight;
  return { arrive, depart: Math.max(arrive, box.top + box.height - viewportHeight) };
}

/**
 * Défilement le plus proche de `wanted` où la caméra reste posée sur la section : entre 2 px après
 * l'arrivée (cible de la navigation) et le départ ; 2 px après l'arrivée si la section n'a pas de repos.
 * Le départ est arrondi au pixel inférieur : le navigateur arrondit le défilement au pixel d'écran,
 * parfois vers le haut, ce qui lancerait le vol d'une fraction de pixel.
 */
export function clampToRest(wanted: number, box: { top: number; height: number }, viewportHeight: number): number {
  const { arrive, depart } = restRange(box, viewportHeight);
  const low = arrive + 2;
  return Math.min(Math.max(wanted, low), Math.max(low, Math.floor(depart)));
}

/**
 * Avancement du repos sur une section : 0 à l'arrivée, 1 au départ (le vol vers la suivante
 * commence), borné entre les deux ; 1 pour une section sans repos.
 */
export function restProgress(range: SectionRange, scrollY: number): number {
  if (range.depart <= range.arrive) return 1;
  return clamp((scrollY - range.arrive) / (range.depart - range.arrive), 0, 1);
}

/** Plages de défilement par section : restRange, sauf arrive = 0 pour la première. */
export function sectionRanges<K extends string>(boxes: readonly SectionBox<K>[], viewportHeight: number): SectionRange<K>[] {
  return boxes.map((box, i) => {
    const { arrive, depart } = restRange(box, viewportHeight);
    return i === 0
      ? { key: box.key, arrive: 0, depart: Math.max(0, box.top + box.height - viewportHeight) }
      : { key: box.key, arrive, depart };
  });
}

/**
 * Position du défilement dans le parcours : i = dernière section avec arrive ≤ y (0 si aucune) ;
 * au repos si i est la dernière ou si y ≤ depart(i) ; sinon vol vers i + 1 avec
 * t = clamp((y − depart(i)) / max(1, arrive(i+1) − depart(i)), 0, 1). Liste vide → {0, 0, 0}.
 */
export function scrollState(ranges: readonly SectionRange[], scrollY: number): ScrollState {
  if (!ranges.length) return { from: 0, to: 0, t: 0 };
  let i = 0;
  while (i < ranges.length - 1 && ranges[i + 1].arrive <= scrollY) i++;
  const current = ranges[i];
  if (i === ranges.length - 1 || scrollY <= current.depart) return { from: i, to: i, t: 0 };
  const next = ranges[i + 1];
  return { from: i, to: i + 1, t: clamp((scrollY - current.depart) / Math.max(1, next.arrive - current.depart), 0, 1) };
}
