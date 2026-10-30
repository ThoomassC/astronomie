import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type MouseEvent,
  type RefObject,
} from "react";

/** Panneau déplié par un bouton : état et réglages à poser sur la racine, le bouton et le panneau. */
export interface Disclosure<T extends HTMLElement> {
  open: boolean;
  /** À poser sur le bouton : ouvre ou ferme le panneau. */
  toggle: () => void;
  /** Racine du composant (bouton et panneau) : un toucher ou un focus hors d'elle ferme le panneau. */
  rootRef: RefObject<T | null>;
  buttonRef: RefObject<HTMLButtonElement | null>;
  /** Identifiant du panneau, pour l'`aria-controls` du bouton. */
  panelId: string;
  /** À poser sur la racine : un focus qui en sort ferme le panneau. */
  onBlur: (event: FocusEvent<T>) => void;
  /**
   * À poser sur le panneau : un lien choisi le referme et rend le focus au bouton. Utile quand le lien ne quitte pas
   * la page (langue ou rubrique déjà affichées) ; sinon la page change de toute façon.
   */
  onChoose: (event: MouseEvent<HTMLElement>) => void;
}

/**
 * Motif « disclosure » de la barre, réglé comme `StopsMenu` : Échap (en capture, puis annulé : un appui ne ferme
 * qu'une couche) referme le panneau et rend le focus au bouton s'il était dedans ; un toucher hors du composant, un
 * focus qui en sort, ou la mise en page qui le masque (fenêtre qui franchit le seuil du menu replié) le referment
 * aussi. Ainsi, un seul panneau de la barre reste ouvert à la fois. Quitter la page le referme aussi : Next garde la
 * page quittée, état compris (`<Activity>`), et l'on ne doit pas la retrouver panneau ouvert au retour.
 */
export function useDisclosure<T extends HTMLElement>(): Disclosure<T> {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<T>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  // Nettoyage synchrone quand la page est masquée par la navigation ou démontée : le panneau ne réapparaît pas ouvert.
  useLayoutEffect(() => () => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    // Composant masqué par la mise en page : il n'intercepte plus rien.
    const hidden = () => !rootRef.current || getComputedStyle(rootRef.current).display === "none";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      if (hidden()) return;
      event.preventDefault();
      if (rootRef.current?.contains(document.activeElement)) buttonRef.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || !rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onResize = () => {
      if (hidden()) setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const onBlur = (event: FocusEvent<T>) => {
    if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  };

  const onChoose = (event: MouseEvent<HTMLElement>) => {
    if (!(event.target instanceof Element) || event.target.closest("a") === null) return;
    setOpen(false);
    buttonRef.current?.focus();
  };

  return { open, toggle: () => setOpen((value) => !value), rootRef, buttonRef, panelId, onBlur, onChoose };
}
