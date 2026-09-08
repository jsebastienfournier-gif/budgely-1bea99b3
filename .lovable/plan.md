# Fiabiliser l'accès aux sources selon la formule

Aujourd'hui, l'accès aux sources est vérifié de façon dispersée dans l'écran de capture (quelques tests `plan === "free"` autour des boutons). Rien n'empêche une source déjà branchée côté service externe de continuer à envoyer des dépenses, ni un import automatique de les enregistrer. C'est ce qui a fait remonter des dépenses bancaires sur un compte sans l'option bancaire.

## Règles retenues

| Formule | Tickets & factures | Analyse des mails | Connexion bancaire |
|---|---|---|---|
| Découverte (0 €) | oui | 5 / mois | non |
| Essentiel (3,99 €) | oui | 5 / mois | oui |
| Premium (6,99 €) | illimité | illimité | oui |

## Ce qui va changer

1. **Un seul endroit qui décide.** Création d'une règle centrale « quelles sources et quels volumes pour quelle formule ». Tous les écrans (capture, réglages, tableau de bord) s'y réfèrent, au lieu de refaire le test chacun de leur côté.

2. **Aucun import d'une source non autorisée.** Avant tout enregistrement d'une dépense venant du service externe, on vérifie la formule et l'origine de la dépense. Une dépense bancaire arrivant sur un compte sans l'option bancaire est ignorée (avec une trace dans la console), qu'elle vienne d'une synchronisation manuelle ou du rechargement automatique de la page.

3. **Sources bancaires affichées comme « suspendues ».** Si une connexion bancaire existe encore côté service externe alors que la formule ne l'autorise pas, elle apparaît avec un badge « Suspendue » et un lien « Passer à Essentiel ». Elle n'est ni supprimée, ni synchronisée : les boutons de synchronisation et de connexion sont désactivés.

4. **Limites de mails appliquées.** Le compteur mensuel d'analyses de mails existant est comparé à la limite de la formule (5 pour Découverte et Essentiel, illimité pour Premium). Au-delà, la synchronisation des mails est bloquée avec un message clair invitant à passer au Premium.

5. **Nettoyage des dépenses importées à tort.** Suppression des dépenses actuellement enregistrées qui proviennent d'une source non autorisée par la formule du compte concerné.

## Détails techniques

- Nouveau module `src/lib/plan-capabilities.ts` : `PLAN_CAPABILITIES` (sources autorisées + quotas mensuels) et helpers `canUseSource(plan, source)` / `getMonthlyLimit(plan, source)`.
- Nouveau hook `src/hooks/usePlanCapabilities.ts` qui combine `useSubscription()` et la table de capacités, et expose `canUseBank`, `canUseEmail`, `emailLimit`, `emailUsed`, `emailRemaining` (à partir de `ai_usage`).
- `src/pages/Receipts.tsx` :
  - `fetchRailwayEmailExpenses` / `upsertEmailExpensesToSupabase` filtrent les lignes dont l'origine réelle (source du backend, `provider`/`source_id` powens) n'est pas autorisée.
  - Le backfill au chargement ne s'exécute que pour les sources autorisées.
  - `handleSyncBank`, `handleConnectBank` et le traitement du retour Powens (`connection_id` + `state`, `/sources/powens/process`) sortent immédiatement si `canUseBank` est faux.
  - `handleSyncEmail` vérifie le quota mensuel avant l'appel.
  - Carte bancaire : état « Suspendue » quand des comptes existent mais `canUseBank` est faux.
- `src/pages/Settings.tsx` : mêmes garde-fous sur les blocs de connexion.
- Nettoyage des données : suppression, via requête, des dépenses `source = 'bank'` (et des dépenses d'origine powens enregistrées en `email`) pour les comptes dont la formule courante n'autorise pas la banque.
- Le service externe reste la source de parsing ; les contrôles ci-dessus sont côté application. Un contrôle équivalent côté backend externe serait à ajouter de son côté pour être totalement étanche — hors périmètre de ce projet.
