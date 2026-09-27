<?php

namespace App\Enums;

enum RoleEnum:string
{
    case ADMIN = 'Admin';
    case TRAINER = 'Formateur';
    case COLLABORATOR = 'Collaborateur';
}