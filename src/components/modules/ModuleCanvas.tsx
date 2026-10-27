import type { ComponentPropsWithoutRef, CSSProperties } from "react";
import type { CanvasModule } from "./useCanvasModule";
import styles from "./modules.module.css";

type StageStyle = CSSProperties & Record<"--ratio" | "--ratio-narrow", string>;

type NativeCanvasProps = Omit<
  ComponentPropsWithoutRef<"canvas">,
  "width" | "height" | "role" | "aria-label" | "children" | "className" | "style"
>;

interface ModuleCanvasProps extends CanvasModule, NativeCanvasProps {
  /** Description de l'image pour les lecteurs d'écran. */
  label: string;
}

/**
 * Canvas d'un module, à alimenter avec le retour de `useCanvasModule`.
 * Le ratio (et le ratio étroit sous 420 px, par requête de conteneur) est fixé en CSS :
 * la hauteur est juste dès le rendu serveur, sans saut à l'hydratation.
 */
export function ModuleCanvas({ canvasRef, size, failed, label, ...canvasProps }: ModuleCanvasProps) {
  const ratio = size.height / size.width;
  const stageStyle: StageStyle = {
    "--ratio": String(ratio),
    "--ratio-narrow": String(size.narrow ?? ratio),
  };
  return (
    <div className={styles.stage} style={stageStyle}>
      <canvas
        ref={canvasRef}
        width={size.width}
        height={size.height}
        className={styles.canvas}
        role="img"
        aria-label={label}
        {...canvasProps}
      />
      {failed ? <p className={styles.fallback}>Animation indisponible.</p> : null}
    </div>
  );
}
