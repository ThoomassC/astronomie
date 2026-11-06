import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { stopColor } from "@/components/journey/stopMeta";
import { DISTANCE_RINGS_LY, isDeepLabelKey, ringLabelKey, starLabelKey } from "@/components/scene/cosmos";
import { DEEP_SKY_STRINGS } from "@/components/scene/deepSky.strings";
import {
  EXTRAGALACTIC_LABEL_ORDER,
  LABELLED_GALAXIES,
  galaxyLabelKey,
  isExtragalacticLabelKey,
} from "@/components/scene/extragalactic";
import SolarScene from "@/components/scene/SolarScene";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { LOCALES, type Locale } from "@/i18n/locales";
import { bodyName } from "@/i18n/names";
import { PLANETS } from "@/lib/astro/planets";
import { NEARBY_STARS } from "@/lib/astro/stars";

afterEach(() => {
  document.body.replaceChildren();
});

/**
 * Rendu serveur de la scène (aucun effet : pas de moteur WebGL), sous le fournisseur de langue que pose le layout
 * `[lang]` : seules les étiquettes DOM, que le moteur place ensuite, sont rendues.
 */
function renderScene(locale: Locale): void {
  document.body.innerHTML = renderToStaticMarkup(
    <LocaleProvider locale={locale}>
      <SolarScene />
    </LocaleProvider>,
  );
}

/** Étiquette du ciel profond de clé `key`. */
function deepLabel(key: string): HTMLElement {
  const found = document.querySelector<HTMLElement>(`[data-deep="${key}"]`);
  if (!found) throw new Error(`Étiquette ${key} absente`);
  return found;
}

/** Texte d'une étiquette, sans espaces de bord. */
const textOf = (element: Element) => element.textContent?.trim() ?? "";

describe("SolarScene, étiquettes des astres", () => {
  it.each(LOCALES)("devrait nommer le Soleil et les huit planètes dans la langue de la page (%s)", (locale) => {
    renderScene(locale);
    const labels = Array.from(document.querySelectorAll<HTMLElement>("[data-body]"));
    expect(labels.map((label) => [label.dataset.body, textOf(label)])).toEqual(
      (["sun", ...PLANETS.map((planet) => planet.key)] as const).map((key) => [key, bodyName(key, locale)]),
    );
  });
});

describe("SolarScene, étiquettes du ciel profond", () => {
  it.each(LOCALES)("devrait poser une étiquette par repère que le moteur sait placer (%s)", (locale) => {
    renderScene(locale);
    const keys = Array.from(document.querySelectorAll<HTMLElement>("[data-deep]"), (label) => label.dataset.deep ?? "");
    expect(keys.filter((key) => !isDeepLabelKey(key) && !isExtragalacticLabelKey(key))).toEqual([]);
    expect(new Set(keys)).toEqual(
      new Set([
        ...NEARBY_STARS.map((star) => starLabelKey(star.key)),
        "here",
        "center",
        ...DISTANCE_RINGS_LY.map(ringLabelKey),
        ...EXTRAGALACTIC_LABEL_ORDER,
      ]),
    );
    expect(keys).toHaveLength(new Set(keys).size);
  });

  it.each(LOCALES)("devrait écrire les repères sans nom propre dans la langue de la page (%s)", (locale) => {
    renderScene(locale);
    const { labels } = DEEP_SKY_STRINGS[locale];
    expect(
      (["here", "center", "web", "cmb", "our-universe", "other-universes"] as const).map((key) => textOf(deepLabel(key))),
    ).toEqual([labels.here, labels.center, labels.web, labels.cmb, labels.ourUniverse, labels.otherUniverses]);
  });

  it.each(LOCALES)("devrait nommer chaque étoile remarquable et donner sa distance dans la langue de la page (%s)", (locale) => {
    renderScene(locale);
    const { starNames, starDistance } = DEEP_SKY_STRINGS[locale];
    const notable = NEARBY_STARS.filter((star) => star.notable);
    expect(notable).toHaveLength(6);
    for (const star of notable) {
      const label = deepLabel(starLabelKey(star.key));
      expect(textOf(label)).toBe(`${starNames[star.key]}${starDistance(star.distanceLy)}`);
      // La distance seule se retire quand le nom seul tient (data-short).
      expect(label.querySelector(".dist")?.textContent).toBe(starDistance(star.distanceLy));
      expect(label).not.toHaveClass("minor");
    }
  });

  it.each(LOCALES)("devrait ne donner que leur nom, plus discret, aux autres étoiles (%s)", (locale) => {
    renderScene(locale);
    const { starNames } = DEEP_SKY_STRINGS[locale];
    const others = NEARBY_STARS.filter((star) => !star.notable);
    expect(others.length).toBeGreaterThan(0);
    for (const star of others) {
      const label = deepLabel(starLabelKey(star.key));
      expect(textOf(label)).toBe(starNames[star.key]);
      expect(label.querySelector(".dist")).toBeNull();
      expect(label).toHaveClass("lbl", "deep", "minor");
    }
  });

  it.each(LOCALES)("devrait nommer les cercles de distance dans la langue de la page (%s)", (locale) => {
    renderScene(locale);
    for (const radius of DISTANCE_RINGS_LY) {
      expect(textOf(deepLabel(ringLabelKey(radius)))).toBe(DEEP_SKY_STRINGS[locale].ring(radius));
    }
  });

  it.each(LOCALES)("devrait nommer les cinq galaxies cadrées au Groupe local, repère ovale de la couleur de l'escale (%s)", (locale) => {
    renderScene(locale);
    for (const galaxy of LABELLED_GALAXIES) {
      const label = deepLabel(galaxyLabelKey(galaxy));
      expect(textOf(label)).toBe(DEEP_SKY_STRINGS[locale].galaxyNames[galaxy]);
      expect(label).toHaveClass("lbl", "deep", "galaxy");
      expect(label.style.getPropertyValue("--lc")).toBe(stopColor("localGroup"));
    }
  });

  it("devrait donner à la toile, au fond diffus et à notre univers la couleur de l'escale de l'Univers", () => {
    renderScene("fr");
    for (const key of ["web", "cmb", "our-universe"]) {
      expect(deepLabel(key).style.getPropertyValue("--lc")).toBe(stopColor("universe"));
    }
  });

  it("devrait signaler les autres univers comme une hypothèse, de la couleur de l'escale du multivers", () => {
    renderScene("fr");
    const label = deepLabel("other-universes");
    expect(label).toHaveClass("lbl", "deep", "hypothesis");
    expect(label.style.getPropertyValue("--lc")).toBe(stopColor("multiverse"));
    expect(textOf(label)).toMatch(/hypothèse/);
  });

  it.each(["en", "es"] as const)("ne devrait laisser aucun repère en français (%s)", (locale) => {
    renderScene(locale);
    const text = textOf(document.body);
    for (const french of ["Vous êtes ici", "Centre de la Galaxie", "Toile cosmique", "Soleil", "Proxima du Centaure"]) {
      expect(text).not.toContain(french);
    }
  });

  it("devrait écrire les années-lumière en symbole anglais en anglais (« 4.2 ly »)", () => {
    renderScene("en");
    expect(textOf(deepLabel(starLabelKey("proxima-centauri")))).toBe("Proxima Centauri · 4.2 ly");
  });
});

