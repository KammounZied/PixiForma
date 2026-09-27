<?php

namespace App\Http\Controllers;

use App\Models\Group;
use App\Models\GroupRequest;
use App\Models\Notification;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'Demandes d\'inscription', description: 'Gestion des demandes d\'inscription aux groupes')]
class GroupRequestController extends Controller
{
    #[OA\Get(
        path: '/groups/available',
        summary: 'Groupes disponibles',
        description: 'Retourne la liste des groupes auxquels l\'utilisateur peut demander à s\'inscrire (non déjà membre ou déjà demandé).',
        security: [['bearerAuth' => []]],
        tags: ['Demandes d\'inscription'],
        responses: [
            new OA\Response(response: 200, description: 'Liste des groupes disponibles'),
            new OA\Response(response: 401, description: 'Non authentifié'),
        ]
    )]
    public function availableGroups(Request $request)
    {
        $user = $request->user();
        $joinedGroupIds = $user->groups()->pluck('group_id')->toArray();
        $requestedGroupIds = GroupRequest::where('user_id', $user->id)
            ->pluck('group_id')
            ->toArray();
        $excludeIds = array_unique(array_merge($joinedGroupIds, $requestedGroupIds));

        $groups = Group::with('creator')
            ->whereNotIn('id', $excludeIds)
            ->orderBy('name')
            ->get();

        return response()->json($groups);
    }

    #[OA\Get(
        path: '/group-requests/mine',
        summary: 'Mes demandes d\'inscription',
        description: 'Retourne la liste des demandes d\'inscription de l\'utilisateur connecté.',
        security: [['bearerAuth' => []]],
        tags: ['Demandes d\'inscription'],
        responses: [
            new OA\Response(response: 200, description: 'Liste des demandes'),
            new OA\Response(response: 401, description: 'Non authentifié'),
        ]
    )]
    public function myRequests(Request $request)
    {
        $user = $request->user();

        $requests = GroupRequest::with(['group.creator'])
            ->where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($requests);
    }

    #[OA\Post(
        path: '/groups/{group}/request-join',
        summary: 'Demander à rejoindre un groupe',
        description: 'Crée une demande d\'inscription à un groupe. Le créateur du groupe sera notifié.',
        security: [['bearerAuth' => []]],
        tags: ['Demandes d\'inscription'],
        parameters: [
            new OA\Parameter(name: 'group', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 201, description: 'Demande envoyée avec succès'),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 404, description: 'Groupe non trouvé'),
            new OA\Response(response: 422, description: 'Demande déjà existante'),
        ]
    )]
    public function requestJoin(Request $request, Group $group)
    {
        $user = $request->user();

        $alreadyMember = $group->members()->where('user_id', $user->id)->exists();
        if ($alreadyMember) {
            return response()->json(['message' => 'Vous êtes déjà membre de ce groupe.'], 422);
        }

        $existingRequest = GroupRequest::where('group_id', $group->id)
            ->where('user_id', $user->id)
            ->first();

        if ($existingRequest) {
            $statusLabels = ['pending' => 'en attente', 'accepted' => 'acceptée', 'declined' => 'refusée'];
            return response()->json([
                'message' => 'Une demande existe déjà pour ce groupe (statut : ' . ($statusLabels[$existingRequest->status] ?? $existingRequest->status) . ').',
            ], 422);
        }

        $groupRequest = GroupRequest::create([
            'group_id' => $group->id,
            'user_id' => $user->id,
            'status' => 'pending',
        ]);

        Notification::create([
            'user_id' => $group->creator_id,
            'type' => 'group_request',
            'title' => 'Nouvelle demande d\'inscription',
            'message' => "{$user->name} souhaite rejoindre votre groupe « {$group->name} ».",
            'data' => [
                'group_id' => $group->id,
                'group_name' => $group->name,
                'user_id' => $user->id,
                'user_name' => $user->name,
                'request_id' => $groupRequest->id,
            ],
        ]);

        return response()->json([
            'message' => 'Demande d\'inscription envoyée avec succès.',
            'request' => $groupRequest->load(['group.creator', 'user']),
        ], 201);
    }

    #[OA\Get(
        path: '/group-requests/pending',
        summary: 'Demandes en attente (formateur)',
        description: 'Retourne les demandes d\'inscription en attente pour les groupes du formateur connecté.',
        security: [['bearerAuth' => []]],
        tags: ['Demandes d\'inscription'],
        responses: [
            new OA\Response(response: 200, description: 'Liste des demandes en attente'),
            new OA\Response(response: 401, description: 'Non authentifié'),
        ]
    )]
    public function pendingRequests(Request $request)
    {
        $user = $request->user();
        $groupIds = $user->hasRole('Admin')
            ? Group::pluck('id')->toArray()
            : Group::where('creator_id', $user->id)->pluck('id')->toArray();
        $requests = GroupRequest::with(['group', 'user'])
            ->whereIn('group_id', $groupIds)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($requests);
    }

    #[OA\Put(
        path: '/group-requests/{groupRequest}/approve',
        summary: 'Approuver une demande',
        description: 'Approuve une demande d\'inscription et ajoute l\'utilisateur comme membre du groupe.',
        security: [['bearerAuth' => []]],
        tags: ['Demandes d\'inscription'],
        parameters: [
            new OA\Parameter(name: 'groupRequest', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Demande approuvée'),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
            new OA\Response(response: 404, description: 'Demande non trouvée'),
            new OA\Response(response: 422, description: 'Demande déjà traitée'),
        ]
    )]
    public function approve(Request $request, GroupRequest $groupRequest)
    {
        $user = $request->user();

        if (!$user->hasRole('Admin') && $groupRequest->group->creator_id !== $user->id) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        if ($groupRequest->status !== 'pending') {
            return response()->json(['message' => 'Cette demande a déjà été traitée.'], 422);
        }

        $groupRequest->update([
            'status' => 'accepted',
            'processed_at' => now(),
        ]);

        $groupRequest->group->members()->syncWithoutDetaching([$groupRequest->user_id]);

        Notification::create([
            'user_id' => $groupRequest->user_id,
            'type' => 'group_request_accepted',
            'title' => 'Demande d\'inscription acceptée',
            'message' => "Votre demande pour rejoindre le groupe « {$groupRequest->group->name} » a été acceptée.",
            'data' => [
                'group_id' => $groupRequest->group_id,
                'group_name' => $groupRequest->group->name,
                'request_id' => $groupRequest->id,
            ],
        ]);

        return response()->json([
            'message' => 'Demande approuvée. L\'utilisateur est maintenant membre du groupe.',
            'request' => $groupRequest->fresh()->load(['group', 'user']),
        ]);
    }

    #[OA\Put(
        path: '/group-requests/{groupRequest}/decline',
        summary: 'Refuser une demande',
        description: 'Refuse une demande d\'inscription à un groupe.',
        security: [['bearerAuth' => []]],
        tags: ['Demandes d\'inscription'],
        parameters: [
            new OA\Parameter(name: 'groupRequest', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Demande refusée'),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
            new OA\Response(response: 404, description: 'Demande non trouvée'),
            new OA\Response(response: 422, description: 'Demande déjà traitée'),
        ]
    )]
    public function decline(Request $request, GroupRequest $groupRequest)
    {
        $user = $request->user();

        if (!$user->hasRole('Admin') && $groupRequest->group->creator_id !== $user->id) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        if ($groupRequest->status !== 'pending') {
            return response()->json(['message' => 'Cette demande a déjà été traitée.'], 422);
        }
        $groupRequest->update(['status' => 'declined','processed_at' => now(),]);
        Notification::create([
            'user_id' => $groupRequest->user_id,
            'type' => 'group_request_declined',
            'title' => 'Demande d\'inscription refusée',
            'message' => "Votre demande pour rejoindre le groupe « {$groupRequest->group->name} » a été refusée.",
            'data' => [
                'group_id' => $groupRequest->group_id,
                'group_name' => $groupRequest->group->name,
                'request_id' => $groupRequest->id,
            ],
        ]);

        return response()->json([
            'message' => 'Demande refusée.',
            'request' => $groupRequest->fresh()->load(['group', 'user']),
        ]);
    }
}
