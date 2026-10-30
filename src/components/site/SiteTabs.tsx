import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import type { Locale } from "@/i18n/locales";
import { PAGES, pathFor, type PageKey } from "@/i18n/routes";
import { SITE_STRINGS } from "./site.strings";

type SiteTabsProps = { locale: Locale; page: PageKey } & Omit<ComponentPropsWithoutRef<"ul">, "children">;

/**
 * Les quatre pages, dans l'ordre du site et dans la langue de la page ; celle qu'on affiche porte
 * `aria-current="page"`. Sans état : la barre (serveur) et le menu replié (client) la partagent.
 * Le libellé passe aussi en `data-label`, qui réserve dans la barre la largeur de son gras (onglet courant).
 */
export function SiteTabs({ locale, page, ...list }: SiteTabsProps) {
  const { tabs } = SITE_STRINGS[locale];
  return (
    <ul {...list}>
      {PAGES.map((key) => (
        <li key={key}>
          <Link href={pathFor(key, locale)} aria-current={key === page ? "page" : undefined} data-label={tabs[key]}>
            <span>{tabs[key]}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
