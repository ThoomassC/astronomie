import { cleanup, getDefaultNormalizer, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ContactFooter } from "@/components/site/ContactFooter";
import { LOCALES } from "@/i18n/locales";

afterEach(() => {
  cleanup();
});

/** Adresses publiques de l'auteur (son portfolio) : rien d'autre, ni téléphone ni adresse postale. */
const GITHUB = "https://github.com/ThoomassC";
const LINKEDIN = "https://www.linkedin.com/in/thomas-caron27/";
const EMAIL = "caronthomas27@gmail.com";

/** Précision lue après le nom d'un lien vers un autre site, comme partout sur le site. */
const EXTERNAL = { fr: "site externe", en: "external site", es: "sitio externo" } as const;

describe("ContactFooter", () => {
  it.each([
    ["fr", "Astronomie\u00a0— un site de Thomas Caron"],
    ["en", "Astronomie\u00a0— a site by Thomas Caron"],
    ["es", "Astronomie\u00a0— un sitio de Thomas Caron"],
  ] as const)("devrait signer le site dans la langue de la page (%s)", (locale, signature) => {
    render(<ContactFooter locale={locale} />);
    // Sans réduire les espaces : l'espace insécable garde le tiret sur la ligne du nom du site.
    const exact = { normalizer: getDefaultNormalizer({ collapseWhitespace: false }) };
    expect(screen.getByText(signature, exact)).toBeInTheDocument();
  });

  it.each(LOCALES)("devrait mener au GitHub de l'auteur, lien externe signalé à l'œil et à l'oreille (%s)", (locale) => {
    render(<ContactFooter locale={locale} />);
    const link = screen.getByRole("link", { name: `GitHub, ${EXTERNAL[locale]}` });
    expect(link).toHaveAttribute("href", GITHUB);
    // Même onglet : rien n'ouvre de fenêtre sans prévenir.
    expect(link).not.toHaveAttribute("target");
    expect(link.querySelector('span[aria-hidden="true"]')).toHaveTextContent("↗");
  });

  it.each(LOCALES)("devrait mener au LinkedIn de l'auteur, lien externe signalé à l'œil et à l'oreille (%s)", (locale) => {
    render(<ContactFooter locale={locale} />);
    const link = screen.getByRole("link", { name: `LinkedIn, ${EXTERNAL[locale]}` });
    expect(link).toHaveAttribute("href", LINKEDIN);
    expect(link).not.toHaveAttribute("target");
    expect(link.querySelector('span[aria-hidden="true"]')).toHaveTextContent("↗");
  });

  it.each(LOCALES)("devrait écrire l'adresse e-mail en clair, sur un lien mailto: qu'elle nomme (%s)", (locale) => {
    render(<ContactFooter locale={locale} />);
    // Le texte visible est tout le nom accessible : la commande vocale « cliquer caronthomas27 » le trouve.
    const link = screen.getByRole("link", { name: EMAIL });
    expect(link).toHaveAttribute("href", `mailto:${EMAIL}`);
    expect(link).toHaveTextContent(EMAIL);
  });

  it("ne devrait proposer que ces trois liens, dans l'ordre : GitHub, LinkedIn, e-mail", () => {
    render(<ContactFooter locale="fr" />);
    expect(screen.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
      GITHUB,
      LINKEDIN,
      `mailto:${EMAIL}`,
    ]);
  });

  it("devrait poser devant chaque libellé un pictogramme décoratif, caché de l'arbre d'accessibilité", () => {
    render(<ContactFooter locale="en" />);
    for (const link of screen.getAllByRole("link")) {
      const icon = link.querySelector("svg");
      expect(icon).toHaveAttribute("aria-hidden", "true");
      expect(icon).toHaveAttribute("focusable", "false");
    }
  });

  it.each(LOCALES)("devrait finir par la mention de droit d'auteur, « © 2026 Thomas Caron » (%s)", (locale) => {
    render(<ContactFooter locale={locale} />);
    expect(screen.getByText("© 2026 Thomas Caron")).toBeInTheDocument();
  });

  it("ne devrait poser ni plan du site ni autre navigation : les onglets restent dans la barre", () => {
    render(<ContactFooter locale="es" />);
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
});
