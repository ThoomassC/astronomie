/*
 * Carte fixe du téléphone (Voyage, Tailles) : sur la mise en page compacte, avec JavaScript, une seule plaque se voit,
 * celle de l'escale courante, fixée en haut de l'écran sous la barre (ADR 0007). Ici, ce qu'elle montre selon le vol en
 * cours : la carte d'une escale au repos, un squelette en plein vol, rien là où l'escale n'a pas de plaque (l'accueil
 * du Voyage, l'introduction de Tailles, la ceinture d'astéroïdes). Module sans dépendance d'exécution.
 */
import type { StopFlight } from "./store";

/**
 * Requête de la carte fixe, celle des blocs de globals.css qui la posent en haut de l'écran : mise en page compacte
 * (téléphone, tablette en portrait), assez haute pour elle (plus de 30 rem : en paysage bas, la plaque suit la page),
 * avec JavaScript (sans lui, la plaque reste entière dans la page).
 */
export const FIXED_CARD_QUERY =
  "(max-width: 640px) and (min-height: 30.0625rem) and (scripting: enabled), (max-width: 1100px) and (orientation: portrait) and (min-height: 30.0625rem) and (scripting: enabled)";

/** Ce que montre la carte fixe : rien, la carte d'une escale, ou le squelette du passage d'une escale à l'autre. */
export type CardView<K extends string> =
  | { readonly kind: "none" }
  | { readonly kind: "card"; readonly key: K }
  | { readonly kind: "skeleton" };

/**
 * Part du vol, à chaque bout, où la carte de l'escale voisine reste (au départ) ou paraît déjà (à l'arrivée) : un
 * frôlement du bout de la plage de repos ne fait pas clignoter le squelette, et la carte d'arrivée n'attend pas le
 * repos. Un vol fait environ 0,9 hauteur d'écran : 4 %, une trentaine de pixels sur un téléphone.
 */
export const CARD_EDGE = 0.04;

const NONE: CardView<never> = { kind: "none" };
const SKELETON: CardView<never> = { kind: "skeleton" };

/**
 * Ce que montre la carte fixe pour le vol `flight` ; `hasCard` dit si une escale a une plaque. Au repos (ou à moins de
 * CARD_EDGE d'un bout du vol), la carte de l'escale, s'il y en a une. En plein vol, le squelette, tant que l'escale
 * affichée (celle de départ jusqu'à mi-vol, celle d'arrivée ensuite) a une carte ; rien sinon : en quittant l'accueil,
 * le squelette ne paraît qu'à mi-vol, et il s'efface à mi-vol vers la ceinture.
 */
export function cardView<K extends string>(flight: StopFlight<K>, hasCard: (key: K) => boolean): CardView<K> {
  const atRest = (key: K): CardView<K> => (hasCard(key) ? { kind: "card", key } : NONE);
  if (flight.from === flight.to || flight.t <= CARD_EDGE) return atRest(flight.from);
  if (flight.t >= 1 - CARD_EDGE) return atRest(flight.to);
  return hasCard(flight.current) ? SKELETON : NONE;
}

/** La carte de `key` est celle que montre la carte fixe. */
export function showsCard<K extends string>(flight: StopFlight<K>, hasCard: (key: K) => boolean, key: K): boolean {
  const view = cardView(flight, hasCard);
  return view.kind === "card" && view.key === key;
}

/** La carte fixe montre le squelette. */
export function showsSkeleton<K extends string>(flight: StopFlight<K>, hasCard: (key: K) => boolean): boolean {
  return cardView(flight, hasCard).kind === "skeleton";
}
