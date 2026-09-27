<?php

namespace App\Http\Controllers;

use App\Models\Formation;
use App\Models\FormationBlockRequest;
use App\Models\FormationUser;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'Formations', description: 'Demandes de déblocage de formation')]
class FormationBlockRequestController extends Controller
{
    #[OA\Post(
        path: '/formations/{formation}/block-requests',
        summary: 'Soumettre une demande de déblocage',
        security: [['bearerAuth' => []]],
        tags: ['Formations'],
        parameters: [
            new OA\Parameter(name: 'formation', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/BlockRequest')
        ),
        responses: [
            new OA\Response(response: 201, description: 'Demande envoyée', content: new OA\JsonContent(ref: '#/components/schemas/ApiResponse')),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 422, description: 'Non bloqué ou demande déjà existante'),
        ]
    )]
    public function store(Request $request, Formation $formation)
    {
        $user = $request->user();

        $fu = $formation->learnerProgress()->where('user_id', $user->id)->first();

        if (!$fu || $fu->status !== 'blocked') {
            return response()->json(['message' => 'Vous n\'êtes pas bloqué dans cette formation.'], 422);
        }

        // Vérifier qu'il n'y a pas déjà une demande en attente
        $existing = $formation->blockRequests()
            ->where('user_id', $user->id)
            ->where('status', 'pending')
            ->first();

        if ($existing) {
            return response()->json(['message' => 'Une demande est déjà en attente.'], 422);
        }

        $blockRequest = FormationBlockRequest::create([
            'formation_user_id' => $fu->id,
            'user_id' => $user->id,
            'formation_id' => $formation->id,
            'publication_id' => $request->publication_id,
            'block_reason' => $request->block_reason ?? 'attempts_exhausted',
            'status' => 'pending',
        ]);

        // Notifier le formateur/créateur du groupe
        $group = $formation->group;
        $formateur = $group->creator;
        if ($formateur) {
            $pubTitle = null;
            if ($request->publication_id) {
                $pub = \App\Models\Publication::find($request->publication_id);
                $pubTitle = $pub->title ?? null;
            }
            Notification::create([
                'user_id' => $formateur->id,
                'type' => 'training_assignment',
                'title' => "Demande de déblocage",
                'message' => "{$user->name} demande à être débloqué dans la formation « {$formation->title }»" . ($pubTitle ? " pour la publication « {$pubTitle} »." : '.'),
                'data' => [
                    'formation_id' => $formation->id,
                    'formation_title' => $formation->title,
                    'group_id' => $group->id,
                    'group_name' => $group->name,
                    'block_request_id' => $blockRequest->id,
                    'user_id' => $user->id,
                    'user_name' => $user->name,
                    'publication_id' => $request->publication_id,
                    'publication_title' => $pubTitle,
                ],
            ]);
        }

        return response()->json([
            'message' => 'Demande de déblocage envoyée.',
            'data' => $blockRequest,
        ], 201);
    }

    #[OA\Get(
        path: '/formations/{formation}/block-requests',
        summary: 'Liste des demandes de déblocage (formateur)',
        security: [['bearerAuth' => []]],
        tags: ['Formations'],
        parameters: [
            new OA\Parameter(name: 'formation', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Liste des demandes'),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
        ]
    )]
    public function index(Request $request, Formation $formation)
    {
        $group = $formation->group;
        $user = $request->user();

        if (!$user->hasRole('Admin') && $group->creator_id !== $user->id) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        $requests = $formation->blockRequests()
            ->with('user:id,name,email', 'publication:id,title')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($r) => tap($r, fn($r) => $r->block_reason = $r->block_reason ?? 'attempts_exhausted'));

        return response()->json($requests);
    }

    public function check(Request $request, Formation $formation)
    {
        $user = $request->user();
        $hasPending = $formation->blockRequests()
            ->where('user_id', $user->id)
            ->where('status', 'pending')
            ->exists();

        return response()->json(['has_pending_request' => $hasPending]);
    }

    #[OA\Put(
        path: '/block-requests/{blockRequest}/approve',
        summary: 'Approuver une demande de déblocage',
        security: [['bearerAuth' => []]],
        tags: ['Formations'],
        parameters: [
            new OA\Parameter(name: 'blockRequest', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Demande approuvée', content: new OA\JsonContent(ref: '#/components/schemas/ApiResponse')),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
        ]
    )]
    public function approve(Request $request, FormationBlockRequest $blockRequest)
    {
        $group = $blockRequest->formation->group;
        $user = $request->user();

        if (!$user->hasRole('Admin') && $group->creator_id !== $user->id) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        if ($blockRequest->status !== 'pending') {
            return response()->json(['message' => 'Cette demande a déjà été traitée.'], 422);
        }

        if ($blockRequest->block_reason === 'deadline_exceeded') {
            $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
                'extra_days' => 'nullable|integer|min:1|max:365',
            ]);
            if ($validator->fails()) {
                return response()->json(['message' => 'Le nombre de jours doit être entre 1 et 365.'], 422);
            }
        }

        $blockRequest->update([
            'status' => 'approved',
            'processed_by' => $user->id,
            'processed_at' => now(),
        ]);

        // Débloquer l'utilisateur
        $fu = $blockRequest->formationUser;
        if ($fu) {
            if ($blockRequest->block_reason === 'deadline_exceeded') {
                $extraDays = (int) ($request->extra_days ?? 7);
                $fu->update([
                    'status' => 'in_progress',
                    'blocked_at' => null,
                    'unblocked_at' => now(),
                    'deadline_extended_days' => ($fu->deadline_extended_days ?? 0) + $extraDays,
                ]);
            } else {
                $fu->update([
                    'status' => 'in_progress',
                    'blocked_at' => null,
                    'unblocked_at' => now(),
                ]);

                $currentPub = $fu->publicationProgress()
                    ->where('publication_id', $blockRequest->publication_id)
                    ->first();
                if ($currentPub) {
                    $currentPub->update([
                        'status' => 'available',
                        'bonus_attempts' => ($currentPub->bonus_attempts ?? 0) + 1,
                    ]);
                }
            }
        }

        // Notifier l'apprenant
        $extraDaysText = '';
        if ($blockRequest->block_reason === 'deadline_exceeded') {
            $extraDaysVal = (int) ($request->extra_days ?? 7);
            $extraDaysText = " Votre délai a été prolongé de {$extraDaysVal} jour(s).";
        }
        Notification::create([
            'user_id' => $blockRequest->user_id,
            'type' => 'training_assignment',
            'title' => 'Demande de déblocage approuvée',
            'message' => "Votre demande de déblocage pour la formation « {$blockRequest->formation->title} » a été approuvée.{$extraDaysText}",
            'data' => [
                'formation_id' => $blockRequest->formation_id,
                'formation_title' => $blockRequest->formation->title,
                'group_id' => $group->id,
                'group_name' => $group->name,
            ],
        ]);

        return response()->json(['message' => 'Demande approuvée. L\'apprenant a été débloqué.']);
    }

    #[OA\Put(
        path: '/block-requests/{blockRequest}/decline',
        summary: 'Refuser une demande de déblocage',
        security: [['bearerAuth' => []]],
        tags: ['Formations'],
        parameters: [
            new OA\Parameter(name: 'blockRequest', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/BlockRequest')
        ),
        responses: [
            new OA\Response(response: 200, description: 'Demande refusée', content: new OA\JsonContent(ref: '#/components/schemas/ApiResponse')),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
        ]
    )]
    public function decline(Request $request, FormationBlockRequest $blockRequest)
    {
        $group = $blockRequest->formation->group;
        $user = $request->user();

        if (!$user->hasRole('Admin') && $group->creator_id !== $user->id) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        if ($blockRequest->status !== 'pending') {
            return response()->json(['message' => 'Cette demande a déjà été traitée.'], 422);
        }

        $validator = Validator::make($request->all(), [
            'reason' => 'nullable|string|max:1000',
        ]);

        $blockRequest->update([
            'status' => 'declined',
            'processed_by' => $user->id,
            'formateur_response' => $request->reason,
            'processed_at' => now(),
        ]);

        // Notifier l'apprenant
        $reasonText = $request->reason ? " Motif : {$request->reason}" : '';
        Notification::create([
            'user_id' => $blockRequest->user_id,
            'type' => 'training_assignment',
            'title' => 'Demande de déblocage refusée',
            'message' => "Votre demande de déblocage pour la formation « {$blockRequest->formation->title} » a été refusée.{$reasonText}",
            'data' => [
                'formation_id' => $blockRequest->formation_id,
                'formation_title' => $blockRequest->formation->title,
                'group_id' => $group->id,
                'group_name' => $group->name,
            ],
        ]);

        return response()->json(['message' => 'Demande refusée.']);
    }

    #[OA\Put(
        path: '/block-requests/{blockRequest}/pass',
        summary: 'Valider la publication pour l\'apprenant (formateur)',
        security: [['bearerAuth' => []]],
        tags: ['Formations'],
        parameters: [
            new OA\Parameter(name: 'blockRequest', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Publication validée'),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
        ]
    )]
    public function pass(Request $request, FormationBlockRequest $blockRequest)
    {
        $group = $blockRequest->formation->group;
        $user = $request->user();

        if (!$user->hasRole('Admin') && $group->creator_id !== $user->id) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        if ($blockRequest->status !== 'pending') {
            return response()->json(['message' => 'Cette demande a déjà été traitée.'], 422);
        }

        if ($blockRequest->block_reason === 'deadline_exceeded') {
            $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
                'extra_days' => 'nullable|integer|min:1|max:365',
            ]);
            if ($validator->fails()) {
                return response()->json(['message' => 'Le nombre de jours doit être entre 1 et 365.'], 422);
            }
        }

        $blockRequest->update([
            'status' => 'approved',
            'processed_by' => $user->id,
            'processed_at' => now(),
            'formateur_response' => 'Publication validée par le formateur.',
        ]);

        $fu = $blockRequest->formationUser;
        $formation = $blockRequest->formation;

        if ($fu) {
            if ($blockRequest->block_reason === 'deadline_exceeded') {
                $extraDays = (int) ($request->extra_days ?? 7);
                $fu->update([
                    'status' => 'in_progress',
                    'blocked_at' => null,
                    'unblocked_at' => now(),
                    'deadline_extended_days' => ($fu->deadline_extended_days ?? 0) + $extraDays,
                ]);
            } else {
                $fup = $fu->publicationProgress()
                    ->where('publication_id', $blockRequest->publication_id)
                    ->first();

                if ($fup) {
                    $fup->update([
                        'status' => 'completed',
                        'completed_at' => now(),
                    ]);
                }

                $currentFp = $formation->formationPublications()
                    ->where('publication_id', $blockRequest->publication_id)
                    ->first();

                if ($currentFp) {
                    $nextFp = $formation->formationPublications()
                        ->where('order', '>', $currentFp->order)
                        ->orderBy('order')
                        ->first();

                    if ($nextFp) {
                        $nextFup = $fu->publicationProgress()
                            ->where('publication_id', $nextFp->publication_id)
                            ->where('status', 'locked')
                            ->first();

                        if ($nextFup) {
                            $nextFup->update(['status' => 'available']);
                        }
                    }
                }

                $currentPubIds = $formation->formationPublications()->pluck('publication_id');
                $allCompleted = $fu->publicationProgress()
                    ->whereIn('publication_id', $currentPubIds)
                    ->where('status', '!=', 'completed')
                    ->count() === 0 && $currentPubIds->isNotEmpty();

                if ($allCompleted) {
                    $fu->update(['status' => 'completed']);
                } else {
                    $fu->update(['status' => 'in_progress', 'blocked_at' => null, 'unblocked_at' => now()]);
                }
            }
        }

        Notification::create([
            'user_id' => $blockRequest->user_id,
            'type' => 'training_assignment',
            'title' => 'Publication validée par le formateur',
            'message' => "Votre formateur a validé la publication pour la formation « {$formation->title} ». Vous pouvez continuer.",
            'data' => [
                'formation_id' => $formation->id,
                'formation_title' => $formation->title,
                'group_id' => $group->id,
                'group_name' => $group->name,
            ],
        ]);

        return response()->json(['message' => 'Publication validée. L\'apprenant peut continuer.']);
    }
}
