import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderIn, settle } from "@/components/modules/testUtils";
import { WeightScales } from "@/components/modules/WeightScales";
import type { Locale } from "@/i18n/locales";

/** Message d'une saisie refusée, écrit par le module : il donne les bornes et un exemple. */
const MASS_ERROR = "Indiquez une masse entre 1 et 300 kg, par exemple 40 ou 62,5.";

function setup() {
  const user = userEvent.setup();
  render(<WeightScales />);
  return {
    user,
    input: screen.getByRole("textbox", { name: /masse sur terre/i }),
    /** Ligne de l'astre de l'escale, mise en avant (aria-current) dans la liste. */
    currentRow: () => screen.getByRole("listitem", { current: true }),
  };
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("WeightScales", () => {
  it("devrait mettre Mars en avant avec la masse d'exemple (40 kg → 15,1 kg)", () => {
    const { currentRow } = setup();
    expect(currentRow()).toHaveTextContent("Mars");
    expect(currentRow()).toHaveTextContent("15,1 kg");
  });

  it("devrait afficher 23,6 kg pour Mars quand on saisit 62,5", async () => {
    const { user, input, currentRow } = setup();
    await user.clear(input);
    await user.type(input, "62,5");
    expect(currentRow()).toHaveTextContent("Mars");
    expect(currentRow()).toHaveTextContent("23,6 kg");
  });

  it("devrait marquer le champ invalide et y relier le message d'erreur quand on le quitte après « 0 »", async () => {
    const { user, input } = setup();
    await user.clear(input);
    await user.type(input, "0");
    await user.tab();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(expect.stringContaining(MASS_ERROR));
  });

  it("devrait garder dans la liste la dernière masse valide quand la saisie est refusée", async () => {
    const { user, input, currentRow } = setup();
    await user.clear(input);
    await user.type(input, "62,5");
    await user.clear(input);
    await user.type(input, "0");
    await user.tab();
    expect(currentRow()).toHaveTextContent("23,6 kg");
  });

  it("devrait retirer l'erreur et son lien quand la saisie redevient valide", async () => {
    const { user, input, currentRow } = setup();
    await user.clear(input);
    await user.type(input, "0");
    await user.tab();
    await user.clear(input);
    await user.type(input, "100");
    expect(input).toHaveAttribute("aria-invalid", "false");
    expect(input).not.toHaveAccessibleDescription(expect.stringContaining(MASS_ERROR));
    expect(currentRow()).toHaveTextContent("37,8 kg");
  });
});

interface Expected {
  /** Nom du champ, unité comprise (le libellé l'entoure). */
  label: string;
  /** Indication liée au champ : la valeur est un exemple, à changer dans les bornes. */
  hint: string;
  /** Les neuf astres de la liste, dans l'ordre. */
  names: readonly string[];
  /** Mars avec la masse d'exemple (40 kg). */
  initial: string;
  /** Saisie de 62,5 kg au format de la langue, et ce que Mars affiche alors. */
  typed: string;
  after: string;
  error: string;
  summary: string;
  note: string;
}

const CASES: readonly (readonly [Locale, Expected])[] = [
  [
    "en",
    {
      label: "Mass on Earth kg",
      hint: "an example you can change (1 to 300 kg)",
      names: ["Mercury", "Venus", "Earth", "Moon", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"],
      initial: "15.1 kg",
      typed: "62.5",
      after: "23.6 kg",
      error: "Enter a mass between 1 and 300 kg, for example 40 or 62.5.",
      summary: "On Mars, the scales would read 23.6 kg. The other worlds are in the list.",
      note: "For the gas giants, this is the gravity at the cloud tops: there is nowhere to land.",
    },
  ],
  [
    "es",
    {
      label: "Masa en la Tierra kg",
      hint: "un ejemplo que puedes cambiar (de 1 a 300 kg)",
      names: ["Mercurio", "Venus", "Tierra", "Luna", "Marte", "Júpiter", "Saturno", "Urano", "Neptuno"],
      initial: "15,1 kg",
      typed: "62,5",
      after: "23,6 kg",
      error: "Indica una masa entre 1 y 300 kg, por ejemplo 40 o 62,5.",
      summary: "En Marte, la báscula marcaría 23,6 kg. Los demás astros están en la lista.",
      note: "En los gigantes gaseosos, es la gravedad en la cima de las nubes: no hay dónde posarse.",
    },
  ],
];

describe.each(CASES)("WeightScales (%s)", (locale, expected) => {
  const input = () => screen.getByRole("textbox", { name: expected.label });
  const currentRow = () => screen.getByRole("listitem", { current: true });

  it("devrait nommer le champ, son exemple et les neuf astres dans la langue", () => {
    renderIn(locale, <WeightScales />);
    expect(input()).toHaveAccessibleDescription(expected.hint);
    const names = screen.getAllByRole("listitem").map((row) => row.firstElementChild?.textContent);
    expect(names).toEqual(expected.names);
    expect(currentRow()).toHaveTextContent(expected.names[4]);
    expect(currentRow()).toHaveTextContent(expected.initial);
    expect(screen.getByText(expected.note)).toBeInTheDocument();
  });

  it("devrait écrire le poids lu sur Mars à la manière de la langue quand on saisit une masse", async () => {
    const user = userEvent.setup();
    renderIn(locale, <WeightScales />);
    await user.clear(input());
    await user.type(input(), expected.typed);
    expect(currentRow()).toHaveTextContent(expected.after);
  });

  it("devrait relier au champ un message d'erreur dans la langue quand on le quitte après « 0 »", async () => {
    const user = userEvent.setup();
    renderIn(locale, <WeightScales />);
    await user.clear(input());
    await user.type(input(), "0");
    await user.tab();
    expect(input()).toHaveAttribute("aria-invalid", "true");
    expect(input()).toHaveAccessibleDescription(`${expected.error} ${expected.hint}`);
  });

  it("devrait annoncer le poids sur Mars, après le calme, quand la saisie est valide", () => {
    vi.useFakeTimers();
    renderIn(locale, <WeightScales />);
    fireEvent.change(input(), { target: { value: expected.typed } });
    settle();
    expect(screen.getByRole("status").textContent).toBe(expected.summary);
  });
});
