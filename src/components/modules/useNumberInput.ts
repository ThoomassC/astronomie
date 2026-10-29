import { useEffect, useRef, useState, type ChangeEvent } from "react";
import type { ParseError, ParseResult } from "@/lib/astro/constants";

/** Inactivité après laquelle une saisie invalide est signalée, en ms. */
const ERROR_DELAY_MS = 600;

interface Pending {
  timer: number | undefined;
  /** Erreur de la dernière saisie, pas encore forcément affichée. */
  error: ParseError | null;
}

/**
 * Champ numérique en texte libre. Une valeur valide est transmise aussitôt ; une saisie
 * invalide n'est signalée qu'à la sortie du champ ou après un temps d'inactivité, pour laisser
 * passer les états intermédiaires de la frappe (« 62, », « 199 »).
 * Rien n'est transmis tant que la saisie est invalide : l'affichage garde la dernière valeur valide.
 *
 * Le parseur décrit l'erreur par sa forme (`ParseError`) ; `describe` en écrit le message, dans la langue du
 * module, au rendu : `error` est ce message, ou `null`.
 */
export function useNumberInput(
  parse: (raw: string) => ParseResult,
  onValid: (value: number) => void,
  describe: (error: ParseError) => string,
) {
  /** Erreur affichée (et `aria-invalid`), ou `null`. */
  const [error, setError] = useState<ParseError | null>(null);
  const pending = useRef<Pending>({ timer: undefined, error: null });

  useEffect(() => {
    const current = pending.current;
    return () => window.clearTimeout(current.timer);
  }, []);

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const current = pending.current;
    window.clearTimeout(current.timer);
    const result = parse(event.currentTarget.value);
    if (result.ok) {
      current.error = null;
      setError(null);
      onValid(result.value);
      return;
    }
    current.error = result.error;
    current.timer = window.setTimeout(() => setError(current.error), ERROR_DELAY_MS);
  };

  const onBlur = () => {
    const current = pending.current;
    window.clearTimeout(current.timer);
    setError(current.error);
  };

  return { error: error === null ? null : describe(error), onChange, onBlur };
}
