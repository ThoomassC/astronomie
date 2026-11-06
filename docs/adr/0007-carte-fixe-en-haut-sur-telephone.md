# ADR 0007 — Carte fixe en haut de l'écran sur téléphone

- Statut : accepté
- Date : 06/11/2026
- Portée : Voyage (`/{lang}/voyage`) et Tailles (`/{lang}/tailles`), mise en page compacte avec JavaScript ; grand
  écran, paysage bas (30 rem de haut et moins) et rendu sans JavaScript inchangés

## Contexte

Sur téléphone, chaque escale avait sa plaque, collée en bas de l'écran pendant le repos de la caméra puis emportée par
le défilement. L'utilisateur, sur Tailles en 375 px : « quand on défile, on a la carte de la prochaine planète qui
vient ». Il demande les cartes en haut, un chargement en squelette au passage d'une carte à l'autre, la même chose au
Voyage, et des cartes plus petites : la rangée de pictogrammes sous le nom les grossissait ; ne garder que le visuel
principal.

Contraintes : identifiants uniques (ancres, `aria-controls`, `aria-labelledby`), repli sans JavaScript, défilement qui
mène la caméra (plages de repos et de vol de chaque escale, ADR 0001), scène cadrée dans une bande libre mesurée,
barre qui glisse hors de l'écran, trois langues, aucune dépendance nouvelle.

## Décision

- **Une carte, pas de copie du DOM.** La plaque de chaque escale reste dans sa section. En carte fixe (requête
  `FIXED_CARD_QUERY`, `src/lib/journey/card.ts`, la même que la feuille de style), toutes sont `position: fixed` sous
  la barre ; seule celle de l'escale courante (`data-current`) se voit, les autres sont `visibility: hidden` : ni
  focalisables, ni lues, mais toujours mesurables. Les escales gardent leur hauteur : le rythme du voyage ne change
  pas. La carte et son squelette glissent avec la barre (même course, même durée).
- **État dérivé du vol.** `cardView(vol, aUneCarte)` rend « rien », « carte de telle escale » ou « squelette » :
  carte au repos (ou à moins de 4 % d'un bout du vol, contre le clignotement), squelette en plein vol, rien là où
  l'escale affichée n'a pas de plaque (accueil, introduction de Tailles, ceinture). Le store prévient désormais aussi à
  chaque état du vol (`subscribeFlight`) ; chaque plaque ne s'abonne qu'à sa propre réponse (booléen), via un contexte
  (`CardTrack`, enveloppé par `JourneyCards` et `SizesCards`), qui rend aussi le squelette après `main`.
- **Carte repliée minimale** (≈ 80 px) : rang, puis « ‹ Nom › ». Le nom est le bouton qui déplie la carte (motif
  accordéon `h2 > button[aria-expanded][aria-controls]`) ; dépliée, la rangée des pictogrammes, première section
  ouverte, contenu qui défile dans la carte jusqu'au dock. Le nom ne devient un bouton qu'après l'hydratation, en carte
  fixe (`useFixedCard`) : au rendu serveur, sur grand écran et sans JavaScript, c'est un simple titre. Une carte qu'on
  quitte se replie.
- **Bande libre** : du bas de la carte repliée, lue à sa place de repos, au haut du dock, de la note d'échelle (passée
  au-dessus du dock) ou du bas de l'écran ; le plancher se lit dans la hauteur maximale de la carte, qu'une seule
  règle de la feuille de style définit. La carte dépliée garde la mesure repliée : la caméra ne bouge pas. Aucune
  étiquette ne se pose sous la carte, ciel profond compris.

## Conséquences

- La scène gagne la hauteur de l'ancienne plaque : sur un téléphone court avec la note d'échelle, la bande passe
  d'environ 17 % à plus de 40 % de l'écran.
- La note d'échelle du Voyage et l'échelle graphique de Tailles quittent le haut de l'écran pour le bas.
- Sur écran bas et dans les navigateurs sans la requête `scripting` (Safari avant 17), la plaque compacte d'avant
  reste ; sans bande libre mesurée dans ce dernier cas, la caméra y cadre l'astre comme en portrait ordinaire.
- Une plaque qui a le focus et cesse d'être courante (défilement au clavier depuis la carte) devient invisible : le
  focus revient au document. À vérifier au lecteur d'écran.

## Alternatives écartées

- **Cartes empilées en défilement** (la plaque suit son escale, comme avant) : c'est ce qui faisait monter la carte
  suivante pendant la lecture.
- **Rangée d'icônes toujours visible** sous le nom : environ 50 px de plus par carte, pris sur l'astre ; le nom suffit
  comme commande.
- **Bouton flottant de détails en bas** : une commande de plus à découvrir, loin du nom qu'elle détaille, et en
  concurrence avec le dock du Voyage.
- **Une carte unique rendue à part** (copie du contenu de l'escale courante) : identifiants en double ou à renommer,
  et un repli sans JavaScript à maintenir séparément.
