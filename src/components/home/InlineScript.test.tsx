import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InlineScript } from "@/components/home/InlineScript";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("InlineScript, rendu par React dans le navigateur", () => {
  it("devrait rester inerte (text/plain), son texte intact, sans avertissement de React", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = render(<InlineScript html="window.__inlineScriptRan = true" />);
    const script = container.querySelector("script");
    expect(script).toHaveAttribute("type", "text/plain");
    expect(script?.textContent).toBe("window.__inlineScriptRan = true");
    expect("__inlineScriptRan" in window).toBe(false);
    expect(errors).not.toHaveBeenCalled();
  });
});
