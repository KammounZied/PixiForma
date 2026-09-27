<?php

namespace App\Http\Controllers;

use App\Models\Formation;
use App\Models\FormationPublication;
use App\Models\FormationUser;
use App\Models\FormationUserPublication;
use App\Models\Group;
use App\Models\Notification;
use App\Models\Publication;
use App\Models\Quiz;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'Formations', description: 'Gestion des formations dans les groupes')]
class FormationController extends Controller
{
    private function canManage(Request $request, Group $group): bool
    {
        $user = $request->user();
        if ($user->hasRole('Admin')) return true;
        if ($user->hasRole('Formateur')) return $group->creator_id === $user->id;
        return false;
    }

    private function checkAccess(Request $request, Group $group): bool
    {
        $user = $request->user();
        if ($user->hasRole('Admin')) return true;
        if ($user->hasRole('Formateur')) {
            return $group->creator_id === $user->id;
        }
        return $group->members()->where('user_id', $user->id)->exists();
    }

    private function checkDeadlineBlock(FormationUser $fu, Formation $formation): void
    {
        if ($formation->progression_mode !== 'guided') return;
        if ($fu->status === 'blocked' || $fu->status === 'completed') return;

        $extendedDays = $fu->deadline_extended_days ?? 0;
        if (!$fu->started_at || !$formation->duration_days) return;

        $deadline = $fu->started_at->copy()->addDays($formation->duration_days + $extendedDays);

        if (now()->greaterThan($deadline)) {
            $fu->update(['status' => 'blocked', 'blocked_at' => now()]);

            $existingRequest = \App\Models\FormationBlockRequest::where('formation_user_id', $fu->id)
                ->where('block_reason', 'deadline_exceeded')
                ->where('status', 'pending')
                ->first();

            if (!$existingRequest) {
                \App\Models\FormationBlockRequest::create([
                    'formation_user_id' => $fu->id,
                    'user_id' => $fu->user_id,
                    'formation_id' => $formation->id,
                    'block_reason' => 'deadline_exceeded',
                    'status' => 'pending',
                ]);

                $group = $formation->group;
                $formateur = $group->creator;
                if ($formateur) {
                    Notification::create([
                        'user_id' => $formateur->id,
                        'type' => 'training_assignment',
                        'title' => 'Demande de déblocage — Délai dépassé',
                        'message' => "Le délai de la formation « {$formation->title} » a été dépassé par un apprenant. Une demande de déblocage a été créée.",
                        'data' => [
                            'formation_id' => $formation->id,
                            'formation_title' => $formation->title,
                            'group_id' => $group->id,
                            'group_name' => $group->name,
                            'user_id' => $fu->user_id,
                        ],
                    ]);
                }
            }
        }
    }

    private function enrichProgressWithLockReasons(FormationUser $fu, Formation $formation): FormationUser
    {
        if ($formation->progression_mode !== 'guided') {
            return $fu;
        }

        $this->checkDeadlineBlock($fu, $formation);

        $publications = $formation->formationPublications()
            ->with('publication:id,title')
            ->orderBy('order')
            ->get();

        $pubProgressMap = [];
        foreach ($fu->publicationProgress as $pp) {
            $pubProgressMap[$pp->publication_id] = $pp;
        }

        $enrichedPubs = [];
        foreach ($publications as $fp) {
            $pp = $pubProgressMap[$fp->publication_id] ?? null;
            $status = $pp ? $pp->status : null;

            if (!$status) {
                $prevPub = $publications->firstWhere('order', $fp->order - 1);
                if (!$prevPub) {
                    $status = 'available';
                } else {
                    $prevPp = $pubProgressMap[$prevPub->publication_id] ?? null;
                    $prevStatus = $prevPp ? $prevPp->status : 'locked';
                    $status = $prevStatus === 'completed' ? 'available' : 'locked';
                }
            }

            $isLocked = $status === 'locked';
            $lockReason = null;

            if ($isLocked) {
                $prevPub = $publications->firstWhere('order', $fp->order - 1);
                if ($prevPub) {
                    $prevTitle = $prevPub->publication->title ?? 'la publication précédente';
                    $lockReason = "Veuillez d'abord réussir le quiz de la publication « {$prevTitle} » pour déverrouiller cette publication.";
                } else {
                    $lockReason = "Cette publication est verrouillée.";
                }
            }

            $enrichedPubs[] = [
                'publication_id' => $fp->publication_id,
                'order' => $fp->order,
                'title' => $fp->publication->title ?? '',
                'status' => $status,
                'is_locked' => $isLocked,
                'lock_reason' => $lockReason,
                'quiz_attempts' => $pp?->quiz_attempts ?? 0,
                'bonus_attempts' => $pp?->bonus_attempts ?? 0,
                'quiz_highest_score' => $pp?->quiz_highest_score ?? null,
                'completed_at' => $pp?->completed_at ?? null,
            ];
        }

        $fu->setRelation('enriched_publications', collect($enrichedPubs));

        return $fu;
    }

