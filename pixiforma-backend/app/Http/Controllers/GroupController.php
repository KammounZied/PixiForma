<?php

namespace App\Http\Controllers;

use App\Models\Comment;
use App\Models\Group;
use App\Models\GroupRequest;
use App\Models\Publication;
use App\Models\PublicationFile;
use App\Models\Quiz;
use App\Models\QuizSubmission;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'Groupes', description: 'Gestion des groupes de collaborateurs')]
class GroupController extends Controller
{
    #[OA\Get(
        path: '/groups',
        summary: 'Liste des groupes',
        description: 'Retourne la liste des groupes. Les admins voient tous les groupes, les formateurs voient uniquement leurs groupes.',
        security: [['bearerAuth' => []]],
        tags: ['Groupes'],
        responses: [
            new OA\Response(response: 200, description: 'Liste des groupes récupérée avec succès', content: new OA\JsonContent(type: 'array', items: new OA\Items(ref: '#/components/schemas/Group'))),
            new OA\Response(response: 401, description: 'Non authentifié'),
        ]
    )]
    public function index(Request $request)
    {
        $user = $request->user();

        if ($user->hasRole('Admin')) {
            $groups = Group::with('creator', 'formations')->withCount('members')->orderBy('name')->get();
        } elseif ($user->hasRole('Formateur')) {
            $groups = Group::with('creator', 'formations')->withCount('members')
                ->where('creator_id', $user->id)
                ->orderBy('name')
                ->get();
        }

        if ($user->hasRole('Admin') || $user->hasRole('Formateur')) {
            $groups = $groups->map(function ($group) {
                $group->total_formations_count = $group->formations->count();
                $group->guided_formations_count = $group->formations->where('progression_mode', 'guided')->count();
                $group->free_formations_count = $group->formations->where('progression_mode', 'free')->count();
                unset($group->formations);
                return $group;
            });
        }

        if (!$user->hasRole('Admin') && !$user->hasRole('Formateur')) {
            $memberGroupIds = $user->groups()->pluck('group_id')->toArray();
            $requestStatuses = GroupRequest::where('user_id', $user->id)
                ->whereIn('status', ['pending', 'declined'])
                ->get()
                ->keyBy('group_id')
                ->map(fn($r) => $r->status)
                ->toArray();

            $groups = Group::with('creator')->withCount('members')->orderBy('name')->get();
            $groups = $groups->map(function ($group) use ($memberGroupIds, $requestStatuses) {
                $group->is_member = in_array($group->id, $memberGroupIds);
                $group->request_status = $requestStatuses[$group->id] ?? null;
                return $group;
            });
        }

        return response()->json($groups);
    }

    #[OA\Post(
        path: '/groups',
        summary: 'Créer un groupe',
        description: 'Crée un nouveau groupe pour le formateur connecté.',
        security: [['bearerAuth' => []]],
        tags: ['Groupes'],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/GroupCreateRequest')),
        responses: [
            new OA\Response(response: 201, description: 'Groupe créé avec succès', content: new OA\JsonContent(ref: '#/components/schemas/ApiResponse')),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 422, description: 'Données invalides'),
        ]
    )]
    public function store(Request $request)
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'name' => [
                'required',
                'string',
                'max:255',
                function ($attribute, $value, $fail) use ($user) {
                    $exists = Group::where('name', $value)
                        ->where('creator_id', $user->id)
                        ->exists();
                    if ($exists) {
                        $fail('Vous avez déjà un groupe avec ce nom.');
                    }
                },
            ],
            'description' => 'nullable|string|max:1000',
        ], [
            'name.required' => 'Le nom du groupe est obligatoire.',
            'name.max' => 'Le nom ne peut pas dépasser 255 caractères.',
            'description.max' => 'La description ne peut pas dépasser 1000 caractères.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        $group = Group::create([
            'name' => $request->name,
            'description' => $request->description,
            'creator_id' => $user->id,
        ]);

        return response()->json([
            'message' => 'Groupe créé avec succès.',
            'group' => $group->load('creator'),
        ], 201);
    }

    #[OA\Get(
        path: '/groups/{group}',
        summary: 'Détails d\'un groupe',
        description: 'Retourne les détails d\'un groupe avec ses membres.',
        security: [['bearerAuth' => []]],
        tags: ['Groupes'],
        parameters: [
            new OA\Parameter(name: 'group', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Groupe récupéré avec succès', content: new OA\JsonContent(ref: '#/components/schemas/Group')),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
            new OA\Response(response: 404, description: 'Groupe non trouvé'),
        ]
    )]
    public function show(Request $request, Group $group)
    {
        $user = $request->user();

        if ($user->hasRole('Admin')) {
            return response()->json($group->load(['creator', 'members']));
        }

        if ($user->hasRole('Formateur') && $group->creator_id !== $user->id) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        if ($group->creator_id !== $user->id && !$group->members()->where('user_id', $user->id)->exists()) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        return response()->json($group->load(['creator', 'members']));
    }

    #[OA\Put(
        path: '/groups/{group}',
        summary: 'Modifier un groupe',
        description: 'Modifie le nom et/ou la description d\'un groupe.',
        security: [['bearerAuth' => []]],
        tags: ['Groupes'],
        parameters: [
            new OA\Parameter(name: 'group', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/GroupUpdateRequest')),
        responses: [
            new OA\Response(response: 200, description: 'Groupe modifié avec succès', content: new OA\JsonContent(ref: '#/components/schemas/ApiResponse')),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
            new OA\Response(response: 404, description: 'Groupe non trouvé'),
            new OA\Response(response: 422, description: 'Données invalides'),
        ]
    )]
    public function update(Request $request, Group $group)
    {
        $user = $request->user();

        if (!$user->hasRole('Admin') && $group->creator_id !== $user->id) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => [
                'required',
                'string',
                'max:255',
                function ($attribute, $value, $fail) use ($user, $group) {
                    $exists = Group::where('name', $value)
                        ->where('creator_id', $user->id)
                        ->where('id', '!=', $group->id)
                        ->exists();
                    if ($exists) {
                        $fail('Vous avez déjà un groupe avec ce nom.');
                    }
                },
            ],
            'description' => 'nullable|string|max:1000',
        ], [
            'name.required' => 'Le nom du groupe est obligatoire.',
            'name.max' => 'Le nom ne peut pas dépasser 255 caractères.',
            'description.max' => 'La description ne peut pas dépasser 1000 caractères.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        $group->update($request->only(['name', 'description']));

        return response()->json([
            'message' => 'Groupe modifié avec succès.',
            'group' => $group->fresh()->load('creator'),
        ]);
    }

    #[OA\Delete(
        path: '/groups/{group}',
        summary: 'Supprimer un groupe',
        description: 'Supprime un groupe et ses associations.',
        security: [['bearerAuth' => []]],
        tags: ['Groupes'],
        parameters: [
            new OA\Parameter(name: 'group', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Groupe supprimé avec succès', content: new OA\JsonContent(ref: '#/components/schemas/ApiResponse')),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
            new OA\Response(response: 404, description: 'Groupe non trouvé'),
        ]
    )]
    public function destroy(Request $request, Group $group)
    {
        $user = $request->user();

        if (!$user->hasRole('Admin') && $group->creator_id !== $user->id) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        // Delete physical files from storage
        foreach ($group->publications as $publication) {
            foreach ($publication->files as $pubFile) {
                Storage::disk('local')->delete($pubFile->file_path);
            }
        }
        Storage::disk('local')->deleteDirectory('publications/' . $group->id);

        // Delete notifications related to this group
        DB::table('notifications')
            ->whereRaw('JSON_EXTRACT(`data`, "$.group_id") = ?', [(int)$group->id])
            ->orWhereRaw('JSON_EXTRACT(`data`, "$.group_id") = ?', [(string)$group->id])
            ->delete();

        $group->delete();

        return response()->json([
            'message' => 'Groupe supprimé avec succès.',
        ]);
    }

    #[OA\Get(
        path: '/groups/{group}/members',
        summary: 'Membres d\'un groupe',
        description: 'Retourne la liste des membres d\'un groupe.',
        security: [['bearerAuth' => []]],
        tags: ['Groupes'],
        parameters: [
            new OA\Parameter(name: 'group', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Membres récupérés avec succès', content: new OA\JsonContent(ref: '#/components/schemas/Group')),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
            new OA\Response(response: 404, description: 'Groupe non trouvé'),
        ]
    )]
    public function members(Request $request, Group $group)
    {
        $user = $request->user();

        if ($user->hasRole('Admin')) {
            return response()->json($group->load('members'));
        }

        if ($user->hasRole('Formateur') && $group->creator_id !== $user->id) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        if ($group->creator_id !== $user->id && !$group->members()->where('user_id', $user->id)->exists()) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        return response()->json($group->load('members'));
    }

    #[OA\Delete(
        path: '/groups/{group}/members/{user}',
        summary: 'Retirer un membre du groupe',
        description: 'Retire un membre d\'un groupe. Seuls l\'Admin ou le créateur du groupe peuvent retirer un membre.',
        security: [['bearerAuth' => []]],
        tags: ['Groupes'],
        parameters: [
            new OA\Parameter(
                name: 'group',
                in: 'path',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
            new OA\Parameter(
                name: 'user',
                in: 'path',
                required: true,
                schema: new OA\Schema(type: 'integer')
            )
        ],
        responses: [
            new OA\Response(response: 200, description: 'Membre retiré avec succès'),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
            new OA\Response(response: 404, description: 'Groupe ou utilisateur non trouvé'),
            new OA\Response(response: 422, description: 'Impossible de retirer le créateur ou utilisateur non membre')
        ]
    )]
    public function removeMember(Request $request, Group $group, User $user)
    {
        $authUser = $request->user();

        if (!$authUser->hasRole('Admin') && $group->creator_id !== $authUser->id) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        if ($user->id === $group->creator_id) {
            return response()->json(['message' => 'Vous ne pouvez pas retirer le créateur du groupe.'], 422);
        }

        $isMember = $group->members()->where('user_id', $user->id)->exists();
        if (!$isMember) {
            return response()->json(['message' => 'Cet utilisateur n\'est pas membre du groupe.'], 422);
        }

        $this->cleanupUserData($group, $user->id);

        $group->members()->detach($user->id);

        return response()->json([
            'message' => "{$user->name} a été retiré du groupe.",
        ]);
    }

    #[OA\Post(
        path: '/groups/{group}/leave',
        summary: "Quitter un groupe",
        description: "Permet à un collaborateur de quitter un groupe dont il est membre.",
        security: [['bearerAuth' => []]],
        tags: ['Groupes'],
        parameters: [
            new OA\Parameter(name: 'group', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Vous avez quitté le groupe.', content: new OA\JsonContent(ref: '#/components/schemas/ApiResponse')),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 422, description: 'Impossible de quitter le groupe (créateur ou non membre)'),
        ]
    )]
    public function leaveGroup(Request $request, Group $group)
    {
        $user = $request->user();

        if ($group->creator_id === $user->id) {
            return response()->json(['message' => 'Le créateur du groupe ne peut pas quitter le groupe.'], 422);
        }

        if (!$group->members()->where('user_id', $user->id)->exists()) {
            return response()->json(['message' => 'Vous n\'êtes pas membre de ce groupe.'], 422);
        }

        $this->cleanupUserData($group, $user->id);

        $group->members()->detach($user->id);

        return response()->json([
            'message' => 'Vous avez quitté le groupe avec succès.',
        ]);
    }

    private function cleanupUserData(Group $group, int $userId): void
    {
        DB::transaction(function () use ($group, $userId) {
            $publicationIds = $group->publications()->pluck('id');
            $formationIds = $group->formations()->pluck('id');

            Comment::where('user_id', $userId)
                ->whereIn('publication_id', $publicationIds)
                ->delete();

            DB::table('formation_user')
                ->where('user_id', $userId)
                ->whereIn('formation_id', $formationIds)
                ->delete();

            $quizIds = Quiz::whereIn('publication_id', $publicationIds)->pluck('id');

            QuizSubmission::where('user_id', $userId)
                ->whereIn('quiz_id', $quizIds)
                ->delete();
        });
    }
}
