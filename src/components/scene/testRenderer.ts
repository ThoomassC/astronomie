import type { WebGLRendererParameters } from "three";

/**
 * Moteur de rendu factice, pour faire tourner les moteurs de scène dans jsdom (sans WebGL) : à substituer à
 * `WebGLRenderer` par `vi.mock("three", …)`. Il garde ses paramètres de création et la suite des appels qui touchent au
 * tampon d'image (`setPixelRatio`, `setSize`, `render`, `dispose`), et répond à ce que les moteurs lisent (capacités,
 * rapport de pixels). `FakeRenderer.available = false` imite un navigateur sans WebGL : le constructeur lève.
 */
export class FakeRenderer {
  /** Moteurs créés depuis le dernier `FakeRenderer.reset()`, dans l'ordre. */
  static instances: FakeRenderer[] = [];
  static available = true;

  static reset(): void {
    FakeRenderer.instances = [];
    FakeRenderer.available = true;
  }

  readonly parameters: WebGLRendererParameters;
  /** « setPixelRatio 1,5 », « setSize 1024×768 », « render », « dispose »… */
  readonly calls: string[] = [];
  readonly capabilities = { maxTextureSize: 4096, getMaxAnisotropy: () => 8 };
  readonly debug = { checkShaderErrors: true };
  outputColorSpace = "";
  toneMapping = 0;
  toneMappingExposure = 1;
  private pixelRatio = 1;

  constructor(parameters: WebGLRendererParameters = {}) {
    if (!FakeRenderer.available) throw new Error("Pas de contexte WebGL");
    this.parameters = parameters;
    FakeRenderer.instances.push(this);
  }

  setClearColor(): void {}

  setPixelRatio(ratio: number): void {
    this.pixelRatio = ratio;
    this.calls.push(`setPixelRatio ${ratio}`);
  }

  getPixelRatio(): number {
    return this.pixelRatio;
  }

  setSize(width: number, height: number): void {
    this.calls.push(`setSize ${width}×${height}`);
  }

  compileAsync(): Promise<void> {
    return Promise.resolve();
  }

  initTexture(): void {}

  render(): void {
    this.calls.push("render");
  }

  dispose(): void {
    this.calls.push("dispose");
  }
}
