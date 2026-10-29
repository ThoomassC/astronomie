# ADR 0001 — Zoom cosmique : une scène réduite autour du Soleil

- Statut : accepté
- Date : 29/10/2026
- Portée : escales « Les étoiles voisines » et « La Voie lactée » (`stars`, `galaxy`), après l'au-delà de Neptune

## Contexte

Le voyage s'arrêtait à l'au-delà de Neptune : une scène Three.js en unités de scène, le système solaire tenant dans
quelques centaines d'unités (4,41 unités par UA en échelle réelle, plan lointain à 7 000). Deux escales s'ajoutent,
avec des distances à l'échelle : Proxima du Centaure à 4,25 al, le centre galactique à 27 000 al. En unités de
scène, Proxima serait à 1,2 million d'unités et le centre galactique à 7,5 milliards : intenable en float32
(précision de la position des sommets, tampon de profondeur) comme pour le plan lointain. Il fallait aussi un passage continu,
lisible pour un public de 12 ans : le système solaire qui se réduit au point-Soleil, les étoiles qui apparaissent,
puis la galaxie vue de l'extérieur, sans rien changer aux escales existantes.

## Décision

- `CamState` gagne `zoom`, l'exposant du zoom cosmique (log10 de la réduction) : 0 aux escales du système solaire,
  4,6 aux étoiles voisines, 8 à la Voie lactée. `blendCameras` l'interpole linéairement : la réduction, elle, est
  exponentielle à l'écran, et la caméra reste à 640 unités de sa cible.
- Le moteur range tout le système solaire (Soleil, couronne, planètes, orbites, ceintures) dans un groupe
  `solarRoot` à l'échelle `zoomScale(zoom) = 10^−zoom`, caché au-delà du zoom 2. Les étoiles voisines, le
  point-Soleil, les cercles de distance et la galaxie vivent dans un second groupe, en années-lumière, à
  l'échelle `unitsPerLightYear(zoom) = 4,41 × 63 241,077 × 10^−zoom` : les deux échelles coïncident à tout zoom.
  Les positions restent petites (moins de 80 000 al, pas de float32 sous 0,01 al) ; l'échelle passe par la
  matrice du groupe, calculée en float64.
- Chaque couche n'est dessinée que dans sa plage de zoom (`layerWeights`, fondus en smoothstep) ; à poids nul,
  `visible = false`. Le plan lointain passe de 7 000 à 100 000 quand le système solaire disparaît.
- Ce que les shaders lisent en coordonnées monde, hors des matrices (centre et rayon des planètes pour l'ombre
  des anneaux et les atmosphères, taille de la couronne en espace vue), est multiplié par `zoomScale`. La lumière
  vient toujours de l'origine : l'échelle se fait autour du Soleil, elle reste juste.
- La galaxie (40 000 points, 16 000 sur écran tactile, graine fixe) est construite une fois, et seulement pour
  qui s'approche des étoiles : sa construction se planifie quand l'escale affichée atteint l'au-delà de Neptune
  (`requestIdleCallback`, délai maximal de 3 s ; repli `setTimeout` de 1,5 s pour Safari), ou se fait aussitôt
  quand le zoom affiché dépasse 5,5 (lien direct vers `#voie-lactee`). Sa sphère englobante est posée d'emblée
  (centre galactique, 60 000 al) : rien à mesurer sur ses points. Un échec laisse la scène tourner sans elle.
- Le mélange additif cumule les points après leur encodage sRGB : l'éclat de la galaxie se règle donc en valeurs
  affichées (points faibles et saturés, qui se cumulent en couleurs franches), et un gain sur ces valeurs
  l'atténue quand elle rapetisse à l'écran ((rayon / 290 px)^1,5), sans quoi sa lumière concentrée saturerait.
- Les escales lointaines se cadrent comme les astres : dans la bande libre (mise en page compacte) ou la zone
  libre (grand écran), vues comme un disque incliné de l'élévation de la caméra, perspective comprise.
- Hors du système solaire, le temps simulé ne change rien de visible : quand seul le temps avance, pas d'image.

## Alternatives écartées

- **Caméra à distance réelle, sans zoom** : Proxima à 1,2 million d'unités ; float32 et plan lointain intenables.
- **Deux scènes ou deux passes de rendu** (système solaire, puis cosmos) : double coût GPU, synchronisation des
  fondus et des caméras ; un groupe mis à l'échelle suffit.
- **Changer d'unité de scène à chaque escale** (téléportation) : pas de passage continu, saut visible au milieu
  du vol, et deux moteurs de cadrage à maintenir.

## Conséquences

- Au zoom 0, le rendu des escales existantes est inchangé : échelle 1 (produit matriciel exact), couches nouvelles
  invisibles, plan lointain d'avant. Des tests de caractérisation figent les caméras des douze escales historiques
  et trois vols.
- Toute nouvelle géométrie du système solaire doit entrer dans `solarRoot`, et tout nouvel uniforme en
  coordonnées monde doit suivre `zoomScale`, sans quoi elle se tromperait pendant les vols vers les étoiles.
- La galaxie est stylisée (modèle de Reid et al. 2019, barre de Bland-Hawthorn et Gerhard 2016, Soleil à
  27 000 al selon GRAVITY 2022) : la plaque le dit ; les tailles des étoiles sont exagérées, leurs distances non.
- Coût : une génération de 10 à 30 ms, une fois, pour qui atteint l'au-delà de Neptune, et un peu plus d'un
  mégaoctet de mémoire graphique ; aucune image quand rien ne bouge. « Au repos » n'est pas garanti :
  `requestIdleCallback` s'exécute de force à l'échéance de 3 s, même pendant un défilement, et le délai de Safari
  tombe n'importe quand ; sur un téléphone lent, la génération peut coûter une image pendant la descente vers les
  étoiles. Le réglage visuel (taille des points, intensité de la galaxie, fondus) se vérifie à l'œil, sur
  ordinateur et sur téléphone.
