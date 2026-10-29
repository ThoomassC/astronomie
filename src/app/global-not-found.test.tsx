import { screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import GlobalNotFound, { metadata } from "@/app/global-not-found";
import { getCommonContent } from "@/content/common/content";
import { LOCALES } from "@/i18n/locales";
import { pathFor } from "@/i18n/routes";

afterEach(() => {
  document.body.replaceChildren();
});

/**
 * Rendu serveur du document de la 404, rendu tel quel ; son contenu est inséré dans le document de test pour
 * l'interroger par rôles (l'analyseur HTML ignore les balises <html> et <body> à l'intérieur de <body>).
 */
function renderNotFound(): string {
  const markup = renderToStaticMarkup(<GlobalNotFound />);
  document.body.innerHTML = markup;
  return markup;
}

describe("404 globale", () => {
  it("devrait titrer l'onglet en français, langue par défaut, suivi du nom du site", () => {
    expect(metadata.title).toBe("Page introuvable · Astronomie");
  });

  it("devrait écrire le document en français, titre principal compris, et les autres langues en dessous", () => {
    expect(renderNotFound()).toContain('<html lang="fr"');
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(getCommonContent("fr").notFound.title);
    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual([
      getCommonContent("en").notFound.title,
      getCommonContent("es").notFound.title,
    ]);
  });

  it.each(LOCALES)(
    "devrait dire en « %s » que la page n'existe pas, et mener à l'accueil dans cette langue",
    (locale) => {
      renderNotFound();
      const { title, text, back } = getCommonContent(locale).notFound;
      const version = screen.getByRole("region", { name: title });
      expect(version).toHaveAttribute("lang", locale);
      expect(version).toHaveTextContent(text);
      const home = within(version).getByRole("link", { name: back });
      expect(home).toHaveAttribute("href", pathFor("home", locale));
      expect(home).toHaveAttribute("hreflang", locale);
    },
  );
});
