# ADR 0003 — Trois langues : des routes préfixées par la langue, des textes rangés selon qui les lit

- Statut : accepté
- Date : 29/10/2026
- Portée : tout le site (Accueil, Voyage, Tailles, À propos), en français, en anglais et en espagnol

## Contexte

Le site tenait sur une seule page française (`/`), chaque escale y ayant son ancre (`#saturne`). La vague 2 le
découpe en quatre onglets et l'ouvre à l'anglais et à l'espagnol, pour un public de 12 ans et plus. Contraintes :

- les pages restent statiques et cachables : aucune lecture de `cookies()` ni de `headers()` au rendu ;
- les liens déjà partagés (`/#saturne`) mènent toujours à leur escale ;
- aucune dépendance nouvelle ;
- les textes des composants client contiennent des fonctions (pluriels, nombres, accords : « d'Uranus », « del Sol ») ;
- les tests existants (plus de 500, en français) restent verts pendant toute la migration, sans être réécrits.

Avec Next 16 (App Router, `cacheComponents`), une langue portée par l'URL passe par un segment `[lang]` au-dessus de
toutes les routes, et la négociation par le proxy.

## Décision

- **Routes et segments (D2).** Le layout racine vit sous `src/app/[lang]/`, avec quatre pages : `/{lang}`,
  `/{lang}/voyage`, `/{lang}/tailles`, `/{lang}/a-propos`. Les segments (`PAGE_SEGMENTS`) et les ancres des escales
  (`STOP_IDS`, `#saturne`) sont les mêmes dans les trois langues : le chemin public est le chemin interne (sortie
  statique, préchargement, `usePathname`), et changer de langue ne remplace que le premier segment (`switchLocale`),
  fragment compris. Les chemins se fabriquent par `pathFor(page, locale)`.
- **Proxy minimal (D3).** `src/proxy.ts` ne voit que les chemins sans langue : son matcher exclut `/fr`, `/en`,
  `/es`, `/_next/`, `/textures/` et les fichiers, si bien que les pages statiques ne passent pas par lui. Sa décision
  est une fonction pure, `routeRequest` : redirection 307 vers `/{langue}{chemin}{requête}`, la langue venant du
  cookie `lang` s'il est valide, sinon d'`Accept-Language` (`negotiateLocale`), sinon du français ; en-tête
  `Vary: Accept-Language, Cookie`. Le proxy ne pose jamais de cookie (un `Set-Cookie` rendrait la page non cachable).
  Seul le menu des langues pose `lang` (un an, `SameSite=Lax`, `Path=/`), sur action de la personne : une préférence
  d'interface, exemptée de consentement.
- **Statique garanti (D4).** Le layout `[lang]` exporte `generateStaticParams` (les trois langues) et
  `ensureStatic = "navigation"`, qui fait échouer `next dev` et `next build` si une page lit `cookies()` ou
  `headers()`. Une langue inconnue donne `notFound()`. La 404 globale, trilingue, passe par `global-not-found.tsx`
  (drapeau `experimental.globalNotFound`) : c'est le cas que Next prévoit quand le layout racine est sous un segment
  dynamique.
- **Langue dans les composants (D5).** Les composants serveur reçoivent `locale` en prop depuis la page. Les
  composants client appellent `useLocale()`, qui lit le contexte posé par le layout (`LocaleProvider`) et vaut `fr`
  sans fournisseur (tests, 404 globale). Pas de `next/root-params` : le module lève une erreur hors compilation Next,
  donc dans Vitest, alors que la prop se teste. Hors React (moteurs Three, fonctions pures), la langue passe en
  argument.
- **Où vivent les textes (D6).** Le contenu long reste côté serveur, dans
  `src/content/<domaine>/{types,fr,en,es,content}.ts`, jamais importé par un module client. Les chaînes des composants
  client vivent dans des tables `*.strings.ts`, à côté des composants qui les lisent (`Readonly<Record<Locale, …>>`,
  fonctions permises) ; leur somme ne dépasse pas 30 000 caractères par langue.
- **Une seule source pour les noms (D7).** `BODY_NAMES` (`src/i18n/names.ts`) nomme le Soleil, les huit planètes et la
  Lune dans les trois langues. Les champs `name` français des données disparaissent en clôture.
- **Formats (D8).** Tout passe par `Intl`, avec `fr-FR`, `en-GB` et `es-ES` (anglais britannique : formats métriques,
  jour-mois-année) : `formatNumber(valeur, décimales, langue)` (« 1 392 700 », « 1,392,700 », « 1.392.700 »),
  `formatCompact` pour les grands nombres en mots (« 2,5 millions », « 2.5 million », « 2,5 millones »), `plural`
  (catégories CLDR), `Intl.DateTimeFormat` pour les dates et `Intl.RelativeTimeFormat` pour les écarts. Unités
  (`UNITS`) : UA / AU / UA, al / ly / al, R☉ partout. La langue de `formatNumber` vaut `fr` par défaut pendant la
  migration et devient obligatoire en clôture.
- **Typographie des nombres et des unités (D8, précisée).** Les nombres gardent la sortie d'Intl telle quelle, et les
  nombres écrits à la main dans les textes la reprennent, pour qu'un même nombre s'écrive pareil partout sur la page :

  | | Français | Anglais | Espagnol |
  |---|---|---|---|
  | Décimales | virgule : 0,39 | point : 0.39 | virgule : 0,39 |
  | Milliers | espace fine insécable (U+202F) dès 4 chiffres : 4 879, 27 000 | virgule dès 4 chiffres : 4,879, 27,000 | point dès 5 chiffres : 4879, 27.000 |
  | Avant une unité (`withUnit`) | espace : 1,52 UA, 764 R☉ | espace : 1.52 AU | espace : 1,52 UA |
  | Avant % | espace : 49 % | collé : 49% | espace : 49 % |
  | Seconde d'arc, degré | collés : 24″, 46° | collés | collés |

  L'espace avant l'unité et avant % est l'espace ordinaire (U+0020) : c'est la seule employée aujourd'hui dans les
  textes du site et leurs tests (plus de 300 occurrences). On n'emploie pas les styles `percent` et `unit` d'Intl, qui
  posent d'autres espaces (U+00A0, U+202F).
- **Changement de langue (D9).** Le menu des langues est fait de liens `<a>` (`lang`, `hrefLang`, langue courante en
  `aria-current`) : changer le paramètre racine recharge la page. Au clic, il pose le cookie et ajoute le fragment de
  la position courante (escale du voyage, étoile des tailles), fourni par la page affichée.
- **Anciens liens (D10).** `/#saturne` : le proxy renvoie vers `/fr` (le navigateur garde le fragment), puis un script
  en ligne, placé avant l'en-tête de l'accueil, remplace l'adresse par `/fr/voyage#saturne` avant la peinture, pour
  toute ancre de `STOP_IDS` sauf `accueil`, qui reste sur le nouvel accueil.
- **Métadonnées (D11).** `pageMetadata(page, locale)` donne le titre, la description, l'adresse canonique, les
  `hreflang` des trois langues et `x-default`, qui pointe vers le chemin sans langue que le proxy négocie
  (`negotiatedPathFor` : `/voyage`) ; Open Graph reçoit `locale` et `alternateLocale`. `metadataBase` vient de
  `VERCEL_PROJECT_PRODUCTION_URL`, `http://localhost:3000` à défaut.

## Alternatives écartées

- **Une bibliothèque i18n** (next-intl, etc.) : dépendance nouvelle, et ses messages ne transportent pas de fonctions
  (pluriels, phrases calculées des modules).
- **Des segments traduits** (`/en/journey`, `/es/viaje`) : il faut une réécriture dans le proxy (chemin public ≠
  chemin interne), avec des écarts possibles entre `usePathname`, le préchargement partiel et la sortie statique, pour
  un gain limité au référencement, que `hreflang` couvre déjà. L'évolution reste bornée : `PAGE_SEGMENTS` deviendrait
  une table par langue, `routeRequest` gagnerait la réécriture et `switchLocale` traduirait le segment ; les appelants
  de `pathFor` ne changent pas.
- **Les chaînes client passées en props depuis le serveur** : les fonctions ne se sérialisent pas, d'où des gabarits
  `{x}` partout et des props sur trois niveaux (modules, scène, menus), et les tests qui rendent sans props
  casseraient. Coût accepté à la place : environ 10 Ko gzip de chaînes en/es en plus sur la page Voyage, borné par un
  test de budget.
- **Une grande passe de traduction après les fonctionnalités** : elle passerait deux fois sur chaque fichier et
  resterait seule sur le chemin critique.
- **Les milliers de la RAE en espagnol** (espace fine, « 27 000 », jamais de point) : c'est la recommandation de
  l'Ortografía de 2010, mais l'usage courant en Espagne, et le CLDR qu'Intl suit, gardent le point. Le suivre
  obligerait à retoucher la sortie d'Intl (`formatToParts`) et à réécrire autrement les nombres rédigés, avec deux
  écritures possibles d'un même nombre. Le changement resterait local (`formatNumber`, nombres rédigés en espagnol,
  tests) si la relecture le demande.
