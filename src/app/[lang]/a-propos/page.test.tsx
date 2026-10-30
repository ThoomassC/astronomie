import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import AboutRoute, { generateMetadata } from "@/app/[lang]/a-propos/page";
import { MAIN_ID } from "@/components/journey/ids";
import { SITE_STRINGS } from "@/components/site/site.strings";
import { getAboutContent } from "@/content/about/content";
import { pageMetadata } from "@/i18n/metadata";

afterEach(() => {
  cleanup();
});

/** Ce que Next passe à la page `/{lang}/a-propos`. */
const props = (lang: string) => ({ params: Promise.resolve({ lang }), searchParams: Promise.resolve({}) });

/** Erreur que lève `notFound()` : Next la traduit en page 404. */
const NOT_FOUND = { digest: "NEXT_HTTP_ERROR_FALLBACK;404" };

describe("route /[lang]/a-propos", () => {
  it("devrait donner à la page ses métadonnées dans la langue : titre, canonique, hreflang", async () => {
    await expect(generateMetadata(props("en"))).resolves.toEqual(pageMetadata("about", "en"));
  });

  it("devrait poser, dans l'ordre, le lien d'évitement, la barre, le contenu et le pied de page", async () => {
    render(await AboutRoute(props("es")));
    const skip = screen.getByRole("link", { name: SITE_STRINGS.es.skipToContent });
    const header = screen.getByRole("banner");
    const main = screen.getByRole("main");
    const footer = screen.getByRole("contentinfo");
    expect(skip).toHaveAttribute("href", `#${MAIN_ID}`);
    expect(main).toHaveAttribute("id", MAIN_ID);
    for (const [before, after] of [
      [skip, header],
      [header, main],
      [main, footer],
    ]) {
      expect(before.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it("devrait marquer l'onglet À propos dans la barre et poser le titre dans la langue de la page", async () => {
    render(await AboutRoute(props("en")));
    const tabs = within(screen.getByRole("banner")).getByRole("navigation", { name: SITE_STRINGS.en.tabsLabel });
    const aboutTab = within(tabs).getByRole("link", { name: SITE_STRINGS.en.tabs.about });
    expect(aboutTab).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(getAboutContent("en").title);
  });

  it("devrait répondre par une 404 à une langue que le site ne parle pas", async () => {
    await expect(AboutRoute(props("de"))).rejects.toMatchObject(NOT_FOUND);
    await expect(generateMetadata(props("de"))).rejects.toMatchObject(NOT_FOUND);
  });
});
