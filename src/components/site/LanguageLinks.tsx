"use client";

import type { ComponentPropsWithoutRef, MouseEvent } from "react";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE_S, LOCALE_NAMES, LOCALES, type Locale } from "@/i18n/locales";
import { pathFor, type PageKey } from "@/i18n/routes";
import { currentFragment } from "@/lib/site/fragment";
import { Flag } from "./flags";

type LanguageLinksProps = { locale: Locale; page: PageKey } & Omit<ComponentPropsWithoutRef<"ul">, "children">;

/**
 * Retient la langue choisie, que le proxy lit sur les chemins sans langue : cookie posé seulement sur action de la
 * personne, pour un an, sur tout le site, jamais envoyé depuis un autre site, et réservé à https quand la page l'est.
 */
function rememberLocale(locale: Locale): void {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=${LOCALE_COOKIE_MAX_AGE_S}; SameSite=Lax${secure}`;
}

/** Clic qui ouvre le lien ailleurs (nouvel onglet, nouvelle fenêtre) : touche de modification ou autre bouton. */
function opensElsewhere(event: MouseEvent): boolean {
  return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

/**
 * Les trois langues, chacune nommée dans sa langue (`lang`) derrière son drapeau, décoratif, et menant à la même page
 * dans cette langue (`hrefLang`) ; celle de la page porte `aria-current="true"`. Liens `<a>` simples : changer de
 * langue change le paramètre racine, la page se recharge. Au clic, le cookie retient le choix et le lien reçoit,
 * juste avant d'être suivi, le fragment de la position affichée (`currentFragment`, « #saturne ») : on arrive au même
 * endroit. Choisir la langue affichée ne recharge rien. Sans JavaScript, les liens mènent au haut de la page.
 */
export function LanguageLinks({ locale, page, ...list }: LanguageLinksProps) {
  const choose = (target: Locale) => (event: MouseEvent<HTMLAnchorElement>) => {
    rememberLocale(target);
    if (target === locale && !opensElsewhere(event)) {
      event.preventDefault();
      return;
    }
    event.currentTarget.setAttribute("href", `${pathFor(page, target)}${currentFragment() ?? ""}`);
  };
  return (
    <ul {...list}>
      {LOCALES.map((target) => (
        <li key={target}>
          <a
            href={pathFor(page, target)}
            lang={target}
            hrefLang={target}
            aria-current={target === locale ? "true" : undefined}
            onClick={choose(target)}
          >
            <Flag locale={target} />
            {LOCALE_NAMES[target]}
          </a>
        </li>
      ))}
    </ul>
  );
}
