# Notes de version — surcharge du MASTER

> Page de lecture, cousine d'À propos : ce qui change sur le site, version après version, de la plus récente à la
> plus ancienne. Le numéro de chaque version est le moment éditorial de la page ; le reste se lit d'un trait. Aucun
> effet : la typographie, l'espace et les filets de laiton font le rythme. Tout ce qui n'est pas écrit ici suit
> `../MASTER.md`.

Code : `src/components/releases/ReleasesPage.tsx` (composant serveur, aucun script) et `ReleasesPage.module.css`.
Route : `src/app/[lang]/notes-de-version/page.tsx`. Textes : `src/content/releases/` (`fr.ts`, `en.ts`, `es.ts` ;
versions, dates et ancres dans `structure.ts`).

## Mise en page

| Largeur | Disposition |
|---|---|
| < 64 rem (1 024 px) | Une colonne dans la gouttière de la barre : titre, accroche, sommaire, puis chaque version. En tête de version, « Version » et le numéro, puis la date et l'étiquette « Dernière version » côte à côte ; le résumé et les rubriques dessous. Rien ne colle. |
| ≥ 64 rem | Chaque version en grille `minmax(11rem, 18rem) minmax(0, 35rem)`, écart `clamp(3rem, 5vw, 5rem)`, alignée sur la gouttière : l'en-tête empilé à gauche (numéro, date, étiquette), collé sous la barre (`position: sticky`, 6,25 rem sous le haut, zone sûre comprise) tant qu'on lit sa version ; le résumé et les rubriques à droite. |
| `max-height: 30rem` | La barre suit la page (règle globale) : 1,5 rem en haut de page, et l'en-tête ne colle plus. |

- Haut de page : 6,75 rem sous le bord (barre fixe de 4,75 rem, plus 2 rem), zone sûre comprise. Bas : 4 rem avant le
  pied de page. Gouttière : celle d'À propos (`--gl`, plus 8 px là où la barre réduit la marque à son pictogramme).
- Colonne de lecture : 35 rem au plus, environ 67 caractères en Atkinson à 1,0625 rem (au plus 70).
- Chaque version s'ouvre sur un filet `--filet`, 3 rem sous ce qui la précède et 2 rem au-dessus de son contenu.
- Ancres `#v1-1-0`, `#v1-0-0` (`releaseAnchor`), communes aux trois langues : le `scroll-padding` global (5 rem) les
  pose sous la barre, et `scroll-margin-top: 1 rem` garde le filet visible.
- 375 et 320 px : une colonne, rien de coupé ; le sommaire passe à une version par ligne, la date à la ligne si elle
  ne tient pas à côté du lien ; les longs mots des points se coupent (`overflow-wrap: break-word`).

## Typographie

| Élément | Police | Taille | Couleur |
|---|---|---|---|
| h1 | Bodoni 450, `opsz` auto | `clamp(2.25rem, 1.5rem + 3.2vw, 3.5rem)`, interligne 1,05 | ivoire |
| Accroche | Bodoni italique | `clamp(1.1875rem, 1.0625rem + 0.5vw, 1.375rem)`, interligne 1,3, 40 rem au plus | ivoire |
| Titre du sommaire | Atkinson 400 | 0,8125 rem | `--brume` |
| Liens du sommaire | Atkinson 600 | 1 rem, cible de 44 px | ivoire, soulignés de laiton |
| « Version » (dans le h2) | Atkinson 400 | 0,9375 rem | `--brume` |
| Numéro (dans le h2) | Bodoni 450, chiffres alignés | `clamp(2.5rem, 2rem + 2.5vw, 3.5rem)`, interligne 1 | ivoire |
| Date | Atkinson 400 | 0,9375 rem | `--brume` |
| Étiquette « Dernière version » | Atkinson 600 | 0,8125 rem, pilule filetée `--filet-fort` | `--laiton` |
| Résumé | Bodoni italique | comme l'accroche, interligne 1,35 | ivoire |
| h3 (rubrique) | Bodoni 450 | 1,375 rem, interligne 1,2 | ivoire |
| Points | Atkinson 400 | 1,0625 rem, interligne 1,6, 0,5 rem entre deux | `#D9D3C4`, puces `--laiton` |

## Composants

- **Sommaire** : `nav` nommée par son titre (« Toutes les versions », `aria-labelledby`), liste sans puces
  (`role="list"`, que Safari retire sinon) ; chaque entrée, le lien « Version 1.1.0 » vers l'ancre, puis la date.
- **Version** : `section[aria-labelledby]` vers son h2 (« Version 1.1.0 », le mot et le numéro séparés par une espace
  dans le texte, posés l'un sous l'autre à l'œil). La date est un `<time dateTime="2026-11-06">`, écrite par
  `Intl.DateTimeFormat` dans la langue de la page, en UTC. L'étiquette « Dernière version » ne marque que la plus
  récente ; sans capitales espacées (MASTER).
- **Rubrique** : un h3, puis une `ul` à puces de laiton, 3 à 6 points en phrases courtes.
- **Pied de page** : le pied de page commun (`ContactFooter`), entre les marges de la page, comme À propos.
- **Barre** : celle de toutes les pages (`data-page="releases"`, sans commandes ni `data-pinned`) : fond de nuit plein
  puis fondu, comme à l'Accueil et à À propos. L'onglet porte un libellé court (« Versions », « Releases »,
  « Versiones ») pour que cinq onglets tiennent sur une ligne de 861 à 1 440 px (MASTER, « Barre haute ») ; le nom
  complet est le titre de la page et de l'onglet du navigateur.

## Accessibilité

- Ordre du DOM = ordre de lecture : lien d'évitement, barre, puis dans `main#contenu` le h1, l'accroche, le sommaire et
  les versions (en-tête, résumé, rubriques), enfin le pied de page. Un h1, un h2 par version, un h3 par rubrique.
- Sans JavaScript : tout se lit, le sommaire mène aux ancres. Aucun script sur la page.
- Couleurs forcées : filets et pilule passent en `CanvasText` d'eux-mêmes.
- Contrastes sur `--nuit` : ivoire 15,64:1, `#D9D3C4` 13,16:1, `--brume` 7,33:1, `--laiton` 8:1 environ.
- Changer de langue garde la page (`/en/notes-de-version` → `/fr/notes-de-version`), pas l'ancre.

## Textes

- Public de 12 ans et plus : pas de vocabulaire technique (ni rendu, ni test, ni décision d'architecture) ; les faits
  restent (quatre trous noirs dont celui du Fer à cheval cosmique, ombre, anneau, étoiles déviées…).
- Noms : Notes de version · Release notes · Notas de la versión ; sommaire : Toutes les versions · All releases ·
  Todas las versiones ; étiquette : Dernière version · Latest version · Última versión.
- Une nouvelle version s'ajoute en tête de `RELEASES` (`structure.ts`) et de chaque fichier de langue, avec les mêmes
  rubriques et le même nombre de points dans les trois langues ; `package.json` porte son numéro (gardé par un test).
