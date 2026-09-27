<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'Rôles et Permissions', description: 'Gestion des rôles et permissions')]
class RoleController extends Controller
{
    #[OA\Get(
        path: '/roles',
        summary: 'Obtenir tous les rôles et permissions',
        security: [['bearerAuth' => []]],
        tags: ['Rôles et Permissions'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Liste des rôles avec leurs permissions'
            )
        ]
    )]
    public function index()
    {
        $roles = Role::with('permissions')->get();
        $permissions = Permission::all();

        return response()->json([
            'roles' => $roles,
            'permissions' => $permissions
        ]);
    }

    #[OA\Put(
        path: '/roles/{role}/permissions/toggle',
        summary: 'Basculer une permission pour un rôle',
        security: [['bearerAuth' => []]],
        tags: ['Rôles et Permissions'],
        parameters: [
            new OA\Parameter(
                name: 'role',
                in: 'path',
                required: true,
                schema: new OA\Schema(type: 'integer')
            )
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'permission_name', type: 'string')
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Permission basculée avec succès'
            )
        ]
    )]
    public function togglePermission(Request $request, Role $role)
    {
        $request->validate([
            'permission_name' => 'required|string|exists:permissions,name'
        ]);

        $permissionName = $request->permission_name;

        if ($role->hasPermissionTo($permissionName)) {
            $role->revokePermissionTo($permissionName);
            $action = 'revoked';
        } else {
            $role->givePermissionTo($permissionName);
            $action = 'granted';
        }

        return response()->json([
            'message' => 'Permission mise à jour avec succès.',
            'action' => $action
        ]);
    }
}
