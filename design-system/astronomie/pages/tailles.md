# Tailles — surcharge du MASTER

> Le vertige de l'échelle : à chaque coup de défilement, une étoile si grande que la précédente devient un caillou,
> puis un point. On ne perd jamais pied : une règle des rayons qui monte d'un facteur 10 à chaque graduation,
> l'échelle graphique du Soleil, des nombres honnêtes, et la couleur de chaque étoile qui dit sa température.
> Tout ce qui n'est pas écrit ici suit `../MASTER.md`.

Code : `src/components/sizes/` (`SizesPage.tsx`, `StarPlate.tsx`, `SizesIntro.tsx`, `SizesScene.tsx`,
`sizesEngine.ts`, `starMeshes.ts`, `SizesRail.tsx`, `SizesMenu.tsx`, `CurrentStar.tsx`) et `SizesPage.module.css`.
Textes : `src/content/sizes/` (serveur) et `src/components/sizes/sizes.strings.ts` (client). Données :
`src/lib/astro/starSizes.ts`. Décision d'architecture : `docs/adr/0004-comparateur-de-tailles.md`.

## Mise en page

La mise en page est **celle du Voyage**, sans dock : on sait déjà la lire.

| Largeur | Disposition |
|---|---|
| Grand écran | Plaques à gauche, règle des tailles à droite, scène dans la zone libre entre les deux. La caméra cadre la paire : l'étoile affichée à gauche, la précédente, plus petite, à sa droite. |
| Mise en page compacte (≤ 640 px, ou tablette en portrait ≤ 1 100 px) | Plaque compacte collée en bas (`--dock-clear` = 16 px + zone sûre : pas de dock), paire cadrée dans la bande libre au-dessus. |
| ≤ 860 px avec JavaScript | La règle cède la place au menu des étoiles, dans la barre (bouton « Étoiles » à l'introduction, sinon pastille et nom de l'étoile). |

- Ordre du DOM, qui est l'ordre de lecture : lien d'évitement, barre commune (étoile affichée, menu des étoiles),
  règle (`nav`), `main#contenu` (introduction, dix plaques), pied de page commun. Scène, étiquettes et échelle graphique
  sont `aria-hidden` : la plaque porte les noms et les nombres.
- Introduction : la mise en page `.hero` du Voyage, un titre, un texte, une ligne discrète (0,8125 rem `--brume`)
  et l'**unique bouton plein** de la page, vers la plus petite étoile.

## Plaques d'étoile (`StarPlate` sur `Plate`)

| Partie | Spécification |
|---|---|
| Section | `section.stop#{ancre}[data-stop]`, comme le Voyage ; `--c` = couleur de l'étoile |
| Rang | `.rank` : pastille `--c`, « 9ᵉ sur 10 · supergéante rouge » (ordinal en exposant en français ; « 9th of 10 », « 9.ª de 10 ») |
| Nom (h2) | barème du Voyage ; mise en page compacte : `clamp(2.25rem, 7vw, 3.25rem)` (« VY Canis Majoris » tient sur une ligne à 375 px) |
| Accroche | la comparaison qui frappe, visible même repliée ; Soleil : « Vu de l'espace, le Soleil est presque blanc. » |
| Fiche (`.facts`, deux colonnes) | Rayon (dd en R☉ ; `small` : kilomètres à 4 chiffres significatifs, puis la fourchette publiée si le rayon est débattu) · Type (catégorie ; `small` : type spectral) · Température, **pleine largeur** (dd en K ; `small` : couleur en mots et comparaison au Soleil, puis la réglette) · Distance (en toutes lettres) · Comparaison, **pleine largeur**, en graisse de texte courant |
| Pied | `.fact-caveat` (seulement les quatre rayons débattus) puis `.fact-source` ; dernière plaque : `.btn.ghost` « Revenir au plus petit » ; puis, en mise en page compacte, les astres voisins (MASTER, « Escales voisines ») : « ← Antarès A », « VY Canis Majoris → », nom court affiché, nom entier dans le nom accessible (« Astre suivant : Trou noir du Fer à cheval cosmique ») ; rien avant le plus petit, rien après le plus grand |

**Couleur en mots** : orangée sous 3 800 K, orange pâle jusqu'à 5 200 K, blanche jusqu'à 7 500 K, blanc bleuté
au-delà, toujours suivie de « plus froide / plus chaude que le Soleil (5 772 K) ».

