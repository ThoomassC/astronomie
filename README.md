# Astronomie

Site pédagogique sur l'espace, en français, en anglais et en espagnol, pour un public de 12 ans et plus. Quatre onglets : l'**Accueil** montre le système solaire tel qu'il est aujourd'hui ; le **Voyage** part du Soleil et, au fil du défilement, passe chaque planète puis s'éloigne jusqu'aux étoiles voisines, à la Voie lactée, au Groupe local, à l'Univers observable et à l'hypothèse du multivers ; **Tailles** compare dix étoiles à la même échelle ; **À propos** dit pourquoi ce site existe et d'où viennent ses chiffres.

## Ce que fait le site

### Accueil

- **Planétaire du jour** : les huit planètes à leur position du jour (éléments orbitaux du JPL), la Terre marquée « Vous êtes ici », la date en légende.
- **Trois portes** vers le Voyage, Tailles et À propos, et **quatre chiffres clés** : 109 Terres dans la largeur du Soleil, 8 min 19 s pour sa lumière, Proxima du Centaure à 4,2 années-lumière, VY Canis Majoris à 1 420 rayons solaires. Leurs sources sont dans la page À propos.
- Les anciens liens (`/#saturne`) mènent toujours à leur escale du Voyage.

### Voyage, du Soleil au multivers

Dix-sept escales : la vue d'ensemble, le Soleil, les huit planètes, la ceinture d'astéroïdes, l'au-delà de Neptune, puis les escales lointaines. La caméra vole d'escale en escale ; chacune a sa plaque, avec des données réelles.

