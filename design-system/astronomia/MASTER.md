# Astronomia — design system (MASTER)

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
- **Fiche** : grille 2 colonnes `dt` / `dd`, une ligne « ce jour » recalculée avec la date simulée.
- **Module** : une animation explicative par escale (Canvas 2D), boutons au clavier,
  texte équivalent en `aria-live`.
- **Règle des distances** : sommaire vertical à échelle logarithmique (UA), curseur suivant la caméra.
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
