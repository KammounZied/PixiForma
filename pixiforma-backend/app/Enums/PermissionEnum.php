<?php

namespace App\Enums;

enum PermissionEnum:string
{
    // ─── Module Utilisateurs ───
    case VIEW_USERS = 'voir-utilisateurs';
    case CREATE_USERS = 'creer-utilisateurs';
    case EDIT_USERS = 'modifier-utilisateurs';
    case DELETE_USERS = 'supprimer-utilisateurs';

    // ─── Module Rôles ───
    case VIEW_ROLES = 'voir-roles';
    case EDIT_ROLES = 'modifier-roles';

    // ─── Module Groupes ───
    case VIEW_GROUPS = 'voir-groupes';
    case CREATE_GROUPS = 'creer-groupes';
    case EDIT_GROUPS = 'modifier-groupes';
    case DELETE_GROUPS = 'supprimer-groupes';

    // ─── Module Invitations ───
    case VIEW_INVITATIONS = 'voir-invitations';
    case CREATE_INVITATIONS = 'creer-invitations';
    case EDIT_INVITATIONS = 'modifier-invitations';
    case DELETE_INVITATIONS = 'supprimer-invitations';

    // ─── Module Demandes d'Adhésion ───
    case VIEW_REQUESTS = 'voir-demandes';
    case CREATE_REQUESTS = 'creer-demandes';
    case EDIT_REQUESTS = 'modifier-demandes';
    case DELETE_REQUESTS = 'supprimer-demandes';

    // ─── Module Publications ───
    case VIEW_PUBLICATIONS = 'voir-publications';
    case CREATE_PUBLICATIONS = 'creer-publications';
    case EDIT_PUBLICATIONS = 'modifier-publications';
    case DELETE_PUBLICATIONS = 'supprimer-publications';

    // ─── Module Formations ───
    case CREATE_FORMATIONS = 'creer-formations';
    case VIEW_FORMATIONS = 'voir-formations';
    case EDIT_FORMATIONS = 'modifier-formations';
    case DELETE_FORMATIONS = 'supprimer-formations';

    // ─── Module Commentaires ───
    case VIEW_COMMENTS = 'voir-commentaires';
    case CREATE_COMMENTS = 'creer-commentaires';
    case EDIT_COMMENTS = 'modifier-commentaires';
    case DELETE_COMMENTS = 'supprimer-commentaires';
}
