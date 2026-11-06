import { freeBand, type ScreenBand, type ScreenZone } from "@/lib/journey/screen";
import { restingRect } from "@/lib/site/barSlide";
import { easeFactor } from "./math";

/**
 * Mise en page compacte (globals.css) : téléphone, tablette en portrait. Avec JavaScript et assez de hauteur, la carte
 * de l'escale courante s'y fixe en haut de l'écran, sous la barre (FIXED_CARD_QUERY).
 */
export const COMPACT_LAYOUT_QUERY = "(max-width: 640px), (max-width: 1100px) and (orientation: portrait)";
/** Grand écran : air entre la zone libre et ce qui la borde (plaque, règle), en px. */
const ZONE_MARGIN_PX = 24;
/** Zone plus étroite que cette part de l'écran (fenêtre très étroite) : cadrage habituel. */
const MIN_ZONE_SHARE = 0.2;
/** Vitesse à laquelle le cadrage rejoint une bande libre qui change (barre d'outils, note), par seconde. */
const BAND_FOLLOW_RATE = 6;
const BAND_EPSILON = 1e-4;

/** Rapproche `value` de `target` et s'y pose quand l'écart devient négligeable. */
function approach(value: number, target: number, factor: number, epsilon: number): number {
  const next = value + (target - value) * factor;
  return Math.abs(target - next) < epsilon ? target : next;
}

/** Ce qui borde la scène dans la page. */
export interface ScreenLayoutElements<K extends string> {
  /** Barre du haut : la bande libre commence sous elle. */
  bar: Element | null;
  /** Règle : sur grand écran, la zone libre s'arrête avant elle. */
  rail: Element | null;
  /**
   * Note d'échelle : visible sur téléphone, posée au-dessus du dock, elle borde aussi la bande libre par le bas.
   * Suspendue aux escales cosmiques (`data-suspended`), elle y garde sa place.
   */
  note: HTMLElement | null;
  /** Plaque de chaque escale : sur téléphone, l'astre est cadré dans la bande libre sous sa carte fixée en haut. */
  plates: ReadonlyMap<K, HTMLElement>;
}

/** Ce que la page laisse libre autour de la scène, mesuré dans le DOM et lissé pour le cadrage. */
export interface ScreenLayout<K extends string> {
  /**
   * Une passe de lecture : bandes libres de la mise en page compacte (plaque repliée mémorisée, note repliée) et zone
   * libre du grand écran (marge de 24 px, au moins 20 % de la largeur).
   */
  measure(view: { width: number; height: number }): void;
  /**
   * Bandes affichées vers bandes mesurées, à 6 par seconde ; instantané en mouvement réduit ou quand une bande
   * apparaît. Vrai quand tout est posé.
   */
  settle(dt: number, reduced: boolean): boolean;
  /** Bande affichée sous la carte de l'escale, en fractions de la hauteur ; null sans bande. */
  band(key: K): ScreenBand | null;
  /** Zone libre du grand écran, en fractions de la largeur ; null sans zone. */
  zone(): ScreenZone | null;
}

/**
 * Mise en page de l'écran autour de la scène (voyage, Tailles), à partir des éléments qui la bordent. `compact` :
 * requête de la mise en page compacte, celle de globals.css par défaut.
 */
