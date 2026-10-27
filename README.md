# Planétaire

Site pédagogique sur le système solaire. On part du Soleil et on rejoint Neptune en faisant défiler la page : la caméra vole de planète en planète, chaque escale présente l'astre avec des données réelles et une animation qui explique un phénomène.

## Ce que fait le site

- **Positions réelles** : les planètes partent de leur position du jour, calculée à partir des éléments orbitaux du JPL (valables de 1800 à 2050).
- **Machine à remonter le temps** : le temps défile de 1 jour à 1 an par seconde, avec retour à aujourd'hui.
- **Distances réelles** : une bascule remet les distances à l'échelle, et montre à quel point le système solaire est vide.
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
    scene/          scène Three.js (planètes, orbites, ceintures, étiquettes)
    journey/        parcours : en-tête, règle des distances, dock, plaques d'escale
    modules/        animations explicatives en Canvas 2D
  content/          textes et données affichées des escales
  lib/
    astro/          éphémérides, échelles, saisons, lumière, conversions (testé)
    journey/        caméra et suivi du défilement (testé)
    sim/            horloge simulée et boucle d'animation unique
docs/maquette/      maquette interactive d'origine (un seul fichier HTML)
design-system/      direction artistique et jetons du projet
```

## Données et approximations

- Éléments orbitaux : JPL, *Keplerian Elements for Approximate Positions of the Major Planets* (1800-2050).
- Données physiques : NASA, *Planetary Fact Sheet*. Nombres de lunes : NASA et UAI, 2025.
- Les tailles des planètes sont agrandies et les distances compressées (racine carrée), sauf en mode « distances réelles ».
- L'ouverture des anneaux de Saturne suit un modèle sinusoïdal, juste à environ un an près.
- Les textures des planètes sont générées par le code.
