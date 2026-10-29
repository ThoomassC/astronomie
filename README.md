# Astronomie

Site pédagogique sur le système solaire. On part du Soleil et on rejoint Neptune en faisant défiler la page, puis on s'éloigne jusqu'aux étoiles voisines et à la Voie lactée : la caméra vole de planète en planète, chaque escale présente l'astre avec des données réelles et une animation qui explique un phénomène.

## Ce que fait le site

- **Positions réelles** : les planètes partent de leur position du jour, calculée à partir des éléments orbitaux du JPL (valables de 1800 à 2050).
- **Machine à remonter le temps** : le temps défile de 1 jour à 1 an par seconde, avec retour à aujourd'hui.
- **Distances réelles** : une bascule remet les distances à l'échelle, et montre à quel point le système solaire est vide.
- **Jusqu'à la Voie lactée** : après l'au-delà de Neptune, un zoom cosmique continu réduit le système solaire à un point, le Soleil, et fait apparaître les 19 étoiles voisines à leur vraie place (distances à l'échelle), puis la Voie lactée vue de l'extérieur, avec « Vous êtes ici ». Chaque escale a sa plaque ; celle des étoiles liste les étoiles de la carte.
- **Une animation par escale** :
  - la course de la lumière ;
  - la loi des aires de Kepler (Mercure) ;
  - le jour de Vénus, plus long que son année ;
  - les saisons, avec la durée du jour à Paris ;
  - une balance qui donne votre poids sur chaque planète ;
  - les tailles des planètes à l'échelle ;
  - l'ouverture des anneaux de Saturne selon l'année ;
  - les saisons d'Uranus ;
  - l'année neptunienne, avec votre année de naissance.

## Pile technique

Next.js 16 (App Router), React 19, TypeScript strict, Three.js pour la scène 3D, Canvas 2D pour les animations, Vitest et Testing Library pour les tests.

## Démarrer

```bash
npm install
npm run dev
```

Puis ouvrir http://localhost:3000.

| Commande | Rôle |
|---|---|
| `npm run dev` | serveur de développement |
| `npm test` | tests Vitest |
| `npm run typecheck` | vérification des types |
| `npm run lint` | ESLint |
| `npm run build` | build de production |

## Organisation

```
src/
  app/              layout, page, styles globaux
  components/
    scene/          scène Three.js (shaders, chargement des cartes, orbites, ceintures, étiquettes)
    journey/        parcours : en-tête, règle des distances, dock, plaques d'escale
    modules/        animations explicatives en Canvas 2D
  content/          textes et données affichées des escales
  lib/
    astro/          éphémérides, échelles, saisons, lumière, conversions (testé)
    journey/        caméra et suivi du défilement (testé)
    sim/            horloge simulée et boucle d'animation unique
public/textures/    cartes des astres, en 2K, en 1K et communes aux deux
docs/maquette/      maquette interactive d'origine (un seul fichier HTML)
docs/adr/           décisions d'architecture (zoom cosmique)
design-system/      direction artistique et jetons du projet
```

## Données et approximations

- Éléments orbitaux : JPL, *Keplerian Elements for Approximate Positions of the Major Planets* (1800-2050).
- Données physiques : NASA, *Planetary Fact Sheet*. Nombres de lunes : NASA et UAI, 2025.
- Les tailles des planètes sont agrandies et les distances compressées (racine carrée), sauf en mode « distances réelles ».
- L'ouverture des anneaux de Saturne suit un modèle sinusoïdal, juste à environ un an près.
- Cartes des astres et de la Voie lactée (`public/textures/`) : [Solar System Scope](https://www.solarsystemscope.com/textures/), d'après des données de la NASA, sous licence [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.fr). Modifications : renommées ; redimensionnées (1K, 512 px pour la Lune, 256 px pour la Voie lactée) ; carte spéculaire convertie de TIFF en JPEG.
- Orientation des axes de rotation : modèles de l'UAI (WGCCRE 2015 ; Mars, rapport 2009), sans les termes périodiques (moins d'un degré). Au chargement, chaque planète montre son vrai méridien origine ; ensuite, sa rotation affichée est ralentie.
- Les anneaux de Saturne s'étendent sur la texture de 1,159 à 2,337 rayons équatoriaux, valeurs mesurées sur ses divisions de Cassini et d'Encke.
- Étoiles voisines (`src/lib/astro/stars.ts`) : tous les systèmes stellaires connus à moins de 12 années-lumière, plus Altaïr ; coordonnées J2000 (SIMBAD), distances tirées des parallaxes (ESA, Gaia DR3 ; Hipparcos, van Leeuwen 2007 ; Akeson et al. 2021 ; Bond et al. 2017 ; Benedict et al. 2006 ; Kervella et al. 2022 ; RECONS). Un couple serré n'est qu'un point ; les naines brunes ne sont pas des étoiles et n'y figurent pas.
- Les distances des étoiles sont à l'échelle, leurs tailles très exagérées : la taille d'un point suit la magnitude absolue de l'étoile, sa couleur sa classe spectrale. Les mouvements propres depuis 2000 sont négligés (0,075° pour l'étoile de Barnard, la plus rapide).
- Voie lactée : modèle procédural stylisé, tiré d'une graine fixe (40 000 points, 16 000 sur écran tactile) ; bras d'après Reid et al. (2019), barre d'après Bland-Hawthorn et Gerhard (2016), Soleil à 27 000 années-lumière du centre (GRAVITY Collaboration, 2022), dimensions de la NASA. Couleurs indicatives : bras bleus (étoiles jeunes), régions HII rouges, bulbe orangé (étoiles vieilles) ; l'éclat est réglé à l'écran et s'atténue quand la galaxie rapetisse, pour ne pas saturer. Ce n'est pas une carte : nul ne peut photographier notre galaxie de l'extérieur.
- Zoom cosmique : une seule scène, réduite autour du Soleil (10^−zoom), avec les étoiles et la galaxie en années-lumière ; voir [docs/adr/0001-zoom-cosmique.md](docs/adr/0001-zoom-cosmique.md).
