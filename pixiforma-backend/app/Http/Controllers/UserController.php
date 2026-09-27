<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Http\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use OpenApi\Attributes as OA;

#[OA\Info(
    title: 'API Pixiforma',
    version: '1.0.0',
    description: 'Documentation de l\'API REST Pixiforma'
)]
#[OA\SecurityScheme(
    securityScheme: 'bearerAuth',
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'Jeton d\'authentification Bearer. Format : Bearer <token>'
)]
#[OA\Tag(name: 'Utilisateur', description: 'Gestion du profil utilisateur')]
class UserController extends Controller
{
    #[OA\Get(
        path: '/user',
        summary: 'Profil de l\'utilisateur connecté',
        description: 'Retourne les informations de l\'utilisateur actuellement authentifié.',
        security: [['bearerAuth' => []]],
        tags: ['Utilisateur'],
        responses: [
            new OA\Response(response: 200, description: 'Profil récupéré avec succès', content: new OA\JsonContent(ref: '#/components/schemas/User')),
            new OA\Response(response: 401, description: 'Non authentifié'),
        ]
    )]
public function me(Request $request)
{
    $user = $request->user()->load('roles');

    return response()->json([
        'user' => $user,
        'force_password_change' => (bool) $user->force_password_change,
    ]);
}

    #[OA\Get(
        path: '/users',
        summary: 'Liste de tous les utilisateurs',
        description: 'Retourne la liste paginée de tous les utilisateurs avec leurs rôles.',
        security: [['bearerAuth' => []]],
        tags: ['Utilisateur'],
        responses: [
            new OA\Response(response: 200, description: 'Liste récupérée avec succès', content: new OA\JsonContent(type: 'array', items: new OA\Items(ref: '#/components/schemas/User'))),
            new OA\Response(response: 401, description: 'Non authentifié'),
        ]
    )]
    public function index()
    {
        $users = User::with('roles')->orderBy('name')->get();
        return response()->json(UserResource::collection($users));
    }

    #[OA\Get(
        path: '/users/collaborators',
        summary: 'Liste des collaborateurs',
        description: 'Retourne la liste des utilisateurs ayant le rôle Collaborateur, avec recherche par nom ou email.',
        security: [['bearerAuth' => []]],
        tags: ['Utilisateur'],
        parameters: [
            new OA\Parameter(name: 'search', in: 'query', required: false, schema: new OA\Schema(type: 'string'), description: 'Recherche par nom ou email')
        ],
        responses: [
            new OA\Response(response: 200, description: 'Liste des collaborateurs récupérée avec succès', content: new OA\JsonContent(type: 'array', items: new OA\Items(ref: '#/components/schemas/User'))),
            new OA\Response(response: 401, description: 'Non authentifié'),
        ]
    )]
    public function collaborators(Request $request)
    {
        $search = $request->query('search');

        $query = User::whereHas('roles', function ($q) {
            $q->where('name', 'Collaborateur');
        })->orderBy('name');

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        return response()->json($query->get()->map(function ($user) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ];
        }));
    }

    #[OA\Post(
        path: '/users/invite',
        summary: 'Inviter un utilisateur',
        description: 'Crée un utilisateur et lui envoie une invitation par email.',
        security: [['bearerAuth' => []]],
        tags: ['Utilisateur'],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/UserInviteRequest')),
        responses: [
            new OA\Response(response: 200, description: 'Invitation envoyée avec succès', content: new OA\JsonContent(ref: '#/components/schemas/ApiResponse')),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
            new OA\Response(response: 422, description: 'Données invalides'),
        ]
    )]
    public function invite(Request $request)
{
    $request->validate([
        'name' => 'required|string|max:255',
        'email' => 'required|string|email|max:255|unique:users',
        'roles' => 'required|array|min:1',
        'roles.*' => 'required|string|distinct|exists:roles,name',
    ], [
        'name.required' => 'Le nom est obligatoire.',
        'name.max' => 'Le nom ne peut pas dépasser 255 caractères.',
        'email.required' => 'L\'adresse e-mail est obligatoire.',
        'email.email' => 'L\'adresse e-mail n\'est pas valide.',
        'email.unique' => 'Cette adresse e-mail est déjà utilisée.',
        'email.max' => 'L\'adresse e-mail ne peut pas dépasser 255 caractères.',
        'roles.required' => 'Au moins un rôle est obligatoire.',
        'roles.*.exists' => 'Le rôle sélectionné n\'existe pas.',
    ]);

    $temporaryPassword = \Illuminate\Support\Str::random(10);

    $user = User::create([
        'name' => $request->name,
        'email' => $request->email,
        'password' => \Illuminate\Support\Facades\Hash::make($temporaryPassword),
        'force_password_change' => true,
    ]);

    $user->syncRoles($request->roles);

    \Illuminate\Support\Facades\Mail::to($user->email)
        ->send(new \App\Mail\UserInvitationMail($user, $temporaryPassword));

    return response()->json([
        'message' => 'Utilisateur invité avec succès',
        'user' => $user
    ], 201);
}

    #[OA\Put(
        path: '/users/{user}',
        summary: 'Modifier un utilisateur',
        description: 'Modifie les informations d\'un utilisateur (nom, email, rôles).',
        security: [['bearerAuth' => []]],
        tags: ['Utilisateur'],
        parameters: [
            new OA\Parameter(name: 'user', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/UserUpdateRequest')),
        responses: [
            new OA\Response(response: 200, description: 'Compte utilisateur modifié avec succès', content: new OA\JsonContent(ref: '#/components/schemas/ApiResponse')),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
            new OA\Response(response: 404, description: 'Utilisateur non trouvé'),
            new OA\Response(response: 422, description: 'Données invalides'),
        ]
    )]
    public function update(Request $request, User $user)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email,' . $user->id,
        ], [
            'name.required' => 'Le nom est obligatoire.',
            'name.max' => 'Le nom ne peut pas dépasser 255 caractères.',
            'email.required' => 'L\'adresse e-mail est obligatoire.',
            'email.email' => 'L\'adresse e-mail n\'est pas valide.',
            'email.unique' => 'Cette adresse e-mail est déjà utilisée.',
            'email.max' => 'L\'adresse e-mail ne peut pas dépasser 255 caractères.',
        ]);

        $user->name = $request->name;
        $user->email = $request->email;

        if ($request->user()->hasRole('Admin') && $request->filled('roles')) {
            $request->validate([
                'roles' => 'required|array|min:1',
                'roles.*' => 'required|string|distinct|exists:roles,name',
            ], [
                'roles.required' => 'Au moins un rôle est obligatoire.',
                'roles.*.exists' => 'Le rôle sélectionné n\'existe pas.',
            ]);
            $user->syncRoles($request->roles);
        }

        $user->save();

        return response()->json([
            'message' => 'Compte utilisateur modifié avec succès.',
            'user' => new UserResource($user->load('roles')),
        ]);
    }

    #[OA\Put(
        path: '/users/{user}/toggle-status',
        summary: 'Activer/désactiver un utilisateur',
        description: 'Active ou désactive le compte d\'un utilisateur. Impossible de désactiver son propre compte.',
        security: [['bearerAuth' => []]],
        tags: ['Utilisateur'],
        parameters: [
            new OA\Parameter(name: 'user', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Statut du compte modifié avec succès', content: new OA\JsonContent(ref: '#/components/schemas/ApiResponse')),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 403, description: 'Action non autorisée'),
            new OA\Response(response: 404, description: 'Utilisateur non trouvé'),
        ]
    )]
    public function toggleStatus(User $user)
    {
        if ($user->id === request()->user()->id) {
            return response()->json([
                'message' => 'Vous ne pouvez pas désactiver votre propre compte.',
            ], 403);
        }

        $user->is_active = !$user->is_active;
        $user->save();

        $status = $user->is_active ? 'activé' : 'désactivé';

        return response()->json([
            'message' => "Compte utilisateur {$status} avec succès.",
            'user' => new UserResource($user->load('roles')),
        ]);
    }

    #[OA\Delete(
        path: '/users/{user}',
        summary: 'Supprimer un utilisateur',
        description: 'Supprime définitivement un compte utilisateur. Impossible de supprimer son propre compte.',
        security: [['bearerAuth' => []]],
        tags: ['Utilisateur'],
        parameters: [
            new OA\Parameter(name: 'user', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Compte utilisateur supprimé avec succès', content: new OA\JsonContent(ref: '#/components/schemas/ApiResponse')),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 403, description: 'Action non autorisée'),
            new OA\Response(response: 404, description: 'Utilisateur non trouvé'),
        ]
    )]
    public function destroy(User $user)
    {
        if ($user->id === request()->user()->id) {
            return response()->json([
                'message' => 'Vous ne pouvez pas supprimer votre propre compte.',
            ], 403);
        }

        $user->delete();

        return response()->json([
            'message' => 'Compte utilisateur supprimé avec succès.',
        ]);
    }

    #[OA\Post(
        path: '/users/change-password',
        summary: 'Changer le mot de passe',
        description: 'Modifie le mot de passe de l\'utilisateur connecté et réinitialise le flag force_password_change.',
        security: [['bearerAuth' => []]],
        tags: ['Utilisateur'],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/ChangePasswordRequest')),
        responses: [
            new OA\Response(response: 200, description: 'Mot de passe mis à jour avec succès', content: new OA\JsonContent(ref: '#/components/schemas/ApiResponse')),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 422, description: 'Données invalides'),
        ]
    )]
    public function changePassword(Request $request)
{
    $request->validate([
        'password' => [
            'required',
            'confirmed',
            'min:8',

            function ($attribute, $value, $fail) {
                if (!preg_match('/[a-z]/', $value)) {
                    $fail('Le mot de passe doit contenir au moins une lettre minuscule.');
                }
            },

            function ($attribute, $value, $fail) {
                if (!preg_match('/[A-Z]/', $value)) {
                    $fail('Le mot de passe doit contenir au moins une lettre majuscule.');
                }
            },

            function ($attribute, $value, $fail) {
                if (!preg_match('/[0-9]/', $value)) {
                    $fail('Le mot de passe doit contenir au moins un chiffre.');
                }
            },

            function ($attribute, $value, $fail) {
                if (!preg_match('/[\W_]/', $value)) {
                    $fail('Le mot de passe doit contenir au moins un caractère spécial.');
                }
            },
        ],
    ], [
        'password.required' => 'Le mot de passe est obligatoire.',
        'password.confirmed' => 'La confirmation du mot de passe ne correspond pas.',
        'password.min' => 'Le mot de passe doit contenir au moins 8 caractères.',
    ]);

    $user = $request->user();
    $user->password = Hash::make($request->password);
    $user->force_password_change = false;
    $user->save();

    return response()->json([
        'message' => 'Mot de passe mis à jour avec succès.'
    ]);
}
    
}
