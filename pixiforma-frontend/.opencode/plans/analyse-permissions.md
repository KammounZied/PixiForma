# Analyse du tableau de permissions PixiForma

**Date :** 31 juillet 2026
**Portée :** matrice de permissions visible par l'Admin (`/dashboard/roles`), seeder `RolesAndPermissionsSeeder.php`, énumérations `PermissionEnum` / `RoleEnum`, backend Laravel (`routes/api.php`, controllers) et frontend Next.js (menu, gardes de pages).
**Objet :** vérifier la cohérence logique de la matrice et identifier les améliorations. Aucune modification de code demandée — simple constatation.

---

## 1. Matrice de permissions actuelle

Source : `pixiforma-backend/database/seeders/RolesAndPermissionsSeeder.php` (30 permissions, 3 rôles).

| Module | Permission | Admin | Formateur | Collaborateur |
|---|---|---|---|---|
| Utilisateurs | Voir | ✔ | ✔ | ✘ |
| Utilisateurs | Créer | ✔ | ✘ | ✘ |
| Utilisateurs | Modifier | ✔ | ✘ | ✘ |
| Utilisateurs | Supprimer | ✔ | ✘ | ✘ |
| Rôles | Voir | ✔ | ✘ | ✘ |
| Rôles | Modifier | ✔ | ✘ | ✘ |
| Groupes | Voir | ✔ | ✔ | ✔ |
| Groupes | Créer | ✔ | ✔ | ✘ |
| Groupes | Modifier | ✔ | ✔ | ✘ |
| Groupes | Supprimer | ✔ | ✔ | ✘ |
| Invitations | Voir | ✔ | ✔ | ✔ |
| Invitations | Créer | ✔ | ✔ | ✘ |
| Invitations | Modifier | ✔ | ✔ | ✔ |
| Invitations | Supprimer | ✔ | ✔ | ✘ |
| Demandes | Voir | ✔ | ✔ | ✔ |
| Demandes | Créer | ✔ | ✘ | ✔ |
| Demandes | Modifier | ✔ | ✔ | ✘ |
| Demandes | Supprimer | ✔ | ✘ | ✔ |
| Publications | Voir | ✔ | ✔ | ✔ |
| Publications | Créer | ✔ | ✔ | ✘ |
| Publications | Modifier | ✔ | ✔ | ✘ |
| Publications | Supprimer | ✔ | ✔ | ✘ |
| Formations | Voir | ✔ | ✔ | ✔ |
| Formations | Créer | ✔ | ✔ | ✘ |
| Formations | Modifier | ✔ | ✔ | ✘ |
| Formations | Supprimer | ✔ | ✔ | ✘ |
| Commentaires | Voir | ✔ | ✔ | ✔ |
| Commentaires | Créer | ✔ | ✔ | ✔ |
| Commentaires | Modifier | ✔ | ✔ | ✘ |
| Commentaires | Supprimer | ✔ | ✔ | ✘ |

---

## 2. Mécanisme d'autorisation réel

L'accès aux fonctionnalités n'est **pas** piloté par le système de permissions Spatie dans la grande majorité des cas. Le véritable contrôle est :

1. **Middlewares de rôle** dans `routes/api.php` :
   - `role:Admin` → création de comptes, rôle utilisateur, toggle de statut, suppression d'utilisateurs, listing des rôles, toggle de permissions.
   - `role:Formateur|Admin` → création/modification/suppression de groupes, publications, formations, invitations, demandes d'adhésion, quiz, résumés IA, stats.
2. **Vérifications `hasRole` + propriété** dans les controllers :
   - `GroupController`, `InvitationController`, `GroupRequestController`, `FormationController`, `PublicationController`, `QuizController`, `StatsController`, `FormationBlockRequestController` : l'accès est dérivé du rôle (Admin tout / Formateur créateur du groupe / Collaborateur membre ou assigné).
3. **Vérifications par permission** (les SEULES en API) :
   - `voir-commentaires` : `CommentController::authorizeAccess` + `authorizeCommentAction`.
   - `creer-commentaires` : `CommentController::store`.
   - `modifier-commentaires` / `supprimer-commentaires` : **plus vérifiées** (remplacées par des règles par rôle : Admin tout, Formateur ses propres commentaires + ceux des Collaborateurs, Collaborateur ses propres commentaires).

**Conclusion : sur 30 permissions, seulement ~9 ont un effet réel** — principalement côté UI (menu latéral et gardes de pages). Les 21 autres ne contrôlent aucun accès, ni en API ni en frontend.

---

## 3. Permissions réellement utilisées (fonctionnelles)

| Permission | Où elle est utilisée | Type |
|---|---|---|
| `voir-utilisateurs` | Menu latéral « Liste des comptes » (`layout.tsx`) | UI |
| `creer-utilisateurs` | Menu latéral « Créer compte » + page accounts | UI |
| `modifier-utilisateurs` | Page « Gestion des comptes » (boutons édition/suppression) | UI |
| `modifier-roles` | Menu latéral « Rôles » + garde page `/dashboard/roles` | UI |
| `voir-groupes` | Menu latéral « Groupes » + gardes pages groupes / groupes-disponibles | UI |
| `voir-invitations` | Garde page `/dashboard/invitations` | UI |
| `voir-demandes` | Gardes pages `/dashboard/demandes` et `/dashboard/mes-demandes` | UI |
| `voir-commentaires` | `CommentController` (accès aux commentaires) | API |
| `creer-commentaires` | `CommentController::store` + composer de commentaires | API + UI |

---

## 4. Permissions décoratives / mortes

Aucun middleware `permission:`, aucune vérification controller, aucune utilisation frontend. Les décocher dans le tableau **ne change aucun accès**.

