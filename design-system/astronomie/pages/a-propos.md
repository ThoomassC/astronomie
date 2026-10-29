# À propos — surcharge du MASTER

> Page de lecture : la notice gravée sous l'instrument. Sobre, très lisible, digne de confiance ; on y trouve vite
> les sources, les crédits, l'accessibilité et la confidentialité. Aucun effet : la typographie, l'espace et les
> filets de laiton font le rythme. Tout ce qui n'est pas écrit ici suit `../MASTER.md`.

Code : `src/components/about/AboutPage.tsx` (composant serveur, aucun script) et `AboutPage.module.css`.
Textes : `src/content/about/` (`fr.ts`, `en.ts`, `es.ts` ; ancres et adresses dans `structure.ts`).

## Mise en page

| Largeur | Disposition |
|---|---|
| < 64 rem (1 024 px) | Une colonne de 42 rem au plus, centrée. Le sommaire, replié dans un `<details>`, ouvre la page. |
| ≥ 64 rem | Grille `13rem minmax(0, 42rem)`, écart de 4 rem, centrée (59 rem). Sommaire ouvert et collant à gauche. |
| ≥ 64 rem et hauteur ≤ 30 rem | Même grille, sommaire non collant (il dépasserait de la vue). |

- Haut de page : 6,75 rem sous le bord (barre fixe de 4,75 rem, plus 2 rem), zone sûre comprise ; le sommaire
  collant s'arrête à la même hauteur, si bien que le titre et le sommaire partent alignés. Bas : 6 rem.
- Le `main` global du voyage laisse passer les clics vers la scène et réserve la place de la règle : la page
  rétablit `pointer-events` et des marges symétriques (`--gl`, `--gr`).
- Les ancres se posent sous la barre grâce au `scroll-padding` global (5 rem).

## Typographie

| Élément | Police | Taille | Couleur |
|---|---|---|---|
| h1 | Bodoni 450, `opsz` auto | `clamp(2.25rem, 1.5rem + 3.2vw, 3.5rem)`, interligne 1,05 | ivoire |
| Accroche | Bodoni italique | `clamp(1.1875rem, 1.0625rem + 0.5vw, 1.375rem)`, interligne 1,3 | ivoire |
| h2 | Bodoni 450 | 2 rem, interligne 1,1 | ivoire |
| Paragraphes, définitions | Atkinson 400 | 1,0625 rem, interligne 1,6, 1 rem entre paragraphes | `#D9D3C4` |
| Termes, noms des liens | Atkinson 600 | 1,0625 rem | ivoire |
| Descriptions des liens | Atkinson 400 | 0,9375 rem, interligne 1,5 | `--brume` |
| Sommaire | Atkinson 400 | 0,9375 rem (titre : 0,8125 rem) | `--brume`, ivoire au survol |

## Composants

- **Sommaire** (`nav` nommée « Sur cette page ») : les neuf sections dans l'ordre. Rendu deux fois, la feuille de
  style n'en affiche qu'un (l'autre est en `display: none`, donc hors de l'arbre d'accessibilité) :
  - replié : `<details>` natif, fermé au départ, bord `--filet-fort`, `--r-md` ; `summary` de 44 px avec un chevron
    de laiton dessiné en CSS (pointe en bas, en haut une fois ouvert, 200 ms) ; lignes de 44 px ;
  - ouvert : titre « Sur cette page » masqué aux lecteurs d'écran (la `nav` porte déjà ce nom), lignes de 36 px.
  Statique : pas de suivi du défilement, pas de triangle `--soleil`.
  Pourquoi deux rendus : un `<details>` fermé ne laisse pas toujours afficher son contenu par CSS
  (`::details-content` n'est pas partout) ; deux rendus évitent tout script.
- **Section** : `section[aria-labelledby]` vers son `h2` (`<ancre>-titre`), `tabindex="-1"` pour recevoir le focus
  quand on suit le sommaire (sans contour : c'est une cible de lecture). Elle s'ouvre sur un filet `--filet`, 3 rem
  sous la précédente et 2 rem au-dessus du titre.
- **Liste filetée de liens** (sources, crédits, signalements, code) : `ul` sans puces, `role="list"` (Safari
  retire sinon le rôle de liste) ; chaque entrée sous un filet `--filet`, 0,75 rem de marge ; le nom est le lien,
  la description suit. Licences en toutes lettres dans les descriptions (CC BY 4.0, OFL, MIT).
- **Liens de texte** : ivoire, soulignés de laiton (1 px, décalage 0,2 em) ; au survol, soulignement ivoire de 2 px.
  Vers un autre site : même onglet, « ↗ » collé au nom par une espace insécable et masqué aux lecteurs d'écran, qui
  entendent à la place « , site externe » (texte `.sr`, convention des compléments de nom du site). Les noms trop
  longs se coupent (`overflow-wrap: anywhere`).
- **Accessibilité** : `dl` en six couples (clavier, lecteurs d'écran, mouvement réduit, contrastes, textes
  équivalents, limites connues), filetés comme la fiche des plaques ; puis le lien de signalement.
- **Encart de confidentialité** : premier élément de sa section, `--r-md`, bord 1 px `--filet-fort` (le laiton,
  pas le soleil : ce n'est pas une alerte), fond `--plaque-a`, marge 1 rem × 1,25 rem, texte ivoire.
- **Langues** : cette page dans les trois langues, sur une ligne (« Français · English · Español »), chaque lien
  avec `lang` et `hreflang`, cible de 44 px de haut ; le point qui les sépare est dessiné (rien à lire). La langue
  de la page porte `aria-current="true"`, en gras et sans soulignement : elle ne se distingue pas que par la couleur.
  Liens simples vers la même section (`#langues`) dans l'autre langue : changer de langue recharge la page et
  l'on reste au même endroit ; seul le menu des langues de la barre pose le cookie.

## Accessibilité

- Ordre du DOM = ordre de lecture : sommaire, h1, accroche, neuf sections. Un seul h1, un h2 par section.
- Sans JavaScript : tout se lit ; le sommaire replié s'ouvre nativement. Aucun script sur la page.
- Mouvement réduit : seul le chevron bouge, et la règle globale coupe sa transition.
- Couleurs forcées : les filets et bords passent en `CanvasText` d'eux-mêmes ; le point entre les langues (un fond)
  disparaît, la langue courante reste en gras.
- Contrastes (design-v2 § 5.1) : ivoire 15,64:1, `#D9D3C4` 13,16:1 et `--brume` 7,33:1 sur `--nuit` ; ivoire sur
  l'encart 14,56:1. Bords des commandes en `--filet-fort` (3,54:1).

## Textes

- Titres de section : Pourquoi ce site · Pour qui · La démarche · Sources · Crédits · Accessibilité · Confidentialité
  · Langues · Code source (en : … Data sources …, pour ne pas recopier « Sources »).
- Ancres communes aux trois langues (`#accessibilite`) : un changement de langue garde le fragment.
- Typographie : en français, espace insécable dans « » et avant « : » et « ; » ; en anglais “ ” ; en espagnol « »
  collés. L'exemple de nombres de la section Langues sort des formateurs du site (`numberSample`).
- Les sources citées sont celles des plaques et des données (README, `stars.ts`, `localGroup.ts`, `universe.ts`) ;
  RECONS, sans adresse https valide, est nommé sans lien.
