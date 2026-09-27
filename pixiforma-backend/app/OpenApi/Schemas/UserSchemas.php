<?php

namespace App\OpenApi\Schemas;

use OpenApi\Attributes as OA;

#[OA\Schema(schema: 'User')]
class UserSchema
{
    #[OA\Property(property: 'id', type: 'integer', example: 1)]
    public int $id;

    #[OA\Property(property: 'name', type: 'string', example: 'Jean Dupont')]
    public string $name;

    #[OA\Property(property: 'email', type: 'string', format: 'email', example: 'jean@example.com')]
    public string $email;

    #[OA\Property(property: 'is_active', type: 'boolean', example: true)]
    public bool $is_active;

    #[OA\Property(property: 'force_password_change', type: 'boolean', example: false)]
    public bool $force_password_change;

    #[OA\Property(property: 'roles', type: 'array', items: new OA\Items(ref: '#/components/schemas/Role'))]
    public array $roles;

    #[OA\Property(property: 'created_at', type: 'string', format: 'date-time')]
    public string $created_at;

    #[OA\Property(property: 'updated_at', type: 'string', format: 'date-time')]
    public string $updated_at;
}

#[OA\Schema(schema: 'Role')]
class RoleSchema
{
    #[OA\Property(property: 'id', type: 'integer', example: 1)]
    public int $id;

    #[OA\Property(property: 'name', type: 'string', example: 'Admin')]
    public string $name;

    #[OA\Property(property: 'guard_name', type: 'string', example: 'api')]
    public string $guard_name;

    #[OA\Property(property: 'permissions', type: 'array', items: new OA\Items(ref: '#/components/schemas/Permission'))]
    public array $permissions;
}

#[OA\Schema(schema: 'Permission')]
class PermissionSchema
{
    #[OA\Property(property: 'id', type: 'integer', example: 1)]
    public int $id;

    #[OA\Property(property: 'name', type: 'string', example: 'voir-utilisateurs')]
    public string $name;

    #[OA\Property(property: 'guard_name', type: 'string', example: 'api')]
    public string $guard_name;
}

#[OA\Schema(schema: 'UserInviteRequest')]
class UserInviteRequest
{
    #[OA\Property(property: 'name', type: 'string', description: 'Nom du nouvel utilisateur', maxLength: 255)]
    public string $name;

    #[OA\Property(property: 'email', type: 'string', format: 'email', description: 'Email du nouvel utilisateur')]
    public string $email;

    #[OA\Property(property: 'roles', type: 'array', items: new OA\Items(type: 'string'), description: 'Rôles à assigner', example: ['Collaborateur'])]
    public array $roles;
}

#[OA\Schema(schema: 'UserUpdateRequest')]
class UserUpdateRequest
{
    #[OA\Property(property: 'name', type: 'string', maxLength: 255, nullable: true)]
    public ?string $name;

    #[OA\Property(property: 'email', type: 'string', format: 'email', nullable: true)]
    public ?string $email;
}

#[OA\Schema(schema: 'AssignRoleRequest')]
class AssignRoleRequest
{
    #[OA\Property(property: 'roles', type: 'array', items: new OA\Items(type: 'string', enum: ['Admin', 'Formateur', 'Collaborateur']), description: 'Rôles à assigner', example: ['Collaborateur'])]
    public array $roles;
}

#[OA\Schema(schema: 'ChangePasswordRequest')]
class ChangePasswordRequest
{
    #[OA\Property(property: 'password', type: 'string', format: 'password', description: 'Nouveau mot de passe (min 8 caractères, doit contenir majuscule, minuscule, chiffre et caractère spécial)')]
    public string $password;

    #[OA\Property(property: 'password_confirmation', type: 'string', format: 'password', description: 'Confirmation du nouveau mot de passe')]
    public string $password_confirmation;
}
