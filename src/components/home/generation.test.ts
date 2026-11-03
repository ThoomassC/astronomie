import { afterEach, describe, expect, it, vi } from "vitest";
import { pageGenerationTime } from "@/components/home/generation";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("pageGenerationTime", () => {
  it("devrait rendre l'heure du build fixée par next.config (BUILD_TIME), sans lire l'horloge au rendu", () => {
    vi.stubEnv("BUILD_TIME", "2026-11-03T21:30:00.000Z");
    const now = vi.spyOn(Date, "now");
    const origin = vi.spyOn(performance, "timeOrigin", "get");
    expect(pageGenerationTime()).toBe(Date.UTC(2026, 10, 3, 21, 30));
    expect(now).not.toHaveBeenCalled();
    expect(origin).not.toHaveBeenCalled();
  });

  it.each([undefined, "", "hier soir"])(
    "devrait refuser de dater la page sans BUILD_TIME lisible (%s) : la configuration est à corriger",
    (value) => {
      vi.stubEnv("BUILD_TIME", value);
      expect(() => pageGenerationTime()).toThrow(/BUILD_TIME/);
    },
  );
});
