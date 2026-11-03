# À propos — surcharge du MASTER

> Page de lecture : la notice gravée sous l'instrument. Sobre, très lisible, digne de confiance ; deux informations
> seulement, pourquoi ce site existe et d'où viennent ses chiffres, sur toute la largeur de la page. Aucun effet : la
> typographie, l'espace et les filets de laiton font le rythme. Tout ce qui n'est pas écrit ici suit `../MASTER.md`.

Code : `src/components/about/AboutPage.tsx` (composant serveur, aucun script) et `AboutPage.module.css`.
Textes : `src/content/about/` (`fr.ts`, `en.ts`, `es.ts` ; ancres et adresses dans `structure.ts`).

## Mise en page

| Largeur | Disposition |
|---|---|
| < 64 rem (1 024 px) | Une colonne, pleine largeur dans la gouttière de la barre : le titre, l'accroche, « Pourquoi ce site », puis « Sources ». |
| ≥ 64 rem | Grille `minmax(0, 1fr) minmax(0, 2fr)`, écart de 4 rem, sur toute la largeur utile : « Pourquoi ce site » à gauche, « Sources » à droite ; le titre et l'accroche couvrent les deux colonnes. |

- Haut de page : 6,75 rem sous le bord (barre fixe de 4,75 rem, plus 2 rem), zone sûre comprise. Bas : 4 rem avant le
  pied de page.
- Le `main` global du voyage laisse passer les clics vers la scène et réserve la place de la règle : la page
  rétablit `pointer-events` et reprend la gouttière de la barre.
- Gouttière de la barre : la page et son pied de page commencent sous le logo et finissent sous la langue. À droite
  `--gr` ; à gauche `--gl`, plus 8 px là où la barre réduit la marque à son pictogramme de 28 px, centré dans sa cible
  de 44 px (de 861 à 1 100 px, sous 360 px, et sans JavaScript à 860 px et moins). Sans ce retrait, le titre
  commençait à 16 px du bord, en avant du logo (vu à 1 024 px).
- Les paragraphes gardent une colonne de lecture de 34 rem au plus, environ 65 caractères à 1,0625 rem (la mesure du
  texte de l'accueil), même dans une section plus large ; à 42 rem, les lignes passaient 80 caractères.
- Liste des sources : colonnes de 18 rem au moins (`repeat(auto-fill, minmax(min(100%, 18rem), 1fr))`, écart de
  2 rem) qui se partagent la largeur de la section : une sur téléphone, deux sur tablette comme à 1 440 px, trois sur
  les écrans plus larges. Les filets s'alignent d'une colonne à l'autre.
- Les ancres (`#pourquoi`, `#sources`) se posent sous la barre grâce au `scroll-padding` global (5 rem).

## Typographie

| Élément | Police | Taille | Couleur |
|---|---|---|---|
| h1 | Bodoni 450, `opsz` auto | `clamp(2.25rem, 1.5rem + 3.2vw, 3.5rem)`, interligne 1,05 | ivoire |
| Accroche | Bodoni italique | `clamp(1.1875rem, 1.0625rem + 0.5vw, 1.375rem)`, interligne 1,3 | ivoire |
| h2 | Bodoni 450 | 2 rem, interligne 1,1 | ivoire |
| Paragraphes | Atkinson 400 | 1,0625 rem, interligne 1,6, 1 rem entre paragraphes | `#D9D3C4` |
| Noms des sources (liens) | Atkinson 600 | 1 rem | ivoire |
| Descriptions des sources | Atkinson 400 | 0,9375 rem, interligne 1,5 | `--brume` |

## Composants

- **Section** : `section[aria-labelledby]` vers son `h2` (`<ancre>-titre`). Elle s'ouvre sur un filet `--filet`, 3 rem
  sous ce qui la précède et 2 rem au-dessus du titre. Pas de sommaire : deux sections se voient d'un coup d'œil.
- **Liste filetée des sources** : `ul` sans puces, `role="list"` (Safari retire sinon le rôle de liste) ; chaque entrée
  sous un filet `--filet` ; le nom est le lien, la description suit. Toutes les sources du site, dans l'ordre du
  voyage, dont celles des chiffres clés de l'accueil.
- **Liens vers les sources** : ivoire, soulignés de laiton (1 px, décalage 0,2 em) ; au survol, soulignement ivoire de
  2 px. Cible de 44 px de haut (bloc en ligne, 0,5 rem au-dessus et au-dessous du texte). Vers un autre site : même
  onglet, « ↗ » collé au nom par une espace insécable et masqué aux lecteurs d'écran, qui entendent à la place
  « , site externe » (texte `.sr`, convention des compléments de nom du site). Les noms trop longs se coupent
  (`overflow-wrap: anywhere`). Titres originaux anglais (« NASA, Sun Fact Sheet », « JPL, Approximate Positions of
  the Planets ») : marqués `lang="en"` sur les pages française et espagnole, pour la synthèse vocale (critère 3.1.2),
  la précision « , site externe » restant dans la langue de la page ; le lien porte `hreflang="en"`.
- **Pied de page** : le pied de page commun (`ContactFooter` : signature, contacts de l'auteur, droit d'auteur) dans un
  `footer` entre les marges de la page ; la classe de la page écarte les marges du `footer` global, faites pour la
  règle et le dock du voyage.

## Accessibilité

- Ordre du DOM = ordre de lecture : lien d'évitement, barre, puis dans `main#contenu` le h1, l'accroche, « Pourquoi ce
  site » et « Sources », enfin le pied de page. Un seul h1, un h2 par section. Le titre et l'accroche sont dans un
  `div`, pas un `header` : dans `main`, il ne nommerait rien.
- Sans JavaScript : tout se lit. Aucun script sur la page.
- Couleurs forcées : les filets passent en `CanvasText` d'eux-mêmes.
- Contrastes (design-v2 § 5.1) : ivoire 15,64:1, `#D9D3C4` 13,16:1 et `--brume` 7,33:1 sur `--nuit`.

## Textes

- Titres de section : Pourquoi ce site · Sources (en : Why this site · Data sources, pour ne pas recopier « Sources » ;
  es : Por qué este sitio · Fuentes).
- Ancres communes aux trois langues (`#sources`) : un changement de langue garde le fragment.
- Typographie : en français, espace insécable dans « » et avant « : » et « ; » ; en anglais “ ” ; en espagnol « »
  collés.
- Les sources citées sont celles des plaques et des données (README, `stars.ts`, `localGroup.ts`, `universe.ts`) ;
  RECONS, sans adresse https valide, est nommé sans lien.
- Les chiffres clés de l'accueil renvoient à cette page : chacun figure à côté de sa source (NASA pour les 109 Terres,
  UAI 2012 pour les 8 min 19 s, Gaia DR3 pour Proxima, Wittkowski et al. 2012 pour VY Canis Majoris), écrit par
  `sourcedFigures` avec les mêmes données et les mêmes formateurs que l'accueil.
- Le crédit des cartes (Solar System Scope, CC BY 4.0) reste au pied de page du voyage, où les cartes s'affichent.