- **L'espace insécable avant les unités dès maintenant** (U+00A0, que recommandent le BIPM, l'Imprimerie nationale et
  la RAE) : elle évite qu'une unité passe seule à la ligne, mais changerait chaque texte français et ses tests pendant
  la migration, qui les garde inchangés, et mélangerait deux espaces sur le site. Elle se posera d'un bloc, dans
  `withUnit` et dans tous les textes à la fois.

## Conséquences

- Les pages restent statiques : seul un chemin sans langue passe par le proxy, et rien ne lit la requête au rendu.
- Changer de langue recharge la page ; le fragment conservé ramène à la même escale.
- Les adresses anglaises et espagnoles gardent des segments français (`/en/tailles`) : coût accepté.
- Le français reste la langue par défaut des anciens liens, des composants rendus hors fournisseur et des tests
  existants. Ce défaut permet de convertir le site fichier par fichier ; la clôture le retire là où il masquerait un
  oubli (langue obligatoire pour `formatNumber`, tsc liste alors chaque appel).
- Toute chaîne nouvelle d'un composant client va dans un `*.strings.ts`, dans les trois langues ; tout nombre affiché
  passe par `formatNumber` ou `formatCompact` avec la langue, et son unité par `withUnit`. En clôture, des tests de
  garde vérifient qu'aucun module client n'atteint `src/content/`, le budget des tables et la complétude des
  traductions.
- Ajouter une langue : `LOCALES` et les tables de `src/i18n/locales.ts`, puis chaque table par langue que tsc signale
  incomplète (`Record<Locale, …>`), et le matcher du proxy, qu'un test garde aligné sur `LOCALES`.
- Risque connu : un nombre formaté au rendu serveur (ICU de Node) puis dans le navigateur (ICU du système) peut
  différer d'un caractère d'espacement en français et casser l'hydratation ; l'anglais et l'espagnol n'utilisent pas
  d'espace. Vérification : console sans avertissement d'hydratation sous Safari et sous Chrome.
