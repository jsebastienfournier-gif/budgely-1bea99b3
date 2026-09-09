# Supprimer les synchronisations automatiques

Objectif : plus aucune récupération de dépenses ne se déclenche toute seule. Tout passe par un clic explicite de l'utilisateur sur « Synchroniser ». L'automatisation pourra être réintroduite plus tard, réservée à la formule Premium.

## Ce qui se déclenche automatiquement aujourd'hui (page Capture)

1. À chaque ouverture de la page, l'application interroge le service externe et réimporte les dépenses e-mail déjà analysées, sans action de l'utilisateur.
2. Juste après le retour d'une connexion bancaire réussie, une synchronisation bancaire part immédiatement (deux chemins de retour distincts).

## Changements

- Retirer la récupération automatique des dépenses e-mail à l'ouverture de la page. La page affichera uniquement les dépenses déjà enregistrées dans la base.
- Après une connexion bancaire réussie, afficher le message de confirmation mais ne plus lancer la synchronisation : l'utilisateur cliquera sur « Synchroniser » quand il le souhaite.
- Conserver inchangés les boutons manuels de synchronisation e-mail et bancaire, ainsi que la finalisation de la connexion bancaire (elle enregistre la connexion, sans importer de dépenses).
- Conserver le nettoyage des dépenses issues d'une source non incluse dans l'offre : il s'exécutera lors des synchronisations manuelles.

## Détails techniques

Fichier concerné : `src/pages/Receipts.tsx`.

- Effet de chargement (`useEffect` sur `user`) : supprimer le bloc de backfill qui appelle `fetchRailwayEmailExpenses` / `upsertEmailExpensesToSupabase` / `reloadExpenses`.
- Callback Powens : supprimer les appels à `handleSyncBank()` après `powens_connected=true` et après `/sources/powens/callback`.
- `handleSyncEmail` et `handleSyncBank` restent inchangés (chemin manuel).

## Hors périmètre

La synchronisation automatique réservée au Premium sera traitée dans une évolution ultérieure.
