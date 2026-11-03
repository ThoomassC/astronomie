# Accueil (`/{lang}`) — surcharge du MASTER

> Page d'entrée du site, en français, anglais et espagnol. Ce fichier précise le MASTER pour cette page ; il
> n'ajoute ni couleur ni police. Code : `src/components/home/`, `src/lib/home/`, `src/content/home/`.

## Intention

On soulève le couvercle de l'instrument : le système solaire **tel qu'il est aujourd'hui**, dessiné comme un
planétaire en laiton. La date prouve que c'est vrai, « Vous êtes ici » ramène à soi. Ensuite, trois portes et quatre
ordres de grandeur. Pas de scène 3D : la page s'affiche tout de suite. Un seul bouton plein, vers le Voyage.

## Mise en page

| Largeur | Disposition |
|---|---|
| ≥ 1 024 px (64 rem) | colonne de 76 rem centrée, marges de 2 rem au moins ; titre, texte et bouton à gauche, planétaire à droite (`1fr 1fr`, écart 4 rem, centrés verticalement) ; le Voyage en avant sur toute la largeur (dessin à gauche, texte à droite), Tailles et À propos côte à côte dessous ; quatre chiffres sur une rangée ; 6 rem entre les blocs |
| 641 à 1 023 px | une colonne, marges de 2 rem ; planétaire de 28 rem centré, 3 rem sous le bouton ; cartes en deux colonnes, le Voyage sur toute la largeur au-dessus ; chiffres en 2 × 2 ; 4 rem entre les blocs |
| ≤ 640 px | marges de 16 px ; bouton pleine largeur, visible sans défiler ; le haut du planétaire (pleine largeur) se devine dès l'arrivée ; cartes en une colonne, dessin en haut ; chiffres en une colonne ; 3 rem entre les blocs |
| `max-height: 30rem` | la barre rejoint la page (règle globale) : plus de marge haute pour elle |

Le haut de page dégage la barre fixe (4,75 rem, encoche comprise), puis 3 rem (1,5 rem sur téléphone). En bas, le
pied de page commun (`ContactFooter` : signature, contacts de l'auteur) ferme la page, dans la même colonne, 4 rem
sous la note des sources (3 rem sur téléphone). Les règles globales `main` et `footer` (place de la règle des distances et du dock, contenu au-dessus de
la scène) ne s'appliquent pas ici. La barre est celle de toutes les pages (`SiteHeader`, `data-page="home"`, sans
commandes propres) : fond de nuit plein jusqu'au bas des commandes, puis fondu sur sa marge basse (MASTER, « Barre
haute »), puisque le contenu défile dessous sans scène.

Titre (h1) : Bodoni 450, `clamp(2.25rem, 4.4vw, 3.5rem)`, interligne 1,05, deux lignes dans les trois langues.
Texte : 1,0625 rem, interligne 1,6, `#D9D3C4` (couleur de `.lede`), 34 rem au plus. Bouton `.btn` suivi d'une flèche
de 12 px.

## Planétaire (`Orrery`, seule feuille client)

Dessin en SVG, `viewBox="-110 -110 220 220"`, orbite de Neptune au rayon 100 : rayon d'orbite
`(12 + 22 √a) / (12 + 22 √a_Neptune)`, la compression de la scène (`orreryOrbit`). Vue du nord de l'écliptique, y vers
le haut, sens inverse des aiguilles pour le mouvement des planètes.

