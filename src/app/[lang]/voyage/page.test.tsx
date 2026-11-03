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

  it("devrait poser sous la barre et sous le dock des fondus décoratifs, ignorés des lecteurs d'écran et effacés pendant l'exploration", async () => {
    await renderVoyage("fr");
    for (const selector of [".bar-fade", ".dock-fade"]) {
      const fade = document.querySelector(selector);
      expect(fade, selector).not.toBeNull();
      expect(fade).toHaveAttribute("aria-hidden", "true");
      expect(fade).toHaveAttribute("data-hide-on-explore");
      expect(fade).toBeEmptyDOMElement();
    }
    // Avant le dock dans le DOM : au même rang que lui ou plus bas, ils passent sous lui à l'écran.
    const dock = screen.getByRole("region", { name: "Machine à remonter le temps" });
    expect(document.querySelector(".dock-fade")?.compareDocumentPosition(dock)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });
});

/*
 * Fondus sous la barre et sous le dock (globals.css, lu tel quel) : le texte d'une plaque qui passe dessous s'efface au
 * lieu d'être tranché par le dock ou de croiser la marque, sans intercepter un clic ni assombrir la scène au-delà de
 * deux bandes. Là où ils s'affichent, ce qui reçoit le focus s'arrête avant eux, contour compris (2 px + 3 px d'écart).
 */
describe("fondus sous la barre et sous le dock", () => {
  const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
  const ruleOf = (pattern: RegExp) => pattern.exec(css)?.[1] ?? "";
  const shared = ruleOf(/\n\.bar-fade,\n\.dock-fade \{([^}]*)\}/);
  const bar = ruleOf(/\n\.bar-fade \{([^}]*)\}/);
  // Règle propre au fondu du bas, après une ligne vide (pas la règle commune, « .bar-fade,\n.dock-fade {… »).
  const dock = ruleOf(/\n\n\.dock-fade \{([^}]*)\}/);
  const REM_PX = 16;
  const FOCUS_RING_PX = 5;

  /** Bloc média qui affiche les fondus, et la règle `html[data-fades]` qu'il contient. */
  function shownBlock(): { query: string; padding: string } {
    const at = css.indexOf("html[data-fades] .bar-fade");
    expect(at).toBeGreaterThan(0);
    const start = css.lastIndexOf("@media", at);
    const query = css.slice(start + "@media".length, css.indexOf("{", start)).replace(/\s+/g, " ").trim();
    const padding = /\n {2}html\[data-fades\] \{([^}]*)\}/.exec(css.slice(start))?.[1] ?? "";
    return { query, padding };
  }

  it("devrait les cacher par défaut, et laisser passer les clics vers la scène et la page", () => {
    expect(shared).toMatch(/display: none;/);
    expect(shared).toMatch(/pointer-events: none;/);
  });

  it("devrait couvrir en bas une bande de 120 à 160 px, de transparent à la nuit", () => {
    const height = Number(/height: calc\((\d+)px \+ env\(safe-area-inset-bottom, 0px\)\);/.exec(dock)?.[1]);
    expect(height).toBeGreaterThanOrEqual(120);
    expect(height).toBeLessThanOrEqual(160);
    expect(dock).toMatch(/bottom: 0;/);
    expect(dock).toMatch(/linear-gradient\(rgba\(6, 11, 24, 0\)[^;]*var\(--nuit\)\)/);
  });

  it("devrait couvrir en haut la barre (4,75 rem, encoche comprise) et 40 px de plus, de la nuit à transparent", () => {
    expect(bar).toMatch(/top: 0;/);
    expect(bar).toMatch(/height: calc\(env\(safe-area-inset-top, 0px\) \+ 4\.75rem \+ 40px\);/);
    expect(bar).toMatch(/linear-gradient\(var\(--nuit\)[^;]*rgba\(6, 11, 24, 0\)\)/);
  });

  it("devrait ne les afficher que sur grand écran : ni en mise en page compacte, ni sur écran bas", () => {
    expect(shownBlock().query).toBe(
      "(min-width: 1101px) and (min-height: 30.0625rem), (min-width: 641px) and (orientation: landscape) and (min-height: 30.0625rem)",
    );
  });

  it("devrait arrêter ce qui reçoit le focus avant les fondus, contour compris, là où ils s'affichent", () => {
    const { padding } = shownBlock();
    const top = /calc\(env\(safe-area-inset-top, 0px\) \+ ([\d.]+)rem \+ (\d+)px \+ ([\d.]+)rem\)/.exec(padding);
    const bottom = /calc\((\d+)px \+ ([\d.]+)rem \+ env\(safe-area-inset-bottom, 0px\)\)/.exec(padding);
    expect(top).not.toBeNull();
    expect(bottom).not.toBeNull();
    const [, barRem, barPx, topAir] = top ?? [];
    const [, dockPx, bottomAir] = bottom ?? [];
    expect(Number(barRem) * REM_PX + Number(barPx) + Number(topAir) * REM_PX).toBeGreaterThanOrEqual(76 + 40 + FOCUS_RING_PX);
    expect(Number(dockPx) + Number(bottomAir) * REM_PX).toBeGreaterThanOrEqual(140 + FOCUS_RING_PX);
  });
});
