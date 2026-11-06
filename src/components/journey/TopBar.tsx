import { SiteHeader } from "@/components/site/SiteHeader";
import type { Locale } from "@/i18n/locales";
import { CurrentStop } from "./CurrentStop";
import type { RailStop } from "./DistanceRail";
import { ExploreButton } from "./ExploreButton";
import { StopsMenu } from "./StopsMenu";
import { VoyageFragment } from "./VoyageFragment";

/**
 * Barre haute du voyage : la barre commune des cinq pages (marque vers l'accueil du site, onglets, langue, menu
 * replié), qui reçoit les commandes du voyage entre les onglets et la langue : escale en cours, menu des escales (là
 * où la règle n'a plus que des pastilles sans nom) et « Tourner autour » de cette escale. VoyageFragment donne au
 * changement de langue l'escale affichée. Masquée et inerte pendant l'exploration, qui a sa propre barre.
 */
export function TopBar({ locale, stops }: { locale: Locale; stops: readonly RailStop[] }) {
  return (
    <SiteHeader locale={locale} page="voyage">
      <CurrentStop />
      <StopsMenu stops={stops} />
      <ExploreButton />
      <VoyageFragment />
    </SiteHeader>
  );
}
