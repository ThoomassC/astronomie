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
barre haute fixe, trois langues, aucune dépendance nouvelle.

## Décision

- **Une carte, pas de copie du DOM.** La plaque de chaque escale reste dans sa section. En carte fixe (requête
  `FIXED_CARD_QUERY`, `src/lib/journey/card.ts`, la même que la feuille de style), toutes sont `position: fixed` sous
  la barre ; seule celle de l'escale courante (`data-current`) se voit. Les escales gardent leur hauteur : le rythme du
  voyage ne change pas. La carte et son squelette glissent avec la barre (même course, même durée).
- **Client prêt d'abord.** Chaque règle de la carte fixe attend `html[data-fixed-card]`, posé par `CardTrack` tant
  que la requête correspond, retiré à son démontage. Avant l'hydratation (réseau lent, script en échec), la plaque
  garde la forme compacte collée en bas, entière et lue : le serveur ne pose jamais `data-current`, et sans cette
  attente aucune plaque ne se voyait ni ne se lisait. La scène retrouve alors sa bande au-dessus de la plaque collée.
- **Lecture linéaire : masquées à l'œil seulement.** Les cartes non courantes sont découpées à rien
  (`clip-path: inset(50%)`), pas `visibility: hidden` : dans l'ordre du document, VoiceOver et TalkBack les lisent
  l'une après l'autre et la liste des titres a un `h2` par escale. Le focus qui entre dans l'une (Tab, lecteur d'écran)
  rend son escale courante d'un saut sans animation (`jumpTo`), avant l'image suivante ; le contenu déplié reste
  masqué tant qu'il n'est pas ouvert. Elles restent **fixées**, et non remises dans le flux de leur section en boîte
  de 1 px : la scène mesure la forme repliée de chaque carte, à sa place de repos, pour cadrer l'astre de chaque
  escale, survolées comprises ; une carte de 1 px ne se mesure plus, et chaque changement de carte courante
  redimensionnerait les plaques (nouvelle mesure de toute la scène). Ce qu'on perd : une plaque fixée ne fait pas
  défiler la page quand le curseur de VoiceOver s'y pose sur du texte (non focalisable) ; seul le focus la rend
  courante.
- **Saut sans squelette.** Une navigation programmée (flèche, lien d'escale, `goTo` ; `jumpTo`) vise son escale :
  le parcours la retient (`StopStore.aim`) jusqu'au repos sur elle ou au premier geste qui fait défiler (pas Tab), et
  la carte fixe la montre dès le départ, sans squelette ni carte des escales survolées. Le focus, posé sur la section
  visée, ne tombe plus sur une carte cachée pendant le vol doux.
- **Focus.** Une carte qui cesse d'être courante avec le focus le rend à sa section (`preventScroll`). Ce qui reçoit
  le focus s'arrête sous la carte repliée (`scroll-padding-top` lit sa hauteur mesurée, `--card-h`). La carte dépliée
  se replie quand le focus la quitte pour un autre élément, sans le reprendre ; un focus perdu sans destination
  (toucher hors de toute commande, fenêtre quittée) ne la replie pas.
- **État dérivé du vol.** `cardView(vol, aUneCarte)` rend « rien », « carte de telle escale » ou « squelette » :
  carte de l'escale visée s'il y en a une, carte au repos (ou à moins de 4 % d'un bout du vol, contre le
  clignotement), squelette en plein vol (son balayage passe trois fois, puis s'arrête), rien là où
  l'escale affichée n'a pas de plaque (accueil, introduction de Tailles, ceinture). Le store prévient désormais aussi à
  chaque état du vol (`subscribeFlight`) ; chaque plaque ne s'abonne qu'à sa propre réponse (booléen), via un contexte
  (`CardTrack`, enveloppé par `JourneyCards` et `SizesCards`), qui rend aussi le squelette après `main`.
- **Carte repliée minimale** (≈ 80 px) : rang, puis « ‹ Nom › ». Le nom est le bouton qui déplie la carte (motif
  accordéon `h2 > button[aria-expanded][aria-controls]`, qui pilote les sections et le pied) ; dépliée, la rangée des pictogrammes, première section
  ouverte, contenu qui défile dans la carte jusqu'au dock. Le nom ne devient un bouton qu'après l'hydratation, en carte
  fixe (`useFixedCard`) : au rendu serveur, sur grand écran et sans JavaScript, c'est un simple titre. Une carte qu'on
  quitte se replie. Quand la mise en page bascule (rotation), l'état suit : hors carte fixe la carte n'est plus
  « dépliée » ; en y entrant avec une section ouverte, la carte courante arrive dépliée, les autres se replient.
  Dépliée, elle a un fond opaque (les étiquettes de la scène ne transparaissent pas), s'arrête au-dessus de la note
  d'échelle visible, et défile tout entière si son haut remplit le plafond (texte à 200 %).
- **Bande libre** : du bas de la carte repliée, lue à sa place de repos, au haut du dock, de la note d'échelle (passée
  au-dessus du dock) ou du bas de l'écran ; le plancher se lit dans la hauteur maximale de la carte, qu'une seule
  règle de la feuille de style définit. La carte dépliée garde la mesure repliée : la caméra ne bouge pas. Aucune
  étiquette ne se pose sous la carte, ciel profond compris.

## Conséquences

- Révision du 06/11/2026 : la barre haute ne glisse plus hors de l'écran en descendant (demande de l'utilisateur :
  « laisse-le fixe tout le temps »). Elle reste toujours affichée, et la carte reste sous elle ; `AutoHideBar` et la
  logique de glissement sont retirés.

- La scène gagne la hauteur de l'ancienne plaque : sur un téléphone court avec la note d'échelle, la bande passe
  d'environ 17 % à plus de 40 % de l'écran.
- La note d'échelle du Voyage et l'échelle graphique de Tailles quittent le haut de l'écran pour le bas.
- Sur écran bas et dans les navigateurs sans la requête `scripting` (Safari avant 17), la plaque compacte d'avant
  reste ; sans bande libre mesurée dans ce dernier cas, la caméra y cadre l'astre comme en portrait ordinaire.
- Tab parcourt les cartes dans l'ordre des escales, chacune devenant courante d'un saut ; à vérifier au lecteur
  d'écran (VoiceOver iOS, TalkBack), notamment le saut au focus et la liste des titres.

## Alternatives écartées

- **Cartes non courantes remises dans le flux de leur section, en boîte de 1 px** : plus fidèle au défilement du
  lecteur d'écran, mais la scène ne mesure plus leur forme repliée (bande libre des escales survolées perdue) et
  chaque changement de carte courante redimensionne deux plaques.
- **Seul le `h2` des cartes non courantes accessible** (le reste en `visibility: hidden`) : liste des titres
  complète, mais la lecture linéaire saute le rang, l'accroche et les flèches de chaque escale.
- **Cartes empilées en défilement** (la plaque suit son escale, comme avant) : c'est ce qui faisait monter la carte
  suivante pendant la lecture.
- **Rangée d'icônes toujours visible** sous le nom : environ 50 px de plus par carte, pris sur l'astre ; le nom suffit
  comme commande.
- **Bouton flottant de détails en bas** : une commande de plus à découvrir, loin du nom qu'elle détaille, et en
  concurrence avec le dock du Voyage.
- **Une carte unique rendue à part** (copie du contenu de l'escale courante) : identifiants en double ou à renommer,
  et un repli sans JavaScript à maintenir séparément.
