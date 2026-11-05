# Astronomie — design system (MASTER)

> Généré le 2026-10-27 avec ui-ux-pro-max, puis **remplacé** : la proposition automatique
> (vert « catégorie », Outfit / Work Sans, fond menthe clair, style SaaS) ne correspondait pas
> au sujet. Ce fichier fait foi pour les écrans suivants. Une page peut le surcharger via
> `pages/<page>.md`.

## Direction

Un planétaire (l'instrument mécanique en laiton qui montre le mouvement des planètes),
rendu vivant : ciel de nuit, réglets gradués, une couleur propre à chaque astre.
Site pédagogique grand public (12 ans et plus), en français, en anglais et en espagnol. Quatre pages : Accueil,
Voyage, Tailles, À propos (précisions par page dans `pages/`).

- Un seul monde visuel, sombre, assumé (pas de thème clair) : `color-scheme: dark`.
- L'élément fort : la scène 3D aux positions réelles et le voyage au défilement.
  Tout le reste reste calme.
- La couleur d'accent change selon l'astre visité (`--c`).

## Couleurs

| Rôle | Hex | Variable |
|------|-----|----------|
| Ciel de nuit (fond) | `#060B18` | `--nuit` |
| Plaque (panneaux) | `#0B1430` | `--plaque` |
| Texte principal | `#ECE5D3` | `--ivoire` |
| Texte secondaire | `#959EB5` | `--brume` |
| Traits d'instrument (orbites, graduations) | `#C2A36B` | `--laiton` |
| Interaction (boutons, focus) | `#FFB547` | `--soleil` |

Couleurs d'astres : Soleil `#FFB13B`, Mercure `#B5ADA3`, Vénus `#E6CB94`, Terre `#5B9BE6`,
Mars `#DA6A43`, Jupiter `#D8A878`, Saturne `#E2C98F`, Uranus `#9ED9DE`, Neptune `#5878E8`.
Escales sans astre : vue d'ensemble `#FFB547`, astéroïdes `#A89F94`, au-delà `#C2A36B`,
étoiles voisines `#CFDCFF` (blanc bleuté), Voie lactée `#B3A4EE` (lavande), Groupe local `#A9B8E8` (bleu
pervenche), Univers observable `#E7A6C1` (rose poudré), multivers `#7FD8C8` (vert d'eau). Chacune tient 3:1 au moins
sur `--nuit` (pastilles, filets, curseur de la règle).

Couleurs des étoiles (scène, pastilles du tableau) : celles du corps noir de leur classe spectrale,
O `#9BB0FF`, B `#AABFFF`, A `#CAD7FF`, F `#F8F7FF`, G `#FFF4EA`, K `#FFD2A1`, M `#FFB56C`.

## Typographie

- Titres : **Bodoni Moda** (Didone, axe `opsz`), graisse 400–500, noms d'astres très grands.
- Texte et interface : **Atkinson Hyperlegible Next** (conçue pour la lisibilité, adaptée au
  public scolaire). Chiffres en `tabular-nums` dès qu'ils changent en direct.
- Pas de capitales espacées pour les étiquettes, pas de police mono décorative.
- Échelle : 0.8125 / 0.9375 / 1.0625 (texte) / 1.375 / 2 / 3.5–7 rem (noms d'astres).
- Espaces du français, sur tout texte affiché (canevas compris) : espace fine insécable (U+202F) entre les milliers
  et avant « ; ! ? », espace insécable (U+00A0) avant « : » et dans les guillemets « », jamais d'espace ordinaire à
  ces places (règle du README, gardée par un test). Anglais et espagnol : rien avant la ponctuation.

## Arrondis

Formes douces, pas d'angle vif (demande du 28/10/2026). Jetons dans `:root` :

| Jeton | Valeur | Usage |
|------|--------|-------|
| `--r-pill` | 999 px | Boutons, puces, interrupteurs, dock, barres de progression |
| `--r-lg` | 26 px | Plaques ; dock replié sur deux lignes |
| `--r-md` | 18 px | Encarts (note d'échelle) |
| `--r-sm` | 12 px | Champs de saisie, canevas des modules |
| `--r-xs` | 6 px | Contour de focus des liens de texte |

Le contour de focus suit l'arrondi de chaque commande ; ne pas lui imposer de rayon.

## Composants

- **Plaque** : panneau de lecture semi-opaque `--plaque` à 88 %, filet laiton 1 px, angles `--r-lg`,
  filet de la couleur de l'astre qui suit l'arrondi du haut.
  Mise en page compacte (téléphone ≤ 640 px, et tablette en portrait jusqu'à 1024 px de large) :
  elle est collée en bas, au-dessus du dock, et centrée : rang (version courte sur téléphone), nom,
  accroche, puis un titre-bouton par
  section (`h3` > `button[aria-expanded]`, motif accordéon), « Lire la fiche » et un libellé propre
  au module (« Votre poids sur chaque astre »), qui remplace le titre du module. Les titres-boutons
  se rangent côte à côte quand ils tiennent. Chaque section s'ouvre sous son titre, en fondu de
  200 ms, et « Replier » referme tout. Pendant le repos de la caméra, le filet de couleur
  (atténué à 50 %) s'éclaire de gauche à droite ; plein, le vol vers l'escale suivante commence
  (pas sur la dernière escale). Noms d'astres de 2,25 à 3,25 rem dans la plaque compacte. Dépliée,
  la plaque reprend sa place en haut de l'escale et s'allonge vers le bas ; le bouton touché passe
  sous la barre sans quitter la plage de repos de la caméra, et aucun repli ne déplace la caméra.
  La scène cadre l'astre dans la bande libre entre la barre (ou la note d'échelle) et la plaque
  repliée, au plus 90 % de sa hauteur et 80 % de la largeur, anneaux compris ; la vue d'ensemble
  de l'au-delà y est centrée. Écran court (≤ 700 px de haut) : plaque plus serrée. Sur grand écran
  ou sans JavaScript, tout est visible et les boutons sont masqués ; sur grand écran, l'astre est
  centré dans la zone libre entre la plaque et la règle, et recule s'il n'y tient pas.
  **Escales voisines** (mise en page compacte seulement : ailleurs, la règle suffit) : la plaque se ferme sur deux
  liens, « ← Vénus » à gauche, « Mars → » à droite : pilules de 44 px au filet `--filet` (en retrait des
  titres-boutons), flèche en laiton, nom court de la barre ; le nom accessible dit le sens et le nom entier
  (« Escale suivante : Mars », « Astre suivant : Trou noir du Fer à cheval cosmique »). Défilement doux vers
  l'escale, immédiat en mouvement réduit. Ni précédente à la première escale (la vue d'ensemble n'en est pas une), ni
  suivante à la dernière, dont la plaque ramène déjà au départ. Quand les deux ne tiennent pas côte à côte, la
  suivante passe dessous, toujours à droite ; aucun nom n'est coupé. L'interlude de la ceinture, escale de la règle,
  les a aussi, sous sa citation, sur le fond `.92` des pilules.
- **Accueil** : sur téléphone, le bouton « Partir du Soleil » est visible sans défiler, au-dessus du
  dock ; la date de départ passe sous les boutons.
- **Fiche** : grille 2 colonnes `dt` / `dd`, une ligne « ce jour » recalculée avec la date simulée.
- **Module** : une animation explicative par escale (Canvas 2D), boutons au clavier,
  texte équivalent en `aria-live`.
- **Plaques des escales lointaines** (étoiles voisines, Voie lactée, Groupe local, Univers observable, multivers) :
  même plaque que les astres, filet de la couleur de l'escale. « Lire la fiche » : texte, fiche `dt` / `dd`, puis
  deux lignes discrètes (0,8125 rem, `--brume`) : ce que la vue simplifie, puis les sources. Les étoiles voisines ont
  une seconde section, « Les étoiles de la carte » : tableau légendé (`caption`), colonnes Étoile / Distance
  (« 4,2 al », alignée à droite, chiffres tabulaires) / Type en mots simples (« naine rouge ») et sa
  précision en petit ; pastille de la couleur du point de la carte devant chaque nom ; filets `--filet`,
  cellules de 0,5 rem au moins. Le Groupe local a de même le tableau de ses galaxies (Galaxie / Distance / Taille).
  Le multivers est la dernière escale : sur téléphone, son filet reste plein.
- **Avertissement d'hypothèse** (multivers) : il ouvre la plaque, avant le rang et le titre, et reste visible plaque
  repliée : encadré de 1 px en pointillés de la couleur de l'escale, `--r-sm`, 0,875 rem ivoire, interligne 1,45.
  Pointillés comme le repère des autres univers dans la scène, dont l'étiquette dit aussi « hypothèse ». La ligne de
  ce que la vue simplifie commence par « Rendu artistique » : jamais de mot qui donnerait l'image pour observée.
- **Étiquettes du ciel profond** : repère creux posé exactement sur l'astre (couleur de l'étoile), texte à nu, sans
  pastille qui cacherait les astres, détaché du ciel par un halo `--nuit` serré autour des lettres (ombres empilées
  de 1 à 14 px) : lisible jusque sur les points les plus clairs de la galaxie, où chaque lettre garde la nuit pour
  fond (ivoire 15,6:1, brume 7,3:1, laiton 8,2:1). Aux étoiles voisines, six étoiles remarquables (Proxima et Alpha du
  Centaure, Barnard, Sirius, Procyon, Altaïr) ont leur nom en ivoire et leur distance en `--brume`, posées les
  premières ; les autres, nom seul en `--brume`, repère atténué. Placées après les astres, 2 px d'air au moins entre
  deux textes, sans recouvrir le point d'une étoile (point ± demi-taille + 2 px), halo compris (6 px autour du texte,
  sauf du côté de son repère), jamais hors de l'écran (texte à
  4 px des bords au moins, astre dans la vue) : texte à droite du repère, sinon à gauche, sinon le nom seul (la
  distance reste dans la plaque), sinon rien. Non interactives (la plaque donne la liste). Dès que le Soleil
  n'est plus qu'un point, « Soleil » se pose de même : seul son texte occupe la place, à droite ou à gauche du
  point ; aux étoiles voisines, sur téléphone comme sur grand écran, « Soleil » et « Proxima du Centaure » sont
  nommés (Alpha du Centaure, collée à Proxima, cède). À la Voie lactée, « Vous êtes ici » se lit au-dessus
  d'un anneau `--soleil` de 14 px autour du point-Soleil, et remplace « Soleil » (l'une s'efface avant que l'autre
  n'apparaisse) ; « Centre de la Galaxie » se lit sous son repère : à la même hauteur à l'écran, les deux textes
  ne se rencontrent jamais. Cercles de distance 5 et 10 al en laiton, étiquette 0,8125 rem, posée au premier point
  libre du cercle (côté opposé au Soleil d'abord, puis les côtés), sur une graduation de laiton de 2 × 9 px :
  jamais l'anneau d'une étoile. Libre veut dire à 8 px au moins de toute autre étiquette, graduation comprise : « 5 al »
  ne se lit jamais collé à « Soleil » ; sinon, plus loin sur le cercle. Au-delà de la Voie lactée, mêmes textes à halo : les galaxies du Groupe local par leur
  nom, puis « Toile cosmique », « Fond diffus cosmologique » et « Notre univers observable » ; les autres univers ont
  un repère en pointillés et un nom en italique qui dit l'hypothèse (« D'autres univers ? (hypothèse) »).
- **Ciel profond (scène)** : étoiles voisines aux couleurs de leur classe, cœur de 3,5 à 10 px selon leur magnitude
  absolue, entouré d'un halo de sa couleur 2,5 fois plus large ; Voie lactée en points additifs, bras
  bleus (étoiles jeunes), régions HII rouge rosé le long des bras majeurs, bulbe et barre jaune orangé, disque
  chaud et faible. L'éclat se règle à l'écran et s'atténue quand la galaxie rapetisse : jamais de blanc saturé.
  Cadrage des escales lointaines : comme les astres, elles remplissent la bande libre en mise en page compacte
  (80 % de la largeur, 90 % de la bande) et la zone libre sur grand écran (90 % de sa largeur, 80 % de la
  hauteur), inclinaison et perspective comprises ; les étoiles jusqu'à 17 al, la galaxie jusqu'au bord de son disque.
  Au-delà, les galaxies du Groupe local en points, grossies 6 fois (distances à l'échelle), leur nom posé à côté du
  disque dès qu'il dépasse le repère (repère effacé, `data-beside`), puis la toile cosmique, le
  fond diffus et les bulles du multivers, stylisés, cadrés comme une sphère ; une coquille qui déborderait sur la
  plaque ou la règle s'efface sur les 24 px qui l'en séparent.
- **Astre visité (scène)** : au repos sur une planète, son orbite s'estompe autour d'elle (effacée jusqu'à 2,5 rayons
  affichés, entière dès 6) et les autres planètes tombent à 35 % de leur éclat affiché ; le repos se défait sur le
  premier cinquième du vol et se refait sur le dernier ; en plein vol et aux escales sans planète, rien ne change. Une
  carte photographique qui arrive se fond en 400 ms dans la couleur unie de l'astre, en mouvement réduit compris
  (fondu enchaîné, sans mouvement).
- **Règle des distances** : sommaire vertical à échelle logarithmique, en trois segments : UA jusqu'à 50
  (les planètes), grand vide comprimé jusqu'à 1 al, puis années-lumière jusqu'à 10¹¹ al, au-delà de l'Univers
  observable (fin de l'axe à 98 %). Le multivers, à l'infini, se pose après l'axe, hors échelle (99,4 %).
  Entre le système solaire et les étoiles, l'axe s'interrompt de 87 à 88,5 % : signe « ≈ » en laiton,
  0,875 rem, centré sur l'axe. Graduations d'UA, puis une par puissance de dix d'années-lumière (majeures : 1 al,
  1 million et 1 milliard d'al). Sous les repères lointains : « dès 4,2 al », « centre à 27 000 al », « Andromède à
  2,5 millions d'al », « rayon de 46 milliards d'al », « hypothèse » (distances en 0,8125 rem). Seize repères, cibles
  de 24 px, 24 px au moins entre leurs centres (WCAG 2.5.8). Curseur suivant la caméra.
  Sur grand écran, seuls l'escale en cours et ses deux voisines (`data-near`) montrent nom et distance, à la ligne
  plutôt que tronqués (9 rem au plus) ; un texte qui toucherait celui d'à côté s'en écarte, sa pastille restant sur
  l'axe. Les autres repères se réduisent à une graduation : pastille de 7 px de leur couleur, texte masqué à l'œil mais
  lu, qui paraît en infobulle au survol (appareils qui survolent) et au focus clavier ; Échap la ferme seule, où que
  soit le focus. Cible d'un repère nommé : son texte (4 px d'air avec ses voisins) et sa pastille ; d'une graduation,
  24 × 24 px centrés sur sa pastille.
  Apparitions en fondu bref ; en couleurs forcées, axe, graduations, curseur et pastilles en couleurs du système. La
  règle des tailles suit le même modèle. Là où elle n'a plus que des pastilles (860 px et moins), en mise en page
  compacte et sur écran bas (546 px de haut et moins : téléphone en paysage, zoom à 400 %), elle laisse sa place au menu
  **Escales** : le nom de l'escale en cours (« Escales » à l'accueil), dans la barre, ouvre la liste des escales
  (pastille creuse, pleine pour l'escale en cours, nom, distance, lignes de 44 px). Sur écran bas, la liste s'ouvre
  sous la barre, restée fixe, et défile en elle-même jusqu'au bas de la vue. Sans JavaScript, la règle reste.
- **Note d'échelle** : encart `--r-md` bordé `--soleil`, visible avec les distances réelles ; au-dessus
  du dock ; en mise en page compacte, en haut sous la barre et dans la colonne de lecture, pour ne
  couvrir ni la plaque ni la règle. Sur téléphone, elle tient sur deux lignes, l'essentiel en tête :
  un chevron (ou un toucher sur le texte) l'affiche en entier, une croix la masque. Échap la masque (après avoir fermé une infobulle de la règle ou
  le menu des escales, s'il y en a).
- **Machine à remonter le temps** : dock bas en capsule, vitesse 1 jour à 1 an par seconde, retour à
  aujourd'hui. Sur grand écran, un fondu fixe de 140 px, de transparent à `--nuit`, passe sous lui au bas de l'écran,
  et un autre sous la barre haute, de `--nuit` à transparent sur la barre et 40 px (au-dessus du contenu, sous la
  règle, sans intercepter un clic) : une plaque qui glisse dessous s'efface au lieu d'être tranchée ou de croiser la
  marque, et le focus s'arrête avant eux (marges de défilement de 128 et 152 px) ; absents en mise en page compacte,
  sur écran bas et sans JavaScript, effacés pendant l'exploration. La vitesse
  active est une bulle ivoire qui glisse d'un choix à l'autre : le bord avant part le premier, l'arrière suit, léger
  rebond à l'arrivée ; instantanée en mouvement réduit. Une copie
  sombre des libellés, découpée à la forme de la bulle, inverse le texte exactement là où elle passe
  (jamais de texte sombre sur fond sombre). Le dock ne passe jamais à la ligne au-dessus de 360 px :
  complet au-delà de 900 px, boutons de droite réduits à leur icône jusqu'à 761 px, compact en dessous
  (un seul bouton de vitesse, date courte). Au doigt (`pointer: coarse`), chaque commande offre une cible de 44 px
  (40 à 42 px à la souris) ; à 384 px et moins, les écarts se resserrent d'autant, et le dock tient encore sur une
  ligne à 360 px. Aux escales lointaines (des étoiles voisines au multivers), où tout
  est déjà à l'échelle, la bascule « Distances réelles » est indisponible : atténuée (opacité 0,45, sans survol),
  toujours focalisable, `aria-disabled` avec sa raison en description (« Ici, les distances sont déjà
  réelles. ») ; un clic ne change rien et le choix revient au retour dans le système solaire. La note
  d'échelle s'y tait aussi, sans quitter sa place dans le cadrage ; si le focus y était, il rejoint la bascule
  du dock. À son retour, elle ne s'annonce pas de nouveau : seule l'activation des distances réelles l'annonce.
- **Bouton « Tourner autour »** : un seul, dans la barre haute, après le nom de l'escale (ou le menu des escales).
  Pilule de 44 px filetée `--filet-fort`, comme le menu des escales : pictogramme d'orbite en laiton, puis le
  libellé ; à 640 px et moins, le pictogramme seul, 44 × 44 (le libellé, masqué à l'œil, reste le début du nom
  accessible : « Tourner autour de Saturne »). Il suit l'escale affichée ; à la ceinture d'astéroïdes, il garde
  sa place sans se montrer. Écran bas (téléphone en paysage, zoom à 400 %) : dans la barre, fixe là aussi, il glisse
  avec elle. Absent sans JavaScript et sans scène 3D.
- **Exploration** : la page (barre, règle, plaques, pied de page, note d'échelle) s'efface en 0,6 s et devient
  inerte pendant que la caméra glisse vers la vue d'exploration ; tout est instantané en mouvement réduit. La page
  ne défile plus ; la scène et le dock restent. En haut, une barre en capsule, comme le dock : pastille et nom de
  l'escale, rappel des gestes et des flèches sur grand écran au pointeur précis (0,8125 rem, `--brume`, séparé par
  un filet ; sur deux lignes équilibrées quand la barre ne le tient pas d'une traite),
  bascule « Vu depuis la Terre » pour les sept planètes autres que la Terre (case dessinée, fond `--soleil` quand
  elle est enfoncée), puis « Terminer » ; boutons de 44 px. Sur téléphone, le nom de la planète cède sa place à la
  bascule. En bas, au-dessus du dock, le pavé en capsule : sept boutons ronds de 44 px (tourner vers la gauche, le
  haut, le bas, la droite ; s'éloigner, se rapprocher ; recentrer), sur une ligne dès 375 px, quatre puis trois
  sous 360 px. Écran bas (30 rem et moins : téléphone en paysage, zoom à 400 %) : barre, lecture et pavé forment une
  colonne au-dessus du dock, qui défile quand elle ne tient pas ; rien ne sort de l'écran ni ne se recouvre.
  Ailleurs, la surface de gestes : curseur main, l'astre suit le doigt. Échap ou « Terminer » rendent la page et le
  focus au bouton.
- **Lecture « Vu depuis la Terre »** : encart `--r-md` sous la barre, centré, sans commande : titre « Vu depuis la
  Terre, ce jour » (0,8125 rem, `--brume`), puis « Éclairée à 49 % · 24″ de diamètre · 46° à l'est du Soleil » et
  quand regarder (« Le soir, à l'ouest après le coucher du Soleil », suivi de l'instrument pour Uranus et Neptune),
  chiffres tabulaires, recalculés avec la date simulée. Pas de région live : la lecture est annoncée une fois, à
  l'activation, unités en toutes lettres.
- **Tailles** (`pages/tailles.md`) : la mise en page du Voyage, sans dock. Dix plaques d'étoile (rayon en R☉ et en
  km, type, température et sa réglette, distance, comparaison), une scène 3D qui cadre l'étoile affichée et la
  précédente, la règle des tailles (rayons solaires, logarithmique, une graduation par facteur 10) et, à 860 px et
  moins, le menu des étoiles dans la barre. Couleur de chaque étoile : celle du corps noir à sa température.
- **Barre haute** : marque à gauche, capsule des onglets au centre, puis un bloc à droite (commandes de la page,
  langue, menu replié), dans cet ordre de tabulation. Plus de 860 px, une grille `1fr auto 1fr` centre les onglets
  dans la barre ; une colonne latérale ne descend jamais sous la largeur de son contenu, si bien que les onglets se
  décalent vers la marque plutôt que de chevaucher les commandes, et retrouvent le centre dès que la place revient
  (au Voyage, à 1 329 px au pire, à l'escale la plus longue en espagnol). Seuil vérifié au pire cas (espagnol,
  Voyage) : 800 px de contenu pour 829 disponibles à 861 px en paysage ; en portrait, où le menu des escales remplace
  l'escale, 860 px qui ne tiennent qu'à 892 px : la grille y attend 900 px, la ligne d'origine sert avant. Hauteur
  inchangée, une seule ligne ; à 860 px et moins, les onglets passent dans « Menu ». Fond : au Voyage et à Tailles,
  un voile léger (`--voile` vers transparent, plus dense à 640 px et moins), pour que la scène 3D se devine dessous ;
  à l'Accueil et à À propos, où le texte défile sous la barre, `--nuit` plein jusqu'au bas des commandes puis un
  fondu sur la marge basse (0,9 rem) : rien ne se lit derrière la marque ni les onglets.
  **Barre qui glisse** (Voyage et Tailles, là où ni règle ni fondus ne la bordent : mise en page compacte et écran
  bas, en portrait comme en paysage) : elle glisse hors de l'écran (0,25 s, rien en mouvement réduit) après 16 px de
  descente, revient dès 8 px de remontée, et reste affichée en haut de page, quand le focus y entre (clavier, retour
  de l'exploration), quand la fenêtre change de largeur (rotation ; pas quand la barre d'adresse du navigateur se
  replie) et tant qu'un de ses menus est ouvert. Sa place reste
  réservée : la scène la lit au repos (l'astre ne bouge pas quand elle part, aucune étiquette ne se pose dessous) et
  le focus s'arrête toujours sous elle (marges de défilement). Sur écran bas (30 rem et moins), elle reste fixe,
  resserrée à 3,75 rem (0,5 rem autour des commandes de 44 px) ; sans JavaScript, elle y suit la page, comme celle de
  l'Accueil et d'À propos.
- **Choix de la langue** : le bouton de la barre montre le drapeau de la langue de la page, puis son code (« FR ») et
  le chevron ; chaque ligne de la liste (et du menu replié), le drapeau puis le nom de la langue dans sa langue ; les
  pilules sans JavaScript, le drapeau puis le code. Drapeaux en SVG (pas d'emoji : Windows ne les dessine pas),
  21 × 14 px au rapport 3:2 : France, Royaume-Uni pour l'anglais britannique (Union Jack redessiné en 3:2, sautoirs
  contre-changés), Espagne en drapeau civil, sans armoiries. Coins de 3 px (la moitié de `--r-xs`), filet de 1 px
  `--filet-fort` autour ; décoratifs (`aria-hidden`), le texte reste le libellé et le nom accessible. Masqués en
  couleurs forcées.
- **Barre haute sans JavaScript** : les boutons de la langue et du menu replié ne déplieraient rien ; à leur place,
  les pilules « FR · EN · ES » (liens directs) et, à toutes les largeurs, les onglets. À 860 px et moins, la marque se
  réduit à son pictogramme et la barre défile à l'horizontale quand la ligne ne tient pas, sans changer de hauteur.
- **Pied de page commun** (`ContactFooter`, dans le `footer` de chaque page ; au voyage, après les sources et le
  crédit des cartes) : sous un filet `--filet`, la signature (« Astronomie — un site de Thomas Caron », `--brume`),
  les coordonnées de l'auteur dans un `address` (GitHub, LinkedIn, puis l'adresse e-mail en clair sur un lien
  `mailto:`), enfin « © 2026 Thomas Caron » (0,8125 rem), poussé à droite. Pictogrammes de 18 px en `--laiton`,
  décoratifs ; libellés ivoire soulignés de laiton, cibles de 44 px ; liens externes signalés par « ↗ » et, aux
  lecteurs d'écran, « , site externe ». Une ligne quand elle tient, l'un sous l'autre à 640 px et moins. Pas de plan
  du site : les onglets restent dans la barre.

## Règles

- Données sourcées (NASA Planetary Fact Sheet, éléments orbitaux JPL 1800–2050 ; étoiles : Gaia DR3 et
  parallaxes publiées ; galaxie : modèle simplifié d'après Reid et al. 2019 et GRAVITY 2022 ; Groupe local :
  McConnachie 2012 ; Univers observable : Planck 2018 ; Tailles : rayons mesurés par interférométrie). Ce que la
  vue simplifie est dit sur la plaque (tailles des étoiles exagérées, bras dessinés d'après un modèle, galaxies
  grossies, toile cosmique et fond diffus stylisés) ; le multivers est une hypothèse, dite avant tout le reste.
- `prefers-reduced-motion` : temps en pause au chargement, pas d'animation automatique.
- Animations Canvas actives seulement quand elles sont visibles (batterie).
- Contraste texte ≥ 4.5:1, focus visible `--soleil`, cibles tactiles ≥ 44 px.
- Responsive : 375, 768, 1024, 1440 px ; aucun défilement horizontal.
