import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useNumberInput } from "@/components/modules/useNumberInput";
import type { ParseError, ParseResult } from "@/lib/astro/constants";
import { parseBirthYear } from "@/lib/astro/neptune";
import { parseMassKg } from "@/lib/astro/weight";

/*
 * Minuteurs simulés + user-event : l'enveloppe asynchrone de Testing Library attend un
 * setTimeout(0) que les minuteurs simulés de Vitest gèlent, et chaque action reste bloquée.
 * Ces tests pilotent donc le champ par fireEvent (synchrone, enveloppé dans act) en rejouant
 * la frappe préfixe par préfixe, comme React la voit. Le parcours clavier réel est couvert
 * par WeightScales.test.tsx, avec user-event et les vrais minuteurs.
 */

/** Inactivité après laquelle une saisie invalide est signalée. */
const ERROR_DELAY_MS = 600;

const parseYear = (raw: string) => parseBirthYear(raw, 2026);

/** Message que le module écrirait dans sa langue ; ici, une phrase qui reprend la forme de l'erreur. */
const describeError = (error: ParseError) =>
  error.kind === "range" ? `Hors bornes : de ${error.min} à ${error.max}.` : "Saisie illisible.";
const UNREADABLE = "Saisie illisible.";
const MASS_OUT_OF_RANGE = "Hors bornes : de 1 à 300.";
const YEAR_OUT_OF_RANGE = "Hors bornes : de 1846 à 2026.";

/** Champ minimal branché sur le hook comme dans les modules : message relié par aria-describedby. */
function NumberField({
  parse,
  onValid,
  describe,
  initial,
}: {
  parse: (raw: string) => ParseResult;
  onValid: (value: number) => void;
  describe: (error: ParseError) => string;
  initial: string;
}) {
  const field = useNumberInput(parse, onValid, describe);
  return (
    <>
      <label htmlFor="field">Valeur</label>
      <input
        id="field"
        type="text"
        defaultValue={initial}
        aria-invalid={field.error !== null}
        aria-describedby="field-error"
        onChange={field.onChange}
        onBlur={field.onBlur}
      />
      <p id="field-error">{field.error}</p>
    </>
  );
}

function setup({ parse = parseMassKg, initial = "40" }: { parse?: (raw: string) => ParseResult; initial?: string } = {}) {
  const onValid = vi.fn<(value: number) => void>();
  const describe = vi.fn(describeError);
  render(<NumberField parse={parse} onValid={onValid} describe={describe} initial={initial} />);
  return { onValid, describe, input: screen.getByRole<HTMLInputElement>("textbox", { name: "Valeur" }) };
}

/** Vide le champ. */
const clear = (input: HTMLInputElement) => fireEvent.change(input, { target: { value: "" } });

/** Frappe `text` à la suite du contenu actuel, un caractère par événement de changement. */
function type(input: HTMLInputElement, text: string): void {
  for (const char of text) fireEvent.change(input, { target: { value: input.value + char } });
}

/** Sortie du champ. */
const leave = (input: HTMLInputElement) => fireEvent.blur(input);