- **Positions réelles** : les planètes partent de leur position du jour, calculée à partir des éléments orbitaux du JPL (valables de 1800 à 2050).
- **Machine à remonter le temps** : le temps défile de 1 jour à 1 an par seconde, avec retour à aujourd'hui.
- **Distances réelles** : une bascule remet les distances à l'échelle, et montre à quel point le système solaire est vide. Aux escales lointaines, déjà à l'échelle, elle est indisponible.
- **Le Soleil** : une surface calculée (granulation, taches, facules, couronne). Les taches suivent le cycle solaire 25 (leur nombre et leur latitude changent avec la date) et tournent plus vite à l'équateur qu'aux pôles.
- **Jusqu'au multivers** : un zoom cosmique continu réduit le système solaire à un point, le Soleil, puis montre les 19 étoiles voisines à leur vraie place, la Voie lactée vue de l'extérieur (« Vous êtes ici »), les galaxies du Groupe local, l'Univers observable (toile cosmique, fond diffus) et enfin le multivers. Le multivers est une hypothèse : sa plaque le dit avant tout le reste, et son image est un rendu artistique.
- **Règle des distances** : un sommaire logarithmique des escales, en UA, puis en années-lumière jusqu'à 10¹¹ al ; le multivers est hors échelle. Sur petit écran et sur écran bas, la liste des escales de la barre la remplace.
- **Tourner autour** : à chaque escale (sauf la ceinture d'astéroïdes), le bouton « Tourner autour » de la barre haute fige le voyage, efface la page et laisse tourner librement autour de l'astre : glisser pour tourner, molette ou pincement pour la distance ; au clavier, flèches, plus et moins, 0 pour recentrer (quand le focus est sur la machine à remonter le temps, plus, moins et 0 lui restent) ; ou le pavé de boutons. Échap ou « Terminer » reprend le voyage là où il était. Le temps continue de tourner (la machine reste utilisable).
- **Vu depuis la Terre** : en tournant autour d'une planète autre que la Terre, une bascule place la caméra dans la direction de la Terre, en géométrie réelle : on voit la phase du jour. Une lecture donne la fraction éclairée, le diamètre apparent, l'écart au Soleil et le moment où la chercher dans le ciel.
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

### Tailles

- Dix étoiles, de la naine rouge Proxima du Centaure (0,154 rayon solaire) à l'hypergéante VY Canis Majoris (1 420), côte à côte et à la même échelle, Soleil compris. À chaque escale, la caméra recule : l'étoile précédente devient un caillou, puis un point.
- Chaque plaque donne le rayon (en kilomètres aussi, et la fourchette publiée quand il est débattu), le type, la température et sa couleur, la distance, et une comparaison : jusqu'où irait l'étoile à la place du Soleil.
- Une règle des tailles, logarithmique, en rayons solaires ; sur petit écran, le menu des étoiles de la barre la remplace.

### Partout

- **Barre commune** : la marque, les onglets au centre, les commandes de la page (escale ou étoile affichée, menu des escales, « Tourner autour »), puis la langue. À 860 px et moins, « Menu » regroupe onglets et langues. Sur l'Accueil et À propos, où le texte défile dessous, son fond est opaque.
- **Trois langues** : le menu des langues montre le drapeau et le code de la langue de la page. Le choix est gardé (cookie `lang`), et changer de langue garde l'escale ou l'étoile affichée.
- **Pied de page commun** : la signature, les contacts de l'auteur (GitHub, LinkedIn, e-mail) et la mention de droit d'auteur.
- Liens d'évitement, parcours complet au clavier, mouvement réduit respecté ; sans JavaScript, la page reste lisible et les onglets comme les langues restent des liens.

## Pile technique

Next.js 16 (App Router, Cache Components), React 19, TypeScript strict, Three.js pour les scènes 3D, Canvas 2D pour les animations, Vitest et Testing Library pour les tests. Aucune bibliothèque d'internationalisation : `Intl` et quelques modules maison (`src/i18n/`).

## Démarrer

```bash
npm install
npm run dev
```

Puis ouvrir http://localhost:3000 : le proxy envoie vers `/fr`, `/en` ou `/es` selon la langue du navigateur.

| Commande | Rôle |
|---|---|
| `npm run dev` | serveur de développement |
| `npm test` | tests Vitest (suite complète) |
| `npm run test:related -- <fichiers>` | tests des fichiers donnés et de ceux qui en dépendent |
| `npm run typecheck` | vérification des types |
| `npm run lint` | ESLint |
| `npm run build` | build de production |

## Organisation

```
src/
  app/
    [lang]/           layout racine (une langue par adresse) et pages : accueil, voyage/, tailles/, a-propos/
    global-not-found.tsx  404 trilingue des adresses qu'aucune route ne sert
    globals.css       styles globaux, partagés par les quatre pages
  proxy.ts            négociation de la langue des adresses qui n'en portent pas
  i18n/               langues, routes, négociation, métadonnées, noms des astres, unités, pluriels ; gardes des textes
  content/            contenus serveur, un dossier par domaine (common, home, voyage, cosmic, sizes, about)
  components/
    site/             barre commune (onglets, langues, menu replié), lien d'évitement, pied de page commun
    home/             Accueil : planétaire, portes, chiffres clés, renvoi des anciens liens
    journey/          Voyage : plaques, règle des distances, dock, exploration, et leurs tables de chaînes
    scene/            scène Three.js du Voyage (astres, ciel profond, galaxies, toile cosmique, étiquettes)
    sizes/            Tailles : scène des étoiles, plaques, règle et menu des étoiles
    about/            À propos
    modules/          animations explicatives en Canvas 2D
  lib/
    astro/            éphémérides, échelles, saisons, lumière, étoiles, galaxies, Univers (testé)
    journey/          caméra, sections, suivi du défilement, exploration et ses gestes (testé)
    sizes/            disposition, caméra et règle des tailles (testé)
    home/             planétaire et chiffres clés de l'accueil (testé)
    site/             position à garder au changement de langue, viewport
    sim/              horloge simulée et boucle d'animation unique
public/textures/      cartes des astres, en 2K, en 1K et communes aux deux
docs/maquette/        maquette interactive d'origine (un seul fichier HTML)
docs/adr/             décisions d'architecture (zoom cosmique, exploration, langues et routes, Tailles, zoom extragalactique)
design-system/        direction artistique, jetons, et précisions par page (pages/)
```

## Langues

### Adresses et négociation

- Chaque page existe dans les trois langues : `/{lang}`, `/{lang}/voyage`, `/{lang}/tailles`, `/{lang}/a-propos`, avec `lang` parmi `fr`, `en`, `es`. Les segments et les ancres des escales (`#saturne`) sont les mêmes dans les trois langues ; les chemins se fabriquent par `pathFor(page, locale)` (`src/i18n/routes.ts`).
- Les pages sont statiques : le layout `src/app/[lang]/layout.tsx` déclare les trois langues (`generateStaticParams`) et `ensureStatic`, qui fait échouer le build si une page lit les cookies ou les en-têtes. Une langue inconnue donne la 404.
- `src/proxy.ts` ne voit que les adresses **sans** langue (`/`, `/voyage`) : il renvoie (307) vers la même adresse préfixée de la langue préférée, le cookie `lang` s'il est valide, sinon `Accept-Language`, sinon le français. Il ne pose jamais de cookie : seul le menu des langues pose `lang`, sur action de la personne (un an, `SameSite=Lax`).
- Les anciens liens `/#saturne` passent par le proxy puis par un script en ligne de l'accueil, qui les renvoie vers `/{lang}/voyage#saturne` avant la peinture.
- Chaque page déclare son adresse canonique, les `hreflang` des trois langues et `x-default` (l'adresse sans langue, que le proxy négocie).

Détails et alternatives écartées : [docs/adr/0003-langues-et-routes.md](docs/adr/0003-langues-et-routes.md).

### Où vivent les textes

- **Contenus serveur** (`src/content/<domaine>/`) : le texte long, lu seulement par des composants serveur, qui reçoivent la langue en prop depuis la page. Par domaine : `types.ts` (forme), `structure.ts` quand il en faut un (ce qui ne dépend pas de la langue : ordre, couleurs, ancres, adresses), un fichier par langue (`fr.ts`, `en.ts`, `es.ts`) qui ne porte que du texte, et `content.ts` (`get<Domaine>Content(locale)`). Ils ne partent jamais au navigateur : aucun module client ne doit les importer.
- **Chaînes client** (`*.strings.ts`, à côté des composants qui les lisent) : une interface et une table `X_STRINGS: Readonly<Record<Locale, …>>`, lue par `X_STRINGS[useLocale()]`. Les fonctions y sont permises (pluriels, phrases calculées, accords : « d'Uranus », « del Sol »). Elles partent au navigateur dans les trois langues : leur somme ne dépasse pas 30 000 caractères par langue.
- Règle de partage : un texte lu par un composant client va dans une table `*.strings.ts` ; un texte lu seulement côté serveur va dans `src/content/`.
- Noms : le Soleil, les planètes et la Lune par `bodyName` (`src/i18n/names.ts`) ; les étoiles voisines et les galaxies dans `deepSky.strings.ts` ; les étoiles de Tailles dans `sizes.strings.ts`. Les données (`src/lib/`) n'ont pas de nom affiché : elles ont une clé.
- Nombres : `formatNumber(valeur, décimales, langue)`, langue obligatoire ; `formatCompact` pour les grands nombres en mots (« 2,5 millions », « 2.5 million », « 2,5 millones ») ; l'unité par `withUnit` (UA / AU / UA, al / ly / al, R☉ partout) ; les pluriels par `plural`.

### Conventions d'écriture

- Registre : vouvoiement en français ; « you » et orthographe britannique en anglais (*centre*, *colour*, formats `en-GB`) ; tutoiement en espagnol.
- Guillemets : « » en français et en espagnol (collés au texte en espagnol), “ ” en anglais ; ¿ ? et ¡ ! en espagnol.
- Les nombres écrits à la main suivent la sortie d'`Intl` de leur langue : « 1 392 700 km », « 1,392,700 km », « 1.392.700 km » (l'espagnol ne groupe qu'à partir de cinq chiffres : « 4879 »).
- **Typographie française**, sur tout le texte affiché (contenus, tables, textes dessinés sur les canevas) :
  - espace fine insécable (U+202F) entre les milliers et avant « ; », « ! », « ? » ;
  - espace insécable (U+00A0) avant « : » et à l'intérieur des guillemets « » ;
  - jamais d'espace ordinaire à ces places : la ligne pourrait s'y couper. Entre un nombre et son unité, l'espace reste ordinaire (`withUnit`).

  Dans les textes, ces espaces sont écrites telles quelles (invisibles dans l'éditeur) ; dans le code et les tests, par leur échappement (`\u202f`, `\u00a0`). Un test les vérifie partout.

### Gardes

Des tests transversaux (`src/i18n/`) gardent ces règles, en découvrant seuls les fichiers à lire :

| Test | Garde |
|---|---|
| `boundaries.test.ts` | aucun module `"use client"` n'atteint `src/content/`, même par un import indirect |
| `stringsBudget.test.ts` | les tables `*.strings.ts` tiennent dans 30 000 caractères par langue |
| `completeness.test.ts` | chaque contenu et chaque table est complet dans les trois langues, sans vide ni `TODO`, et rien n'est recopié du français (hors noms propres, symboles et mots identiques listés) |
| `frenchTypography.test.ts` | la typographie française ci-dessus, dans les valeurs affichées et dans le code qui les écrit |

### Ajouter une langue

1. Déclarer la langue dans `src/i18n/locales.ts` : son code dans `LOCALES`, puis `INTL_LOCALE`, `LOCALE_NAMES` et `OG_LOCALE`.
2. Lancer `npx tsc --noEmit` : il liste chaque table `Record<Locale, …>` à compléter, notamment les tables `*.strings.ts`, les noms des astres et les unités (`src/i18n/`), le drapeau (`src/components/site/flags.tsx`), les formats de date et de durée (`SimDate.tsx`, `seasons.ts`) et l'aiguillage de chaque contenu (`src/content/<domaine>/content.ts`).
3. Écrire un fichier `<code>.ts` par domaine de `src/content/`, et la nouvelle langue de chaque table, sans recopier le français.
4. Ajouter la langue au matcher de `src/proxy.ts` (un littéral, lu au build) : le test du proxy vérifie qu'il exclut chaque langue de `LOCALES`.
5. Lancer les gardes (`npx vitest run src/i18n`) et les tests des domaines, puis vérifier à l'œil, à 320, 375 et 1 440 px, la barre (une seule ligne), le dock et les textes des canevas, souvent plus longs qu'en français.

## Données et approximations

- Éléments orbitaux : JPL, *Keplerian Elements for Approximate Positions of the Major Planets* (1800-2050).
- Données physiques : NASA, *Planetary Fact Sheet*. Nombres de lunes : NASA et UAI, 2025.
- Les tailles des planètes sont agrandies et les distances compressées (racine carrée), sauf en mode « distances réelles ».
- L'ouverture des anneaux de Saturne suit un modèle sinusoïdal, juste à environ un an près.
- Cartes des astres et de la Voie lactée (`public/textures/`) : [Solar System Scope](https://www.solarsystemscope.com/textures/), d'après des données de la NASA, sous licence [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.fr). Modifications : renommées ; redimensionnées (1K, 512 px pour la Lune, 256 px pour la Voie lactée) ; carte spéculaire convertie de TIFF en JPEG.
- Orientation des axes de rotation : modèles de l'UAI (WGCCRE 2015 ; Mars, rapport 2009), sans les termes périodiques (moins d'un degré). Au chargement, chaque planète montre son vrai méridien origine ; ensuite, sa rotation affichée est ralentie.
- Les anneaux de Saturne s'étendent sur la texture de 1,159 à 2,337 rayons équatoriaux, valeurs mesurées sur ses divisions de Cassini et d'Encke.
- Soleil : surface procédurale, calculée en température ; le cycle des taches suit un modèle de Hathaway et al. (1994) ancré sur le cycle 25 (minimum de décembre 2019, maximum d'octobre 2024, NOAA, NASA, SILSO). Loin de ce cycle, il ne donne qu'un ordre de grandeur.
- Étoiles voisines (`src/lib/astro/stars.ts`) : une sélection des systèmes stellaires les plus connus à moins de 12 années-lumière, plus Altaïr ; coordonnées J2000 (SIMBAD), distances tirées des parallaxes (ESA, Gaia DR3 ; Hipparcos, van Leeuwen 2007 ; Akeson et al. 2021 ; Bond et al. 2017 ; Benedict et al. 2006 ; Kervella et al. 2022 ; RECONS). Un couple serré n'est qu'un point ; les naines brunes ne sont pas des étoiles et n'y figurent pas.
- Les distances des étoiles sont à l'échelle, leurs tailles très exagérées : la taille d'un point suit la magnitude absolue de l'étoile, sa couleur sa classe spectrale. Les mouvements propres depuis 2000 sont négligés (0,075° pour l'étoile de Barnard, la plus rapide).
- Voie lactée : modèle procédural stylisé, tiré d'une graine fixe (40 000 points, 16 000 sur écran tactile) ; bras d'après Reid et al. (2019), barre d'après Bland-Hawthorn et Gerhard (2016), Soleil à 27 000 années-lumière du centre (GRAVITY Collaboration, 2022), dimensions de la NASA. Couleurs indicatives : bras bleus (étoiles jeunes), régions HII rouges, bulbe orangé (étoiles vieilles) ; l'éclat est réglé à l'écran et s'atténue quand la galaxie rapetisse, pour ne pas saturer. Ce n'est pas une carte : nul ne peut photographier notre galaxie de l'extérieur.
- Groupe local (`src/lib/astro/localGroup.ts`) : treize galaxies, d'après McConnachie (2012, catalogue 2021) et des distances récentes (Li et al. 2021, Breuval et al. 2023, Pietrzyński et al. 2019, Graczyk et al. 2020). Distances à l'échelle, galaxies grossies 4 fois pour qu'on les voie, formes stylisées d'après leurs mesures.
- Univers observable : 46 milliards d'années-lumière de rayon pour 13,8 milliards d'années (Planck Collaboration, 2020). La toile cosmique et les taches du fond diffus sont procédurales : ce n'est pas une carte du ciel, et la plaque le dit.
- Multivers : une hypothèse, jamais observée ; les autres bulles, leurs tailles et leurs places sont inventées pour l'image.
- Zoom cosmique : une seule scène, réduite autour du Soleil (10^−zoom), avec les étoiles, les galaxies et l'Univers dans leurs propres unités ; voir [docs/adr/0001-zoom-cosmique.md](docs/adr/0001-zoom-cosmique.md) et [docs/adr/0005-zoom-extragalactique.md](docs/adr/0005-zoom-extragalactique.md).
- Tailles (`src/lib/astro/starSizes.ts`) : rayons tirés de diamètres angulaires mesurés (interférométrie) et de distances (Gaia DR3, Hipparcos, parallaxes de masers), en rayons solaires nominaux (UAI 2015 : 695 700 km) ; pour les supergéantes, dont la surface est floue et la distance incertaine, la fourchette publiée accompagne la valeur retenue. Couleurs : celles du corps noir à la température effective (table de Mitchell Charity). Voir [docs/adr/0004-comparateur-de-tailles.md](docs/adr/0004-comparateur-de-tailles.md).
- Tourner autour : la caméra garde la cible de l'escale et ne s'en éloigne pas à plus de quatre fois sa distance de départ ; elle s'approche jusqu'à 1,8 rayon d'une planète (1,15 fois ses anneaux), jamais à moins de 2,5 rayons du Soleil, et jusqu'au quart de la vue de départ aux étoiles voisines, aux deux cinquièmes aux autres escales lointaines ; voir [docs/adr/0002-mode-exploration.md](docs/adr/0002-mode-exploration.md).
- Vu depuis la Terre : positions héliocentriques des éléments JPL, sans temps de lumière ni position de l'observateur (latitude, horizon). La caméra se place dans la vraie direction de la Terre ; les distances de la scène restant compressées, seule cette direction, donc la phase, est exacte. Fraction éclairée tirée de l'angle de phase, diamètre apparent équatorial (diamètres NASA). L'élongation est la séparation angulaire vraie Soleil–planète, latitudes comprises, comme dans les almanachs (et non la seule différence de longitudes : 8,4° au lieu de 0,1° pour Vénus le 23 mars 2025) ; le côté du Soleil (est : le soir, ouest : le matin) vient de la différence des longitudes. Quand regarder, même règle pour les sept planètes : à moins de 15° du Soleil, trop près pour être vue ; à 150° et plus, toute la nuit ; sinon, sous 60°, le soir à l'ouest après le coucher du Soleil (côté est) ou le matin à l'est avant son lever (côté ouest), et au-delà, en soirée ou en fin de nuit. Uranus se cherche aux jumelles, Neptune au télescope, les autres à l'œil nu.
