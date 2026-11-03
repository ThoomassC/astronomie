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
| ≥ 1 024 px (64 rem) | colonne de 76 rem centrée, marges de 2 rem au moins ; titre, texte et bouton à gauche, planétaire à droite (`1fr 1fr`, écart 4 rem, centrés verticalement) ; trois cartes côte à côte ; quatre chiffres sur une rangée ; 6 rem entre les blocs |
| 641 à 1 023 px | une colonne, marges de 2 rem ; planétaire de 28 rem centré, 3 rem sous le bouton ; cartes horizontales (pictogramme 48 px à gauche) ; chiffres en 2 × 2 ; 4 rem entre les blocs |
| ≤ 640 px | marges de 16 px ; bouton pleine largeur, visible sans défiler ; le haut du planétaire (pleine largeur) se devine dès l'arrivée ; cartes horizontales (pictogramme 40 px) ; chiffres en une colonne ; 3 rem entre les blocs |
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
| Étiquettes | HTML au-dessus du dessin, 0,8125 rem 600 ivoire, halo `--nuit` ; `aria-hidden` |
| Ligne datée | « Positions réelles du 29 octobre 2026 » : 0,9375 rem `--brume`, chiffres tabulaires, pastille `--soleil` dont le halo bat deux fois |
| Note | « Vu du dessus. Orbites rapprochées et planètes agrandies pour tenir dans le cadre. », 0,8125 rem `--brume` |
| Légende | huit entrées sur 4 colonnes (rocheuses, puis géantes) : pastille de 10 px aux mêmes formes que le dessin (anneaux de Saturne et de la Terre), nom en 0,8125 rem ivoire ; « Terre (vous êtes ici) » |

Taille : `min(100%, 34rem)` dès 1 024 px, `min(100%, 28rem)` au-dessous, `100%` jusqu'à 640 px ; boîte carrée
(`aspect-ratio: 1`) dès le serveur.

**Étiquettes** (`placeOrreryLabels`). Ordre de pose : « Vous êtes ici » (la Terre), Neptune, Uranus, Saturne,
Jupiter, Mars, Vénus, Mercure. Places essayées : vers l'extérieur (4 px au-delà de l'astre, anneaux compris, dans la
direction Soleil → planète), vers l'intérieur, puis au-dessus, au-dessous, à droite, à gauche. Texte aligné par son
début si la direction va vers la droite (cos > 0,3), par sa fin vers la gauche, sinon centré au-dessus ou au-dessous ;
dans une direction oblique, l'étiquette est poussée jusqu'à ce que son coin ne revienne plus sur l'astre. Une place
est refusée si elle sort du dessin (4 px), touche une étiquette posée (+ 4 px), une autre planète (+ 2 px) ou la lueur
du Soleil ; sans place, l'étiquette est abandonnée, la légende nomme toujours la planète. Mesure dans le DOM (taille
réelle des étiquettes), reprise au redimensionnement et à l'arrivée des polices.

**États.**
- Rendu serveur et avant hydratation : orbites, Soleil, note, légende ; la date affiche « – » dans une boîte qui a déjà
  la largeur de la plus longue date de la langue (« 28 de septiembre de 2026 ») : la ligne passe à la ligne au même
  endroit avant et après. Aucun décalage de mise en page.
- Après hydratation : les planètes, posées à l'heure du chargement (`performance.timeOrigin`, comme la date du
  voyage), apparaissent en fondu de 300 ms, décalé de 40 ms d'une orbite à l'autre, une seule fois ; puis les
  étiquettes. Aucune boucle d'animation.
- Mouvement réduit : tout est posé d'emblée (règle globale), la pastille ne bat pas.
- Sans JavaScript : orbites, Soleil, note et légende ; la ligne datée est masquée (`@media (scripting: none)`).
- Couleurs forcées : orbites en `CanvasText`, étiquettes sans halo.

**Ne jamais reconnaître une planète à sa seule couleur** : Vénus `#E6CB94` et Saturne `#E2C98F` sont indiscernables
(ΔE 1,0). Le nom (étiquette, légende), l'ordre des orbites et la forme (anneau de Saturne) portent l'identité ; la
couleur va sur la pastille, jamais sur le texte.

## Cartes (`HomeCards`)

Trois cartes sans couleur d'accent : `--plaque-a`, filet `--filet`, `--r-lg`, marge interne 2 rem (1,5 rem en
tablette, 1,25 rem sur téléphone). Pictogramme en traits `--laiton` de 1,5 px (Voyage : le Soleil, une orbite et une
étoile au bout du chemin ; Tailles : trois astres sur une règle ; À propos : une plaque gravée). Titre h3 Bodoni 2 rem :
c'est le lien, étendu à toute la carte (`a::after`), donc le nom accessible se limite au titre. Texte 1,0625 rem
`#D9D3C4`. Ligne d'action (« Commencer le voyage → ») en 0,9375 rem 700, `aria-hidden`, alignée en bas.
Focus : contour `--soleil` autour de la carte entière (`:has(a:focus-visible)`), sinon celui du lien. Survol (au
pointeur qui survole) : filet `--filet-fort`, voile ivoire à 4 %, flèche décalée de 3 px ; appui : voile à 8 %.
Section titrée par un h2 masqué (« Explorer le site »).

## Chiffres clés (`KeyFigures`)

Quatre chiffres, du plus proche au plus lointain, tirés des données du site : **109** Terres dans la largeur du
Soleil (NASA), **8 min 19 s** pour sa lumière (1 UA / c), **4,2 années-lumière** jusqu'à Proxima du Centaure (Gaia
DR3), **1 420** Soleils pour VY Canis Majoris (Wittkowski et al. 2012). Sans boîte, suspendus à un réglet : filet
`--filet-fort` en haut de chaque rangée, repère de 1 × 8 px à la couleur de l'astre (Soleil, Terre, étoiles voisines
`#CFDCFF`, VY CMa `#FFC987`), 1,25 rem au-dessus de la valeur.

Valeur en Atkinson 700, 2 rem, chiffres proportionnels ; symboles et unité en mots (« min », « s »,
« années-lumière ») en 1,0625 rem 600 sur la même ligne de base. Légende en 0,9375 rem `--brume`, qui prolonge la
valeur comme une phrase (« 109 Terres côte à côte pour égaler la largeur du Soleil »). « 8 min 19 s » se lit en
toutes lettres aux lecteurs d'écran (« 8 minutes et 19 secondes »). Sous la rangée : « Valeurs arrondies. Sources
détaillées dans À propos. », lien vers la page À propos.

## Accessibilité

- Ordre de lecture : script des anciens liens, lien d'évitement, barre, `main#contenu` (h1, texte, bouton,
  planétaire, cartes, chiffres, note des sources), pied de page.
- Le dessin est une image nommée par son titre et la ligne datée (« Les huit planètes autour du Soleil, vues du
  dessus. Positions réelles du 29 octobre 2026 ») ; la légende dit en plus aux lecteurs d'écran où est chaque
  planète, comme l'heure d'un cadran, midi en haut (« Vénus, à 2 heures »).
- Contrastes : ivoire 15,6:1 et `--brume` 7,3:1 sur `--nuit` ; sur une carte survolée, 13,5:1 et 6,3:1 ; orbites
  3,54:1 ; planètes de 4,93:1 (Neptune) à 12,6:1 (Uranus).
- Anciens liens (« /#saturne ») : un script en ligne, premier élément de la page, renvoie vers
  `/{lang}/voyage#saturne` avant la peinture (toute escale sauf « accueil »).