| Élément | Rendu |
|---|---|
| Orbites | `--laiton` à 60 %, 1 px non mis à l'échelle (3,54:1 sur `--nuit`) |
| Soleil | disque de rayon 5 `#FFB13B`, lueur de rayon 11 (dégradé radial à 35 % → 0), sans animation |
| Planètes | rayons 1,6 (Mercure) · 2,2 · 2,3 · 1,9 · 4,2 · 3,6 · 3,0 · 2,9 (Neptune) ; l'ordre des tailles est juste, pas leur rapport (la note le dit) ; anneau de surface de 1,5 px `--nuit` qui détache deux disques qui se croisent |
| Saturne | anneau rx 6,4 × ry 2, incliné de −20°, en deux moitiés (derrière puis devant le disque) |
| Terre | anneau `--soleil` de 2 px, 2,2 unités au-delà du disque (3,4 px à 343 px, 5,4 px à 544 px) |
| Étiquettes | HTML au-dessus du dessin, 0,8125 rem 600 ivoire, halo `--nuit` ; `aria-hidden` ; 6 px entre deux étiquettes |
| Filets | étiquette reportée hors du groupe intérieur : trait `--laiton` plein de 1 px (8:1 sur `--nuit`, plus franc que les orbites qu'il croise), du bord de l'astre au bord de l'étiquette |
| Ligne datée | « Positions réelles du 29 octobre 2026 » : la date des positions dessinées (le build avant le script, le chargement ensuite) ; 0,9375 rem `--brume`, chiffres tabulaires, pastille `--soleil` dont le halo bat deux fois |
| Note | « Vu du dessus. Orbites rapprochées et planètes agrandies pour tenir dans le cadre. », 0,8125 rem `--brume` |
| Légende | huit entrées sur 4 colonnes (rocheuses, puis géantes) : pastille de 10 px aux mêmes formes que le dessin (anneaux de Saturne et de la Terre), nom en 0,8125 rem ivoire ; « Terre (vous êtes ici) ». Visible tant que les étiquettes ne nomment pas les planètes, puis effacée (opacité 0, fondu de 200 ms) sans quitter sa place |

Taille : `min(100%, 34rem)` dès 1 024 px, `min(100%, 28rem)` au-dessous, `100%` jusqu'à 640 px ; boîte carrée
(`aspect-ratio: 1`) dès le serveur.

**Étiquettes** (`placeOrreryLabels`). Aucune ne se pose dans le groupe intérieur (l'orbite de Mars et son disque,
plus 4 px), où Mercure, Vénus et la Terre se serrent à quelques px (début novembre 2026 : à 7° les unes des autres).
Pour chaque planète, 24 directions autour de la direction Soleil → planète (tous les 15°), à partir de la première
place qui touche presque l'astre (4 px au-delà, anneaux compris) et sort du groupe intérieur, puis de plus en plus
loin (tous les 6 px, jusqu'à 84 px). Texte aligné par son début si la direction va vers la droite (cos > 0,3), par sa
fin vers la gauche, sinon centré au-dessus ou au-dessous ; dans une direction oblique, l'étiquette est poussée jusqu'à
ce que son coin ne revienne plus sur l'astre. Une place est refusée si elle sort du dessin (4 px), entre dans le groupe
intérieur ou couvre un astre (anneaux compris, + 2 px). À plus de 8 px de son astre, l'étiquette est reportée au bout
d'un filet, qui part à 1,5 px du bord de l'astre et s'arrête à 2 px du milieu de son bord d'attache, sans passer sur
la lueur du Soleil ni sur le disque d'une autre planète (il peut traverser un anneau). Coût d'une place : son
éloignement, 0,15 px par degré d'écart à la radiale, 20 px pour un filet et 16 de plus s'il traverse un anneau.
Quatre ordres de pose sont essayés, « Vous êtes ici » toujours d'abord ; chaque étiquette prend sa place la moins
coûteuse qui reste à 6 px des étiquettes posées sans croiser leurs filets, et la mise en page la moins coûteuse
l'emporte. Sans place (texte très agrandi sur un petit dessin), une étiquette manque : la légende reste alors visible.
Mesure dans le DOM (taille réelle des étiquettes), reprise au redimensionnement et à l'arrivée des polices. Tests :
les huit planètes nommées sans chevauchement de 2026 à 2028, à 288, 343, 448 et 544 px, en français et en espagnol,
et aux jours où les planètes intérieures se serrent (conjonctions de Vénus, Mercure, Vénus et la Terre alignées).

**États.**
- Rendu serveur et avant hydratation : tout le dessin, aux positions de la génération de la page, c'est-à-dire du
  build : `next.config.ts` fixe l'heure une fois (`env.BUILD_TIME`), Next l'inscrit dans le code, rien ne lit
  l'horloge au rendu et la page reste statique. La ligne datée dit ce jour, en temps universel (le serveur et le
  navigateur l'écrivent à l'identique), dans une boîte qui a déjà la largeur de la plus longue date de la langue
  (« 28 de septiembre de 2026 ») : la ligne passe à la ligne au même endroit avant et après. La légende nomme les
  planètes ; pas encore d'étiquettes (elles se mesurent dans la page).
- Après hydratation : les planètes glissent en 1,2 s le long de leurs orbites jusqu'à leurs positions du chargement
  (`performance.timeOrigin` du navigateur, comme la date du voyage), en avant et en moins d'un tour
  (`glideLongitude`) : la transition interpole chaque rotation autour du Soleil. La date passe au jour local du
  chargement. Le glissement s'achève avec la transition d'une planète (`transitionend`), ou par une minuterie de
  secours de 1,2 s si elle n'a pas lieu ; alors seulement étiquettes et filets paraissent (fondu de 200 ms), et la
  légende s'efface (`data-labelled`) sans quitter sa place : rien ne bouge sous le planétaire. Aucune boucle
  d'animation.
- Monté dans le navigateur (navigation interne) : les positions du chargement d'emblée, sans glissement.
- Mouvement réduit : rien ne glisse, tout se pose d'emblée (règle globale), la pastille ne bat pas.
- Sans JavaScript, ou script lent, bloqué ou en échec : tout le dessin, la ligne datée (jour du build), la note et la
  légende.
- Couleurs forcées : orbites et filets en `CanvasText`, étiquettes sans halo.

**Ne jamais reconnaître une planète à sa seule couleur** : Vénus `#E6CB94` et Saturne `#E2C98F` sont indiscernables
(ΔE 1,0). Le nom (étiquette, légende), l'ordre des orbites et la forme (anneau de Saturne) portent l'identité ; la
couleur va sur la pastille, jamais sur le texte.

## Cartes (`HomeCards`)

Trois cartes sans couleur d'accent : `--plaque-a`, filet `--filet`, `--r-lg`. Chacune s'ouvre sur une illustration
en SVG (`CardArt`) : une fenêtre sur le ciel de nuit au rapport 12:5 (viewBox de 240 × 100), à l'arrondi du haut de la
plaque, séparée du texte par un filet `--filet`. Traits `--laiton` de 1 px quelle que soit la taille, astres aux
couleurs du site :
- Voyage : le Soleil près du bord gauche, ses orbites en arcs, les planètes en pastilles (la Terre et son anneau
  `--soleil`, Saturne et le sien), puis une trajectoire en pointillés (du laiton à l'ivoire) qui file vers une étoile,
  passé une galaxie lavande ;
- Tailles : sur une même ligne de sol graduée, Proxima du Centaure, le Soleil, Sirius A, Arcturus, Rigel et VY Canis
  Majoris (couleurs de l'onglet Tailles), de plus en plus grands, puis un trou noir, le plus grand : anneau lumineux,
  anneau de photons, centre noir ;
- À propos : des fiches de sources (pastilles d'astres, lignes de texte, flèches de lien externe) sur un réglet gradué.

Dessins centrés sans rogner : dans un cadre d'un autre rapport, orbites et étoiles posées hors du viewBox prolongent le
ciel. Décoratifs (`aria-hidden`), sans script ni animation ; en couleurs forcées, ils gardent leurs couleurs sur leur
propre fond, comme une image (`forced-color-adjust: none`). Le Voyage est mis en avant (`data-featured`) : sur toute la
largeur au-dessus des deux autres dès 641 px (dessin de 18 rem de haut au plus), puis dès 64 rem dessin à gauche (un
peu plus de la moitié de la carte, 17 rem de haut au moins) et texte à droite, centré en hauteur, titre de 2,5 rem.

Marge interne du texte 2 rem (1,5 rem en tablette, 1,25 rem sur téléphone, 2,5 rem pour le Voyage en avant). Titre h3
Bodoni 2 rem : c'est le seul lien, étendu à toute la carte (`a::after`), donc le nom accessible se limite au titre.
Texte 1,0625 rem `#D9D3C4`. Ligne d'action (« Commencer le voyage → ») en 0,9375 rem 700, `aria-hidden`, alignée en
bas.
Focus : contour `--soleil` autour de la carte entière (`:has(a:focus-visible)`), sinon celui du lien. Survol (au
pointeur qui survole) : filet `--filet-fort`, voile ivoire à 4 %, flèche décalée de 3 px ; appui : voile à 8 %.
Section titrée par un h2 masqué (« Explorer le site »).

## Chiffres clés (`KeyFigures`)

Quatre chiffres, du plus proche au plus lointain, tirés des données du site : **109** Terres dans la largeur du
Soleil (NASA), **8 min 19 s** pour sa lumière (1 UA / c), **4,2 années-lumière** jusqu'à Proxima du Centaure (Gaia
DR3), **1 420** Soleils pour VY Canis Majoris (Wittkowski et al. 2012). Sans boîte, suspendus à un réglet : filet
`--filet-fort` en haut de chaque rangée, repère de 1 × 8 px à la couleur de l'astre (Soleil, Terre, étoiles voisines
`#CFDCFF`, VY CMa `#FFC987`), 1,5 rem au-dessus de la valeur ; rangées espacées de 2,5 rem (2 rem sur téléphone).

Valeur : le moment éditorial de la page, en Bodoni 450 à la taille d'affichage des noms d'astres,
`clamp(2.5rem, 5vw, 3.5rem)`, interligne 1,05, chiffres alignés (`lining-nums`). Symboles et unité en mots (« min »,
« s », « années-lumière ») en Atkinson 1,0625 rem 600, sur la même ligne de base ; l'espace qui les précède est à leur
taille (« 8 min » reste serré). Le nombre et ses symboles ne se coupent jamais ; l'unité en mots, d'un seul tenant,
passe sous le nombre quand la colonne est trop étroite (quatre colonnes à 1 024 px). Légende en 0,9375 rem `--brume`,
24 rem au plus, 0,75 rem sous la valeur, qui la prolonge comme une phrase (« 109 Terres côte à côte pour égaler la
largeur du Soleil »). « 8 min 19 s » se lit en toutes lettres aux lecteurs d'écran (« 8 minutes et 19 secondes »).
Sous la rangée : « Valeurs arrondies. Sources détaillées dans À propos. », lien vers la page À propos.

## Accessibilité

- Ordre de lecture : script des anciens liens, lien d'évitement, barre, `main#contenu` (h1, texte, bouton,
  planétaire, cartes, chiffres, note des sources), pied de page.
- Le dessin est une image nommée par son titre et la ligne datée (« Les huit planètes autour du Soleil, vues du
  dessus. Positions réelles du 29 octobre 2026 ») ; la légende, lue même effacée, dit en plus aux lecteurs d'écran où
  est chaque planète, comme l'heure d'un cadran, midi en haut (« Vénus, à 2 heures »), dès le rendu serveur.
- Les illustrations des cartes sont décoratives (`aria-hidden`) : le titre, seul lien, nomme la carte.
- Contrastes : ivoire 15,6:1 et `--brume` 7,3:1 sur `--nuit` ; sur une carte survolée, 13,5:1 et 6,3:1 ; orbites
  3,54:1 ; planètes de 4,93:1 (Neptune) à 12,6:1 (Uranus).
- Anciens liens (« /#saturne ») : un script en ligne, premier élément de la page, renvoie vers
  `/{lang}/voyage#saturne` avant la peinture (toute escale sauf « accueil »).
