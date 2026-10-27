import { DAY_MS } from "@/lib/astro/constants";

/**
 * Écart lisible entre la date simulée et maintenant (`deltaMs` = simulée − réelle) :
 * « aujourd'hui » à moins d'une demi-journée, puis en jours (moins de 60),
 * en mois (moins de 730 jours), sinon en années.
 */
export function formatRelativeDate(deltaMs: number, rtf: Intl.RelativeTimeFormat): string {
  const days = Math.round(deltaMs / DAY_MS);
  const abs = Math.abs(days);
  if (abs < 1) return "aujourd'hui";
  if (abs < 60) return rtf.format(days, "day");
  if (abs < 730) return rtf.format(Math.round(days / 30.44), "month");
  return rtf.format(Math.round(days / 365.25), "year");
}
