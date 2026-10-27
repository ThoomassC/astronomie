import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { WeightScales } from "@/components/modules/WeightScales";
import type { ParseResult } from "@/lib/astro/constants";
import { parseMassKg } from "@/lib/astro/weight";

/** Message renvoyé par le parseur pour une saisie refusée. */
function errorOf(result: ParseResult): string {
  if (result.ok) throw new Error("saisie valide inattendue dans la préparation du test");
  return result.error;
}

const MASS_ERROR = errorOf(parseMassKg("0"));

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

afterEach(cleanup);

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