/*
 * Étiquettes de la scène en mise en page compacte (globals.css, lue telle quelle) : plus petites, à la demande de
 * l'utilisateur (0,75 rem, sous le minimum de 0,8125 rem du MASTER, exception notée), pastilles de Tailles plus fines ;
 * au Voyage, le nom posé au-dessus du disque d'un astre (`data-above`, posé par la scène) efface son repère.
 */
describe("feuille de style des étiquettes de la scène", () => {
  const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
  const COMPACT = "@media (max-width: 640px), (max-width: 1100px) and (orientation: portrait) {";

  /** Déclarations de la règle `selector` (indentation de 2) dans le bloc compact qui la contient. */
  function compactRule(selector: string): string {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    for (let at = css.indexOf(COMPACT); at >= 0; at = css.indexOf(COMPACT, at + 1)) {
      const block = css.slice(at, css.indexOf("\n}", at));
      const rule = new RegExp(`\\n {2}${escaped} \\{([^}]*)\\}`).exec(block)?.[1];
      if (rule !== undefined) return rule;
    }
    throw new Error(`Règle absente : ${selector}`);
  }

  it("devrait réduire le texte des étiquettes à 0,75 rem, cercles de distance compris", () => {
    expect(compactRule(".lbl,\n  .lbl.deep.ring")).toMatch(/font-size: 0\.75rem;/);
  });

  it("devrait affiner le rembourrage des étiquettes et la pastille de Tailles", () => {
    expect(compactRule(".lbl")).toMatch(/padding: 0\.2rem 0\.4rem 0\.2rem 0\.15rem;/);
    const pill = compactRule(".lbl.deep > span");
    expect(pill).toMatch(/padding: 0 0\.35rem;/);
    expect(pill).toMatch(/line-height: 1\.3;/);
  });

  it("devrait effacer le repère d'un nom posé au-dessus de son astre, sans lui retirer sa place", () => {
    expect(css).toMatch(/\n\.lbl\[data-above\] i \{\s*visibility: hidden;\s*\}/);
  });

  /*
   * Au repos sur le Soleil, « Soleil » se pose sur sa couronne claire : une seule ombre floue (0 1px 6px) n'y suffit pas.
   * Le texte, opaque, prend le halo de nuit serré des étiquettes posées à nu (ombres de 1 à 3 px, denses au ras des
   * lettres) : sur un fond clair, ses lettres restent bordées de --nuit. Pas de pastille, et rien qui change la hauteur
   * du bouton (25,6 px, au-dessus des 24 px demandés).
   */
  it("devrait border de nuit le nom posé au-dessus de son astre, sans pastille ni changement de taille", () => {
    const rule = /\n\.lbl\[data-above\] > span \{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(rule).toMatch(/opacity: 1;/);
    for (const shadow of ["0 0 1px var(--nuit)", "0 0 2px var(--nuit)", "0 0 3px var(--nuit)"]) {
      expect(rule).toContain(shadow);
    }
    expect(rule).not.toMatch(/background|border|padding|font-size|line-height/);
  });
});

