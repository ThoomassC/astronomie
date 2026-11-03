import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Activity } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Flag } from "@/components/site/flags";
import { LanguageMenu } from "@/components/site/LanguageMenu";
import { LOCALES, type Locale } from "@/i18n/locales";
import { setFragmentSource } from "@/lib/site/fragment";

/**
 * jsdom ne sait pas suivre un lien vers une autre page. Après les écouteurs de React, le test note pour chaque clic
 * sur un lien si la page a laissé le navigateur le suivre (rien d'annulé), puis l'annule lui-même.
 */
let followed: boolean[] = [];
function interceptLinks(event: MouseEvent) {
  if (!(event.target instanceof Element) || event.target.closest("a") === null) return;
  followed.push(!event.defaultPrevented);
  event.preventDefault();
}

/** Retrait de la source de fragment déclarée par un test. */
let removeSource: (() => void) | undefined;

beforeEach(() => {
  followed = [];
  document.addEventListener("click", interceptLinks);
});

afterEach(() => {
  cleanup();
  document.removeEventListener("click", interceptLinks);
  removeSource?.();
  removeSource = undefined;
  document.cookie = "lang=; Path=/; Max-Age=0";
  vi.restoreAllMocks();
});

const toggle = () => screen.getByRole("button", { name: "FR, langue\u00a0: français" });

/** Ce que chaque lien de la liste annonce : libellé, adresse, langue du libellé, langue de la page visée. */
function languageLinks(): (string | null)[][] {
  return screen
    .getAllByRole("link")
    .map((link) => [link.textContent, link.getAttribute("href"), link.getAttribute("lang"), link.getAttribute("hreflang")]);
}

/** Le drapeau d'une langue tel que `Flag` le dessine seul : la référence des comparaisons. */
function drawing(locale: Locale): Element | null {
  const template = document.createElement("template");
  template.innerHTML = renderToStaticMarkup(<Flag locale={locale} />);
  return template.content.firstElementChild;
}

/** Langues dont le drapeau figure dans un élément, dans l'ordre du DOM. */
function flagsIn(element: Element): Locale[] {
  return Array.from(element.querySelectorAll("svg")).flatMap((svg) =>
    LOCALES.filter((locale) => svg.isEqualNode(drawing(locale))),
  );
}

