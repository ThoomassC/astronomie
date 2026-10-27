import { FOOTER } from "@/content/site";

/** Sources des données et avertissement sur l'échelle. */
export function SiteFooter() {
  return (
    <footer>
      <p>{FOOTER.sources}</p>
      <p>{FOOTER.scale}</p>
    </footer>
  );
}
