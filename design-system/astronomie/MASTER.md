# Astronomie — design system (MASTER)

> Généré le 2026-10-27 avec ui-ux-pro-max, puis **remplacé** : la proposition automatique
> (vert « catégorie », Outfit / Work Sans, fond menthe clair, style SaaS) ne correspondait pas
> au sujet. Ce fichier fait foi pour les écrans suivants. Une page peut le surcharger via
> `pages/<page>.md`.

## Direction

Un planétaire (l'instrument mécanique en laiton qui montre le mouvement des planètes),
rendu vivant : ciel de nuit, réglets gradués, une couleur propre à chaque astre.
Site pédagogique grand public (12 ans et plus), en français.

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
étoiles voisines `#CFDCFF` (blanc bleuté), Voie lactée `#B3A4EE` (lavande).

Couleurs des étoiles (scène, pastilles du tableau) : celles du corps noir de leur classe spectrale,
O `#9BB0FF`, B `#AABFFF`, A `#CAD7FF`, F `#F8F7FF`, G `#FFF4EA`, K `#FFD2A1`, M `#FFB56C`.

## Typographie

- Titres : **Bodoni Moda** (Didone, axe `opsz`), graisse 400–500, noms d'astres très grands.
- Texte et interface : **Atkinson Hyperlegible Next** (conçue pour la lisibilité, adaptée au
  public scolaire). Chiffres en `tabular-nums` dès qu'ils changent en direct.
- Pas de capitales espacées pour les étiquettes, pas de police mono décorative.
- Échelle : 0.8125 / 0.9375 / 1.0625 (texte) / 1.375 / 2 / 3.5–7 rem (noms d'astres).

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
- **Accueil** : sur téléphone, le bouton « Partir du Soleil » est visible sans défiler, au-dessus du
  dock ; la date de départ passe sous les boutons.
- **Fiche** : grille 2 colonnes `dt` / `dd`, une ligne « ce jour » recalculée avec la date simulée.
- **Module** : une animation explicative par escale (Canvas 2D), boutons au clavier,
  texte équivalent en `aria-live`.
- **Plaques des escales lointaines** (étoiles voisines, Voie lactée) : même plaque que les astres, filet
  de la couleur de l'escale. « Lire la fiche » : texte, fiche `dt` / `dd`, puis deux lignes discrètes
  (0,8125 rem, `--brume`) : ce que la vue simplifie, puis les sources. Les étoiles voisines ont une
  seconde section, « Les étoiles de la carte » : tableau légendé (`caption`), colonnes Étoile / Distance
  (« 4,2 al », alignée à droite, chiffres tabulaires) / Type en mots simples (« naine rouge ») et sa
  précision en petit ; pastille de la couleur du point de la carte devant chaque nom ; filets `--filet`,
  cellules de 0,5 rem au moins. La Voie lactée est la dernière escale : sur téléphone, son filet reste plein.
- **Étiquettes du ciel profond** : repère creux posé exactement sur l'astre (couleur de l'étoile), texte (nom et
  distance) sur une pilule `--plaque-a` filetée `--filet` : lisible sur les points les plus clairs de la galaxie
  (sur du blanc pur, ivoire 11,8:1, laiton 6,2:1). Placées après les astres, sans que leurs textes se
  chevauchent ni recouvrent le point d'une étoile (point ± demi-taille + 2 px), jamais hors de l'écran (texte à
  4 px des bords au moins, astre dans la vue) : texte à droite du repère, sinon à gauche, sinon le nom seul (la
  distance reste dans la plaque), sinon rien. Non interactives (la plaque donne la liste). Dès que le Soleil
  n'est plus qu'un point, « Soleil » se pose de même : seul son texte occupe la place, à droite ou à gauche du
  point ; aux étoiles voisines, sur téléphone comme sur grand écran, « Soleil » et « Proxima du Centaure » sont
  nommés (Alpha du Centaure, collée à Proxima, cède). À la Voie lactée, « Vous êtes ici » se lit au-dessus
  d'un anneau `--soleil` de 14 px autour du point-Soleil, et remplace « Soleil » (l'une s'efface avant que l'autre
  n'apparaisse) ; « Centre de la Galaxie » se lit sous son repère : à la même hauteur à l'écran, les deux textes
  ne se rencontrent jamais. Cercles de distance 5 et 10 al en laiton, étiquette 0,75 rem, posée au premier point
  libre du cercle (côté opposé au Soleil d'abord, puis les côtés), sur une graduation de laiton de 2 × 9 px :
  jamais l'anneau d'une étoile.
- **Ciel profond (scène)** : étoiles voisines aux couleurs de leur classe ; Voie lactée en points additifs, bras
  bleus (étoiles jeunes), régions HII rouge rosé le long des bras majeurs, bulbe et barre jaune orangé, disque
  chaud et faible. L'éclat se règle à l'écran et s'atténue quand la galaxie rapetisse : jamais de blanc saturé.
  Cadrage des escales lointaines : comme les astres, elles remplissent la bande libre en mise en page compacte
  (80 % de la largeur, 90 % de la bande) et la zone libre sur grand écran (90 % de sa largeur, 80 % de la
  hauteur), inclinaison et perspective comprises ; les étoiles jusqu'à 17 al, la galaxie jusqu'au bord de son disque.
- **Règle des distances** : sommaire vertical à échelle logarithmique, en trois segments : UA jusqu'à 50
  (les planètes), grand vide comprimé jusqu'à 1 al, puis années-lumière jusqu'à 100 000 (plafond 98 %).
  Entre le système solaire et les étoiles, l'axe s'interrompt de 87 à 90 % : signe « ≈ » en laiton,
  0,875 rem, centré sur l'axe. Graduations d'UA, puis une par puissance de dix d'années-lumière (majeure : 1 al).
  Sous les repères lointains : « dès 4,2 al », « centre à 27 000 al ». Curseur suivant la caméra.
  Infobulles au survol (appareils qui survolent) et au focus clavier ; au doigt, le nom de l'escale
  en cours reste affiché. Là où elle n'a plus que des pastilles (860 px et moins) et en mise en page
  compacte, elle laisse sa place au menu **Escales** : le nom de l'escale en cours (« Escales » à
  l'accueil), dans la barre, ouvre la liste des escales (pastille creuse, pleine pour l'escale en
  cours, nom, distance en UA, lignes de 44 px). Sur écran bas (zoom à 400 %) et sans JavaScript,
  la règle reste.
- **Note d'échelle** : encart `--r-md` bordé `--soleil`, visible avec les distances réelles ; au-dessus
  du dock ; en mise en page compacte, en haut sous la barre et dans la colonne de lecture, pour ne
  couvrir ni la plaque ni la règle. Sur téléphone, elle tient sur deux lignes, l'essentiel en tête :
  un chevron (ou un toucher sur le texte) l'affiche en entier, une croix la masque. Échap la masque (après avoir fermé une infobulle de la règle ou
  le menu des escales, s'il y en a).
- **Machine à remonter le temps** : dock bas en capsule, vitesse 1 jour à 1 an par seconde, retour à
  aujourd'hui. La vitesse active est une bulle ivoire qui glisse d'un choix à l'autre : le bord avant
  part le premier, l'arrière suit, léger rebond à l'arrivée ; instantanée en mouvement réduit. Une copie
  sombre des libellés, découpée à la forme de la bulle, inverse le texte exactement là où elle passe
  (jamais de texte sombre sur fond sombre). Le dock ne passe jamais à la ligne au-dessus de 360 px :
  complet au-delà de 900 px, boutons de droite réduits à leur icône jusqu'à 761 px, compact en dessous
  (un seul bouton de vitesse, date courte). Aux étoiles voisines et à la Voie lactée, où tout est déjà
  à l'échelle, la bascule « Distances réelles » est indisponible : atténuée (opacité 0,45, sans survol),
  toujours focalisable, `aria-disabled` avec sa raison en description (« Ici, les distances sont déjà
  réelles. ») ; un clic ne change rien et le choix revient au retour dans le système solaire. La note
  d'échelle s'y tait aussi, sans quitter sa place dans le cadrage ; si le focus y était, il rejoint la bascule
  du dock. À son retour, elle ne s'annonce pas de nouveau : seule l'activation des distances réelles l'annonce.
- **Bouton « Tourner autour »** : un seul, dans la barre haute, après le nom de l'escale (ou le menu des escales).
  Pilule de 44 px filetée `--filet-fort`, comme le menu des escales : pictogramme d'orbite en laiton, puis le
  libellé ; à 640 px et moins, le pictogramme seul, 44 × 44 (le libellé, masqué à l'œil, reste le début du nom
  accessible : « Tourner autour de Saturne »). Il suit l'escale affichée ; à la ceinture d'astéroïdes, il garde
  sa place sans se montrer. Écran bas (téléphone en paysage, zoom à 400 %) : fixé en haut à droite, la barre lui
  réserve 52 px. Absent sans JavaScript et sans scène 3D.
- **Exploration** : la page (barre, règle, plaques, pied de page, note d'échelle) s'efface en 0,6 s et devient
  inerte pendant que la caméra glisse vers la vue d'exploration ; tout est instantané en mouvement réduit. La page
  ne défile plus ; la scène et le dock restent. En haut, une barre en capsule, comme le dock : pastille et nom de
  l'escale, rappel des gestes sur grand écran au pointeur précis (0,8125 rem, `--brume`, séparé par un filet),
  bascule « Vu depuis la Terre » pour les sept planètes autres que la Terre (case dessinée, fond `--soleil` quand
  elle est enfoncée), puis « Terminer » ; boutons de 44 px. Sur téléphone, le nom de la planète cède sa place à la
  bascule. En bas, au-dessus du dock, le pavé en capsule : sept boutons ronds de 44 px (tourner vers la gauche, le
  haut, le bas, la droite ; s'éloigner, se rapprocher ; recentrer), sur une ligne dès 375 px, quatre puis trois
  sous 360 px. Ailleurs, la surface de gestes : curseur main, l'astre suit le doigt. Échap ou « Terminer » rendent
  la page et le focus au bouton.
- **Lecture « Vu depuis la Terre »** : encart `--r-md` sous la barre, centré, sans commande : titre « Vu depuis la
  Terre, ce jour » (0,8125 rem, `--brume`), puis « Éclairée à 49 % · 24″ de diamètre · 46° à l'est du Soleil » et
  quand regarder (« Le soir, à l'ouest après le coucher du Soleil », suivi de l'instrument pour Uranus et Neptune),
  chiffres tabulaires, recalculés avec la date simulée. Pas de région live : la lecture est annoncée une fois, à
  l'activation, unités en toutes lettres.
- **Barre haute** : marque à gauche, capsule des onglets au centre, puis un bloc à droite (commandes de la page,
  langue, menu replié), dans cet ordre de tabulation. Plus de 860 px, une grille `1fr auto 1fr` centre les onglets
  dans la barre ; une colonne latérale ne descend jamais sous la largeur de son contenu, si bien que les onglets se
  décalent vers la marque plutôt que de chevaucher les commandes, et retrouvent le centre dès que la place revient
  (au Voyage, à 1 329 px au pire, à l'escale la plus longue en espagnol). Seuil vérifié au pire cas (espagnol,
  Voyage) : 800 px de contenu pour 829 disponibles à 861 px en paysage ; en portrait, où le menu des escales remplace
  l'escale, 860 px qui ne tiennent qu'à 892 px : la grille y attend 900 px, la ligne d'origine sert avant. Hauteur
  inchangée, une seule ligne ; à 860 px et moins, les onglets passent dans « Menu ».
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
  parallaxes publiées ; galaxie : modèle simplifié d'après Reid et al. 2019 et GRAVITY 2022). Ce que la
  vue simplifie est dit sur la plaque (tailles des étoiles exagérées, bras dessinés d'après un modèle).
- `prefers-reduced-motion` : temps en pause au chargement, pas d'animation automatique.
- Animations Canvas actives seulement quand elles sont visibles (batterie).
- Contraste texte ≥ 4.5:1, focus visible `--soleil`, cibles tactiles ≥ 44 px.
- Responsive : 375, 768, 1024, 1440 px ; aucun défilement horizontal.
