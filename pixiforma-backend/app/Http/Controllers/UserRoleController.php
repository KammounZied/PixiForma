<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Http\Requests\AssignRoleRequest;
use App\Models\User;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'Utilisateur', description: 'Attribution des rôles aux utilisateurs')]
class UserRoleController extends Controller
{
    #[OA\Put(
        path: '/users/{user}/role',
        summary: 'Attribuer un rôle à un utilisateur',
        security: [['bearerAuth' => []]],
        tags: ['Utilisateur'],

        parameters: [
            new OA\Parameter(name: 'user', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],

        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/AssignRoleRequest')
        ),

        responses: [
            new OA\Response(response: 200, description: 'Rôle attribué avec succès', content: new OA\JsonContent(ref: '#/components/schemas/ApiResponse')),
            new OA\Response(response: 403, description: 'Accès interdit')
        ]
    )]
    public function assign(AssignRoleRequest $request, User $user)
    {
        $user->syncRoles($request->roles);

        return response()->json([
            'message' => 'Rôle(s) attribué(s) avec succès',
            'user' => $user->load('roles'),
        ]);
    }
}