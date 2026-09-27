<?php

namespace App\OpenApi\Schemas;

use OpenApi\Attributes as OA;

#[OA\Schema(schema: 'Publication')]
class PublicationSchema
{
    #[OA\Property(property: 'id', type: 'integer', example: 1)]
    public int $id;

    #[OA\Property(property: 'group_id', type: 'integer', example: 1)]
    public int $group_id;

    #[OA\Property(property: 'creator_id', type: 'integer', example: 1)]
    public int $creator_id;

    #[OA\Property(property: 'title', type: 'string', example: 'Introduction à Laravel')]
    public string $title;

    #[OA\Property(property: 'description', type: 'string', example: 'Description de la publication')]
    public string $description;

    #[OA\Property(property: 'content', type: 'string', nullable: true)]
    public ?string $content;

    #[OA\Property(property: 'summary', type: 'string', nullable: true, description: 'Résumé Markdown généré par l\'IA')]
    public ?string $summary;

    #[OA\Property(property: 'summary_status', type: 'string', enum: ['idle', 'generating', 'draft', 'error'], example: 'idle', description: 'Statut de génération du résumé')]
    public string $summary_status;

    #[OA\Property(property: 'summary_error', type: 'string', nullable: true, description: 'Message d\'erreur de la génération du résumé')]
    public ?string $summary_error;

    #[OA\Property(property: 'is_visible', type: 'boolean', example: false)]
    public bool $is_visible;

    #[OA\Property(property: 'in_formation', type: 'boolean', example: false)]
    public bool $in_formation;

    #[OA\Property(property: 'creator', ref: '#/components/schemas/User')]
    public object $creator;

    #[OA\Property(property: 'files', type: 'array', items: new OA\Items(ref: '#/components/schemas/PublicationFile'))]
    public array $files;

    #[OA\Property(property: 'comments_count', type: 'integer', example: 3)]
    public int $comments_count;

    #[OA\Property(property: 'created_at', type: 'string', format: 'date-time')]
    public string $created_at;

    #[OA\Property(property: 'updated_at', type: 'string', format: 'date-time')]
    public string $updated_at;
}

#[OA\Schema(schema: 'PublicationFile')]
class PublicationFileSchema
{
    #[OA\Property(property: 'id', type: 'integer')]
    public int $id;

    #[OA\Property(property: 'publication_id', type: 'integer')]
    public int $publication_id;

    #[OA\Property(property: 'file_name', type: 'string')]
    public string $file_name;

    #[OA\Property(property: 'file_size', type: 'integer', nullable: true)]
    public ?int $file_size;

    #[OA\Property(property: 'file_url', type: 'string', nullable: true)]
    public ?string $file_url;

    #[OA\Property(property: 'created_at', type: 'string', format: 'date-time')]
    public string $created_at;
}

#[OA\Schema(schema: 'Comment')]
class CommentSchema
{
    #[OA\Property(property: 'id', type: 'integer', example: 1)]
    public int $id;

    #[OA\Property(property: 'publication_id', type: 'integer')]
    public int $publication_id;

    #[OA\Property(property: 'user_id', type: 'integer')]
    public int $user_id;

    #[OA\Property(property: 'parent_id', type: 'integer', nullable: true, description: 'Identifiant du commentaire parent pour une réponse (null = commentaire racine)')]
    public ?int $parent_id;

    #[OA\Property(property: 'content', type: 'string')]
    public string $content;

    #[OA\Property(property: 'edited_at', type: 'string', format: 'date-time', nullable: true, description: 'Date de dernière modification du commentaire (null = jamais modifié)')]
    public ?string $edited_at;

    #[OA\Property(property: 'user', ref: '#/components/schemas/User')]
    public object $user;

    #[OA\Property(property: 'replies', type: 'array', items: new OA\Items(ref: '#/components/schemas/Comment'), description: 'Réponses au commentaire (niveau unique)')]
    public array $replies;

    #[OA\Property(property: 'created_at', type: 'string', format: 'date-time')]
    public string $created_at;

    #[OA\Property(property: 'updated_at', type: 'string', format: 'date-time')]
    public string $updated_at;
}

#[OA\Schema(schema: 'CommentCreateRequest')]
class CommentCreateRequest
{
    #[OA\Property(property: 'content', type: 'string', maxLength: 5000)]
    public string $content;

    #[OA\Property(property: 'parent_id', type: 'integer', nullable: true, description: 'Répondre à un commentaire racine existant de la même publication')]
    public ?int $parent_id;
}

#[OA\Schema(schema: 'CommentUpdateRequest')]
class CommentUpdateRequest
{
    #[OA\Property(property: 'content', type: 'string', maxLength: 5000)]
    public string $content;
}
