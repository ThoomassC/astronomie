import type { CSSProperties } from "react";

/** Style React avec propriétés personnalisées (`--c`, `--pc`, `--lc`…), que `CSSProperties` ne type pas. */
export function cssVars(vars: Record<`--${string}`, string>, base: CSSProperties = {}): CSSProperties {
  return { ...base, ...vars };
}
