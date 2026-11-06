import type { ReleasesContent } from "./types";

/**
 * Notes de version, en français : vouvoiement, phrases courtes, sans vocabulaire technique (public de 12 ans et plus) ;
 * typographie du site (espace insécable avant « : » et dans les guillemets, espace fine insécable avant « ; »).
 */
export const RELEASES_FR: ReleasesContent = {
  title: "Notes de version",
  intro: "Ce qui change sur le site, version après version, de la plus récente à la plus ancienne.",
  toc: "Toutes les versions",
  version: "Version",
  latest: "Dernière version",
  releases: [
    {
      version: "1.1.0",
      summary:
        "Quatre trous noirs rejoignent les étoiles de Tailles, le Voyage et l'Accueil gagnent en finesse, et la navigation sur téléphone est repensée.",
      sections: [
        {
          heading: "Nouveautés",
          items: [
            "Quatre trous noirs dans l'onglet Tailles : Cygnus X-1, Sagittarius A*, M87* et le trou noir du Fer à cheval cosmique.",
            "Sur téléphone, la fiche de l'astre affiché reste en haut de l'écran pendant tout le parcours.",
            "Cette page, Notes de version, raconte ce qui change à chaque version.",
          ],
        },
        {
          heading: "Tailles",
          items: [
            "Les trous noirs se rangent parmi les étoiles selon la taille de leur ombre, environ 2,6 fois celle de leur horizon.",
            "Chaque trou noir est calculé à l'écran : son ombre, son anneau de lumière et les étoiles du fond, déviées comme par une loupe.",
            "Cygnus X-1 est entouré d'un disque de gaz brûlant, M87* lance un long jet et Sagittarius A* porte un anneau ténu.",
            "Le trou noir du Fer à cheval cosmique, pesé en 2025, est l'un des plus gros connus : 36 milliards de fois la masse du Soleil.",
            "Chaque trou noir a sa fiche, ses sources, et la règle des tailles va d'un dix-millième à un million de rayons solaires.",
            "Rigel et Sirius, étoiles très chaudes, ont désormais un bord plus sombre et un halo bleuté.",
          ],
        },
        {
          heading: "Voyage",
          items: [
            "La règle des distances s'allège : l'escale en cours et ses voisines gardent leur nom, les autres le montrent au survol.",
            "À chaque planète, son orbite s'efface autour d'elle et les autres planètes s'assombrissent.",
            "Les noms des astres s'affichent au-dessus d'eux, et au-dessus des anneaux pour Saturne et Uranus.",
            "Les étoiles voisines brillent davantage ; six d'entre elles affichent leur distance.",
            "Le texte s'efface en douceur sous la barre du haut et sous les commandes du bas.",
            "Les textes sont plus grands et les images des planètes apparaissent en fondu.",
          ],
        },
        {
          heading: "Accueil",
          items: [
            "Les trois portes sont illustrées, et celle du Voyage passe devant.",
            "Sur le planétaire, les noms des planètes sortent du centre, reliés à elles par un fin trait de laiton.",
            "À l'ouverture de la page, les planètes glissent jusqu'à leur position du jour.",
            "Les chiffres clés s'affichent en grands caractères, et la page À propos s'aligne sur la barre du haut.",
          ],
        },
        {
          heading: "Téléphone",
          items: [
            "Au Voyage et à Tailles, une carte fixe en haut de l'écran montre l'escale en cours, avec des flèches vers la précédente et la suivante.",
            "Toucher le nom de l'astre déplie ses détails, qui défilent dans la carte.",
            "Pendant le passage d'une escale à l'autre, une carte d'attente garde la place.",
            "Au Voyage et à Tailles, la barre du haut reste toujours fixe, en portrait comme en paysage.",
            "Les boutons du bas sont plus faciles à toucher, et les noms des astres évitent la barre.",
          ],
        },
        {
          heading: "Accessibilité",
          items: [
            "Quand la carte change d'escale, le clavier reste au bon endroit.",
            "Un lecteur d'écran lit toujours les escales dans l'ordre de la page.",
            "Sans JavaScript, chaque fiche reste dans la page et se lit en entier.",
          ],
        },
      ],
    },
    {
      version: "1.0.0",
      summary:
        "La première version publique : le système solaire du jour, un voyage jusqu'au multivers et la taille des étoiles, en trois langues.",
      sections: [
        {
          heading: "Accueil",
          items: [
            "Un planétaire montre les huit planètes à leur position du jour, la Terre marquée « Vous êtes ici ».",
            "Trois portes mènent au Voyage, à Tailles et à la page À propos.",
            "Quatre chiffres clés donnent l'échelle, des 109 Terres dans la largeur du Soleil à Proxima du Centaure, à 4,2 années-lumière.",
          ],
        },
        {
          heading: "Voyage",
          items: [
            "Dix-sept escales, du Soleil au multivers, en passant par chaque planète, les étoiles voisines, la Voie lactée et les autres galaxies.",
            "Les planètes partent de leur vraie position du jour.",
            "Une machine à remonter le temps fait défiler les jours ou les années, et une bascule montre les distances réelles.",
            "Le Soleil est calculé en direct, avec ses taches qui suivent le cycle solaire et sa couronne.",
            "« Tourner autour » fait le tour de chaque astre, et « Vu depuis la Terre » montre une planète telle qu'on la voit d'ici.",
            "Une animation par escale : la course de la lumière, les saisons, votre poids sur chaque planète, l'année de Neptune…",
          ],
        },
        {
          heading: "Tailles",
          items: [
            "Dix étoiles côte à côte et à la même échelle, de la petite Proxima du Centaure à l'immense VY Canis Majoris, Soleil compris.",
            "Chaque fiche donne le rayon, la température et sa couleur, la distance, et jusqu'où irait l'étoile à la place du Soleil.",
            "Une règle des tailles situe chaque étoile d'un coup d'œil.",
          ],
        },
        {
          heading: "Tout le site",
          items: [
            "La page À propos dit pourquoi ce site existe et d'où viennent ses chiffres.",
            "Le site parle français, anglais et espagnol ; changer de langue garde la page et l'endroit affichés.",
            "Sur téléphone, un menu regroupe les onglets et les langues.",
          ],
        },
        {
          heading: "Accessibilité",
          items: [
            "Tout se parcourt au clavier, avec un lien pour aller directement au contenu.",
            "Les animations se calment quand l'appareil demande moins de mouvement.",
            "Sans JavaScript, les pages restent lisibles et les liens fonctionnent.",
          ],
        },
      ],
    },
  ],
};
