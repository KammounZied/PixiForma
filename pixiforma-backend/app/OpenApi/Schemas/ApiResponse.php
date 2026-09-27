<?php

namespace App\OpenApi\Schemas;

use OpenApi\Attributes as OA;

#[OA\Schema(schema: 'ApiResponse')]
class ApiResponse
{
    #[OA\Property(property: 'message', type: 'string', example: 'Opération réussie.')]
    public string $message;

    #[OA\Property(property: 'data', nullable: true)]
    public mixed $data;
}

#[OA\Schema(schema: 'ApiError')]
class ApiError
{
    #[OA\Property(property: 'message', type: 'string', example: 'Erreur de validation.')]
    public string $message;

    #[OA\Property(property: 'errors', type: 'object', nullable: true)]
    public ?object $errors;
}

#[OA\Schema(schema: 'PaginationMeta')]
class PaginationMeta
{
    #[OA\Property(property: 'current_page', type: 'integer')]
    public int $current_page;

    #[OA\Property(property: 'last_page', type: 'integer')]
    public int $last_page;

    #[OA\Property(property: 'per_page', type: 'integer')]
    public int $per_page;

    #[OA\Property(property: 'total', type: 'integer')]
    public int $total;
}
