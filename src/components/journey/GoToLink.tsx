"use client";

import type { ComponentPropsWithoutRef, MouseEvent } from "react";
import { goTo } from "./navigation";

type GoToLinkProps = Omit<ComponentPropsWithoutRef<"a">, "onClick" | "href"> & {
  /** Escale visée : clé `data-stop` de sa section dans la page. */
  stop: string;
  /** Ancre de repli (`#soleil`), suivie telle quelle sans JavaScript. */
  href: `#${string}`;
};

/** Lien d'ancre vers une escale : défilement piloté pour que la caméra arrive, ancre native sinon. */
export function GoToLink({ stop, ...props }: GoToLinkProps) {
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (goTo(stop)) event.preventDefault();
  };
  return <a {...props} onClick={onClick} />;
}
