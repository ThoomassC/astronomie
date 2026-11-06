import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, getDefaultNormalizer, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SizesIntro } from "@/components/sizes/SizesIntro";
import { getSizesContent } from "@/content/sizes/content";

afterEach(() => {
  cleanup();
});

describe("SizesIntro", () => {
  it.each([
    ["fr", "Étoiles et trous noirs, côte à côte."],
    ["en", "Stars and black holes, side by side."],
    ["es", "Estrellas y agujeros negros, en fila."],
  ] as const)("devrait titrer la page (h1) et poser l'introduction à l'ancre #tailles, escale « intro » (%s)", (locale, title) => {
    render(<SizesIntro locale={locale} />);
    const section = screen.getByRole("region", { name: title });
    expect(section).toHaveAttribute("id", "tailles");
    expect(section).toHaveAttribute("data-stop", "intro");
    expect(screen.getByRole("heading", { level: 1, name: title })).toBeInTheDocument();
  });

  it.each([
    ["fr", "Commencer par le plus petit"],
    ["en", "Start with the smallest"],
    ["es", "Empezar por el más pequeño"],
  ] as const)("devrait conduire au plus petit astre, Cygnus X-1, à l'ancre #cygnus-x-1 (%s)", (locale, start) => {
    render(<SizesIntro locale={locale} />);
    expect(screen.getByRole("link", { name: start })).toHaveAttribute("href", "#cygnus-x-1");
  });

  it("devrait dire ce qui est à l'échelle, et ce qui ne l'est pas (ligne discrète)", () => {
    render(<SizesIntro locale="fr" />);
    // Texte exact : la recherche par défaut ramènerait l'espace fine insécable (« échelle ; ») à une espace ordinaire.
    const exact = { normalizer: getDefaultNormalizer({ collapseWhitespace: false }) };
    expect(screen.getByText(getSizesContent("fr").intro.note, exact)).toBeInTheDocument();
  });

  it("devrait dire aux lecteurs d'écran ce que montre la scène 3D décorative", () => {
    render(<SizesIntro locale="en" />);
    expect(screen.getByText(getSizesContent("en").intro.sceneDescription)).toHaveClass("sr");
  });
});

/*
 * Sur téléphone, la scène montre déjà le plus petit astre au milieu de l'écran, derrière le texte de l'introduction
 * (en 375 × 812, le disque lumineux de Cygnus X-1 gênait la lecture du paragraphe). Le texte, réuni en un bloc, se pose
 * en mise en page compacte sur un panneau de plaque : son contraste tient sur toute sa hauteur, quoi que la scène
 * montre dessous, au repos comme pendant le vol vers le premier astre.
 */
describe("panneau du texte de l'introduction, sur téléphone", () => {
  const sizesCss = readFileSync(resolve(process.cwd(), "src/components/sizes/SizesPage.module.css"), "utf8");
  const globalCss = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
  const COMPACT = "@media (max-width: 640px), (max-width: 1100px) and (orientation: portrait) {";

  /** Couleur d'une variable de :root : « #rrggbb » ou « rgba(r, g, b, a) », en composantes 0 à 255 et opacité. */
  function rootColor(name: string): { rgb: [number, number, number]; alpha: number } {
    const value = new RegExp(`\\n {2}${name}: ([^;]+);`).exec(globalCss)?.[1] ?? "";
    const hex = /^#([\da-f]{6})$/i.exec(value)?.[1];
    if (hex) return { rgb: [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number], alpha: 1 };
    const rgba = /^rgba\((\d+), (\d+), (\d+), ([\d.]+)\)$/.exec(value);
    if (!rgba) throw new Error(`Couleur illisible : ${name} = ${value}`);
    return { rgb: [Number(rgba[1]), Number(rgba[2]), Number(rgba[3])], alpha: Number(rgba[4]) };
  }

  const luminance = ([r, g, b]: readonly number[]) => {
    const linear = (c: number) => (c / 255 <= 0.040_45 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
    return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
  };
  const contrast = (a: readonly number[], b: readonly number[]) => {
    const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (light + 0.05) / (dark + 0.05);
  };

  it("devrait réunir tout le texte de l'introduction en un seul bloc, que la feuille de style pose sur le panneau", () => {
    render(<SizesIntro locale="fr" />);
    const section = screen.getByRole("region", { name: "Étoiles et trous noirs, côte à côte." });
    expect(section.children).toHaveLength(1);
    const block = section.firstElementChild;
    expect(block?.querySelector("h1")).toBe(screen.getByRole("heading", { level: 1 }));
    expect(block?.querySelector(".actions")).toContainElement(screen.getByRole("link", { name: "Commencer par le plus petit" }));
  });

  it("devrait poser le panneau, couleur de plaque, en mise en page compacte seulement", () => {
    const at = sizesCss.indexOf(COMPACT);
    expect(at).toBeGreaterThan(0);
    const compact = sizesCss.slice(at, sizesCss.indexOf("\n}", at));
    expect(compact).toMatch(/\n {2}\.introText \{[^}]*background: var\(--plaque-a\);/);
    // Hors de ce bloc, le texte reste à nu sur la scène, comme sur grand écran.
    expect(sizesCss.replace(compact, "")).not.toMatch(/\.introText \{[^}]*background/);
  });

  it.each([
    ["sur le point le plus clair de la scène (blanc)", [255, 255, 255]],
    ["sur la nuit", [6, 11, 24]],
  ] as const)("devrait garder au texte un contraste d'au moins 4,5:1, %s", (_where, scene) => {
    const panel = rootColor("--plaque-a");
    const behind = panel.rgb.map((c, i) => panel.alpha * c + (1 - panel.alpha) * scene[i]);
    // La note de l'introduction, en --brume et en petit corps, est le texte le moins contrasté.
    expect(contrast(rootColor("--brume").rgb, behind)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(rootColor("--ivoire").rgb, behind)).toBeGreaterThanOrEqual(4.5);
  });
});

