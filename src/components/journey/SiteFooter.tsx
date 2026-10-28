import { FOOTER } from "@/content/site";

/** Sources des données, avertissement sur l'échelle et crédit des cartes des astres. */
export function SiteFooter() {
  const { textures } = FOOTER;
  return (
    <footer>
      <p>{FOOTER.sources}</p>
      <p>{FOOTER.scale}</p>
      <p>
        {textures.before}
        <a href={textures.source.href}>{textures.source.label}</a>
        {textures.between}
        <a href={textures.license.href}>{textures.license.label}</a>
        {textures.after}
      </p>
    </footer>
  );
}
