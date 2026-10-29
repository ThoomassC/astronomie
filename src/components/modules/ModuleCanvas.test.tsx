import { cleanup, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ModuleCanvas } from "@/components/modules/ModuleCanvas";
import { renderIn, stubVisibleCanvas } from "@/components/modules/testUtils";
import { useCanvasModule } from "@/components/modules/useCanvasModule";
import type { Locale } from "@/i18n/locales";

/** Module minimal : dès que son canevas est visible sans contexte 2D, il se sait incapable de dessiner. */
function Probe() {
  const { canvas } = useCanvasModule({ width: 560, height: 236 }, () => {}, { animating: false });
  return <ModuleCanvas {...canvas} label="Sonde" />;
}

beforeEach(() => {
  stubVisibleCanvas();
  // Frontière navigateur : contexte 2D refusé, comme sur un navigateur qui ne peut pas en créer.
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  // Le module signale l'échec dans la console : attendu ici, il ne doit pas encombrer la sortie des tests.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe.each([
  ["fr", "Animation indisponible."],
  ["en", "Animation unavailable."],
  ["es", "Animación no disponible."],
] as const satisfies readonly (readonly [Locale, string])[])("ModuleCanvas (%s)", (locale, fallback) => {
  it("devrait dire dans la langue que l'animation est indisponible quand le canevas ne peut pas être dessiné", () => {
    renderIn(locale, <Probe />);
    expect(screen.getByText(fallback)).toBeInTheDocument();
  });
});
