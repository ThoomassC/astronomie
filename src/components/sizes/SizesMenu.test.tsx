import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { SizesMenu } from "@/components/sizes/SizesMenu";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { sizesStore } from "@/lib/sizes/store";

afterEach(() => {
  cleanup();
  act(() => sizesStore.reset());
});

const renderIn = (locale: "fr" | "en" | "es") =>
  render(
    <LocaleProvider locale={locale}>
      <SizesMenu />
    </LocaleProvider>,
  );

describe("SizesMenu", () => {
  it("devrait dire « Estrellas » à l'introduction, et proposer de choisir une étoile (es)", () => {
    renderIn("es");
    expect(screen.getByRole("navigation", { name: "Estrellas" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Estrellas, elegir una estrella" })).toBeInTheDocument();
  });

  it("devrait nommer l'étoile affichée sur le bouton, et suivre le parcours de la page (es)", () => {
    renderIn("es");
    act(() => sizesStore.update("pollux", "pollux", 0));
    expect(screen.getByRole("button", { name: "Pólux, cambiar de estrella" })).toBeInTheDocument();
  });

  it("devrait lister les dix étoiles avec leur rayon et marquer celle où l'on est (es)", async () => {
    const user = userEvent.setup();
    renderIn("es");
    act(() => sizesStore.update("sirius-a", "sirius-a", 0));
    await user.click(screen.getByRole("button", { name: "Sirio A, cambiar de estrella" }));
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(10);
    expect(screen.getByRole("link", { name: /Sirio A/ })).toHaveAttribute("aria-current", "location");
    expect(screen.getByRole("link", { name: /Sirio A/ })).toHaveAttribute("href", "#sirius-a");
    expect(screen.getByRole("link", { name: /Próxima Centauri/ })).toHaveTextContent("0,154 R☉");
  });
});