/** Laisse s'écouler `ms` sans frappe. */
function idle(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useNumberInput", () => {
  describe("saisie valide", () => {
    it("devrait transmettre aussitôt la valeur, sans erreur", () => {
      const { onValid, input } = setup();
      clear(input);
      type(input, "62,5");
      expect(onValid).toHaveBeenLastCalledWith(62.5);
      expect(input).toHaveAttribute("aria-invalid", "false");
    });

    it("devrait transmettre l'année complète, et elle seule, quand on la tape chiffre à chiffre", () => {
      const { onValid, input } = setup({ parse: parseYear, initial: "2000" });
      clear(input);
      type(input, "1990");
      expect(onValid).toHaveBeenCalledTimes(1);
      expect(onValid).toHaveBeenCalledWith(1990);
    });
  });

  describe("saisie intermédiaire", () => {
    it("ne devrait rien signaler pendant la frappe de « 62, »", () => {
      const { input } = setup();
      clear(input);
      type(input, "62,");
      expect(input).toHaveAttribute("aria-invalid", "false");
      expect(input).toHaveAccessibleDescription("");
    });

    it("ne devrait rien signaler pendant la frappe d'une année qui passe par « 199 »", () => {
      const { input } = setup({ parse: parseYear, initial: "2000" });
      clear(input);
      type(input, "199");
      expect(input).toHaveAttribute("aria-invalid", "false");
      expect(input).toHaveAccessibleDescription("");
    });

    it("ne devrait pas afficher l'erreur différée quand la saisie est complétée à temps", () => {
      const { input } = setup();
      clear(input);
      type(input, "62,");
      idle(ERROR_DELAY_MS / 2);
      type(input, "5");
      idle(ERROR_DELAY_MS * 2);
      expect(input).toHaveAttribute("aria-invalid", "false");
    });
  });

  describe("signalement de l'erreur", () => {
    it("devrait signaler l'erreur après 600 ms d'inactivité, et pas avant", () => {
      const { input } = setup();
      clear(input);
      type(input, "62,");
      idle(ERROR_DELAY_MS - 1);
      expect(input).toHaveAttribute("aria-invalid", "false");
      idle(1);
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(input).toHaveAccessibleDescription(UNREADABLE);
    });

    it("devrait relancer le délai de 600 ms à chaque frappe", () => {
      const { input } = setup();
      clear(input);
      type(input, "0");
      idle(ERROR_DELAY_MS - 100);
      type(input, ",");
      idle(ERROR_DELAY_MS - 100);
      expect(input).toHaveAttribute("aria-invalid", "false");
      idle(100);
      expect(input).toHaveAttribute("aria-invalid", "true");
    });

    it("devrait signaler l'année invalide quand la personne s'arrête sur « 199 »", () => {
      const { input } = setup({ parse: parseYear, initial: "2000" });
      clear(input);
      type(input, "199");
      idle(ERROR_DELAY_MS);
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(input).toHaveAccessibleDescription(YEAR_OUT_OF_RANGE);
    });

    it("devrait signaler l'erreur dès la sortie du champ, sans attendre", () => {
      const { input } = setup();
      clear(input);
      type(input, "0");
      leave(input);
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(input).toHaveAccessibleDescription(MASS_OUT_OF_RANGE);
    });

    it("devrait demander le message au module avec l'erreur du parseur, bornes comprises", () => {
      const { describe, input } = setup();
      clear(input);
      type(input, "0");
      leave(input);
      expect(describe).toHaveBeenCalledWith({ kind: "range", min: 1, max: 300 });
      clear(input);
      type(input, "abc");
      leave(input);
      expect(describe).toHaveBeenLastCalledWith({ kind: "format" });
      expect(input).toHaveAccessibleDescription(UNREADABLE);
    });

    it("ne devrait pas demander de message tant que la saisie est valide", () => {
      const { describe, input } = setup();
      clear(input);
      type(input, "62,5");
      leave(input);
      expect(describe).not.toHaveBeenCalled();
    });

    it("ne devrait rien signaler à la sortie du champ quand la valeur est valide", () => {
      const { input } = setup();
      leave(input);
      expect(input).toHaveAttribute("aria-invalid", "false");
    });

    it("devrait effacer l'erreur dès que la saisie redevient valide", () => {
      const { onValid, input } = setup();
      clear(input);
      type(input, "0");
      leave(input);
      clear(input);
      type(input, "70");
      expect(input).toHaveAttribute("aria-invalid", "false");
      expect(input).toHaveAccessibleDescription("");
      expect(onValid).toHaveBeenLastCalledWith(70);
    });
  });

  describe("dernière valeur valide", () => {
    it("ne devrait jamais transmettre une saisie invalide", () => {
      const { onValid, input } = setup();
      clear(input);
      type(input, "0");
      leave(input);
      idle(ERROR_DELAY_MS);
      expect(onValid).not.toHaveBeenCalled();
    });

    it("devrait laisser la dernière valeur valide transmise quand la saisie devient invalide", () => {
      const { onValid, input } = setup();
      clear(input);
      type(input, "62,5");
      type(input, "abc");
      leave(input);
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(onValid).toHaveBeenLastCalledWith(62.5);
    });
  });
});
