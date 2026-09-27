<?php

namespace App\OpenApi\Schemas;

use OpenApi\Attributes as OA;

#[OA\Schema(schema: 'Invitation')]
class InvitationSchema
{
    #[OA\Property(property: 'id', type: 'integer', example: 1)]
    public int $id;

    #[OA\Property(property: 'group_id', type: 'integer')]
    public int $group_id;

    #[OA\Property(property: 'sender_id', type: 'integer')]
    public int $sender_id;

    #[OA\Property(property: 'recipient_id', type: 'integer')]
    public int $recipient_id;

    #[OA\Property(property: 'status', type: 'string', enum: ['pending', 'accepted', 'declined'])]
    public string $status;

    #[OA\Property(property: 'group', ref: '#/components/schemas/Group')]
    public object $group;

    #[OA\Property(property: 'sender', ref: '#/components/schemas/User')]
    public object $sender;

    #[OA\Property(property: 'recipient', ref: '#/components/schemas/User')]
    public object $recipient;

    #[OA\Property(property: 'created_at', type: 'string', format: 'date-time')]
    public string $created_at;
}

#[OA\Schema(schema: 'SendInvitationRequest')]
class SendInvitationRequest
{
    #[OA\Property(property: 'recipient_ids', type: 'array', items: new OA\Items(type: 'integer'), description: 'IDs des utilisateurs à inviter')]
    public array $recipient_ids;
}

#[OA\Schema(schema: 'GroupRequest')]
class GroupRequestSchema
{
    #[OA\Property(property: 'id', type: 'integer', example: 1)]
    public int $id;

    #[OA\Property(property: 'group_id', type: 'integer')]
    public int $group_id;

    #[OA\Property(property: 'user_id', type: 'integer')]
    public int $user_id;

    #[OA\Property(property: 'status', type: 'string', enum: ['pending', 'approved', 'declined'])]
    public string $status;

    #[OA\Property(property: 'group', ref: '#/components/schemas/Group')]
    public object $group;

    #[OA\Property(property: 'user', ref: '#/components/schemas/User')]
    public object $user;

    #[OA\Property(property: 'created_at', type: 'string', format: 'date-time')]
    public string $created_at;
}
