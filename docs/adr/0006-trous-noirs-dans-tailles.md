# ADR 0006 — Trous noirs dans le comparateur de tailles : ombre comparée, rendu calculé, encombrement

- Statut : accepté
- Date : 05/11/2026
- Portée : onglet « Tailles » (`/{lang}/tailles`) ; complète l'ADR 0004

## Contexte

L'utilisateur demande d'ajouter des trous noirs à l'onglet Tailles, « aux bons endroits suivant leur taille », dont le
plus gros connu, « extrêmement jolis, bien faits et détaillés ». Quatre trous noirs rejoignent les dix étoiles :
Cygnus X-1 (stellaire, 21 M☉), Sagittarius A* (4,3 millions de M☉), M87* (6,5 milliards) et le trou noir du Fer à
cheval cosmique (36 milliards, pesé en 2025 par lentille et vitesse des étoiles). Les tailles couvrent désormais près de
dix ordres de grandeur, contre quatre pour les étoiles seules.

Un trou noir n'a pas de surface. Ce qu'on en voit, l'ombre (√27/2 r_s ≈ 2,6 fois le rayon de Schwarzschild) puis le
disque ou l'anneau, dépasse son horizon. Contraintes : aucune dépendance nouvelle, aucune image téléchargée, précision
float32, téléphone, trois langues, invariants de cadrage de l'ADR 0004.

## Décision

- **Données** : union discriminée `ComparedStar | ComparedBlackHole` (`src/lib/sizes/objects.ts`). Le rayon de l'horizon
  se calcule depuis la masse (`src/lib/astro/schwarzschild.ts`, constante de l'UAI 2015) ; les fiches disent « horizon
  (sans rotation) », valeur exacte seulement sans spin.
- **Comparaison par l'ombre** : `comparedRadiusSolar` rend le rayon de l'ombre d'un trou noir. Sagittarius A* (47 R☉)
  passe ainsi entre Aldébaran et Rigel : par l'horizon, il serait rangé avant Arcturus tout en paraissant plus grand
  qu'Arcturus et Aldébaran, et la suite ne grandirait plus à l'œil. Les fiches donnent aussi l'horizon.
- **Le plus gros** : le trou noir du Fer à cheval cosmique, « l'un des plus gros jamais pesés, peut-être le record ».
  TON 618, souvent cité, n'a qu'une estimation indirecte (facteur 4 d'incertitude) : sa fiche le mentionne.
- **Encombrement** : distinct de la taille comparée (`BLACK_HOLE_EXTENT_RS`), pour l'espacement et le cadrage ; l'étiquette
  se pose juste au-dessus de ce qui se voit (`BLACK_HOLE_VISIBLE_RS`). Écart à trois termes (4 × min, 2 × repos,
  0,35 × suivant), qui laisse les dix étoiles à leur place.
- **Rendu** : lancer de rayons dans la métrique de Schwarzschild (Verlet sur −1,5 r_s h² x/|x|⁵), dans un rectangle par
  trou noir, repère en r_s calculé en float64 ; 160 pas, 72 en version allégée. Le fond étoilé procédural de la scène
  applique la lentille faible avec la même fonction que le shader : pas de couture au bord du rectangle. Effet Doppler et
  décalage gravitationnel exacts ; quatre aspects : disque X chaud (Cygnus X-1), anneau ténu (Sagittarius A*), anneau et
  jet (M87*), dormant (Fer à cheval). Cercle d'horizon en pointillés discrets.
- **Règle** de 10⁻⁴ à 10⁶ R☉ ; échelle graphique en km ou en Soleils côte à côte.

## Conséquences

- Les palettes des anneaux de Sagittarius A* et M87* sont des fausses couleurs, comme celles de l'EHT ; les fiches le
  disent. M87* est montré incliné de 40° (17° vu de la Terre) pour que son jet se lise de côté.
- Le coût GPU se concentre sur le rectangle des trous noirs ; il reste à mesurer sur un téléphone d'entrée de gamme.
- Le test qui confronte `BLACK_HOLE_VISIBLE_RS` au lancer de rayons échoue si l'on règle à nouveau les aspects : c'est
  voulu, l'étiquette doit suivre le rendu.

## Alternatives écartées

- **Ordre par l'horizon** : la suite ne grandit plus à l'œil autour de Sagittarius A* (voir plus haut).
- **Ligne d'horizon commune** (astres posés sur un même sol) : un trou noir n'a pas de base, et la caméra comme ses tests
  seraient à réécrire.
- **Images EHT** : téléchargement de fichiers tiers et licence à gérer ; le rendu calculé dit la même chose.
- **Seconde passe plein écran, cubemap, demi-résolution** : plus de coût et de complexité, sans mesure qui les justifie.
