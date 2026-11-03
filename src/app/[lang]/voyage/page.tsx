import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { anchorOf } from "@/components/journey/anchors";
import { ClockDriver } from "@/components/journey/ClockDriver";
import { CosmicStops } from "@/components/journey/CosmicStops";
import { DistanceRail, type RailStop } from "@/components/journey/DistanceRail";
import { ExploreMode } from "@/components/journey/ExploreMode";
import { MAIN_ID } from "@/components/journey/ids";
import { JourneyTracker } from "@/components/journey/JourneyTracker";
import { ScaleNote } from "@/components/journey/ScaleNote";
import { SiteFooter } from "@/components/journey/SiteFooter";
import { SkipLinks } from "@/components/journey/SkipLinks";
import { SolarStops } from "@/components/journey/SolarStops";
import { TimeDock } from "@/components/journey/TimeDock";
import { TopBar } from "@/components/journey/TopBar";
import { SceneErrorBoundary } from "@/components/scene/SceneErrorBoundary";
import { SceneMount } from "@/components/scene/SceneMount";
import { isLocale } from "@/i18n/locales";
import { pageMetadata } from "@/i18n/metadata";
import { RAIL_STOPS } from "@/lib/journey/camera";

/** Titre, description, adresse canonique et hreflang de la page Voyage, dans la langue de l'adresse. */
export async function generateMetadata({ params }: PageProps<"/[lang]/voyage">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return pageMetadata("voyage", lang);
}

/**
 * Le voyage, dans la langue de l'adresse (/fr/voyage, /en/voyage, /es/voyage) : une section par escale, une scène 3D
 * fixe derrière, la règle des distances et la machine à remonter le temps. Statique ; tout ce qui bouge vit dans des
 * feuilles client. Ce que marque `data-hide-on-explore` s'efface et devient inerte pendant l'exploration
 * (« Tourner autour ») ; la scène et le dock du temps restent.
 */
export default async function VoyagePage({ params }: PageProps<"/[lang]/voyage">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const sunHref = anchorOf("sun");
  const railStops: RailStop[] = RAIL_STOPS.map(({ key, au }) => ({ key, au, href: anchorOf(key) }));
  return (
    <>
      <SkipLinks locale={lang} />
      {/* Fond de repli sans scène 3D (classe `no3d`) : un Soleil dessiné en CSS. */}
      <div className="sky-fallback" aria-hidden="true" />
      <SceneErrorBoundary>
        <SceneMount />
      </SceneErrorBoundary>
      <TopBar locale={lang} stops={railStops} />
      <DistanceRail stops={railStops} />
      <main id={MAIN_ID} tabIndex={-1} data-hide-on-explore>
        <SolarStops locale={lang} sunHref={sunHref} />
        <CosmicStops locale={lang} sunHref={sunHref} />
      </main>
      <SiteFooter locale={lang} />
      <ScaleNote />
      {/* Avant le dock, sous lui à l'écran (z-index) : au clavier, la barre et le pavé d'exploration, puis le dock. */}
      <ExploreMode />
      {/* Fondu décoratif sous le dock : le bas d'une plaque qui passe dessous s'efface au lieu d'être tranché. */}
      <div className="dock-fade" aria-hidden="true" data-hide-on-explore />
      <TimeDock />
      <ClockDriver />
      <JourneyTracker />
    </>
  );
}
