<?php

namespace App\OpenApi\Schemas;

use OpenApi\Attributes as OA;

#[OA\Schema(schema: 'Group')]
class GroupSchema
{
    #[OA\Property(property: 'id', type: 'integer', example: 1)]
    public int $id;

    #[OA\Property(property: 'name', type: 'string', example: 'Groupe A')]
    public string $name;

    #[OA\Property(property: 'description', type: 'string', nullable: true, example: 'Description du groupe')]
    public ?string $description;

    #[OA\Property(property: 'creator_id', type: 'integer', example: 1)]
    public int $creator_id;

    #[OA\Property(property: 'creator', ref: '#/components/schemas/User')]
    public object $creator;

    #[OA\Property(property: 'members_count', type: 'integer', example: 5)]
    public int $members_count;

    #[OA\Property(property: 'is_member', type: 'boolean', example: true)]
    public bool $is_member;

    #[OA\Property(property: 'request_status', type: 'string', nullable: true, enum: ['pending', 'declined'])]
    public ?string $request_status;

    #[OA\Property(property: 'created_at', type: 'string', format: 'date-time')]
    public string $created_at;

    #[OA\Property(property: 'updated_at', type: 'string', format: 'date-time')]
    public string $updated_at;
}

#[OA\Schema(schema: 'GroupCreateRequest')]
class GroupCreateRequest
{
    #[OA\Property(property: 'name', type: 'string', description: 'Nom du groupe', maxLength: 255)]
    public string $name;

    #[OA\Property(property: 'description', type: 'string', nullable: true, description: 'Description du groupe', maxLength: 1000)]
    public ?string $description;
}

#[OA\Schema(schema: 'GroupUpdateRequest')]
class GroupUpdateRequest
{
    #[OA\Property(property: 'name', type: 'string', maxLength: 255, nullable: true)]
    public ?string $name;

    #[OA\Property(property: 'description', type: 'string', maxLength: 1000, nullable: true)]
    public ?string $description;
}

#[OA\Schema(schema: 'GroupMember')]
class GroupMemberSchema
{
    #[OA\Property(property: 'id', type: 'integer', example: 1)]
    public int $id;

    #[OA\Property(property: 'name', type: 'string', example: 'Jean Dupont')]
    public string $name;

    #[OA\Property(property: 'email', type: 'string', format: 'email')]
    public string $email;

    #[OA\Property(property: 'pivot', type: 'object', properties: [
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time'),
    ])]
    public object $pivot;
}
