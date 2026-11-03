# ADR 0004 — Comparateur de tailles : une scène légère, des étoiles côte à côte à leur vraie taille

- Statut : accepté
- Date : 30/10/2026
- Portée : onglet « Tailles » (`/{lang}/tailles`)

## Contexte

L'onglet « Tailles » compare au défilement dix étoiles, de la plus petite à la plus grande : Proxima du Centaure
(0,154 R☉), le Soleil, Sirius A, Pollux, Arcturus, Aldébaran, Rigel, Antarès A, Bételgeuse et VY Canis Majoris
(1 420 R☉). Les rayons couvrent quatre ordres de grandeur. Au repos sur une étoile, la précédente doit paraître
minuscule à côté d'elle. Contraintes :

- la mise en page du Voyage, déjà apprise : plaques à gauche, règle à droite, plaque compacte sur téléphone ;
- un portable sur batterie : aucune image calculée au repos ;
- le texte équivalent de la scène est dans les plaques ;
- aucune dépendance nouvelle ;
- les trois langues du site.

## Décision

- **Une scène dédiée, séparée d'`engine.ts`.** `sizesEngine.ts` réutilise ce que le socle a rendu générique :
  `sizesStore` (`createStopStore`), `useScrollTracker`, `RailView`, `StopsMenuView`, `createScreenLayout`, `placeLabel`
  et les dispositions à repère d'étiquettes. Il ne rend une image que si le vol, la mise en page ou la taille de la vue
  change. La surface des étoiles n'avance que pendant un vol, et jamais en mouvement réduit. Il garde les plafonds de
  pixels du Voyage (1,5 et 4,2 Mpx), compile les shaders avant le premier rendu et libère tout au démontage. Sans
  WebGL 2, il renvoie `null` et la page passe au repli (`no3d`).
- **Rayons vrais, en R☉, côte à côte sur l'axe x** (`placeStars`). La plus petite est à l'origine, où la précision
  float32 est la meilleure ; chaque étoile se pose à gauche de la précédente. Entre deux voisines, le vide vaut
  `SIZE_GAP_RATIO = 4` rayons de la plus petite.
  - Le plan prévoyait 2,4, vérifié en projetant le point (x + r, 0, 0) au plan de la cible.
  - Or la silhouette d'une grande sphère proche de la caméra déborde de ce point. En paysage sur téléphone
    (844 × 390), le Soleil occupait déjà 11 % de la largeur au repos sur Proxima.
  - L'invariant de non-apparition projette la silhouette exacte (angle du centre plus demi-angle apparent) sur quatre
    vues. Il faut au moins 3,62 ; 4 laisse plus de 3 % de marge.
- **Caméra** (`sizesCamera.ts`, fonctions pures) :
  - au repos, elle cadre la paire (étoile affichée, précédente) ;
  - 90 % de la largeur de la zone libre du grand écran, 80 % de la largeur dans la bande libre du téléphone, 70 %
    sinon ; la hauteur de l'étoile l'emporte quand elle contraint davantage ;
  - en vol, la distance suit une progression géométrique et la cible suit le zoom (même part du chemin, poids calculé
    par `expm1`, continu même pour des distances presque égales) ;
  - l'étoile suivante n'est dessinée qu'une fois le vol commencé ; son halo entre en fondu.
- **Matériau** : celui du Soleil (`starSurface`), derrière un seul adaptateur, `starMeshes.ts`.
  - Couleur : corps noir à la température effective. Le Soleil y est presque blanc.
  - Granulation : 60 cellules par rayon pour le Soleil × r^−0,35, de 4 à 80 ; presque effacée au-delà de 9 500 K.
  - Taches : pour le Soleil seulement, selon l'activité du jour.
- **Pour se repérer** :
  - une règle logarithmique des rayons (0,1 à 2 000 R☉, × 10 à chaque graduation) ;
  - des étiquettes au-dessus du limbe ou sur un anneau, avec hystérésis, et l'anneau « ici » du Soleil devenu un point ;
  - une échelle graphique « n Soleils côte à côte », visible dès que le Soleil fait 24 px ou moins ;
  - sur la plaque, la couleur en mots et une réglette des températures.
- **Données** (`starSizes.ts`) : recherche documentaire v2, avec les arbitrages retenus.
  - Proxima à 0,154 R☉ (Boyajian et al. 2012) plutôt qu'une prépublication non relue.
  - Rigel 74 (70–79), Antarès A 680 (550–850), Bételgeuse 764 (640–1 010), VY CMa 1 420 (1 300–1 540). Les
    fourchettes des quatre rayons débattus sont affichées, avec une mise en garde.
  - Comparaisons calculées (`pickComparison`) : orbite engloutie, Terres alignées, ou Soleils dans le volume.
- **Textes** : contenu long côté serveur (`src/content/sizes/`) ; noms, rayons, rangs, distances, comparaisons et
  libellés des commandes dans `sizes.strings.ts`. Les nombres passent par Intl, comme partout (ADR 0003).
- **Pages masquées** : Next 16 garde des pages quittées dans le DOM. La scène ne lit donc que la page affichée
  (`shownElements`), la seule à porter la barre, la règle et des plaques sous une clé commune au Voyage (« sun »).

## Conséquences

- La page coûte une scène Three de dix sphères et dix halos. Le programme du matériau est commun à neuf étoiles ; le
  Soleil a le sien, à cause de ses taches. Rien n'est calculé au repos.
- Un vide de 4 rayons étale davantage les étoiles. Au repos, l'étoile affichée occupe un peu moins de la zone (environ
  20 % de moins quand deux voisines ont presque la même taille, comme Antarès A et Bételgeuse).
- Hors des quatre vues de référence (fenêtres étroites sans zone libre), le bord de l'étoile suivante peut paraître
  sous la plaque.
- Le Soleil de Tailles diffère de celui du Voyage : presque blanc ici, doré là-bas. L'accroche le dit.

## Alternatives écartées

- **Réutiliser `engine.ts`** : moteur couplé au système solaire (planètes, cartes, zoom cosmique, exploration). Une
  petite scène dédiée, qui partage la mise en page, les étiquettes et le parcours, coûte moins cher.
- **Tailles en échelle logarithmique dans la scène** : l'effet recherché (la précédente devient un point) disparaît.
  Le logarithme vit dans la règle.
- **Écart de 2,4 rayons** (plan) : l'étoile suivante apparaissait d'un coup au départ du vol en paysage sur téléphone.
- **Animation continue de la surface** : batterie ; la surface ne bouge que pendant un vol.
