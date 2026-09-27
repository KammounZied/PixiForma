<?php

namespace App\OpenApi\Schemas;

use OpenApi\Attributes as OA;

#[OA\Schema(schema: 'Formation')]
class FormationSchema
{
    #[OA\Property(property: 'id', type: 'integer', example: 1)]
    public int $id;

    #[OA\Property(property: 'group_id', type: 'integer', example: 1)]
    public int $group_id;

    #[OA\Property(property: 'creator_id', type: 'integer', example: 1)]
    public int $creator_id;

    #[OA\Property(property: 'title', type: 'string', example: 'Formation Laravel')]
    public string $title;

    #[OA\Property(property: 'description', type: 'string', example: 'Description détaillée de la formation')]
    public string $description;

    #[OA\Property(property: 'pedagogical_objective', type: 'string', nullable: true)]
    public ?string $pedagogical_objective;

    #[OA\Property(property: 'start_date', type: 'string', format: 'date', nullable: true)]
    public ?string $start_date;

    #[OA\Property(property: 'end_date', type: 'string', format: 'date', nullable: true)]
    public ?string $end_date;

    #[OA\Property(property: 'progression_mode', type: 'string', enum: ['guided', 'free'])]
    public string $progression_mode;

    #[OA\Property(property: 'is_visible', type: 'boolean', example: false)]
    public bool $is_visible;

    #[OA\Property(property: 'max_attempts', type: 'integer', nullable: true)]
    public ?int $max_attempts;

    #[OA\Property(property: 'min_pass_percentage', type: 'number', format: 'float', nullable: true)]
    public ?float $min_pass_percentage;

    #[OA\Property(property: 'creator', ref: '#/components/schemas/User')]
    public object $creator;

    #[OA\Property(property: 'publications', type: 'array', items: new OA\Items(ref: '#/components/schemas/Publication'))]
    public array $publications;

    #[OA\Property(property: 'formation_publications', type: 'array', items: new OA\Items(ref: '#/components/schemas/FormationPublication'))]
    public array $formation_publications;

    #[OA\Property(property: 'my_status', type: 'string', nullable: true, enum: ['not_started', 'in_progress', 'completed', 'blocked', 'not_assigned'])]
    public ?string $my_status;

    #[OA\Property(property: 'created_at', type: 'string', format: 'date-time')]
    public string $created_at;

    #[OA\Property(property: 'updated_at', type: 'string', format: 'date-time')]
    public string $updated_at;
}

#[OA\Schema(schema: 'FormationCreateRequest')]
class FormationCreateRequest
{
    #[OA\Property(property: 'title', type: 'string', maxLength: 255)]
    public string $title;

    #[OA\Property(property: 'description', type: 'string', maxLength: 5000)]
    public string $description;

    #[OA\Property(property: 'pedagogical_objective', type: 'string', nullable: true, maxLength: 5000)]
    public ?string $pedagogical_objective;

    #[OA\Property(property: 'start_date', type: 'string', format: 'date', nullable: true)]
    public ?string $start_date;

    #[OA\Property(property: 'end_date', type: 'string', format: 'date', nullable: true)]
    public ?string $end_date;

    #[OA\Property(property: 'progression_mode', type: 'string', enum: ['guided', 'free'])]
    public string $progression_mode;

    #[OA\Property(property: 'publication_ids', type: 'array', items: new OA\Items(type: 'integer'), nullable: true)]
    public ?array $publication_ids;

    #[OA\Property(property: 'recommended_durations', type: 'object', nullable: true, description: 'Durées recommandées en jours (clé: publication_id)')]
    public ?object $recommended_durations;

    #[OA\Property(property: 'max_attempts', type: 'integer', nullable: true, minimum: 1, maximum: 100)]
    public ?int $max_attempts;

    #[OA\Property(property: 'min_pass_percentage', type: 'number', nullable: true, minimum: 0, maximum: 100)]
    public ?float $min_pass_percentage;
}

#[OA\Schema(schema: 'FormationUpdateRequest')]
class FormationUpdateRequest
{
    #[OA\Property(property: 'title', type: 'string', maxLength: 255, nullable: true)]
    public ?string $title;

    #[OA\Property(property: 'description', type: 'string', maxLength: 5000, nullable: true)]
    public ?string $description;

    #[OA\Property(property: 'pedagogical_objective', type: 'string', nullable: true, maxLength: 5000)]
    public ?string $pedagogical_objective;

    #[OA\Property(property: 'start_date', type: 'string', format: 'date', nullable: true)]
    public ?string $start_date;

    #[OA\Property(property: 'end_date', type: 'string', format: 'date', nullable: true)]
    public ?string $end_date;

    #[OA\Property(property: 'progression_mode', type: 'string', enum: ['guided', 'free'], nullable: true)]
    public ?string $progression_mode;