    private function notifyGroupMembers(Group $group, int $excludeUserId, string $type, string $title, string $message, array $data = []): void
    {
        $members = $group->members()->where('user_id', '!=', $excludeUserId)->get();
        foreach ($members as $member) {
            Notification::create([
                'user_id' => $member->id,
                'type' => $type,
                'title' => $title,
                'message' => $message,
                'data' => $data,
            ]);
        }
        if ($group->creator_id !== $excludeUserId) {
            $alreadyNotified = $members->pluck('id')->contains($group->creator_id);
            if (!$alreadyNotified) {
                Notification::create([
                    'user_id' => $group->creator_id,
                    'type' => $type,
                    'title' => $title,
                    'message' => $message,
                    'data' => $data,
                ]);
            }
        }
    }

    // ─── LIST ───────────────────────────────────────────────

    #[OA\Get(
        path: '/groups/{group}/formations',
        summary: 'Liste des formations d\'un groupe',
        security: [['bearerAuth' => []]],
        tags: ['Formations'],
        parameters: [
            new OA\Parameter(name: 'group', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Liste des formations', content: new OA\JsonContent(type: 'array', items: new OA\Items(ref: '#/components/schemas/Formation'))),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
        ]
    )]
    public function index(Request $request, Group $group)
    {
        if (!$this->checkAccess($request, $group)) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        $user = $request->user();
        $query = $group->formations()->with('creator', 'publications');

        // Collaborateurs ne voient que les formations assignées ET visibles
        if (!$user->hasRole('Admin') && !$user->hasRole('Formateur')) {
            $assignedFormationIds = \App\Models\FormationUser::where('user_id', $user->id)->pluck('formation_id')->toArray();
            $query->whereIn('formations.id', $assignedFormationIds)->where('is_visible', true);
        }

        $formations = $query->orderBy('created_at', 'desc')->get();

        // Enrichir avec le statut et la disponibilité des quiz (guidé uniquement)
        $formations->each(function ($formation) use ($user) {
            if ($formation->progression_mode === 'guided') {
                $publicationIds = $formation->formationPublications()->pluck('publication_id');
                $publishedQuizPubIds = \App\Models\Quiz::whereIn('publication_id', $publicationIds)
                    ->where('status', 'published')
                    ->pluck('publication_id')
                    ->unique();
                $missingQuizzes = $publicationIds->diff($publishedQuizPubIds);
                $formation->setAttribute('all_quizzes_ready', $publicationIds->isNotEmpty() && $missingQuizzes->isEmpty());
            }

            if (!$user->hasRole('Admin') && !$user->hasRole('Formateur')) {
                $fu = $formation->learnerProgress()->where('user_id', $user->id)->first();
                $formation->setAttribute('my_status', $fu ? $fu->status : null);
            }
        });

        return response()->json($formations);
    }

    // ─── SHOW ───────────────────────────────────────────────

    #[OA\Get(
        path: '/formations/{formation}',
        summary: 'Détails d\'une formation',
        security: [['bearerAuth' => []]],
        tags: ['Formations'],
        parameters: [
            new OA\Parameter(name: 'formation', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Détails de la formation', content: new OA\JsonContent(ref: '#/components/schemas/Formation')),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
            new OA\Response(response: 404, description: 'Formation non trouvée'),
        ]
    )]
    public function show(Request $request, Formation $formation)
    {
        $group = $formation->group;
        if (!$this->checkAccess($request, $group)) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        $user = $request->user();
        if (!$user->hasRole('Admin') && !$user->hasRole('Formateur')) {
            if (!$formation->is_visible) {
                return response()->json(['message' => 'Formation non trouvée.'], 404);
            }
            $isAssigned = $formation->learnerProgress()->where('user_id', $user->id)->exists();
            if (!$isAssigned) {
                return response()->json(['message' => 'Formation non trouvée.'], 404);
            }
        }

        $formation->load('creator', 'publications', 'formationPublications.publication.creator', 'formationPublications.publication.files');

        // Ajouter my_status pour les collaborateurs
        if (!$user->hasRole('Admin') && !$user->hasRole('Formateur')) {
            $fu = $formation->learnerProgress()->where('user_id', $user->id)->first();
            if ($fu) {
                $this->checkDeadlineBlock($fu, $formation);
                $fu->refresh();
            }
            $formation->setAttribute('my_status', $fu ? $fu->status : 'not_assigned');
            $formation->setAttribute('started_at', $fu?->started_at);
            $formation->setAttribute('deadline_extended_days', $fu?->deadline_extended_days ?? 0);

            $deadline = null;
            if ($fu && $fu->started_at && $formation->duration_days) {
                $extendedDays = $fu->deadline_extended_days ?? 0;
                $deadline = $fu->started_at->copy()->addDays($formation->duration_days + $extendedDays)->toDateString();
            }
            $formation->setAttribute('deadline', $deadline);
        }

        return response()->json($formation);
    }

    // ─── STORE ──────────────────────────────────────────────

    #[OA\Post(
        path: '/groups/{group}/formations',
        summary: 'Créer une formation',
        security: [['bearerAuth' => []]],
        tags: ['Formations'],
        parameters: [
            new OA\Parameter(name: 'group', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/FormationCreateRequest')
        ),
        responses: [
            new OA\Response(response: 201, description: 'Formation créée avec succès', content: new OA\JsonContent(ref: '#/components/schemas/ApiResponse')),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
            new OA\Response(response: 422, description: 'Données invalides'),
        ]
    )]
    public function store(Request $request, Group $group)
    {
        $user = $request->user();

        if (!$this->canManage($request, $group)) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255|unique:formations,title,NULL,id,group_id,' . $group->id . ',deleted_at,NULL',
            'description' => 'required|string|max:5000',
            'pedagogical_objective' => 'nullable|string|max:5000',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'duration_days' => 'nullable|integer|min:0',
            'progression_mode' => 'required|in:guided,free',
            'publication_ids' => 'nullable|array',
            'publication_ids.*' => 'integer|exists:publications,id',
            'max_attempts' => 'nullable|integer|min:1|max:100',
            'min_pass_percentage' => 'nullable|numeric|min:0|max:100',
            'quiz_question_count' => 'nullable|integer|in:5,10,15',
            'quiz_difficulty' => 'nullable|string|in:easy,medium,hard',
            'quiz_time_per_question' => 'nullable|integer|in:10,12,15',
        ], [
            'title.required' => 'Le titre est obligatoire.',
            'title.unique' => 'Une formation avec ce titre existe déjà dans ce groupe.',
            'description.required' => 'La description est obligatoire.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        // Vérifier que les publications appartiennent bien à ce groupe
        if ($request->has('publication_ids')) {
            $validCount = Publication::whereIn('id', $request->publication_ids)
                ->where('group_id', $group->id)
                ->count();
            if ($validCount !== count($request->publication_ids)) {
                return response()->json(['message' => 'Certaines publications n\'appartiennent pas à ce groupe.'], 422);
            }
        }

        // Calculer end_date à partir de duration_days si fourni
        $durationDays = $request->filled('duration_days') ? (int) $request->duration_days : null;
        if ($request->filled('start_date') && $durationDays) {
            $request->merge(['end_date' => \Carbon\Carbon::parse($request->start_date)->addDays($durationDays)->format('Y-m-d')]);
        }

        // Vérifier que la somme des durées recommandées ne dépasse pas la durée totale
        $totalDays = $durationDays;
        if (!$totalDays && $request->filled('start_date') && $request->filled('end_date')) {
            $totalDays = \Carbon\Carbon::parse($request->start_date)->diffInDays(\Carbon\Carbon::parse($request->end_date)) + 1;
        }
        if ($totalDays && $request->has('recommended_durations')) {
            $sumDays = array_sum(array_map(function ($v) { return max(0, (int) $v); }, $request->recommended_durations));
            if ($sumDays > $totalDays) {
                return response()->json([
                    'message' => "La somme des durées recommandées ({$sumDays} jours) dépasse la durée totale de la formation ({$totalDays} jours)."
                ], 422);
            }
        }

        $data = $request->only([
            'title', 'description', 'pedagogical_objective',
            'start_date', 'end_date', 'duration_days', 'progression_mode',
            'max_attempts', 'min_pass_percentage', 'quiz_question_count', 'quiz_difficulty', 'quiz_time_per_question',
        ]);
        $data['group_id'] = $group->id;
        $data['creator_id'] = $user->id;
        
        if ($data['progression_mode'] === 'free') {
            $data['is_visible'] = false;
        }

        $formation = Formation::create($data);

        // Associer les publications
        if ($request->has('publication_ids')) {
            $order = 1;
            $durations = $request->input('recommended_durations', []);
            foreach ($request->publication_ids as $pubId) {
                FormationPublication::create([
                    'formation_id' => $formation->id,
                    'publication_id' => $pubId,
                    'order' => $order++,
                    'recommended_duration_minutes' => isset($durations[$pubId]) && (int) $durations[$pubId] > 0 ? (int) $durations[$pubId] : null,
                ]);
            }
        }

        $formation->load('creator', 'publications', 'formationPublications.publication.creator', 'formationPublications.publication.files');

        return response()->json([
            'message' => 'Formation créée avec succès.',
            'data' => $formation,
        ], 201);
    }

    // ─── UPDATE ─────────────────────────────────────────────

    #[OA\Put(
        path: '/formations/{formation}',
        summary: 'Modifier une formation',
        security: [['bearerAuth' => []]],
        tags: ['Formations'],
        parameters: [
            new OA\Parameter(name: 'formation', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/FormationUpdateRequest')
        ),
        responses: [
            new OA\Response(response: 200, description: 'Formation modifiée avec succès', content: new OA\JsonContent(ref: '#/components/schemas/ApiResponse')),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
            new OA\Response(response: 404, description: 'Formation non trouvée'),
            new OA\Response(response: 422, description: 'Données invalides'),
        ]
    )]
    public function update(Request $request, Formation $formation)
    {
        $group = $formation->group;
        $user = $request->user();

        if (!$this->canManage($request, $group)) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|required|string|max:255|unique:formations,title,' . $formation->id . ',id,group_id,' . $group->id . ',deleted_at,NULL',
            'description' => 'sometimes|required|string|max:5000',
            'pedagogical_objective' => 'nullable|string|max:5000',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'duration_days' => 'nullable|integer|min:0',
            'progression_mode' => 'sometimes|required|in:guided,free',
            'is_visible' => 'sometimes|boolean',
            'publication_ids' => 'nullable|array',
            'publication_ids.*' => 'integer|exists:publications,id',
            'max_attempts' => 'nullable|integer|min:1|max:100',
            'min_pass_percentage' => 'nullable|numeric|min:0|max:100',
            'quiz_question_count' => 'nullable|integer|in:5,10,15',
            'quiz_difficulty' => 'nullable|string|in:easy,medium,hard',
            'quiz_time_per_question' => 'nullable|integer|in:10,12,15',
        ], [
            'title.unique' => 'assu',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        // Calculer end_date à partir de duration_days si fourni
        if ($request->filled('duration_days')) {
            $startDate = $request->input('start_date', $formation->start_date?->format('Y-m-d'));
            if ($startDate) {
                $request->merge(['end_date' => \Carbon\Carbon::parse($startDate)->addDays((int) $request->duration_days)->format('Y-m-d')]);
            }
        }

        // Vérifier que la somme des durées recommandées ne dépasse pas la durée totale
        $durationDays = $request->filled('duration_days') ? (int) $request->duration_days : $formation->duration_days;
        $startDate = $request->input('start_date', $formation->start_date?->format('Y-m-d'));
        $endDate = $request->input('end_date', $formation->end_date?->format('Y-m-d'));
        $totalDays = $durationDays;
        if (!$totalDays && $startDate && $endDate) {
            $totalDays = \Carbon\Carbon::parse($startDate)->diffInDays(\Carbon\Carbon::parse($endDate)) + 1;
        }
        if ($totalDays && $request->has('recommended_durations')) {
            $sumDays = array_sum(array_map(function ($v) { return max(0, (int) $v); }, $request->recommended_durations));
            if ($sumDays > $totalDays) {
                return response()->json([
                    'message' => "La somme des durées recommandées ({$sumDays} jours) dépasse la durée totale de la formation ({$totalDays} jours)."
                ], 422);
            }
        }

        $wasHidden = !$formation->is_visible;

        $formation->update($request->only([
            'title', 'description', 'pedagogical_objective',
            'start_date', 'end_date', 'duration_days', 'progression_mode', 'is_visible',
            'max_attempts', 'min_pass_percentage', 'quiz_question_count', 'quiz_difficulty', 'quiz_time_per_question',
        ]));

        // Synchroniser les publications
        if ($request->has('publication_ids')) {
            $formation->formationPublications()->delete();
            $order = 1;
            $durations = $request->input('recommended_durations', []);
            foreach ($request->publication_ids as $pubId) {
                FormationPublication::create([
                    'formation_id' => $formation->id,
                    'publication_id' => $pubId,
                    'order' => $order++,
                    'recommended_duration_minutes' => isset($durations[$pubId]) && (int) $durations[$pubId] > 0 ? (int) $durations[$pubId] : null,
                ]);
            }
        }

        // Notification si la formation devient visible ou si elle est modifiée et visible
        if ($formation->is_visible) {
            $isNewVisible = $wasHidden;
            
            $learners = $formation->learnerProgress()->get();
            foreach ($learners as $fu) {
                Notification::create([
                    'user_id' => $fu->user_id,
                    'type' => $isNewVisible ? 'training_assignment' : 'training_updated',
                    'title' => $isNewVisible ? "Formation disponible : {$formation->title}" : "Formation modifiée : {$formation->title}",
                    'message' => $isNewVisible 
                        ? "La formation « {$formation->title} » est maintenant disponible dans le groupe « {$group->name} »."
                        : "La formation « {$formation->title} » a été modifiée dans le groupe « {$group->name} ».",
                    'data' => [
                        'formation_id' => $formation->id,
                        'formation_title' => $formation->title,
                        'group_id' => $group->id,
                        'group_name' => $group->name,
                    ],
                ]);
            }
        }

        $formation->load('creator', 'publications', 'formationPublications.publication.creator', 'formationPublications.publication.files');

        return response()->json([
            'message' => 'Formation modifiée avec succès.',
            'data' => $formation,
        ]);
    }

    // ─── DESTROY ────────────────────────────────────────────

    #[OA\Delete(
        path: '/formations/{formation}',
        summary: 'Supprimer une formation',
        security: [['bearerAuth' => []]],
        tags: ['Formations'],
        parameters: [
            new OA\Parameter(name: 'formation', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Formation supprimée avec succès', content: new OA\JsonContent(ref: '#/components/schemas/ApiResponse')),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
            new OA\Response(response: 404, description: 'Formation non trouvée'),
        ]
    )]
    public function destroy(Request $request, Formation $formation)
    {
        $group = $formation->group;

        if (!$this->canManage($request, $group)) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        // Notifier les apprenants si la formation est visible
        if ($formation->is_visible) {
            $learners = FormationUser::where('formation_id', $formation->id)->get();
            foreach ($learners as $fu) {
                Notification::create([
                    'user_id' => $fu->user_id,
                    'type' => 'training_deleted',
                    'title' => "Formation supprimée : {$formation->title}",
                    'message' => "La formation « {$formation->title} » a été supprimée du groupe « {$group->name} ».",
                    'data' => [
                        'formation_id' => $formation->id,
                        'formation_title' => $formation->title,
                        'group_id' => $group->id,
                        'group_name' => $group->name,
                    ],
                ]);
            }
        }

        $formation->delete();

        return response()->json([
            'message' => 'Formation supprimée avec succès.',
        ]);
    }

    // ─── ASSIGN PUBLICATIONS ────────────────────────────────

    #[OA\Post(
        path: '/formations/{formation}/publications',
        summary: 'Associer des publications à une formation',
        security: [['bearerAuth' => []]],
        tags: ['Formations'],
        parameters: [
            new OA\Parameter(name: 'formation', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/PublicationIdsRequest')
        ),
        responses: [
            new OA\Response(response: 200, description: 'Publications associées avec succès', content: new OA\JsonContent(ref: '#/components/schemas/ApiResponse')),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
        ]
    )]
    public function assignPublications(Request $request, Formation $formation)
    {
        $group = $formation->group;

        if (!$this->canManage($request, $group)) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'publication_ids' => 'present|array',
            'publication_ids.*' => 'integer|exists:publications,id',
            'durations' => 'nullable|array',
            'durations.*' => 'nullable|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first()], 422);
        }

        // Vérifier que les publications appartiennent au groupe
        $validCount = Publication::whereIn('id', $request->publication_ids)
            ->where('group_id', $group->id)
            ->count();
        if ($validCount !== count($request->publication_ids)) {
            return response()->json(['message' => 'Certaines publications n\'appartiennent pas à ce groupe.'], 422);
        }

        // Supprimer les anciennes associations
        $formation->formationPublications()->delete();

        // Créer les nouvelles associations
        $order = 1;
        $durations = $request->durations ?? [];
        foreach ($request->publication_ids as $pubId) {
            FormationPublication::create([
                'formation_id' => $formation->id,
                'publication_id' => $pubId,
                'order' => $order++,
                'recommended_duration_minutes' => $durations[$pubId] ?? null,
            ]);
        }

        $formation->load('creator', 'publications', 'formationPublications.publication.creator', 'formationPublications.publication.files');

        // Notifier les apprenants si la formation est visible
        if ($formation->is_visible) {
            $learners = $formation->learnerProgress()->get();
            foreach ($learners as $fu) {
                Notification::create([
                    'user_id' => $fu->user_id,
                    'type' => 'training_updated',
                    'title' => "Contenu mis à jour : {$formation->title}",
                    'message' => "Les publications de la formation « {$formation->title} » ont été modifiées.",
                    'data' => [
                        'formation_id' => $formation->id,
                        'formation_title' => $formation->title,
                        'group_id' => $group->id,
                        'group_name' => $group->name,
                    ],
                ]);
            }
        }

        return response()->json([
            'message' => 'Publications associées avec succès.',
            'data' => $formation,
        ]);
    }

    // ─── REMOVE PUBLICATION ────────────────────────────────

    #[OA\Delete(
        path: '/formations/{formation}/publications/{publication}',
        summary: 'Retirer une publication d\'une formation',
        description: 'Retire volontairement une publication d\'une formation. Les progressions des collaborateurs liées à cette publication dans cette formation sont supprimées, les publications restantes sont réordonnées et, en mode guidé, l\'ordre de déverrouillage est recalculé. La publication n\'est pas supprimée.',
        security: [['bearerAuth' => []]],
        tags: ['Formations'],
        parameters: [
            new OA\Parameter(name: 'formation', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'publication', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Publication retirée de la formation avec succès', content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'message', type: 'string'),
                    new OA\Property(property: 'impacted_learners_count', type: 'integer', description: 'Nombre de collaborateurs dont la progression est impactée'),
                ]
            )),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
            new OA\Response(response: 404, description: 'Publication non associée à la formation'),
        ]
    )]
    public function removePublication(Request $request, Formation $formation, Publication $publication)
    {
        $group = $formation->group;

        if (!$this->canManage($request, $group)) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        $fp = $formation->formationPublications()
            ->where('publication_id', $publication->id)
            ->first();

        if (!$fp) {
            return response()->json(['message' => 'Cette publication n\'est pas associée à cette formation.'], 404);
        }

        $publicationTitle = $publication->title;
        $learners = $formation->learnerProgress()->get();
        $impactedLearners = $learners->count();

        DB::transaction(function () use ($formation, $publication, $fp, $learners) {
            $learnerIds = $learners->pluck('id');

            // Supprimer les progressions liées à cette publication pour tous les apprenants
            FormationUserPublication::whereIn('formation_user_id', $learnerIds)
                ->where('publication_id', $publication->id)
                ->delete();

            // Retirer la publication de la formation
            $fp->delete();

            // Renuméroter les publications restantes
            $remaining = $formation->formationPublications()->orderBy('order')->get();
            $order = 1;
            foreach ($remaining as $item) {
                if ($item->order !== $order) {
                    $item->update(['order' => $order]);
                }
                $order++;
            }

            // Supprimer les quiz liés (formation + publication)
            Quiz::where('formation_id', $formation->id)
                ->where('publication_id', $publication->id)
                ->delete();

            // Recalculer l'ordre de déverrouillage et la complétion en mode guidé
            if ($formation->progression_mode === 'guided') {
                $remainingIds = $remaining->pluck('publication_id');

                foreach ($learners as $fu) {
                    $progress = FormationUserPublication::where('formation_user_id', $fu->id)
                        ->whereIn('publication_id', $remainingIds)
                        ->get()
                        ->keyBy('publication_id');

                    $firstUncompletedSet = false;
                    foreach ($remaining as $item) {
                        $fup = $progress[$item->publication_id] ?? null;
                        if (!$fup || $fup->status === 'completed') continue;

                        $newStatus = $firstUncompletedSet ? 'locked' : 'available';
                        if ($fup->status !== $newStatus) {
                            $fup->update(['status' => $newStatus]);
                        }
                        $firstUncompletedSet = true;
                    }

                    if ($remainingIds->isNotEmpty()) {
                        $nonCompleted = FormationUserPublication::where('formation_user_id', $fu->id)
                            ->whereIn('publication_id', $remainingIds)
                            ->where('status', '!=', 'completed')
                            ->count();

                        if ($nonCompleted === 0) {
                            $fu->update(['status' => 'completed']);
                        }
                    }
                }
            }
        });

        // Notifier les apprenants si la formation est visible
        if ($formation->is_visible) {
            foreach ($learners as $fu) {
                Notification::create([
                    'user_id' => $fu->user_id,
                    'type' => 'training_updated',
                    'title' => "Contenu mis à jour : {$formation->title}",
                    'message' => "La publication « {$publicationTitle} » a été retirée de la formation « {$formation->title} ».",
                    'data' => [
                        'formation_id' => $formation->id,
                        'formation_title' => $formation->title,
                        'group_id' => $group->id,
                        'group_name' => $group->name,
                        'publication_id' => $publication->id,
                        'publication_title' => $publicationTitle,
                    ],
                ]);
            }
        }

        return response()->json([
            'message' => 'Publication retirée de la formation avec succès.',
            'impacted_learners_count' => $impactedLearners,
        ]);
    }

    // ─── REORDER PUBLICATIONS ───────────────────────────────

    #[OA\Put(
        path: '/formations/{formation}/publications/reorder',
        summary: 'Réorganiser l\'ordre des publications',
        security: [['bearerAuth' => []]],
        tags: ['Formations'],
        parameters: [
            new OA\Parameter(name: 'formation', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/PublicationIdsRequest')
        ),
        responses: [
            new OA\Response(response: 200, description: 'Ordre mis à jour', content: new OA\JsonContent(ref: '#/components/schemas/ApiResponse')),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
        ]
    )]
    public function reorderPublications(Request $request, Formation $formation)
    {
        $group = $formation->group;

        if (!$this->canManage($request, $group)) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'publication_ids' => 'present|array',
            'publication_ids.*' => 'integer|exists:formation_publication,publication_id',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first()], 422);
        }

        $order = 1;
        foreach ($request->publication_ids as $pubId) {
            FormationPublication::where('formation_id', $formation->id)
                ->where('publication_id', $pubId)
                ->update(['order' => $order++]);
        }

        $formation->load('formationPublications.publication.creator', 'formationPublications.publication.files');

        // Notifier les apprenants si la formation est visible
        if ($formation->is_visible) {
            $learners = $formation->learnerProgress()->get();
            foreach ($learners as $fu) {
                Notification::create([
                    'user_id' => $fu->user_id,
                    'type' => 'training_updated',
                    'title' => "Contenu réorganisé : {$formation->title}",
                    'message' => "L'ordre des publications de la formation « {$formation->title} » a été modifié.",
                    'data' => [
                        'formation_id' => $formation->id,
                        'formation_title' => $formation->title,
                        'group_id' => $group->id,
                        'group_name' => $group->name,
                    ],
                ]);
            }
        }

        return response()->json([
            'message' => 'Ordre des publications mis à jour.',
            'data' => $formation,
        ]);
    }

    // ─── ASSIGN LEARNERS ────────────────────────────────────

    #[OA\Post(
        path: '/formations/{formation}/assign',
        summary: 'Assigner des apprenants à une formation',
        security: [['bearerAuth' => []]],
        tags: ['Formations'],
        parameters: [
            new OA\Parameter(name: 'formation', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/AssignLearnersRequest')
        ),
        responses: [
            new OA\Response(response: 200, description: 'Apprenants assignés avec succès', content: new OA\JsonContent(ref: '#/components/schemas/ApiResponse')),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
        ]
    )]
    public function assignLearners(Request $request, Formation $formation)
    {
        $group = $formation->group;

        if (!$this->canManage($request, $group)) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'user_ids' => 'present|array',
            'user_ids.*' => 'integer|exists:users,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first()], 422);
        }

        $newUserIds = $request->user_ids;
        $existingUserIds = $formation->learnerProgress()->pluck('user_id')->toArray();

        // Utilisateurs à retirer (présents avant mais plus dans la nouvelle liste)
        $toRemove = array_diff($existingUserIds, $newUserIds);
        if (!empty($toRemove)) {
            FormationUser::where('formation_id', $formation->id)
                ->whereIn('user_id', $toRemove)
                ->delete();
        }

        // Utilisateurs à ajouter (dans la nouvelle liste mais pas avant)
        $toAdd = array_diff($newUserIds, $existingUserIds);

        $publications = $formation->formationPublications()->orderBy('order')->get();

        foreach ($toAdd as $userId) {
            $fu = FormationUser::create([
                'formation_id' => $formation->id,
                'user_id' => $userId,
                'status' => 'not_started',
            ]);

            // Initialiser la progression pour chaque publication
            foreach ($publications as $index => $fp) {
                $isFirst = $index === 0;
                FormationUserPublication::create([
                    'formation_user_id' => $fu->id,
                    'publication_id' => $fp->publication_id,
                    'status' => $formation->progression_mode === 'free' ? 'available' : ($isFirst ? 'available' : 'locked'),
                ]);
            }

            // Notifier UNIQUEMENT les nouveaux apprenants si la formation est visible
            if ($formation->is_visible) {
                Notification::create([
                    'user_id' => $userId,
                    'type' => 'training_assignment',
                    'title' => "Formation assignée : {$formation->title}",
                    'message' => "Vous avez été assigné à la formation « {$formation->title} » dans le groupe « {$group->name} ».",
                    'data' => [
                        'formation_id' => $formation->id,
                        'formation_title' => $formation->title,
                        'group_id' => $group->id,
                        'group_name' => $group->name,
                    ],
                ]);
            }
        }

        // Si la formation est visible, notifier les retirés
        if ($formation->is_visible && !empty($toRemove)) {
            foreach ($toRemove as $userId) {
                Notification::create([
                    'user_id' => $userId,
                    'type' => 'training_removed',
                    'title' => "Formation retirée : {$formation->title}",
                    'message' => "Vous avez été retiré de la formation « {$formation->title} » dans le groupe « {$group->name} ».",
                    'data' => [
                        'formation_id' => $formation->id,
                        'formation_title' => $formation->title,
                        'group_id' => $group->id,
                        'group_name' => $group->name,
                    ],
                ]);
            }
        }

        return response()->json(['message' => 'Apprenants assignés avec succès.']);
    }

    // ─── LEARNER PROGRESS ───────────────────────────────────

    #[OA\Get(
        path: '/formations/{formation}/learners',
        summary: 'Progression des apprenants d\'une formation',
        security: [['bearerAuth' => []]],
        tags: ['Formations'],
        parameters: [
            new OA\Parameter(name: 'formation', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Liste des apprenants avec leur progression'),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
        ]
    )]
    public function learnerProgress(Request $request, Formation $formation)
    {
        $group = $formation->group;

        if (!$this->canManage($request, $group)) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        $learners = $formation->learnerProgress()
            ->with('user:id,name,email', 'publicationProgress.publication:id,title')
            ->get();

        $enriched = $learners->map(fn($fu) => $this->enrichProgressWithLockReasons($fu, $formation));

        return response()->json($enriched);
    }

    // ─── MY PROGRESS ────────────────────────────────────────

    #[OA\Get(
        path: '/formations/{formation}/my-progress',
        summary: 'Ma progression dans une formation',
        security: [['bearerAuth' => []]],
        tags: ['Formations'],
        parameters: [
            new OA\Parameter(name: 'formation', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Progression de l\'utilisateur connecté'),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 404, description: 'Non assigné à cette formation'),
        ]
    )]
    public function myProgress(Request $request, Formation $formation)
    {
        $user = $request->user();

        $fu = $formation->learnerProgress()
            ->where('user_id', $user->id)
            ->with('publicationProgress.publication:id,title')
            ->first();

        if (!$fu) {
            return response()->json(['message' => 'Vous n\'êtes pas assigné à cette formation.'], 404);
        }

        $enriched = $this->enrichProgressWithLockReasons($fu, $formation);

        return response()->json($enriched);
    }

    // ─── START MY PROGRESS ──────────────────────────────────

    #[OA\Post(
        path: '/formations/{formation}/my-progress',
        summary: 'Démarrer une formation pour l\'utilisateur connecté',
        security: [['bearerAuth' => []]],
        tags: ['Formations'],
        parameters: [
            new OA\Parameter(name: 'formation', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Formation démarrée', content: new OA\JsonContent(ref: '#/components/schemas/ApiResponse')),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 404, description: 'Non assigné à cette formation'),
        ]
    )]
    public function startMyProgress(Request $request, Formation $formation)
    {
        $user = $request->user();

        $fu = $formation->learnerProgress()
            ->where('user_id', $user->id)
            ->first();

        if (!$fu) {
            return response()->json(['message' => 'Vous n\'êtes pas assigné à cette formation.'], 404);
        }

        if ($fu->status !== 'not_started') {
            return response()->json(['message' => 'Cette formation a déjà été commencée.'], 422);
        }

        $fu->update([
            'status' => 'in_progress',
            'started_at' => now(),
        ]);

        $existingPubs = FormationUserPublication::where('formation_user_id', $fu->id)
            ->pluck('publication_id')
            ->toArray();

        $publications = $formation->formationPublications()->orderBy('order')->get();

        foreach ($publications as $index => $fp) {
            if (!in_array($fp->publication_id, $existingPubs)) {
                FormationUserPublication::create([
                    'formation_user_id' => $fu->id,
                    'publication_id' => $fp->publication_id,
                    'status' => $formation->progression_mode === 'free' ? 'available' : ($index === 0 ? 'available' : 'locked'),
                ]);
            }
        }

        return response()->json([
            'message' => 'Formation commencée avec succès.',
        ]);
    }

    // ─── UNBLOCK LEARNER ────────────────────────────────────

    #[OA\Post(
        path: '/formations/{formation}/unblock/{user}',
        summary: 'Débloquer un apprenant dans une formation',
        security: [['bearerAuth' => []]],
        tags: ['Formations'],
        parameters: [
            new OA\Parameter(name: 'formation', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'user', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Apprenant débloqué', content: new OA\JsonContent(ref: '#/components/schemas/ApiResponse')),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
            new OA\Response(response: 404, description: 'Utilisateur non assigné'),
        ]
    )]
    public function unblockLearner(Request $request, Formation $formation, \App\Models\User $user)
    {
        $group = $formation->group;

        if (!$this->canManage($request, $group)) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        $fu = $formation->learnerProgress()->where('user_id', $user->id)->first();

        if (!$fu) {
            return response()->json(['message' => 'Cet utilisateur n\'est pas assigné à cette formation.'], 404);
        }

        if ($fu->status !== 'blocked') {
            return response()->json(['message' => 'Cet utilisateur n\'est pas bloqué.'], 422);
        }

        $fu->update([
            'status' => 'in_progress',
            'blocked_at' => null,
            'unblocked_at' => now(),
        ]);

        // Débloquer la publication suivante
        $nextPub = $fu->publicationProgress()->where('status', 'locked')->orderBy('id')->first();
        if ($nextPub) {
            $nextPub->update(['status' => 'available']);
        }

        // Réinitialiser les tentatives de la publication bloquée
        $currentPub = $fu->publicationProgress()->where('status', 'available')->orderBy('id')->first();
        if ($fu->formation->progression_mode === 'guided' && $currentPub) {
            $currentPub->update(['quiz_attempts' => 0]);
        }

        // Notifier l'apprenant
        Notification::create([
            'user_id' => $user->id,
            'type' => 'training_assignment',
            'title' => "Progression débloquée",
            'message' => "Votre progression dans la formation « {$formation->title} » a été débloquée par le formateur.",
            'data' => [
                'formation_id' => $formation->id,
                'formation_title' => $formation->title,
                'group_id' => $group->id,
                'group_name' => $group->name,
            ],
        ]);

        return response()->json(['message' => 'Apprenant débloqué avec succès.']);
    }

    // ─── TOGGLE VISIBILITY ──────────────────────────────────

    #[OA\Put(
        path: '/formations/{formation}/visibility',
        summary: 'Modifier la visibilité d\'une formation',
        security: [['bearerAuth' => []]],
        tags: ['Formations'],
        parameters: [
            new OA\Parameter(name: 'formation', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/FormationVisibilityRequest')
        ),
        responses: [
            new OA\Response(response: 200, description: 'Visibilité mise à jour', content: new OA\JsonContent(ref: '#/components/schemas/ApiResponse')),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
        ]
    )]
    public function toggleVisibility(Request $request, Formation $formation)
    {
        $group = $formation->group;

        if (!$this->canManage($request, $group)) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'is_visible' => 'required|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first()], 422);
        }

        // Vérifier que la formation a au moins une publication si on la rend visible
        if ($request->is_visible && $formation->formationPublications()->count() === 0) {
            return response()->json(['message' => 'Une formation doit contenir au moins une publication pour être publiée.'], 422);
        }

        // Vérifier que toutes les publications d'une formation guidée ont un quiz publié
        if ($request->is_visible && $formation->progression_mode === 'guided') {
            $publicationIds = $formation->formationPublications()->pluck('publication_id');
            $publishedQuizPubIds = \App\Models\Quiz::whereIn('publication_id', $publicationIds)
                ->where('status', 'published')
                ->pluck('publication_id')
                ->unique();

            $missingQuizzes = $publicationIds->diff($publishedQuizPubIds);
            if ($missingQuizzes->isNotEmpty()) {
                $missingCount = $missingQuizzes->count();
                $totalPubs = $publicationIds->count();
                return response()->json([
                    'message' => "En mode guidé, toutes les publications doivent avoir un quiz publié. {$missingCount} publication(s) sur {$totalPubs} n'ont pas encore de quiz.",
                    'missing_count' => $missingCount,
                    'total_publications' => $totalPubs,
                ], 422);
            }
        }

        $wasHidden = !$formation->is_visible;
        $formation->update(['is_visible' => $request->is_visible]);

        // Notifier tous les apprenants assignés si la formation devient visible
        if ($wasHidden && $formation->is_visible) {
            $learners = $formation->learnerProgress()->get();
            foreach ($learners as $fu) {
                Notification::create([
                    'user_id' => $fu->user_id,
                    'type' => 'training_assignment',
                    'title' => "Formation disponible : {$formation->title}",
                    'message' => "La formation « {$formation->title} » est maintenant disponible.",
                    'data' => [
                        'formation_id' => $formation->id,
                        'formation_title' => $formation->title,
                        'group_id' => $group->id,
                        'group_name' => $group->name,
                    ],
                ]);
            }
        }

        return response()->json([
            'message' => $formation->is_visible ? 'Formation publiée.' : 'Formation masquée.',
            'data' => $formation,
        ]);
    }
}
