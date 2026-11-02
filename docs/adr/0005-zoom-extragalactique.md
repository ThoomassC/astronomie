# ADR 0005 — Zoom extragalactique : du Groupe local au multivers

- Statut : accepté
- Date : 30/10/2026 ; révisé le 02/11/2026 (galaxies grossies 6 fois au lieu de 4, noms à côté des disques)
- Portée : escales « Le Groupe local », « L'Univers observable » et « Le multivers » (`localGroup`, `universe`,
  `multiverse`), après la Voie lactée ; prolonge l'ADR 0001

## Contexte

Le voyage s'arrêtait à la Voie lactée (zoom 8). Trois escales s'ajoutent : le Groupe local, l'Univers observable et
le multivers. Andromède est à 2,5 millions d'al et l'Univers observable mesure environ 46 milliards d'al de rayon. Le
multivers est une hypothèse, jamais observée. Contraintes :

- garder le zoom de l'ADR 0001 : une seule scène, des groupes mis à l'échelle, des vols continus ;
- la précision float32 et le plan lointain doivent tenir jusqu'au multivers ;
- aucune image calculée au repos ;
- n'utiliser que des données vérifiées (`donnees-v2.md`), dans les trois langues ;
- dire clairement que le multivers est une hypothèse, partout où il paraît.

## Décision

- **Escales et zooms.** `STOP_ORDER` se termine par `COSMIC_STOPS` : `stars` (4,6), `galaxy` (8), `localGroup` (9,7),
  `universe` (14), `multiverse` (15).
  - Groupe local : cible à mi-chemin d'Andromède. Azimut perpendiculaire à l'axe Voie lactée–Andromède, élévation 25°.
  - Univers et multivers : cible à l'origine, vue `MULTIVERSE_VIEW_DEG` (azimut 206°, élévation 20°), celle qui sert à
    placer les bulles.
- **Cadrage en sphère.** Les deux premières escales lointaines restent cadrées comme un disque. Les trois nouvelles le
  sont comme une sphère : `dist = rayon / sin(atan(tan))`, dans la bande libre du téléphone ou la zone libre du grand
  écran, avec les mêmes taux que pour le disque.
  - Groupe local : la sphère couvre les cinq galaxies principales, grossies, soit environ 1 756 kly de rayon, jusqu'au
    bord du Triangle. Cadrer les treize galaxies réduirait chaque galaxie d'un tiers.
  - Univers : 46 Gal. Multivers : rayon des bulles (`multiverseRadius`).
- **Galaxies grossies 6 fois au Groupe local, distances à l'échelle** (`LOCAL_GROUP_MAGNIFICATION`, comme les étoiles
  voisines, grossies elles aussi). À l'échelle, Andromède n'y faisait que 14 px de rayon sur grand écran et 7 sur
  téléphone, la Voie lactée 9 et 5 : quelques points épars, aucune forme.
  - Le grossissement monte de 1 à 6 sur [8,5 ; 9,3], avec l'arrivée du Groupe local (`galaxyMagnification`). À son
    escale, la Voie lactée garde sa vraie taille.
  - Chaque galaxie grossit autour de son centre ; la Voie lactée autour du centre galactique, avec le point-Soleil et
    « Vous êtes ici », qui restent à leur place dans le disque dessiné.
  - À l'escale : Andromède environ 77 px de rayon sur grand écran et 39 sur téléphone, la Voie lactée 46 et 25, le
    Triangle 30 et 16 (mesures du grossissement 4, ramenées au nouveau cadrage). La plaque le dit dans les trois
    langues (« les galaxies sont grossies 6 fois »).
  - Révision du 02/11/2026 : grossies 4 fois, la Voie lactée restait invisible à l'escale, et l'étiquette de chaque
    galaxie, posée sur son centre, couvrait le cœur et la moitié du disque. Grossies 6 fois, les trois grandes se
    lisent, et Andromède ne touche pas le Triangle à l'écran ; le Grand Nuage de Magellan était déjà sur le disque de
    la Voie lactée à 4 fois.
  - Le nom d'une galaxie se pose à côté de son disque dès que celui-ci dépasse le repère (rayon apparent mesuré à
    chaque image) : texte à 6 px du bord, à droite ou à gauche, repère effacé (`data-beside`). Si aucun côté ne tient,
    il reprend la disposition ordinaire, repère sur le centre.
- **Deux groupes de plus, chacun dans son unité.** `extragalactic.localGroup` est en kly, à l'échelle
  `unitsPerLightYear(zoom) × 1e3` (positions < 3 100). `extragalactic.universe` est en Gal, à l'échelle × 1e9
  (positions < 450). Comme à l'ADR 0001, l'échelle passe par la matrice du groupe, calculée en float64. La Voie lactée
  garde son nuage en al ; seule son étiquette, `lg:milky-way`, est décrite avec les autres galaxies.