export function createScreenLayout<K extends string>(
  { bar, rail, note, plates }: ScreenLayoutElements<K>,
  compact: MediaQueryList = window.matchMedia(COMPACT_LAYOUT_QUERY),
): ScreenLayout<K> {
  /** Grand écran : zone libre entre la colonne des plaques et la règle, en fractions de la largeur. */
  let zone: ScreenZone | null = null;
  /**
   * Carte repliée de chaque escale, fixée en haut : son bas à sa place de repos, et le plancher que lui fixe la feuille
   * de style (haut de sa place de repos plus sa hauteur maximale : la réserve du dock, ou le bas de l'écran), en px.
   */
  const compactCards = new Map<K, { bottom: number; floor: number }>();
  /** Largeur de vue des mesures repliées : une carte change de hauteur avec elle. */
  let compactWidth = 0;
  /** Haut de la note d'échelle repliée : la déplier ne déplace pas la caméra. */
  let noteTop = Infinity;
  /** Bande libre mesurée sous chaque carte, en fractions de la hauteur de la vue (téléphone seulement). */
  const bands = new Map<K, ScreenBand>();
  /** Bandes du cadrage : elles rejoignent en douceur les bandes mesurées. */
  const shownBands = new Map<K, ScreenBand>();
  let bandsSettled = true;

  /**
   * Mise en page compacte : bande libre entre la carte repliée de chaque escale, fixée en haut sous la barre, et ce
   * qui borde le bas (la note d'échelle visible, sinon le plancher de la carte : réserve du dock, bas de l'écran). Une
   * carte ou une note dépliée garde la mesure de sa forme repliée, pour que la caméra ne bouge pas ; la mesure des
   * cartes se perd si la largeur change. La note suspendue aux escales cosmiques (distances réelles toujours actives)
   * garde sa place : le cadrage ne saute ni quand elle se tait, ni quand elle revient. La carte, qui remonte avec la
   * barre quand celle-ci glisse hors de l'écran, est lue à sa place de repos : l'astre ne bouge pas quand elles partent.
   * Sans barre fixe ni carte fixe (écran bas, sans JavaScript), pas de bande.
   */
  function measureBands(view: { width: number; height: number }): void {
    bands.clear();
    bandsSettled = false;
    if (view.width !== compactWidth) {
      compactCards.clear();
      compactWidth = view.width;
    }
    if (!compact.matches || !bar || getComputedStyle(bar).position !== "fixed") {
      compactCards.clear();
      return;
    }
    if (note?.dataset.visible === "true") {
      if (!note.hasAttribute("data-open")) noteTop = note.getBoundingClientRect().top;
    } else if (!note?.hasAttribute("data-suspended")) {
      noteTop = Infinity;
    }
    for (const [key, plate] of plates) {
      // Dépliée par son nom (`data-unfolded`), même sans section ouverte, ou par un titre-bouton (`data-expanded`).
      if (!plate.hasAttribute("data-expanded") && !plate.hasAttribute("data-unfolded")) {
        const style = getComputedStyle(plate);
        if (style.position === "fixed") {
          const top = restingRect(plate).top;
          const maxHeight = parseFloat(style.maxHeight);
          compactCards.set(key, {
            bottom: top + plate.offsetHeight,
            floor: Number.isFinite(maxHeight) ? top + maxHeight : view.height,
          });
        } else {
          compactCards.delete(key);
        }
      }
      const card = compactCards.get(key);
      const band = card ? freeBand(view.height, card.bottom, Math.min(card.floor, noteTop)) : null;
      if (band) bands.set(key, band);
    }
  }

  /**
   * Le cadrage rejoint les bandes mesurées en douceur : la barre d'outils du navigateur qui se replie
   * ou la note qui apparaît ne font pas sauter l'astre. Une bande qui apparaît ou disparaît s'applique
   * aussitôt (pas de forme intermédiaire), comme tout changement en mouvement réduit.
   */
  function settleBands(dt: number, reduced: boolean): void {
    if (bandsSettled) return;
    const follow = reduced ? 1 : easeFactor(dt, BAND_FOLLOW_RATE);
    let settled = true;
    for (const key of shownBands.keys()) if (!bands.has(key)) shownBands.delete(key);
    for (const [key, target] of bands) {
      const shown = shownBands.get(key);
      if (!shown) {
        shownBands.set(key, { ...target });
        continue;
      }
      shown.top = approach(shown.top, target.top, follow, BAND_EPSILON);
      shown.bottom = approach(shown.bottom, target.bottom, follow, BAND_EPSILON);
      if (shown.top !== target.top || shown.bottom !== target.bottom) settled = false;
    }
    bandsSettled = settled;
  }

  /** Grand écran : zone libre entre la colonne des plaques (toutes alignées) et la règle. */
  function measureZone(view: { width: number; height: number }): void {
    zone = null;
    if (compact.matches || !rail) return;
    const plate = plates.values().next().value;
    if (!plate) return;
    const left = plate.getBoundingClientRect().right + ZONE_MARGIN_PX;
    // Règle masquée (liste des escales à sa place) : la zone va jusqu'au bord de l'écran.
    const railBox = rail.getBoundingClientRect();
    const right = (railBox.width > 0 ? railBox.left : view.width) - ZONE_MARGIN_PX;
    if (right - left >= MIN_ZONE_SHARE * view.width) zone = { left: left / view.width, right: right / view.width };
  }

  return {
    measure(view) {
      measureBands(view);
      measureZone(view);
    },
    settle(dt, reduced) {
      settleBands(dt, reduced);
      return bandsSettled;
    },
    band: (key) => shownBands.get(key) ?? null,
    zone: () => zone,
  };
}