    #[OA\Property(property: 'is_visible', type: 'boolean', nullable: true)]
    public ?bool $is_visible;

    #[OA\Property(property: 'publication_ids', type: 'array', items: new OA\Items(type: 'integer'), nullable: true)]
    public ?array $publication_ids;

    #[OA\Property(property: 'max_attempts', type: 'integer', nullable: true, minimum: 1, maximum: 100)]
    public ?int $max_attempts;

    #[OA\Property(property: 'min_pass_percentage', type: 'number', nullable: true, minimum: 0, maximum: 100)]
    public ?float $min_pass_percentage;
}

#[OA\Schema(schema: 'FormationVisibilityRequest')]
class FormationVisibilityRequest
{
    #[OA\Property(property: 'is_visible', type: 'boolean')]
    public bool $is_visible;
}

#[OA\Schema(schema: 'AssignLearnersRequest')]
class AssignLearnersRequest
{
    #[OA\Property(property: 'user_ids', type: 'array', items: new OA\Items(type: 'integer'), description: 'IDs des utilisateurs à assigner')]
    public array $user_ids;
}

#[OA\Schema(schema: 'FormationPublication')]
class FormationPublicationSchema
{
    #[OA\Property(property: 'id', type: 'integer')]
    public int $id;

    #[OA\Property(property: 'formation_id', type: 'integer')]
    public int $formation_id;

    #[OA\Property(property: 'publication_id', type: 'integer')]
    public int $publication_id;

    #[OA\Property(property: 'order', type: 'integer')]
    public int $order;

    #[OA\Property(property: 'recommended_duration_minutes', type: 'integer', nullable: true)]
    public ?int $recommended_duration_minutes;

    #[OA\Property(property: 'publication', ref: '#/components/schemas/Publication')]
    public object $publication;
}

#[OA\Schema(schema: 'PublicationIdsRequest')]
class PublicationIdsRequest
{
    #[OA\Property(property: 'publication_ids', type: 'array', items: new OA\Items(type: 'integer'))]
    public array $publication_ids;

    #[OA\Property(property: 'durations', type: 'object', nullable: true)]
    public ?object $durations;
}

#[OA\Schema(schema: 'LearnerProgress')]
class LearnerProgressSchema
{
    #[OA\Property(property: 'id', type: 'integer')]
    public int $id;

    #[OA\Property(property: 'user_id', type: 'integer')]
    public int $user_id;

    #[OA\Property(property: 'formation_id', type: 'integer')]
    public int $formation_id;

    #[OA\Property(property: 'status', type: 'string', enum: ['not_started', 'in_progress', 'completed', 'blocked'])]
    public string $status;

    #[OA\Property(property: 'user', ref: '#/components/schemas/User')]
    public object $user;

    #[OA\Property(property: 'publication_progress', type: 'array', items: new OA\Items(ref: '#/components/schemas/FormationUserPublication'))]
    public array $publication_progress;
}

#[OA\Schema(schema: 'FormationUserPublication')]
class FormationUserPublicationSchema
{
    #[OA\Property(property: 'id', type: 'integer')]
    public int $id;

    #[OA\Property(property: 'publication_id', type: 'integer')]
    public int $publication_id;

    #[OA\Property(property: 'status', type: 'string', enum: ['locked', 'available', 'completed'])]
    public string $status;

    #[OA\Property(property: 'quiz_attempts', type: 'integer')]
    public int $quiz_attempts;

    #[OA\Property(property: 'quiz_highest_score', type: 'number', format: 'float', nullable: true)]
    public ?float $quiz_highest_score;

    #[OA\Property(property: 'completed_at', type: 'string', format: 'date-time', nullable: true)]
    public ?string $completed_at;

    #[OA\Property(property: 'publication', ref: '#/components/schemas/Publication')]
    public object $publication;
}

#[OA\Schema(schema: 'BlockRequest')]
class BlockRequestSchema
{
    #[OA\Property(property: 'id', type: 'integer')]
    public int $id;

    #[OA\Property(property: 'formation_user_id', type: 'integer')]
    public int $formation_user_id;

    #[OA\Property(property: 'user_id', type: 'integer')]
    public int $user_id;

    #[OA\Property(property: 'formation_id', type: 'integer')]
    public int $formation_id;

    #[OA\Property(property: 'status', type: 'string', enum: ['pending', 'approved', 'declined'])]
    public string $status;

    #[OA\Property(property: 'reason', type: 'string', nullable: true)]
    public ?string $reason;

    #[OA\Property(property: 'formateur_response', type: 'string', nullable: true)]
    public ?string $formateur_response;

    #[OA\Property(property: 'created_at', type: 'string', format: 'date-time')]
    public string $created_at;
}