- **Couches** (`layerWeights`, valeurs inchangées jusqu'au zoom 8) :
  - galaxies du Groupe local : 0 → 1 sur [8,5 ; 9,3], puis 1 → 0 sur [10,8 ; 11,6] ;
  - la Voie lactée s'efface avec elles, et « Centre de la Galaxie » dès [8,3 ; 8,9], avant que « Voie lactée »
    n'apparaisse ;
  - toile : 0 → 1 sur [11,2 ; 12,8], atténuée de 65 % au multivers ;
  - fond diffus : 0 → 1 sur [12,6 ; 13,6] ; autres bulles : 0 → 1 sur [14,2 ; 14,9] ;
  - étiquettes : « Vous êtes ici » reste jusqu'au multivers. « Soleil » (`sunLabel`) ne revient pas quand la galaxie
    s'efface.
- **Plan lointain inchangé (100 000).** Quand la toile paraît (zoom 11,2), l'Univers observable mesure 80 950 unités
  de rayon, caméra près de son centre. Au zoom 9,7, Andromède est à 140 unités. La sphère fait 128 unités au zoom 14
  et 13 au zoom 15. Rien n'écrit dans le tampon de profondeur : sa précision est sans objet.
- **Niveau de détail par la part des points dessinés, pas seulement par un gain.** Le mélange additif cumule les points
  dans un tampon 8 bits : un point qui ajoute moins d'un demi-niveau sur 255 disparaît.
  - Au zoom 9,7, le gain de la Voie lactée tomberait à 0,0025 : plus de Voie lactée.
  - Les nuages sont donc tirés dans un ordre aléatoire. La Voie lactée est mélangée par `shufflePointCloud`, avec la
    même graine. Le moteur ne dessine qu'une part de chaque nuage (`setDrawRange`), d'éclat inchangé.
  - Groupe local : lumière `(r / 80 px)^1,5`, r étant le rayon apparent d'Andromède grossie. Comme pour la Voie lactée,
    le gain la porte jusqu'à 0,35, puis la part dessinée prend le relais. Chaque galaxie dessine au moins 12 points.
    À l'escale, au banc logiciel : lumière 0,53 sur grand écran (tous les points) ; sur téléphone, gain 0,35 et 56 %
    des points.
  - Toile : même loi, rapportée à 250 px de rayon apparent de l'Univers observable.
  - Voie lactée : le gain suit `(r / 290 px)^1,5` comme avant, jusqu'à 0,25. En dessous, la part dessinée fait le reste
    (`splitLight`), et la lumière totale suit toujours la même loi.
- **Constructions au repos, en chaîne.** La galaxie se construit dès l'au-delà de Neptune, puis le Groupe local
  (14 000 points, 7 000 sur écran tactile), puis l'Univers : toile (30 000 / 12 000 points), fond diffus et 14 bulles.
  - Chaque construction attend `requestIdleCallback` (3 s au plus), ou `setTimeout` (1,5 s) sur Safari.
  - Une couche manquante est construite tout de suite au-delà des zooms 5,5, 8,6 et 11 (lien direct, vol rapide).
  - Un échec laisse la scène tourner sans la couche, sans nouvel essai.
  - Les programmes du fond diffus et des bulles sont compilés hors du fil principal (`compileAsync`) dès que l'Univers
    est construit.
  - En développement, `checkShaderErrors` écrit dans la console toute erreur de compilation des shaders.
- **Coquilles retenues dans l'espace libre.** Le fond diffus et les autres bulles ne recouvrent jamais la plaque ni la
  règle.
  - Au repos, la sphère de l'Univers occupe 90 % de la largeur de la zone libre du grand écran et 80 % de celle du
    téléphone, dans sa bande ; toutes les bulles du multivers y tiennent.
  - En vol, la caméra traverse le fond diffus puis le voit rapetisser jusqu'à sa taille de repos. Sur grand écran, en
    1440 × 900, entre 70 et 88 % du vol depuis le Groupe local, la coquille débordait de 50 à 2 600 px sur la plaque et
    la règle.
  - Chaque coquille est donc pesée par la part qui tient dans l'espace libre (`shellFit`, `fitShells`). Cet espace est
    la zone entre la plaque et la règle, ou la bande au-dessus de la plaque. La coquille s'efface sur les 24 px de
    débord qui la séparent de la règle, avec son étiquette. Elle paraît donc à la fin du vol, quand elle tient.
  - En exploration, la page est masquée : rien n'est retenu.
- **Règle des distances.** Quatre segments logarithmiques : 0 → 2 % ; UA jusqu'à 50 ; de 50 UA à 1 al, de 86 à 89 % ;
  au-delà, de 89 à 98 % pour 1 à 10¹¹ al. Rupture « ≈ » entre 87 et 88,5 %.
  - Graduations en puissances de dix d'al, majeures à 1 al, 1 Mal et 1 Gal.
  - Le multivers, à l'infini, se place hors échelle à 99,4 %, après la fin de l'axe ; sous son nom, « hypothèse ».
  - Ses seize repères gardent au moins 24 px entre leurs centres (WCAG 2.5.8) : il faut 360 px de règle, donc une vue
    d'au moins 546 px de haut (66vh). En dessous, et à 860 px de large ou moins, la liste des escales de la barre
    remplace la règle. Sur un écran bas (480 px et moins), la barre suit la page : la liste s'ouvre en haut de page.
- **Le multivers est une hypothèse, et la page le dit :**
  - l'avertissement ouvre sa plaque, avant le rang et le titre ;
  - « hypothèse » sur la règle ;
  - « D'autres univers ? (hypothèse) » dans la scène, en italique, avec un repère en pointillés ;
  - les bulles sont un rendu artistique, dit dans « ce que la vue simplifie ».
- **Textes.** Noms des galaxies, repères et distances dans `deepSky.strings.ts`, lus par la scène (client) et par les
  plaques (serveur). Le contenu long est dans `src/content/cosmic/`. Le tableau des galaxies de la plaque du Groupe
  local nomme les treize ; la scène n'en nomme que cinq.

## Alternatives écartées

- **Un seul gain d'éclat selon la taille à l'écran** (comme la Voie lactée à son escale) : sous un demi-niveau du
  tampon 8 bits, les points s'effacent d'un coup. Grands à l'écran, ils saturent.
- **Une unité de scène unique en années-lumière** : 46 milliards d'al en float32, plus aucune précision sur les
  galaxies proches ; le plan lointain devrait couvrir 10¹¹.
- **Deux scènes ou deux passes de rendu** : double coût GPU et fondus à synchroniser (déjà écarté à l'ADR 0001).
- **Cadrer les treize galaxies du Groupe local** : WLM, à 3 Mal, éloigne la caméra. Toutes les galaxies rapetissent
  d'un tiers, et les naines tombent à un ou deux pixels.
- **Galaxies à leur vraie taille au Groupe local** (premier câblage) : quelques points épars, aucune forme lisible,
  Voie lactée comprise. Au-delà de 6 fois, vue de l'escale, Andromède toucherait le Triangle, et le cadrage reculerait
  d'autant (il suit le bord du Triangle grossi).
- **Cadrer l'Univers de plus loin** pour qu'il tienne aussi en vol : au repos, il deviendrait petit pour rien. Le
  débord n'a lieu qu'à la fin du vol, quand la caméra sort de la coquille.
- **Garder la règle sur un écran bas en serrant ses repères** : à 390 px de haut, ils n'auraient que 14,5 px entre eux,
  pour des liens de 29 px. Ils se chevaucheraient.
- **Une carte réelle du fond diffus** (Planck) : lourde et peu lisible à cette taille. Un motif procédural dit la même
  chose : une peau presque uniforme, aux contrastes infimes.

## Conséquences

- Jusqu'au zoom 8, rien ne change : les tests de caractérisation des quatorze escales historiques et les poids des
  couches au zoom 8 et en deçà sont inchangés.
- Coût de génération des points, une fois, au repos. Mesures hors navigateur (Node, portable sur batterie), premier
  appel puis médiane de dix ; elles varient d'un facteur 1,5 avec la charge de la machine :
  - Groupe local (14 000 points) : 10,5 / 5,0 ms ; 7 000 points : 2,4 / 2,2 ms ;
  - toile (30 000 points) : 14,8 / 11,4 ms ; 12 000 points : 4,6 / 4,6 ms ;
  - Voie lactée (40 000 points) : 15,5 / 11,5 ms, dont moins de 1 ms pour le mélange.
  - Un lien direct vers le multivers construit les trois couches dans la même image.
- Appels de dessin, seulement pour les couches de poids non nul : 12 galaxies au Groupe local ; toile et fond diffus à
  l'Univers ; plus 14 bulles au multivers.
- La règle porte 16 repères, dont cinq serrés entre 89,5 et 99,4 %. Pour garder 26 px entre eux, `spreadPositions`
  remonte les repères au-dessus, reliés à leur vraie place par un trait fin :
  - règle de 560 px : Neptune remonte de 33 px ;
  - règle de 475 px : Neptune remonte de 52 px ;
  - sous 430 px, la poussée atteint Vénus.
- Entre 24 et 33 px d'écart (règle de 360 à 495 px), les liens d'un repère, hauts de 33 px sur grand écran, se
  recouvrent encore de quelques pixels. Chacun garde au moins 24 px à lui.
- La règle cède sa place à la liste des escales à 546 px de haut et moins. Cela vaut aussi pour la page Tailles, qui
  partage la règle et la requête.
- Au Groupe local, le grossissement passe dans l'image et dans les étiquettes : le point-Soleil s'écarte du centre de la
  Voie lactée avec son disque, de 81 000 al au plus, invisible à l'échelle des Gal.
- Toute nouvelle couche au-delà de la Voie lactée doit entrer dans l'un des deux groupes, être pesée par
  `weighExtragalactic` et, si c'est un nuage de points additif, régler son détail par la part dessinée.
- Le rendu WebGL réel (shaders, fondus, lisibilité des étiquettes, tenue sur téléphone) se vérifie dans le
  navigateur : les tests couvrent les données, les caméras, les poids et le texte, pas l'image.
