import { describe, expect, it } from "vitest";
import { DOCK_STRINGS } from "@/components/journey/dock.strings";
import { formatRelativeDate } from "@/components/journey/relativeDate";
import { INTL_LOCALE, type Locale } from "@/i18n/locales";
import { DAY_MS } from "@/lib/astro/constants";

const HOUR_MS = DAY_MS / 24;
const days = (count: number) => count * DAY_MS;

/** Format réellement utilisé par la date simulée du dock, dans chaque langue. */
const dockFormat = (locale: Locale) => new Intl.RelativeTimeFormat(INTL_LOCALE[locale], { numeric: "auto" });
const DOCK_FORMAT = dockFormat("fr");
/** Mot du jour même, tiré des chaînes du dock. */
const TODAY = DOCK_STRINGS.fr.relativeToday;

/** Formateur qui expose la valeur et l'unité choisies, indépendamment des chaînes d'ICU. */
class UnitRecorder extends Intl.RelativeTimeFormat {
  override format(value: number, unit: Intl.RelativeTimeFormatUnit): string {
    return `${value} ${unit}`;
  }
}
const UNITS = new UnitRecorder("fr");

describe("formatRelativeDate", () => {
  it.each([
    { label: "maintenant", delta: 0 },
    { label: "dans 6 h", delta: 6 * HOUR_MS },
    { label: "il y a 6 h", delta: -6 * HOUR_MS },
    { label: "dans 11 h 54", delta: 11.9 * HOUR_MS },
    { label: "il y a 11 h 54", delta: -11.9 * HOUR_MS },
  ])("devrait dire « aujourd'hui » à moins d'une demi-journée ($label)", ({ delta }) => {
    expect(formatRelativeDate(delta, DOCK_FORMAT, TODAY)).toBe("aujourd'hui");
  });

  it.each([
    { label: "dans 12 h 06", delta: 12.1 * HOUR_MS, expected: "1 day" },
    { label: "il y a 12 h 06", delta: -12.1 * HOUR_MS, expected: "-1 day" },
    { label: "dans 59 jours", delta: days(59), expected: "59 day" },
    { label: "il y a 59 jours", delta: days(-59), expected: "-59 day" },
  ])("devrait compter en jours de la demi-journée à 60 jours ($label → $expected)", ({ delta, expected }) => {
    expect(formatRelativeDate(delta, UNITS, TODAY)).toBe(expected);
  });

  it.each([
    { label: "dans 60 jours", delta: days(60), expected: "2 month" },
    { label: "il y a 90 jours", delta: days(-90), expected: "-3 month" },
    { label: "dans 729 jours", delta: days(729), expected: "24 month" },
  ])("devrait compter en mois de 60 à 730 jours ($label → $expected)", ({ delta, expected }) => {
    expect(formatRelativeDate(delta, UNITS, TODAY)).toBe(expected);
  });

  it.each([
    { label: "dans 730 jours", delta: days(730), expected: "2 year" },
    { label: "il y a 10 ans", delta: days(-3652.5), expected: "-10 year" },
    { label: "dans une année de Neptune", delta: days(164.79 * 365.25), expected: "165 year" },
  ])("devrait compter en années à partir de 730 jours ($label → $expected)", ({ delta, expected }) => {
    expect(formatRelativeDate(delta, UNITS, TODAY)).toBe(expected);
  });

  it.each([
    { delta: days(1), expected: "demain" },
    { delta: days(-1), expected: "hier" },
    { delta: days(5), expected: "dans 5 jours" },
    { delta: days(-5), expected: "il y a 5 jours" },
    { delta: days(-90), expected: "il y a 3 mois" },
    { delta: days(730), expected: "dans 2 ans" },
  ])("devrait écrire en français dans le format du dock ($expected)", ({ delta, expected }) => {
    expect(formatRelativeDate(delta, DOCK_FORMAT, TODAY)).toBe(expected);
  });
});

describe("formatRelativeDate en anglais et en espagnol", () => {
  it.each([
    { locale: "en", expected: "today" },
    { locale: "es", expected: "hoy" },
  ] as const)(
    "devrait dire le jour même avec le mot des chaînes du dock ($locale : « $expected »)",
    ({ locale, expected }) => {
      expect(formatRelativeDate(2 * HOUR_MS, dockFormat(locale), DOCK_STRINGS[locale].relativeToday)).toBe(expected);
    },
  );

  it.each([
    { locale: "en", delta: days(-90), expected: "3 months ago" },
    { locale: "en", delta: days(5), expected: "in 5 days" },
    { locale: "en", delta: days(730), expected: "in 2 years" },
    { locale: "es", delta: days(-90), expected: "hace 3 meses" },
    { locale: "es", delta: days(1), expected: "mañana" },
    { locale: "es", delta: days(730), expected: "dentro de 2 años" },
  ] as const)(
    "devrait écrire l'écart dans la langue du dock ($locale : « $expected »)",
    ({ locale, delta, expected }) => {
      expect(formatRelativeDate(delta, dockFormat(locale), DOCK_STRINGS[locale].relativeToday)).toBe(expected);
    },
  );
});
