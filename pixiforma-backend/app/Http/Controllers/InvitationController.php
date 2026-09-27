<?php

namespace App\Http\Controllers;

use App\Models\Group;
use App\Models\Invitation;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'Invitations', description: 'Gestion des invitations à rejoindre un groupe')]
class InvitationController extends Controller
{
    #[OA\Get(
        path: '/invitations',
        summary: 'Liste des invitations',
        description: 'Retourne la liste des invitations reçues par l\'utilisateur connecté.',
        security: [['bearerAuth' => []]],
        tags: ['Invitations'],
        responses: [
            new OA\Response(response: 200, description: 'Liste des invitations récupérée avec succès', content: new OA\JsonContent(type: 'array', items: new OA\Items(ref: '#/components/schemas/Invitation'))),
            new OA\Response(response: 401, description: 'Non authentifié'),
        ]
    )]
    public function index(Request $request)
    {
        $user = $request->user();

        $invitations = Invitation::with(['group', 'sender'])
            ->where('recipient_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($invitations);
    }

    #[OA\Post(
        path: '/groups/{group}/invitations',
        summary: 'Envoyer des invitations',
        description: 'Envoie des invitations à un ou plusieurs collaborateurs pour rejoindre un groupe.',
        security: [['bearerAuth' => []]],
        tags: ['Invitations'],
        parameters: [
            new OA\Parameter(name: 'group', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/SendInvitationRequest')
        ),
        responses: [
            new OA\Response(response: 201, description: 'Invitation(s) envoyée(s) avec succès', content: new OA\JsonContent(ref: '#/components/schemas/ApiResponse')),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
            new OA\Response(response: 404, description: 'Groupe non trouvé'),
            new OA\Response(response: 422, description: 'Données invalides'),
        ]
    )]
    public function send(Request $request, Group $group)
    {
        $user = $request->user();

        if (!$user->hasRole('Admin') && $group->creator_id !== $user->id) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'recipient_ids' => 'required|array|min:1',
            'recipient_ids.*' => 'required|integer|exists:users,id',
        ], [
            'recipient_ids.required' => 'Veuillez sélectionner au moins un collaborateur.',
            'recipient_ids.*.exists' => 'Un ou plusieurs utilisateurs n\'existent pas.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        $recipientIds = $request->recipient_ids;
        $alreadyMemberIds = $group->members()->whereIn('user_id', $recipientIds)->pluck('user_id')->toArray();
        $alreadyInvitedIds = Invitation::where('group_id', $group->id)
            ->whereIn('recipient_id', $recipientIds)
            ->where('status', 'sent')
            ->pluck('recipient_id')
            ->toArray();

        $errors = [];

        if (!empty($alreadyMemberIds)) {
            $names = \App\Models\User::whereIn('id', $alreadyMemberIds)->pluck('name')->implode(', ');
            $errors[] = "Ces utilisateurs sont déjà membres du groupe : {$names}";
        }

        if (!empty($alreadyInvitedIds)) {
            $names = \App\Models\User::whereIn('id', $alreadyInvitedIds)->pluck('name')->implode(', ');
            $errors[] = "Une invitation a déjà été envoyée à : {$names}";
        }

        if (!empty($errors)) {
            return response()->json([
                'message' => implode('. ', $errors),
                'errors' => $errors,
            ], 422);
        }

        $created = [];
        foreach ($recipientIds as $recipientId) {
            $invitation = Invitation::where('group_id', $group->id)
                ->where('recipient_id', $recipientId)
                ->first();

            if ($invitation) {
                $invitation->update([
                    'sender_id' => $user->id,
                    'status' => 'sent',
                ]);
                $invitation = $invitation->fresh();
            } else {
                $invitation = Invitation::create([
                    'group_id' => $group->id,
                    'sender_id' => $user->id,
                    'recipient_id' => $recipientId,
                    'status' => 'sent',
                ]);
            }

            $created[] = $invitation->load(['recipient', 'group']);

            Notification::create([
                'user_id' => $recipientId,
                'type' => 'group_invitation',
                'title' => 'Invitation à rejoindre un groupe',
                'message' => "Vous avez été invité à rejoindre le groupe « {$group->name} » par {$user->name}.",
                'data' => [
                    'group_id' => $group->id,
                    'group_name' => $group->name,
                    'sender_id' => $user->id,
                    'sender_name' => $user->name,
                    'invitation_id' => $invitation->id,
                ],
            ]);
        }

        return response()->json([
            'message' => 'Invitation(s) envoyée(s) avec succès.',
            'invitations' => $created,
        ], 201);
    }

    #[OA\Put(
        path: '/invitations/{invitation}/accept',
        summary: 'Accepter une invitation',
        description: 'Accepte une invitation à rejoindre un groupe et ajoute l\'utilisateur comme membre.',
        security: [['bearerAuth' => []]],
        tags: ['Invitations'],
        parameters: [
            new OA\Parameter(name: 'invitation', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Invitation acceptée avec succès', content: new OA\JsonContent(ref: '#/components/schemas/ApiResponse')),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
            new OA\Response(response: 404, description: 'Invitation non trouvée'),
            new OA\Response(response: 422, description: 'Invitation déjà traitée'),
        ]
    )]
    public function accept(Request $request, Invitation $invitation)
    {
        $user = $request->user();

        if ($invitation->recipient_id !== $user->id) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        if ($invitation->status !== 'sent') {
            return response()->json(['message' => 'Cette invitation a déjà été traitée.'], 422);
        }

        $invitation->update(['status' => 'accepted']);

        $invitation->group->members()->attach($user->id);

        return response()->json([
            'message' => 'Invitation acceptée. Vous êtes maintenant membre du groupe.',
            'invitation' => $invitation->fresh()->load(['group', 'sender']),
        ]);
    }

    #[OA\Put(
        path: '/invitations/{invitation}/decline',
        summary: 'Refuser une invitation',
        description: 'Refuse une invitation à rejoindre un groupe.',
        security: [['bearerAuth' => []]],
        tags: ['Invitations'],
        parameters: [
            new OA\Parameter(name: 'invitation', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Invitation refusée avec succès', content: new OA\JsonContent(ref: '#/components/schemas/ApiResponse')),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
            new OA\Response(response: 404, description: 'Invitation non trouvée'),
            new OA\Response(response: 422, description: 'Invitation déjà traitée'),
        ]
    )]
    public function decline(Request $request, Invitation $invitation)
    {
        $user = $request->user();

        if ($invitation->recipient_id !== $user->id) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        if ($invitation->status !== 'sent') {
            return response()->json(['message' => 'Cette invitation a déjà été traitée.'], 422);
        }

        $invitation->update(['status' => 'declined']);

        return response()->json([
            'message' => 'Invitation refusée.',
            'invitation' => $invitation->fresh()->load(['group', 'sender']),
        ]);
    }
}