**Réglette des températures** (`aria-hidden`, rendue par le serveur) : piste de 6 px, `--r-pill`, sur toute la
largeur ; échelle logarithmique de 2 500 à 13 000 K ; dégradé des couleurs de corps noir de Charity (2 800 →
12 100 K) ; triangle ivoire de 8 px au-dessus pour l'étoile ; trait `--laiton` de 1 × 10 px dessous pour le Soleil
(« Soleil » en 0,75 rem `--brume`, sauf sur sa propre plaque) ; « plus froide » et « plus chaude » aux bouts. Ici,
rouge veut dire froid.

## Scène

- **Étoiles** : sphères du matériau d'étoile du Soleil (`starSurface`), adapté par `starMeshes.ts` :
  - couleur du centre du disque : celle de la plaque (corps noir à la température effective), éclat HDR adouci par le
    tone mapping. Le Soleil y est **presque blanc**, écart assumé avec l'orange du Voyage, que l'accroche explique ;
  - cellules de convection d'autant plus grandes que l'étoile l'est, de 80 par rayon (Proxima) à quelques cellules
    géantes (supergéantes) ; granulation presque effacée pour les étoiles chaudes (Sirius A, Rigel) ;
  - taches pour le Soleil seulement, selon l'activité du jour ;
  - halo additif de 1,25 rayon ; celui de l'étoile qui arrive entre en fondu sur les 30 premiers % du vol.
- **Étiquettes** (style `.lbl.deep`) : « Nom · 764 R☉ » sur une pilule `--plaque-a`.
  - Étoile de 24 px de diamètre ou plus à l'écran : pilule seule, centrée **au-dessus du limbe** à 8 px, sinon
    dessous, sinon rien ; elle n'en sort que sous 18 px (hystérésis).
  - Plus petite : anneau creux de 10 px à sa couleur, texte à droite, sinon à gauche, sinon le nom seul.
  - Soleil sous 14 px : l'anneau « ici » de 14 px et 2 px en `--soleil`, réservé au Soleil, « Soleil · 1 R☉ ».
  - Ordre de pose : étoile affichée, précédente, Soleil, puis de la plus grande à la plus petite. Barre, règle,
    échelle graphique et place des plaques sont réservées d'avance.
- **Échelle graphique** : pilule `--plaque-a`, bord `--filet`. Ligne 1 : le Soleil **à l'échelle** (disque `#FFF1E7`
  de 4 à 24 px, sinon un point dans un anneau de 10 px `--soleil`), puis un trait `--laiton` terminé par deux traits
  de 8 px. Ligne 2 : « {n} Soleils côte à côte », 0,75 rem `--brume`. n parmi 2, 5, 10 … 2 000, le plus grand qui
  tient en 160 px (112 px en compact). Elle paraît, en fondu de 200 ms, quand le Soleil fait 24 px ou moins. Grand
  écran : en bas à droite, à gauche de la règle ; compact : en haut à droite, sous la barre. Toujours sous le contenu
  (une fiche dépliée passe devant), au-dessus de la scène et de ses étiquettes.

## Règle des tailles

- `RailView` tel quel : axe continu de 4 à 96 %, graduations à 0,1 ; **1** (majeure) ; 10 ; 100 ; 1 000 R☉, repères
  nommés « Sirius A, 1,711 R☉ », pastilles de la couleur de l'étoile, curseur `--soleil`.
- Nom accessible : « Règle des tailles, de la plus petite à la plus grande étoile ».
- Légende décorative sous la règle, 0,75 rem `--brume` : « × 10 à chaque graduation » ; elle part avec la règle.

## Mouvement et repli

- Vol : distance sur une échelle géométrique, la cible suit le zoom ; l'étoile suivante n'est dessinée qu'une fois le
  vol commencé, toujours hors champ à cet instant (invariant de non-apparition, testé sur quatre vues).
- **Aucune image calculée au repos.** La surface des étoiles ne bouillonne que pendant un vol, jamais en mouvement
  réduit. La règle globale de mouvement réduit coupe les transitions (échelle graphique, dépliage des plaques).
- Sans WebGL ou en rendu logiciel : pas de scène, fond `--nuit` (`no3d`) ; plaques, règle et menu restent.
  Sans JavaScript : l'introduction et les dix plaques entières, la règle.
- Couleurs forcées : réglette masquée (décorative, faite de dégradés) ; échelle graphique gardée, son texte, son trait
  et le Soleil à l'échelle redessinés en bordures (`CanvasText`).

## Non vérifié dans un navigateur

Captures 1 440 × 900 et 375 × 812, fr / en / es, clair et sombre ; vol lent de Rigel à Antarès A ; lisibilité des
étiquettes et de l'échelle graphique pendant un vol ; coût GPU au repos et en vol sur téléphone.
