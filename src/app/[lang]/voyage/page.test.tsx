import { screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import VoyagePage, { generateMetadata } from "@/app/[lang]/voyage/page";
import { MAIN_ID } from "@/components/journey/ids";
import { pageMetadata } from "@/i18n/metadata";
import { STOP_ORDER } from "@/lib/journey/camera";
import { STOP_IDS } from "@/lib/journey/stopIds";

/** La scène 3D ne se rend que dans le navigateur (WebGL) : hors de lui, elle ne rend rien. */
vi.mock("@/components/scene/SceneMount", () => ({ SceneMount: () => null }));

afterEach(() => {
  document.body.replaceChildren();
});

/** Ce que Next passe à la page `/[lang]/voyage` et à ses métadonnées. */
const props = (lang: string) => ({ params: Promise.resolve({ lang }), searchParams: Promise.resolve({}) });

/** Erreur que lève `notFound()` : Next la traduit en page 404. */
const NOT_FOUND = { digest: "NEXT_HTTP_ERROR_FALLBACK;404" };

/**
 * Rendu serveur de la page, comme au build (aucun effet ne s'exécute), inséré dans le document pour l'interroger
 * par rôles.
 */
async function renderVoyage(lang: string): Promise<void> {
  document.body.innerHTML = renderToStaticMarkup(await VoyagePage(props(lang)));
}

describe("route /[lang]/voyage", () => {
  it("devrait donner à la page ses métadonnées dans la langue : titre, canonique, hreflang", async () => {
    await expect(generateMetadata(props("en"))).resolves.toEqual(pageMetadata("voyage", "en"));
  });

  it("devrait poser la barre commune dans la langue de l'adresse, l'onglet du voyage en page courante", async () => {
    await renderVoyage("es");
    const tabs = within(screen.getByRole("navigation", { name: "Secciones" }));
    expect(tabs.getByRole("link", { name: "Viaje" })).toHaveAttribute("href", "/es/voyage");
    expect(tabs.getByRole("link", { name: "Viaje" })).toHaveAttribute("aria-current", "page");
  });

  it("devrait poser une section par escale, dans l'ordre du voyage, à l'ancre de chacune", async () => {
    await renderVoyage("fr");
    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("id", MAIN_ID);
    const sections = Array.from(main.children, (child) => [child.tagName, child.id]);
    expect(sections).toEqual(STOP_ORDER.map((key) => ["SECTION", STOP_IDS[key]]));
  });

  it.each([STOP_ORDER[0], STOP_ORDER[STOP_ORDER.length - 1]])(
    "devrait mener au Soleil depuis la première et la dernière escale (« %s »)",
    async (key) => {
      await renderVoyage("fr");
      const section = document.getElementById(STOP_IDS[key]);
      if (section === null) throw new Error(`Section #${STOP_IDS[key]} absente`);
      const targets = within(section)
        .getAllByRole("link")
        .map((link) => link.getAttribute("href"));
      expect(targets).toContain(`#${STOP_IDS.sun}`);
    },
  );

  it("devrait répondre par une 404 à une langue que le site ne parle pas", async () => {
    await expect(VoyagePage(props("de"))).rejects.toMatchObject(NOT_FOUND);
    await expect(generateMetadata(props("de"))).rejects.toMatchObject(NOT_FOUND);
  });
});
