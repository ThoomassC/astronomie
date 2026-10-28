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
- **Règle des distances** : sommaire vertical à échelle logarithmique (UA), curseur suivant la caméra.
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
  (un seul bouton de vitesse, date courte).

## Règles

- Données sourcées (NASA Planetary Fact Sheet, éléments orbitaux JPL 1800–2050).
- `prefers-reduced-motion` : temps en pause au chargement, pas d'animation automatique.
- Animations Canvas actives seulement quand elles sont visibles (batterie).
- Contraste texte ≥ 4.5:1, focus visible `--soleil`, cibles tactiles ≥ 44 px.
- Responsive : 375, 768, 1024, 1440 px ; aucun défilement horizontal.
