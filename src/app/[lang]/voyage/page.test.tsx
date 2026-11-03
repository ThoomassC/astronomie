import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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

  it("devrait poser sous le dock un fondu décoratif, ignoré des lecteurs d'écran et effacé pendant l'exploration", async () => {
    await renderVoyage("fr");
    const fade = document.querySelector(".dock-fade");
    expect(fade).not.toBeNull();
    expect(fade).toHaveAttribute("aria-hidden", "true");
    expect(fade).toHaveAttribute("data-hide-on-explore");
    expect(fade).toBeEmptyDOMElement();
    // Avant le dock dans le DOM : il passe sous lui à l'écran.
    const dock = screen.getByRole("region", { name: "Machine à remonter le temps" });
    expect(fade?.compareDocumentPosition(dock)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });
});

/*
 * Fondu sous le dock (globals.css, lu tel quel) : le bas d'une plaque qui passe sous le dock s'efface au lieu d'être
 * tranché, sans intercepter un clic ni assombrir la scène au-delà d'une bande de 120 à 160 px.
 */
describe("fondu sous le dock", () => {
  const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
  const rule = /\n\.dock-fade \{([^}]*)\}/.exec(css)?.[1] ?? "";

  it("devrait laisser passer les clics vers la scène et la page", () => {
    expect(rule).toMatch(/pointer-events: none;/);
  });

  it("devrait couvrir une bande de 120 à 160 px au bas de l'écran, de transparent à la nuit", () => {
    const height = Number(/height: calc\((\d+)px \+ env\(safe-area-inset-bottom, 0px\)\);/.exec(rule)?.[1]);
    expect(height).toBeGreaterThanOrEqual(120);
    expect(height).toBeLessThanOrEqual(160);
    expect(rule).toMatch(/bottom: 0;/);
    expect(rule).toMatch(/linear-gradient\(rgba\(6, 11, 24, 0\)[^;]*var\(--nuit\)\)/);
  });
});
