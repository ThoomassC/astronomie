# ADR 0002 — Mode exploration : tourner autour de l'escale, et la voir depuis la Terre

- Statut : accepté
- Date : 29/10/2026
- Portée : bouton « Tourner autour » (toutes les escales sauf la ceinture d'astéroïdes) et bascule « Vu depuis la
  Terre » (les sept planètes autres que la Terre)

## Contexte

Jusqu'ici, la caméra n'obéissait qu'au défilement : chaque escale montrait un seul point de vue. On veut tourner
librement autour de l'astre (glisser, molette, pincement, clavier, boutons), puis le regarder depuis la Terre, avec
sa vraie phase du jour. Contraintes : la page ne doit pas bouger pendant ce temps, sinon le suivi du voyage enverrait
la caméra ailleurs ; tout doit marcher au clavier et au lecteur d'écran ; on ne rend une image que si quelque chose
bouge (batterie) ; iOS ne respecte pas toujours le blocage du défilement.

## Décision

- **État** : `exploreStore` (`src/lib/journey/explore.ts`), singleton de module comme `journeyStore`. React n'est
  prévenu que quand l'escale explorée ou « vu depuis la Terre » change ; les gestes s'accumulent hors de React et le
  moteur les consomme une fois par image (`takeInput`). Tourner rend la main (coupe « vu depuis la Terre ») ; changer
  la distance la garde.
- **Géométrie pure et testée** (`src/lib/journey/orbit.ts`) : vue d'orbite absolue (azimut et élévation dans le repère
  de la scène, élévation bornée à ±85°, distance en `ln(distance / distance de base)`). La cible suit l'astre, qui
  tourne avec le temps : la lumière, donc la phase, aussi. Recul jusqu'à 4 fois la base ; approche jusqu'à 1,8 rayon
  d'une planète (1,15 fois ses anneaux), 2,5 rayons du Soleil (la caméra s'arrête avant cette sphère, sur toute la
  ligne de visée), 0,25 et 0,4 fois la base aux étoiles voisines et à la Voie lactée. Gestes et touches y sont
  convertis : l'astre suit le doigt.
- **Moteur** : caméra de base = `cameraFor` sans la mise en page (le contenu est masqué), sauf aux escales lointaines,
  qui remplissent l'écran (bande symétrique de 8 à 92 % de la hauteur) ; cible au centre de l'écran, parallaxe de la
  souris coupée. Entrée et sortie se fondent en 0,6 s depuis la dernière image affichée (`mixCameras` : cible en ligne
  droite, distance géométrique, sans recul), instantanées en mouvement réduit. La vue affichée rejoint la vue demandée
  (12/s). Une image n'est rendue que si un geste attend, si la vue ou le fondu avancent, ou si le mode change.
- **Page** (`ExploreMode`) : à l'entrée, `holdAt` pose le défilement au repos de l'escale, sans animation (entrée en
  plein vol comprise) ; `data-explore` sur `<html>` bloque le défilement (`overflow: hidden`, jamais `position:
  fixed` sur `<body>`, qui remettrait le défilement à 0) ; tout ce qui porte `data-hide-on-explore` s'efface et
  devient `inert`. Le focus va au groupe des commandes, nommé d'après l'escale, et une annonce dit comment tourner.
  Échap est écouté en capture et consommé : un appui ne ferme qu'une couche. Garde-fous : si la page défile quand même
  (2 px ou plus) ou si l'escale affichée change, on quitte le mode et le voyage reprend là où est la page ; si la
  fenêtre change de taille, la page se repose sur l'escale. À la sortie, `inert` est retiré avant de rendre le focus au
  bouton (un élément inerte refuse le focus).
- **Gestes** : une surface plein écran, masquée aux technologies d'assistance (le pavé et le clavier font la même
  chose). Pointeurs capturés, deux au plus ; molette écoutée à la main, en mode non passif (Ctrl + molette compris :
  c'est ainsi qu'arrive le pincement d'un pavé tactile). Le milieu des deux doigts ne fait tourner qu'au-delà de 6 px
  cumulés, mesuré une fois par image : sinon c'est un zoom pur, qui garde « vu depuis la Terre ».
- **Vu depuis la Terre** (`src/lib/astro/earthView.ts`) : en géométrie héliocentrique réelle (UA), la direction de la
  planète vers la Terre remplace l'azimut et l'élévation à chaque image. Les distances de la scène sont compressées
  dans l'axe du Soleil : la lumière y arrive dans la même direction qu'en vrai, et la phase affichée est juste.
  Élongation = séparation angulaire vraie, comme les almanachs.
- **Un seul bouton d'entrée**, dans la barre haute : un seul point de retour du focus, visible à toutes les escales.

## Alternatives écartées

- **`OrbitControls` (exemples de Three)** : non testable, amortissement en boucle continue (rendus permanents,
  batterie), conflit avec le `lookAt` et le `setViewOffset` du moteur comme avec le défilement de la page.
- **Un bouton dans chaque plaque** : treize exemplaires ; dans la plaque compacte, il ferait passer les titres longs à
  la ligne, donc changer la hauteur de la plaque et déplacer le cadrage ; absent de l'accueil, qui n'a pas de plaque.
- **`position: fixed` sur `<body>`** pour bloquer le défilement : `scrollY` passerait à 0 et le voyage repartirait de
  l'accueil.
- **Élongation en différence de longitudes** (définition du brief) : elle ignore la latitude ; Vénus le 23/03/2025
  serait à 0,1° du Soleil au lieu de 8,4°.

## Conséquences

- Le dock du temps reste utilisable : c'est la seule façon de voir l'astre tourner, les lunes bouger et la phase
  changer en vue depuis la Terre. En écran bas, où il rejoint la page, il redevient fixe pendant le mode.
- Sans scène (pas de WebGL, erreur, contexte perdu, démontage), le mode prend fin : la page n'est jamais laissée
  masquée et inerte.
- Une rotation du téléphone pendant le mode change la distance de base (cadrage portrait) : petit saut de distance
  accepté. Le pincement du pavé tactile de Safari sur macOS (`gesturechange`) n'est pas géré : la molette et les
  boutons restent.
- Sur iOS, si le défilement échappe au blocage (page zoomée, barre d'outils), le garde-fou fait sortir du mode : rien
  ne casse, mais l'exploration s'arrête. À vérifier sur appareil réel.
- Géométrie, gestes, store, lecture et composants sont couverts par des tests ; le rendu (fondus, cadrage, phase)
  se vérifie à l'œil, sur ordinateur et sur téléphone.