| Permission | Constat |
|---|---|
| `supprimer-utilisateurs` | Aucun usage ; la suppression d'utilisateurs est protégée par `role:Admin` |
| `voir-roles` | Jamais consultée (la page Rôles est gardée par `modifier-roles`) |
| `creer-groupes` / `modifier-groupes` / `supprimer-groupes` | Protégées par `role:Formateur|Admin` ; le frontend utilise `isAdmin` / `creator_id` |
| `creer-invitations` | Protégée par `role:Formateur|Admin` ; jamais référencée en frontend |
| `modifier-invitations` | Jamais vérifiée (accepter/refuser contrôlé par `recipient_id`) |
| `supprimer-invitations` | Aucun endpoint de suppression d'invitation |
| `creer-demandes` | Endpoint `request-join` ouvert à tout utilisateur authentifié, sans permission |
| `modifier-demandes` | Approuver/refuser protégé par `role:Formateur|Admin` |
| `supprimer-demandes` | Aucune fonctionnalité d'annulation/suppression de demande |
| `voir-publications` | Accès contrôlé par rôle/membres/formations, jamais par la permission |
| `creer/modifier/supprimer-publications` | Protégées par `role:Formateur|Admin` |
| `voir-formations` | Menu « Mes formations » gated par `hasRole('Collaborateur')`, jamais par la permission |
| `creer/modifier/supprimer-formations` | Protégées par `role:Formateur|Admin` |
| `modifier-commentaires` / `supprimer-commentaires` | Remplacées par des règles par rôle dans `CommentController` |

---

## 5. Constatations / illogismes

### 5.1. Faille : `GET /users` sans aucune protection backend
`UserController::index` (`GET /users`) n'a **aucun middleware** (contrairement à `/users/collaborators` qui est en `role:Formateur|Admin`). Tout utilisateur authentifié — même un Collaborateur sans la permission `voir-utilisateurs` — peut lister tous les comptes (nom, email, rôles) en appelant directement l'API. La protection n'existe qu'au niveau de l'affichage (menu masqué).

### 5.2. « Modifier Invitations » coché pour le Collaborateur
Le Collaborateur ne fait qu'accepter/refuser ses invitations (vérification `recipient_id`). La case « Modifier » est trompeuse : la permission n'est jamais consultée et le libellé laisse croire à une capacité d'édition qui n'existe pas.

### 5.3. « Supprimer Demandes » coché pour le Collaborateur
Aucune fonctionnalité d'annulation/suppression de demande n'existe (`mes-demandes` est en lecture seule, aucun endpoint DELETE). Case trompeuse.

### 5.4. « Voir Utilisateurs » coché pour le Formateur
Le Formateur voit la page « Gestion des comptes » (liste complète avec emails et rôles) alors qu'un endpoint dédié `/users/collaborators` existe pour lui (sélection de collaborateurs pour invitations). Question de cohérence fonctionnelle : le Formateur n'a pas besoin de la liste complète.

### 5.5. Commentaires : matrice contredisant les règles réelles
La matrice affiche le Formateur en « Modifier/Supprimer » sur tous les commentaires, mais `CommentController` impose désormais des règles par rôle :
- Modifier : auteur uniquement (ou Admin).
- Supprimer : Admin tout ; Formateur ses propres commentaires + ceux des Collaborateurs ; Collaborateur ses propres commentaires.
Les cases cochées ne reflètent pas le comportement effectif.

### 5.6. CRUD groupes/invitations/publications/formations/demandes : cases sans effet
Cochées pour le Formateur, elles ne sont vérifiées ni en API (middleware de rôle), ni en frontend (`isFormateurUser`, `creator_id`). Un Admin qui les décoche croit restreindre le Formateur : il n'en est rien.

### 5.7. Modules manquants dans le tableau
Quiz, suivi apprenants / statistiques, blocages/déblocages, génération d'IA (résumés) et conversion PDF sont des capacités réelles protégées par `role:Formateur|Admin` mais **absentes** de la matrice. Le tableau est donc incomplet en tant que modèle de sécurité.

### 5.8. `voir-roles` inutile
Seul l'Admin la possède (déjà protégé par middleware `role:Admin`) et elle n'est jamais consultée.

---

## 6. Recommandations (non exécutées)

### Option A — Aligner la matrice sur la réalité (recommandée, faible risque)
- Conserver les rôles + middlewares comme source de vérité.
- Supprimer de la matrice (ou de l'affichage) les permissions mortes : `supprimer-utilisateurs`, `voir-roles`, `creer/modifier/supprimer-invitations`, `creer/modifier/supprimer-demandes`, `voir/creer/modifier/supprimer-publications`, `voir/creer/modifier/supprimer-formations`, `modifier/supprimer-commentaires`.
- Corriger les libellés trompeurs : « Modifier Invitations » → « Accepter/Refuser Invitations », « Supprimer Demandes » → supprimer.
- Ajouter la protection backend manquante : `GET /users` en `role:Admin` (ou `permission:voir-utilisateurs`).
- Réconcilier les permissions commentaires avec les règles par rôle (les retirer ou les faire refléter la règle).

### Option B — Faire des permissions la vraie source de vérité (refactor lourd)
- Migrer les middlewares `role:...` vers `permission:...` pour que les cases du tableau contrôlent réellement l'accès.
- Aligner le frontend sur les permissions plutôt que sur les rôles.
- Impact : refactor global des routes, des controllers et de l'UI ; risque de régression élevé.

### Recommandations transverses
- Considérer l'ajout de modules manquants (quiz, suivi, blocages) si la matrice doit rester le modèle de sécurité de référence.
- En attendant, corriger au minimum la faille `GET /users`.
