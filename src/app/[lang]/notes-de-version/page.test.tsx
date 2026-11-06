import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ReleasesRoute, { generateMetadata } from "@/app/[lang]/notes-de-version/page";
import { MAIN_ID } from "@/components/journey/ids";
import { SITE_STRINGS } from "@/components/site/site.strings";
import { getReleasesContent } from "@/content/releases/content";
import { pageMetadata } from "@/i18n/metadata";

afterEach(() => {
  cleanup();
});

/** Ce que Next passe à la page `/{lang}/notes-de-version`. */
const props = (lang: string) => ({ params: Promise.resolve({ lang }), searchParams: Promise.resolve({}) });

/** Erreur que lève `notFound()` : Next la traduit en page 404. */
const NOT_FOUND = { digest: "NEXT_HTTP_ERROR_FALLBACK;404" };

describe("route /[lang]/notes-de-version", () => {
  it("devrait donner à la page ses métadonnées dans la langue : titre, canonique, hreflang", async () => {
    await expect(generateMetadata(props("es"))).resolves.toEqual(pageMetadata("releases", "es"));
  });

  it("devrait poser, dans l'ordre, le lien d'évitement, la barre, le contenu et le pied de page", async () => {
    render(await ReleasesRoute(props("fr")));
    const skip = screen.getByRole("link", { name: SITE_STRINGS.fr.skipToContent });
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

  it("devrait marquer l'onglet des notes de version et poser le nom complet de la page en titre", async () => {
    render(await ReleasesRoute(props("en")));
    const banner = screen.getByRole("banner");
    const tabs = within(banner).getByRole("navigation", { name: SITE_STRINGS.en.tabsLabel });
    expect(within(tabs).getByRole("link", { name: SITE_STRINGS.en.tabs.releases })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(getReleasesContent("en").title);
  });

  it("devrait laisser la barre suivre la page, comme à l'Accueil et à À propos", async () => {
    render(await ReleasesRoute(props("fr")));
    const banner = screen.getByRole("banner");
    expect(banner).not.toHaveAttribute("data-pinned");
    expect(banner).toHaveAttribute("data-page", "releases");
  });

  it("devrait répondre par une 404 à une langue que le site ne parle pas", async () => {
    await expect(ReleasesRoute(props("de"))).rejects.toMatchObject(NOT_FOUND);
    await expect(generateMetadata(props("de"))).rejects.toMatchObject(NOT_FOUND);
  });
});
