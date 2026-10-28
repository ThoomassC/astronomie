import { ImageBitmapLoader, Texture, TextureLoader } from "three";
import { textureUrl, type TextureKey, type TextureTier } from "./textureSet";

/** Au plus deux téléchargements à la fois : les cartes de l'escale en cours passent devant. */
const MAX_IN_FLIGHT = 2;

export interface TextureStream {
  /** Lance les téléchargements suivants, dans l'ordre donné (les clés déjà demandées sont ignorées). */
  pump(order: readonly TextureKey[]): void;
  /** Rend au plus une texture arrivée : une seule mise en mémoire graphique par image. */
  take(): { key: TextureKey; texture: Texture } | null;
  /** Interrompt les téléchargements et libère toutes les textures créées. Idempotent. */
  dispose(): void;
}

/**
 * ImageBitmap décode l'image hors du fil principal. Même règle que GLTFLoader : pas avant
 * Safari 17 ni Firefox 98, qui gèrent mal ses options.
 */
function supportsImageBitmap(): boolean {
  if (typeof createImageBitmap === "undefined") return false;
  const agent = navigator.userAgent;
  if (/^((?!chrome|android).)*safari/i.test(agent)) return Number(/Version\/(\d+)/.exec(agent)?.[1] ?? 0) >= 17;
  const firefox = /Firefox\/(\d+)/.exec(agent);
  return !firefox || Number(firefox[1]) >= 98;
}

/**
 * Télécharge les cartes à la demande. `configure` règle chaque texture (espace colorimétrique,
 * répétition, anisotropie) avant qu'elle ne soit rendue par `take`.
 */
export function createTextureStream(
  tier: TextureTier,
  configure: (key: TextureKey, texture: Texture) => void,
): TextureStream {
  const bitmapLoader = supportsImageBitmap()
    ? new ImageBitmapLoader().setOptions({
        imageOrientation: "flipY",
        premultiplyAlpha: "none",
        // Valeurs brutes : les cartes de nuages et d'océans sont des données, pas des couleurs.
        colorSpaceConversion: "none",
      })
    : null;
  const imageLoader = bitmapLoader ? null : new TextureLoader();
  const requested = new Set<TextureKey>();
  const ready: { key: TextureKey; texture: Texture }[] = [];
  const created: Texture[] = [];
  let inFlight = 0;
  let disposed = false;

  async function load(url: string): Promise<Texture> {
    if (!bitmapLoader) return (imageLoader ?? new TextureLoader()).loadAsync(url);
    const bitmap = await bitmapLoader.loadAsync(url);
    const texture = new Texture(bitmap);
    // Une fois l'image envoyée au GPU, la copie décodée (8 Mo en 2K) ne sert plus : on la libère.
    texture.onUpdate = () => {
      bitmap.close();
      texture.onUpdate = null;
    };
    return texture;
  }

  function start(key: TextureKey): void {
    requested.add(key);
    inFlight += 1;
    load(textureUrl(key, tier)).then(
      (texture) => {
        inFlight -= 1;
        if (disposed) {
          if (texture.image instanceof ImageBitmap) texture.image.close();
          texture.dispose();
          return;
        }
        configure(key, texture);
        texture.needsUpdate = true;
        created.push(texture);
        ready.push({ key, texture });
      },
      (error: unknown) => {
        inFlight -= 1;
        if (!disposed) console.warn(`Texture « ${key} » indisponible : le rendu de repli reste affiché.`, error);
      },
    );
  }

  return {
    pump(order) {
      for (const key of order) {
        if (disposed || inFlight >= MAX_IN_FLIGHT) return;
        if (!requested.has(key)) start(key);
      }
    },
    take() {
      return ready.shift() ?? null;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      bitmapLoader?.abort();
      for (const texture of created) {
        // Image pas encore envoyée au GPU : la copie décodée est encore là.
        if (texture.onUpdate && texture.image instanceof ImageBitmap) texture.image.close();
        texture.dispose();
      }
      created.length = 0;
      ready.length = 0;
    },
  };
}
