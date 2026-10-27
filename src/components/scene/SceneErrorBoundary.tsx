"use client";

import { Component, type ReactNode } from "react";
import { setSceneFallback } from "./fallback";

interface SceneErrorBoundaryProps {
  children: ReactNode;
}

interface SceneErrorBoundaryState {
  failed: boolean;
}

/**
 * Le décor ne doit jamais faire tomber la page : une erreur dans la scène (module qui ne
 * se charge pas, exception au montage ou dans un effet) ne rend plus rien et passe au repli CSS.
 */
export class SceneErrorBoundary extends Component<SceneErrorBoundaryProps, SceneErrorBoundaryState> {
  state: SceneErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): SceneErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: unknown): void {
    setSceneFallback("boundary", true);
    console.error("Scène 3D désactivée", error);
  }

  componentWillUnmount(): void {
    if (this.state.failed) setSceneFallback("boundary", false);
  }

  render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}
