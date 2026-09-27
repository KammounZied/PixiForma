<?php

namespace App\OpenApi\Schemas;

use OpenApi\Attributes as OA;

#[OA\Schema(schema: 'Quiz')]
class QuizSchema
{
    #[OA\Property(property: 'id', type: 'integer', example: 42)]
    public int $id;

    #[OA\Property(property: 'formation_id', type: 'integer', example: 7)]
    public int $formation_id;

    #[OA\Property(property: 'publication_id', type: 'integer', example: 15)]
    public int $publication_id;

    #[OA\Property(property: 'questions', type: 'array', items: new OA\Items(type: 'object'), description: 'Questions generees par l\'IA (40-50)')]
    public array $questions;

    #[OA\Property(property: 'status', type: 'string', enum: ['generating', 'draft', 'published', 'error'])]
    public string $status;

    #[OA\Property(property: 'approved_count', type: 'integer', example: 42)]
    public int $approved_count;

    #[OA\Property(property: 'generated_at', type: 'string', format: 'date-time', nullable: true)]
    public ?string $generated_at;

    #[OA\Property(property: 'published_at', type: 'string', format: 'date-time', nullable: true)]
    public ?string $published_at;

    #[OA\Property(property: 'generation_error', type: 'string', nullable: true)]
    public ?string $generation_error;
}

#[OA\Schema(schema: 'QuizForCollaborator')]
class QuizForCollaboratorSchema
{
    #[OA\Property(property: 'id', type: 'integer')]
    public int $id;

    #[OA\Property(property: 'formation_id', type: 'integer')]
    public int $formation_id;

    #[OA\Property(property: 'publication_id', type: 'integer')]
    public int $publication_id;

    #[OA\Property(property: 'questions', type: 'array', items: new OA\Items(type: 'object'), description: 'Questions tirees aleatoirement (5 ou 10)')]
    public array $questions;

    #[OA\Property(property: 'status', type: 'string')]
    public string $status;

    #[OA\Property(property: 'approved_count', type: 'integer')]
    public int $approved_count;

    #[OA\Property(property: 'min_pass_percentage', type: 'number', format: 'float', example: 70.0)]
    public float $min_pass_percentage;

    #[OA\Property(property: 'max_attempts', type: 'integer', nullable: true, example: 3)]
    public ?int $max_attempts;
}

#[OA\Schema(schema: 'QuizSubmissionRequest')]
class QuizSubmissionRequestSchema
{
    #[OA\Property(property: 'answers', type: 'object', description: 'Map index_question => index_reponse (0-based)')]
    public object $answers;
}

#[OA\Schema(schema: 'QuizResult')]
class QuizResultSchema
{
    #[OA\Property(property: 'submission_id', type: 'integer')]
    public int $submission_id;

    #[OA\Property(property: 'score', type: 'number', format: 'float', example: 80.0)]
    public float $score;

    #[OA\Property(property: 'total_questions', type: 'integer', example: 10)]
    public int $total_questions;

    #[OA\Property(property: 'correct_answers', type: 'integer', example: 8)]
    public int $correct_answers;

    #[OA\Property(property: 'passed', type: 'boolean', example: true)]
    public bool $passed;

    #[OA\Property(property: 'min_pass_percentage', type: 'number', format: 'float', example: 70.0)]
    public float $min_pass_percentage;

    #[OA\Property(property: 'attempts_used', type: 'integer', example: 1)]
    public int $attempts_used;

    #[OA\Property(property: 'max_attempts', type: 'integer', nullable: true, example: 3)]
    public ?int $max_attempts;

    #[OA\Property(property: 'remaining_attempts', type: 'integer', nullable: true, example: 2)]
    public ?int $remaining_attempts;

    #[OA\Property(property: 'results', type: 'array', items: new OA\Items(type: 'object'), description: 'Detail des resultats par question')]
    public array $results;
}

#[OA\Schema(schema: 'QuizToggleResponse')]
class QuizToggleResponseSchema
{
    #[OA\Property(property: 'message', type: 'string', example: 'Question rejetee.')]
    public string $message;

    #[OA\Property(property: 'warning', type: 'string', nullable: true, description: 'Avertissement si moins de 30 questions validees')]
    public ?string $warning;

    #[OA\Property(property: 'data', type: 'object', nullable: true)]
    public ?object $data;
}

#[OA\Schema(schema: 'EnrichedPublication')]
class EnrichedPublicationSchema
{
    #[OA\Property(property: 'publication_id', type: 'integer')]
    public int $publication_id;

    #[OA\Property(property: 'order', type: 'integer')]
    public int $order;

    #[OA\Property(property: 'title', type: 'string')]
    public string $title;

    #[OA\Property(property: 'status', type: 'string', enum: ['locked', 'available', 'completed'])]
    public string $status;

    #[OA\Property(property: 'is_locked', type: 'boolean')]
    public bool $is_locked;

    #[OA\Property(property: 'lock_reason', type: 'string', nullable: true, description: 'Message descriptif quand la publication est verrouillee')]
    public ?string $lock_reason;

    #[OA\Property(property: 'quiz_attempts', type: 'integer')]
    public int $quiz_attempts;

    #[OA\Property(property: 'quiz_highest_score', type: 'number', format: 'float', nullable: true)]
    public ?float $quiz_highest_score;

    #[OA\Property(property: 'completed_at', type: 'string', format: 'date-time', nullable: true)]
    public ?string $completed_at;
}