describe("LanguageMenu", () => {
  it("devrait nommer la langue de la page sur son bouton, liste fermée", () => {
    render(<LanguageMenu locale="fr" page="voyage" />);
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it.each([
    { locale: "en", name: "EN, language: English" },
    { locale: "es", name: "ES, idioma: español" },
  ] as const)("devrait nommer son bouton dans la langue de la page ($locale)", ({ locale, name }) => {
    render(<LanguageMenu locale={locale} page="home" />);
    expect(screen.getByRole("button", { name })).toBeInTheDocument();
  });

  it("devrait montrer sur son bouton le drapeau de la langue de la page, devant son code (fr)", () => {
    render(<LanguageMenu locale="fr" page="voyage" />);
    expect(flagsIn(toggle())).toEqual(["fr"]);
  });

  it("devrait montrer le drapeau espagnol sur le bouton d'une page en espagnol", () => {
    render(<LanguageMenu locale="es" page="voyage" />);
    expect(flagsIn(screen.getByRole("button", { name: "ES, idioma: español" }))).toEqual(["es"]);
  });

  it("devrait se ranger sous un repère de navigation « Langue »", () => {
    render(<LanguageMenu locale="fr" page="voyage" />);
    expect(screen.getByRole("navigation", { name: "Langue" })).toContainElement(toggle());
  });

  it("devrait ouvrir la liste des trois langues vers la même page, chacune nommée et annoncée dans sa langue", async () => {
    const user = userEvent.setup();
    render(<LanguageMenu locale="fr" page="voyage" />);
    await user.click(toggle());
    expect(toggle()).toHaveAttribute("aria-expanded", "true");
    expect(languageLinks()).toEqual([
      ["Français", "/fr/voyage", "fr", "fr"],
      ["English", "/en/voyage", "en", "en"],
      ["Español", "/es/voyage", "es", "es"],
    ]);
  });

  it("devrait poser devant chaque langue de la liste son drapeau, un par langue", async () => {
    const user = userEvent.setup();
    render(<LanguageMenu locale="fr" page="voyage" />);
    await user.click(toggle());
    expect(screen.getAllByRole("link").map(flagsIn)).toEqual([["fr"], ["en"], ["es"]]);
  });

  it("devrait relier son bouton à la liste qu'il ouvre", async () => {
    const user = userEvent.setup();
    render(<LanguageMenu locale="fr" page="voyage" />);
    await user.click(toggle());
    expect(toggle()).toHaveAttribute("aria-controls", screen.getByRole("list").id);
  });

  it("devrait marquer la langue de la page comme langue courante", async () => {
    const user = userEvent.setup();
    render(<LanguageMenu locale="en" page="sizes" />);
    await user.click(screen.getByRole("button", { name: "EN, language: English" }));
    expect(screen.getByRole("link", { name: "English" })).toHaveAttribute("aria-current", "true");
  });

  it.each(["Français", "Español"])("ne devrait pas marquer « %s », autre langue que celle de la page", async (name) => {
    const user = userEvent.setup();
    render(<LanguageMenu locale="en" page="sizes" />);
    await user.click(screen.getByRole("button", { name: "EN, language: English" }));
    expect(screen.getByRole("link", { name })).not.toHaveAttribute("aria-current");
  });

  it("devrait se refermer avec Échap, rendre le focus au bouton et ne fermer que lui", async () => {
    const user = userEvent.setup();
    render(<LanguageMenu locale="fr" page="voyage" />);
    await user.click(toggle());
    const english = screen.getByRole("link", { name: "English" });
    act(() => english.focus());
    // fireEvent renvoie false quand l'événement a été annulé : la couche suivante (note d'échelle) reste ouverte.
    expect(fireEvent.keyDown(english, { key: "Escape" })).toBe(false);
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
    expect(toggle()).toHaveFocus();
  });

  it("devrait se refermer quand on touche ailleurs dans la page", async () => {
    const user = userEvent.setup();
    render(
      <>
        <LanguageMenu locale="fr" page="voyage" />
        <p>Ailleurs</p>
      </>,
    );
    await user.click(toggle());
    fireEvent.pointerDown(screen.getByText("Ailleurs"));
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
  });

  it("devrait se refermer quand le focus quitte la liste (Tab après le dernier lien)", async () => {
    const user = userEvent.setup();
    render(
      <>
        <LanguageMenu locale="fr" page="voyage" />
        <button type="button">Partir du Soleil</button>
      </>,
    );
    await user.click(toggle());
    act(() => screen.getByRole("link", { name: "Español" }).focus());
    await user.tab();
    expect(screen.getByRole("button", { name: "Partir du Soleil" })).toHaveFocus();
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
  });

  it("devrait se refermer quand la mise en page le masque (fenêtre rétrécie sous le seuil du menu replié)", async () => {
    const user = userEvent.setup();
    render(<LanguageMenu locale="fr" page="voyage" />);
    await user.click(toggle());
    screen.getByRole("navigation", { name: "Langue" }).style.display = "none";
    fireEvent(window, new Event("resize"));
    expect(screen.getByRole("button", { name: "FR, langue\u00a0: français", hidden: true })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("ne devrait pas garder pour lui l'Échap quand la mise en page le masque", async () => {
    const user = userEvent.setup();
    render(<LanguageMenu locale="fr" page="voyage" />);
    await user.click(toggle());
    screen.getByRole("navigation", { name: "Langue" }).style.display = "none";
    expect(fireEvent.keyDown(document.body, { key: "Escape" })).toBe(true);
  });

  it("devrait se refermer quand on quitte la page sans la recharger, pour ne pas la retrouver ouverte au retour", async () => {
    // Next garde la page quittée, masquée sous <Activity> avec son état : le retour arrière la rend telle quelle.
    const page = (mode: "visible" | "hidden") => (
      <Activity mode={mode}>
        <LanguageMenu locale="fr" page="voyage" />
      </Activity>
    );
    const user = userEvent.setup();
    const { rerender } = render(page("visible"));
    await user.click(toggle());
    rerender(page("hidden"));
    rerender(page("visible"));
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
  });

  it("devrait garder l'escale affichée en passant à l'anglais : la page ajoute son ancre au lien suivi", async () => {
    removeSource = setFragmentSource(() => "#saturne");
    const user = userEvent.setup();
    render(<LanguageMenu locale="fr" page="voyage" />);
    await user.click(toggle());
    const english = screen.getByRole("link", { name: "English" });
    await user.click(english);
    expect(english).toHaveAttribute("href", "/en/voyage#saturne");
    expect(followed).toEqual([true]);
  });

  it("devrait retenir la langue choisie dans le cookie « lang »", async () => {
    const user = userEvent.setup();
    render(<LanguageMenu locale="fr" page="voyage" />);
    await user.click(toggle());
    await user.click(screen.getByRole("link", { name: "English" }));
    expect(document.cookie).toContain("lang=en");
  });

  it("devrait poser le cookie pour un an, sur tout le site, sans l'envoyer aux autres sites", async () => {
    const setCookie = vi.spyOn(document, "cookie", "set");
    const user = userEvent.setup();
    render(<LanguageMenu locale="en" page="about" />);
    await user.click(screen.getByRole("button", { name: "EN, language: English" }));
    await user.click(screen.getByRole("link", { name: "Español" }));
    expect(setCookie).toHaveBeenCalledWith("lang=es; Path=/; Max-Age=31536000; SameSite=Lax");
  });

  it("devrait suivre le lien tel quel quand la page n'a déclaré aucune position", async () => {
    const user = userEvent.setup();
    render(<LanguageMenu locale="fr" page="voyage" />);
    await user.click(toggle());
    const english = screen.getByRole("link", { name: "English" });
    await user.click(english);
    expect(english).toHaveAttribute("href", "/en/voyage");
    expect(followed).toEqual([true]);
  });

  it("devrait suivre le lien tel quel quand la page n'a pas de position à garder", async () => {
    removeSource = setFragmentSource(() => null);
    const user = userEvent.setup();
    render(<LanguageMenu locale="fr" page="home" />);
    await user.click(toggle());
    const spanish = screen.getByRole("link", { name: "Español" });
    await user.click(spanish);
    expect(spanish).toHaveAttribute("href", "/es");
  });

  it("devrait se refermer quand on choisit une langue", async () => {
    const user = userEvent.setup();
    render(<LanguageMenu locale="fr" page="voyage" />);
    await user.click(toggle());
    await user.click(screen.getByRole("link", { name: "English" }));
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
  });

  it("ne devrait pas recharger la page quand on choisit la langue affichée, mais retenir ce choix et se refermer", async () => {
    removeSource = setFragmentSource(() => "#saturne");
    const user = userEvent.setup();
    render(<LanguageMenu locale="fr" page="voyage" />);
    await user.click(toggle());
    await user.click(screen.getByRole("link", { name: "Français" }));
    expect(followed).toEqual([false]);
    expect(document.cookie).toContain("lang=fr");
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
    expect(toggle()).toHaveFocus();
  });

  it("devrait laisser ouvrir la langue affichée dans un nouvel onglet (clic avec Cmd ou Ctrl)", async () => {
    const user = userEvent.setup();
    render(<LanguageMenu locale="fr" page="voyage" />);
    await user.click(toggle());
    fireEvent.click(screen.getByRole("link", { name: "Français" }), { metaKey: true });
    expect(followed).toEqual([true]);
  });

  describe("sans JavaScript", () => {
    it.each([
      { name: "FR, Français", href: "/fr/voyage", lang: "fr" },
      { name: "EN, English", href: "/en/voyage", lang: "en" },
      { name: "ES, Español", href: "/es/voyage", lang: "es" },
    ])("devrait garder un lien direct « $name », dans sa langue, vers la même page", ({ name, href, lang }) => {
      render(<LanguageMenu locale="fr" page="voyage" />);
      const link = screen.getByRole("link", { name, hidden: true });
      expect(link).toHaveAttribute("href", href);
      expect(link).toHaveAttribute("lang", lang);
      expect(link).toHaveAttribute("hreflang", lang);
    });

    it("devrait poser devant chaque code le drapeau de sa langue", () => {
      render(<LanguageMenu locale="fr" page="voyage" />);
      const pills = ["FR, Français", "EN, English", "ES, Español"].map((name) =>
        screen.getByRole("link", { name, hidden: true }),
      );
      expect(pills.map(flagsIn)).toEqual([["fr"], ["en"], ["es"]]);
    });

    it("devrait marquer la langue de la page parmi ces liens directs", () => {
      render(<LanguageMenu locale="es" page="voyage" />);
      expect(screen.getByRole("link", { name: "ES, Español", hidden: true })).toHaveAttribute("aria-current", "true");
    });

    it("devrait masquer ces liens directs tant que le script tourne, le bouton faisant foi", () => {
      render(<LanguageMenu locale="fr" page="voyage" />);
      expect(screen.getByRole("link", { name: "EN, English", hidden: true })).not.toBeVisible();
    });
  });

  describe("en liste, dans le menu replié", () => {
    it("devrait montrer les trois liens d'emblée, sans bouton, sous le nom de la rubrique", () => {
      render(<LanguageMenu locale="es" page="about" variant="list" />);
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(
        within(screen.getByRole("navigation", { name: "Idioma" }))
          .getAllByRole("link")
          .map((link) => link.getAttribute("href")),
      ).toEqual(["/fr/a-propos", "/en/a-propos", "/es/a-propos"]);
    });

    it("devrait poser devant chaque langue son drapeau", () => {
      render(<LanguageMenu locale="es" page="about" variant="list" />);
      const links = within(screen.getByRole("navigation", { name: "Idioma" })).getAllByRole("link");
      expect(links.map(flagsIn)).toEqual([["fr"], ["en"], ["es"]]);
    });

    it("devrait aussi garder la position et retenir la langue choisie", async () => {
      removeSource = setFragmentSource(() => "#betelgeuse");
      const user = userEvent.setup();
      render(<LanguageMenu locale="es" page="sizes" variant="list" />);
      const french = screen.getByRole("link", { name: "Français" });
      await user.click(french);
      expect(french).toHaveAttribute("href", "/fr/tailles#betelgeuse");
      expect(document.cookie).toContain("lang=fr");
    });
  });
});
