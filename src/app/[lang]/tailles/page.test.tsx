import { screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import TaillesPage, { generateMetadata } from "@/app/[lang]/tailles/page";
import { MAIN_ID } from "@/components/journey/ids";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import type { Locale } from "@/i18n/locales";
import { pageMetadata } from "@/i18n/metadata";
import { SIZE_STOP_IDS, SIZE_STOP_ORDER } from "@/lib/sizes/stops";

/** La scène 3D ne se rend que dans le navigateur (WebGL) : hors de lui, elle ne rend rien. */
vi.mock("@/components/sizes/SizesSceneMount", () => ({ SizesSceneMount: () => null }));

afterEach(() => {
  document.body.replaceChildren();
});

/** Ce que Next passe à la page `/[lang]/tailles` et à ses métadonnées. */
const props = (lang: string) => ({ params: Promise.resolve({ lang }), searchParams: Promise.resolve({}) });

/** Erreur que lève `notFound()` : Next la traduit en page 404. */
const NOT_FOUND = { digest: "NEXT_HTTP_ERROR_FALLBACK;404" };

/**
 * Rendu serveur de la page, comme au build (aucun effet ne s'exécute), avec la langue que le layout `[lang]` donne aux
 * composants client, inséré dans le document pour l'interroger par rôles.
 */
async function renderSizes(lang: Locale): Promise<void> {
  const page = await TaillesPage(props(lang));
  document.body.innerHTML = renderToStaticMarkup(<LocaleProvider locale={lang}>{page}</LocaleProvider>);
}

describe("route /[lang]/tailles", () => {
  it("devrait donner à la page ses métadonnées dans la langue : titre, canonique, hreflang", async () => {
    await expect(generateMetadata(props("es"))).resolves.toEqual(pageMetadata("sizes", "es"));
  });

  it("devrait poser l'introduction puis une section par étoile, dans l'ordre des tailles, à l'ancre de chacune", async () => {
    await renderSizes("fr");
    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("id", MAIN_ID);
    const sections = Array.from(main.children, (child) => [child.tagName, child.id, child.getAttribute("data-stop")]);
    expect(sections).toEqual(SIZE_STOP_ORDER.map((key) => ["SECTION", SIZE_STOP_IDS[key], key]));
  });

  it("devrait finir par la plus grande étoile, une escale comme les autres, qui ramène à la plus petite", async () => {
    await renderSizes("fr");
    const last = screen.getByRole("main").lastElementChild;
    expect(last).toHaveClass("stop");
    expect(last?.id).toBe("vy-canis-majoris");
    if (!(last instanceof HTMLElement)) throw new Error("Dernière section absente");
    expect(within(last).getByRole("link", { name: "Revenir à la plus petite étoile" })).toHaveAttribute(
      "href",
      "#proxima-du-centaure",
    );
  });

  it("devrait suivre l'ordre de lecture : évitement, barre, règle, contenu, pied de page", async () => {
    await renderSizes("fr");
    const landmarks = Array.from(document.body.querySelectorAll("a.skip, header, nav#rail, main, footer"), (element) =>
      element.matches("a.skip") ? "évitement" : element.tagName.toLowerCase(),
    );
    expect(landmarks).toEqual(["évitement", "header", "nav", "main", "footer"]);
    expect(screen.getByRole("link", { name: "Aller au contenu" })).toHaveAttribute("href", `#${MAIN_ID}`);
  });

  it("devrait finir, après les plaques, par le pied de page commun aux contacts de l'auteur, sans plan du site", async () => {
    await renderSizes("es");
    const footer = screen.getByRole("contentinfo");
    expect(within(footer).getByRole("link", { name: "GitHub, sitio externo" })).toHaveAttribute(
      "href",
      "https://github.com/ThoomassC",
    );
    expect(within(footer).queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("devrait marquer l'onglet Tailles comme la page courante, dans la barre commune", async () => {
    await renderSizes("en");
    const tabs = screen.getAllByRole("link", { current: "page" });
    expect(tabs.map((tab) => tab.textContent)).toContain("Sizes");
  });

  it("devrait parler la langue de l'adresse, des plaques à la règle (es)", async () => {
    await renderSizes("es");
    expect(screen.getByRole("heading", { level: 1, name: "Diez estrellas, en fila." })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Sirio A" })).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Escala de tamaños, del astro más pequeño al más grande" }),
    ).toBeInTheDocument();
  });

  it("devrait répondre par une 404 à une langue que le site ne parle pas", async () => {
    await expect(TaillesPage(props("de"))).rejects.toMatchObject(NOT_FOUND);
    await expect(generateMetadata(props("de"))).rejects.toMatchObject(NOT_FOUND);
  });
});
