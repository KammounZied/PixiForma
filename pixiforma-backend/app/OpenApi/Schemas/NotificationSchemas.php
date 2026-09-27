<?php

namespace App\OpenApi\Schemas;

use OpenApi\Attributes as OA;

#[OA\Schema(schema: 'Notification')]
class NotificationSchema
{
    #[OA\Property(property: 'id', type: 'integer', example: 1)]
    public int $id;

    #[OA\Property(property: 'user_id', type: 'integer')]
    public int $user_id;

    #[OA\Property(property: 'type', type: 'string', example: 'training_assignment')]
    public string $type;

    #[OA\Property(property: 'title', type: 'string', example: 'Formation disponible')]
    public string $title;

    #[OA\Property(property: 'message', type: 'string', example: 'La formation est maintenant disponible.')]
    public string $message;

    #[OA\Property(property: 'data', type: 'object', nullable: true)]
    public ?object $data;

    #[OA\Property(property: 'is_read', type: 'boolean', example: false)]
    public bool $is_read;

    #[OA\Property(property: 'read_at', type: 'string', format: 'date-time', nullable: true)]
    public ?string $read_at;

    #[OA\Property(property: 'created_at', type: 'string', format: 'date-time')]
    public string $created_at;
}

#[OA\Schema(schema: 'NotificationDeleteRequest')]
class NotificationDeleteRequest
{
    #[OA\Property(property: 'ids', type: 'array', items: new OA\Items(type: 'integer'), description: 'IDs des notifications à supprimer')]
    public array $ids;
}
