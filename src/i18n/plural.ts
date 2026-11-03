import { INTL_LOCALE, type Locale } from "./locales";

/** Formes d'un mot selon le nombre qui le précède. */
export interface PluralForms {
  one: string;
  other: string;
  /** fr et es : grands nombres ronds (1 000 000). */
  many?: string;
}

/** Règles de pluriel par langue, créées à la première demande (en construire coûte cher). */
const rulesByLocale = new Map<Locale, Intl.PluralRules>();

/**
 * Catégorie CLDR de n (Intl.PluralRules, mis en cache par langue) : fr 0, 1 et 1,5 → one, 1e6 → many ;
 * en 1 → one, 0 et 1,07 → other ; es 1 → one, 1e6 → many. Les catégories zero, two et few n'existent dans aucune
 * des trois langues. n est lu comme un nombre, sans les décimales affichées : 1 → one, même écrit « 1.00 » (CLDR
 * voudrait alors other en anglais).
 */
export function pluralCategory(locale: Locale, n: number): "one" | "many" | "other" {
  let rules = rulesByLocale.get(locale);
  if (!rules) {
    rules = new Intl.PluralRules(INTL_LOCALE[locale]);
    rulesByLocale.set(locale, rules);
  }
  const category = rules.select(n);
  return category === "one" || category === "many" ? category : "other";
}

/** Forme de n ; `many` absente → `other`. */
export function plural(locale: Locale, n: number, forms: PluralForms): string {
  const category = pluralCategory(locale, n);
  return category === "many" ? (forms.many ?? forms.other) : forms[category];
}
