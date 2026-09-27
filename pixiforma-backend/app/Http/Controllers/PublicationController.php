<?php

namespace App\Http\Controllers;

use App\Jobs\ConvertPdfToMarkdownJob;
use App\Models\Group;
use App\Models\Notification;
use App\Models\Publication;
use App\Models\PublicationFile;
use App\Services\AI\OpenRouterService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'Publications', description: 'Gestion des publications dans les groupes')]
#[OA\Tag(name: 'Résumé', description: 'Gestion des résumés de publications : génération IA, statut de génération, consultation et téléchargement PDF')]
class PublicationController extends Controller
{
    private function checkAccess(Request $request, Group $group): bool
    {
        $user = $request->user();
        if ($user->hasRole('Admin')) return true;
        if ($user->hasRole('Formateur')) {
            return $group->creator_id === $user->id;
        }
        return $group->members()->where('user_id', $user->id)->exists();
    }

    private function canManage(Request $request, Group $group): bool
    {
        $user = $request->user();
        if ($user->hasRole('Admin')) return true;
        if ($user->hasRole('Formateur')) return $group->creator_id === $user->id;
        return false;
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

    #[OA\Get(
        path: '/groups/{group}/publications',
        summary: 'Liste des publications d\'un groupe',
        security: [['bearerAuth' => []]],
        tags: ['Publications'],
        parameters: [
            new OA\Parameter(name: 'group', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Liste des publications', content: new OA\JsonContent(type: 'array', items: new OA\Items(ref: '#/components/schemas/Publication'))),
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
        $isFormateur = $user->hasRole('Admin') || $user->hasRole('Formateur');
        $query = $group->publications()->with('creator', 'files', 'formations')->withCount('comments');

        // Collaborateurs ne voient que les publications visibles
        if (!$isFormateur) {
            $query->where('is_visible', true);

            // Exclure les publications rattachées à une formation en mode guidé
            $query->whereDoesntHave('formations', function ($q) {
                $q->where('progression_mode', 'guided');
            });
        }

        $publications = $query->orderBy('created_at', 'desc')->get();

        // Ajouter un flag in_formation pour chaque publication
        $publications->each(function ($pub) {
            $pub->in_formation = $pub->formations->isNotEmpty();
            unset($pub->formations);
        });

        return response()->json($publications);
    }

    #[OA\Post(
        path: '/groups/{group}/publications',
        summary: 'Créer une publication',
        security: [['bearerAuth' => []]],
        tags: ['Publications'],
        parameters: [
            new OA\Parameter(name: 'group', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\MediaType(
                mediaType: 'multipart/form-data',
                schema: new OA\Schema(
                    required: ['title', 'description', 'content'],
                    properties: [
                        new OA\Property(property: 'title', type: 'string', description: 'Titre de la publication'),
                        new OA\Property(property: 'description', type: 'string', description: 'Description de la publication'),
                        new OA\Property(property: 'content', type: 'string', description: 'Contenu de la publication'),
                        new OA\Property(property: 'files', type: 'array', description: 'Fichiers joints (images ou documents, max 20 Mo chacun, 50 Mo total)', items: new OA\Items(type: 'string', format: 'binary')),
                    ]
                )
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Publication créée avec succès', content: new OA\JsonContent(ref: '#/components/schemas/ApiResponse')),
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

        $extensions = 'jpg,jpeg,png,gif,bmp,webp,pdf';

        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255|unique:publications,title,NULL,id,group_id,' . $group->id,
            'description' => 'required|string|max:1000',
            'content' => 'required|string',
            'files' => 'nullable|array',
            'files.*' => 'file|mimes:' . $extensions . '|max:20480',
        ], [
            'title.required' => 'Le titre est obligatoire.',
            'title.unique' => 'Une publication avec ce titre existe déjà dans ce groupe.',
            'description.required' => 'La description est obligatoire.',
            'content.required' => 'Le contenu est obligatoire.',
            'files.*.mimes' => 'Chaque fichier doit être une image (jpg, png...) ou un fichier PDF.',
            'files.*.max' => 'Chaque fichier ne peut pas dépasser 20 Mo.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        if ($request->hasFile('files')) {
            $totalSize = array_sum(array_map(fn($f) => $f->getSize(), $request->file('files')));
            if ($totalSize > 50 * 1024 * 1024) {
                return response()->json([
                    'message' => 'La taille totale des fichiers ne peut pas dépasser 50 Mo.',
                    'errors' => ['files' => ['La taille totale des fichiers ne peut pas dépasser 50 Mo.']],
                ], 422);
            }
            $newPdfCount = count(array_filter($request->file('files'), fn($f) => strtolower($f->getClientOriginalExtension()) === 'pdf'));
            if ($newPdfCount > 1) {
                return response()->json([
                    'message' => 'Un seul fichier PDF peut être attaché à une publication.',
                    'errors' => ['files' => ['Un seul fichier PDF peut être attaché à une publication.']],
                ], 422);
            }
        }

        $publication = Publication::create([
            'group_id' => $group->id,
            'creator_id' => $user->id,
            'title' => $request->title,
            'description' => $request->description,
            'content' => $request->content,
            'is_visible' => false,
        ]);

        if ($request->hasFile('files')) {
            foreach ($request->file('files') as $uploadedFile) {
                $fileName = time() . '_' . $uploadedFile->getClientOriginalName();
                $path = $uploadedFile->storeAs('publications/' . $group->id, $fileName, 'local');
                $pubFile = $publication->files()->create([
                    'file_path' => $path,
                    'file_name' => $uploadedFile->getClientOriginalName(),
                    'file_size' => $uploadedFile->getSize(),
                ]);
                if (strtolower($uploadedFile->getClientOriginalExtension()) === 'pdf') {
                    ConvertPdfToMarkdownJob::dispatch($pubFile);
                }
            }
        }

        // Pas de notification à la création car la publication est masquée par défaut
        // La notification sera envoyée lors du démasquage (is_visible → true)

        return response()->json([
            'message' => 'Publication créée avec succès.',
            'data' => $publication->load('creator', 'files'),
        ], 201);
    }

    private function checkFormationAccess(Request $request, Publication $publication): bool
    {
        $user = $request->user();
        if ($user->hasRole('Admin') || $user->hasRole('Formateur')) return true;

        $isAssigned = $publication->formations()
            ->where('is_visible', true)
            ->whereHas('learnerProgress', function ($q) use ($user) {
                $q->where('user_id', $user->id);
            })->exists();

        if (!$isAssigned) return false;

        $isBlocked = $publication->formations()
            ->where('is_visible', true)
            ->where('progression_mode', 'guided')
            ->whereHas('learnerProgress', function ($q) use ($user) {
                $q->where('user_id', $user->id)->where('status', 'not_started');
            })->exists();

        return !$isBlocked;
    }

    private function canViewPublication(Request $request, Publication $publication): bool
    {
        $user = $request->user();
        if ($user->hasRole('Admin') || $user->hasRole('Formateur')) return true;

        if ($publication->is_visible) return true;

        return $publication->formations()
            ->where('is_visible', true)
            ->whereHas('learnerProgress', function ($q) use ($user) {
                $q->where('user_id', $user->id);
            })->exists();
    }

    #[OA\Get(
        path: '/groups/{group}/publications/{publication}',
        summary: 'Détails d\'une publication',
        security: [['bearerAuth' => []]],
        tags: ['Publications'],
        parameters: [
            new OA\Parameter(name: 'group', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'publication', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Détails de la publication', content: new OA\JsonContent(ref: '#/components/schemas/Publication')),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
            new OA\Response(response: 404, description: 'Publication non trouvée'),
        ]
    )]
    public function show(Request $request, Group $group, Publication $publication)
    {
        if ($publication->group_id !== $group->id) {
            return response()->json(['message' => 'Publication non trouvée.'], 404);
        }

        if (!$this->checkAccess($request, $group)) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        if (!$this->canViewPublication($request, $publication)) {
            return response()->json(['message' => 'Publication non trouvée.'], 404);
        }

        if (!$this->checkFormationAccess($request, $publication)) {
            return response()->json(['message' => 'Vous devez commencer la formation avant d\'accéder à cette publication.'], 403);
        }

        return response()->json($publication->load('creator', 'files'));
    }

    #[OA\Post(
        path: '/groups/{group}/publications/{publication}',
        summary: 'Modifier une publication',
        security: [['bearerAuth' => []]],
        tags: ['Publications'],
        parameters: [
            new OA\Parameter(name: 'group', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'publication', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\MediaType(
                mediaType: 'multipart/form-data',
                schema: new OA\Schema(
                    required: ['title', 'description', 'content'],
                    properties: [
                        new OA\Property(property: 'title', type: 'string', description: 'Titre de la publication'),
                        new OA\Property(property: 'description', type: 'string', description: 'Description de la publication'),
                        new OA\Property(property: 'content', type: 'string', description: 'Contenu de la publication'),
                        new OA\Property(property: 'files', type: 'array', description: 'Nouveaux fichiers à ajouter (images ou documents, max 20 Mo chacun, 50 Mo total)', items: new OA\Items(type: 'string', format: 'binary')),
                        new OA\Property(property: 'delete_files', type: 'array', description: 'IDs des fichiers existants à supprimer', items: new OA\Items(type: 'integer')),
                    ]
                )
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Publication modifiée avec succès', content: new OA\JsonContent(ref: '#/components/schemas/ApiResponse')),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
            new OA\Response(response: 404, description: 'Publication non trouvée'),
            new OA\Response(response: 422, description: 'Données invalides'),
        ]
    )]
    public function update(Request $request, Group $group, Publication $publication)
    {
        if ($publication->group_id !== $group->id) {
            return response()->json(['message' => 'Publication non trouvée.'], 404);
        }

        if (!$this->canManage($request, $group)) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        $user = $request->user();
        $extensions = 'jpg,jpeg,png,gif,bmp,webp,pdf';

        $rules = [
            'title' => 'sometimes|required|string|max:255|unique:publications,title,' . $publication->id . ',id,group_id,' . $group->id,
            'description' => 'sometimes|required|string|max:1000',
            'content' => 'sometimes|required|string',
        ];

        $messages = [
            'title.required' => 'Le titre est obligatoire.',
            'title.unique' => 'Une publication avec ce titre existe déjà dans ce groupe.',
            'description.required' => 'La description est obligatoire.',
            'content.required' => 'Le contenu est obligatoire.',
            'files.*.mimes' => 'Chaque fichier doit être une image (jpg, png...) ou un fichier PDF.',
            'files.*.max' => 'Chaque fichier ne peut pas dépasser 20 Mo.',
        ];

        if ($request->hasFile('files')) {
            $rules['files'] = 'nullable|array';
            $rules['files.*'] = 'file|mimes:' . $extensions . '|max:20480';
        }

        $validator = Validator::make($request->all(), $rules, $messages);

        if ($validator->fails()) {
            return response()->json([
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        if ($request->hasFile('files')) {
            $totalSize = array_sum(array_map(fn($f) => $f->getSize(), $request->file('files')));
            if ($totalSize > 50 * 1024 * 1024) {
                return response()->json([
                    'message' => 'La taille totale des fichiers ne peut pas dépasser 50 Mo.',
                    'errors' => ['files' => ['La taille totale des fichiers ne peut pas dépasser 50 Mo.']],
                ], 422);
            }
            $deleteIds = $request->has('delete_files')
                ? (is_array($request->delete_files) ? $request->delete_files : [$request->delete_files])
                : [];
            $existingPdfCount = $publication->files()
                ->whereNotIn('id', $deleteIds)
                ->get()
                ->filter(fn($f) => strtolower(pathinfo($f->file_name, PATHINFO_EXTENSION)) === 'pdf')
                ->count();
            $newPdfCount = count(array_filter($request->file('files'), fn($f) => strtolower($f->getClientOriginalExtension()) === 'pdf'));
            if ($existingPdfCount + $newPdfCount > 1) {
                return response()->json([
                    'message' => 'Un seul fichier PDF peut être attaché à une publication.',
                    'errors' => ['files' => ['Un seul fichier PDF peut être attaché à une publication.']],
                ], 422);
            }
        }

        $data = [];
        if ($request->has('title')) $data['title'] = $request->title;
        if ($request->has('description')) $data['description'] = $request->description;
        if ($request->has('content')) $data['content'] = $request->content;
        if ($request->has('is_visible')) {
            $data['is_visible'] = filter_var($request->is_visible, FILTER_VALIDATE_BOOLEAN);
        }
        if ($request->has('summary')) {
            $data['summary'] = $request->summary;
        }

        // Delete requested files
        if ($request->has('delete_files')) {
            $deleteIds = is_array($request->delete_files) ? $request->delete_files : [$request->delete_files];
            $filesToDelete = $publication->files()->whereIn('id', $deleteIds)->get();
            foreach ($filesToDelete as $pubFile) {
                Storage::disk('local')->delete($pubFile->file_path);
                $pubFile->delete();
            }

            // Si un document (PDF) est supprimé, le résumé est également supprimé
            $deletedDocument = $filesToDelete->contains(
                fn($f) => strtolower(pathinfo($f->file_name, PATHINFO_EXTENSION)) === 'pdf'
            );
            if ($deletedDocument) {
                $data['summary'] = null;
                $data['summary_status'] = 'idle';
                $data['summary_error'] = null;
            }
        }

        $wasHidden = !$publication->is_visible;
        $changes = [];
        if (isset($data['title']) && $publication->title !== $data['title']) $changes[] = 'le titre';
        if (isset($data['description']) && $publication->description !== $data['description']) $changes[] = 'la description';
        if (isset($data['content']) && $publication->content !== $data['content']) $changes[] = 'le contenu';

        $publication->update($data);

        if ($request->hasFile('files')) {
            $fileCount = count($request->file('files'));
            $changes[] = $fileCount . ' nouveau(x) fichier(s) ajouté(s)';
            foreach ($request->file('files') as $uploadedFile) {
                $fileName = time() . '_' . $uploadedFile->getClientOriginalName();
                $path = $uploadedFile->storeAs('publications/' . $group->id, $fileName, 'local');
                $pubFile = $publication->files()->create([
                    'file_path' => $path,
                    'file_name' => $uploadedFile->getClientOriginalName(),
                    'file_size' => $uploadedFile->getSize(),
                ]);
                if (strtolower($uploadedFile->getClientOriginalExtension()) === 'pdf') {
                    ConvertPdfToMarkdownJob::dispatch($pubFile);
                }
            }
        }

        if ($request->has('delete_files')) {
            $changes[] = 'fichier(s) supprimé(s)';
        }

        $becameVisible = $wasHidden && $publication->is_visible;

        if ($becameVisible) {
            // Notification spécifique pour le démasquage d'une publication
            $fileNote = '';
            $fileCount = $publication->files()->count();
            if ($fileCount > 0) {
                $fileNote = " avec {$fileCount} fichier" . ($fileCount > 1 ? 's' : '');
            }
            $this->notifyGroupMembers(
                $group,
                $user->id,
                'publication_visible',
                "Nouvelle publication dans « {$group->name} »",
                "{$user->name} a publié « {$publication->title} »{$fileNote}.",
                [
                    'publication_id' => $publication->id,
                    'publication_title' => $publication->title,
                    'group_id' => $group->id,
                    'group_name' => $group->name,
                    'creator_name' => $user->name,
                    'action' => 'created',
                    'formation_id' => $publication->formations()->first()?->id,
                ]
            );
        }

        if (!empty($changes) && !$becameVisible) {
            $changesStr = implode(', ', $changes);
            $notifiedUserIds = [$user->id];

            // 1. Notifier les membres du groupe si la publication est visible
            if ($publication->is_visible) {
                $this->notifyGroupMembers(
                    $group,
                    $user->id,
                    'publication_updated',
                    "Publication modifiée dans « {$group->name} »",
                    "{$user->name} a modifié « {$publication->title} » : {$changesStr}.",
                    [
                        'publication_id' => $publication->id,
                        'publication_title' => $publication->title,
                        'group_id' => $group->id,
                        'group_name' => $group->name,
                        'creator_name' => $user->name,
                        'action' => 'updated',
                        'changes' => $changes,
                        'formation_id' => $publication->formations()->first()?->id,
                    ]
                );
                $notifiedUserIds = array_merge($notifiedUserIds, $group->members()->pluck('user_id')->toArray());
            }

            // 2. Notifier les apprenants des formations
            $formations = $publication->formations()->where('is_visible', true)->get();
            $learnerIds = [];
            foreach ($formations as $formation) {
                $learnerIds = array_merge($learnerIds, $formation->learnerProgress()->pluck('user_id')->toArray());
            }
            $learnersToNotify = array_diff(array_unique($learnerIds), $notifiedUserIds);

            foreach ($learnersToNotify as $learnerId) {
                Notification::create([
                    'user_id' => $learnerId,
                    'type' => 'publication_updated',
                    'title' => "Contenu de formation modifié : {$publication->title}",
                    'message' => "Le contenu « {$publication->title} » a été modifié : {$changesStr}.",
                    'data' => [
                        'publication_id' => $publication->id,
                        'publication_title' => $publication->title,
                        'group_id' => $group->id,
                        'group_name' => $group->name,
                        'creator_name' => $user->name,
                        'action' => 'updated',
                        'changes' => $changes,
                        'formation_id' => $formations->first()?->id,
                    ],
                ]);
            }
        }

        return response()->json([
            'message' => 'Publication modifiée avec succès.',
            'data' => $publication->fresh()->load('creator', 'files'),
        ]);
    }

    #[OA\Delete(
        path: '/groups/{group}/publications/{publication}',
        summary: 'Supprimer une publication',
        security: [['bearerAuth' => []]],
        tags: ['Publications'],
        parameters: [
            new OA\Parameter(name: 'group', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'publication', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Publication supprimée avec succès', content: new OA\JsonContent(ref: '#/components/schemas/ApiResponse')),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
            new OA\Response(response: 404, description: 'Publication non trouvée'),
        ]
    )]
    public function destroy(Request $request, Group $group, Publication $publication)
    {
        if ($publication->group_id !== $group->id) {
            return response()->json(['message' => 'Publication non trouvée.'], 404);
        }

        if (!$this->canManage($request, $group)) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        // Une publication liée à une ou plusieurs formations ne peut pas être supprimée :
        // elle doit d'abord être retirée volontairement de chaque formation par le formateur.
        $formations = $publication->formations->map(fn($f) => [
            'id' => $f->id,
            'title' => $f->title,
            'learners_count' => $f->learnerProgress()->count(),
        ]);

        if ($formations->isNotEmpty()) {
            return response()->json([
                'message' => 'Cette publication est liée à une ou plusieurs formations. Elle doit être retirée de toutes les formations avant d\'être supprimée.',
                'code' => 'PUBLICATION_LINKED_TO_FORMATION',
                'formations' => $formations,
            ], 409);
        }

        $wasVisible = $publication->is_visible;
        $user = $request->user();

        // Nettoyer les anciennes notifications liées à cette publication (AVANT d'en créer une nouvelle)
        DB::table('notifications')
            ->where(function ($query) use ($publication) {
                $query->whereRaw('JSON_EXTRACT(`data`, "$.publication_id") = ?', [(int)$publication->id])
                      ->orWhereRaw('JSON_EXTRACT(`data`, "$.publication_id") = ?', [(string)$publication->id]);
            })
            ->delete();

        $notifiedUserIds = [$user->id];

        // Notifier les membres si la publication était visible
        if ($wasVisible) {
            $this->notifyGroupMembers(
                $group,
                $user->id,
                'publication_deleted',
                "Publication supprimée dans « {$group->name} »",
                "{$user->name} a supprimé la publication « {$publication->title} ».",
                [
                    'publication_id' => $publication->id,
                    'publication_title' => $publication->title,
                    'group_id' => $group->id,
                    'group_name' => $group->name,
                    'creator_name' => $user->name,
                    'action' => 'deleted',
                    'formation_id' => $publication->formations()->first()?->id,
                ]
            );
            $notifiedUserIds = array_merge($notifiedUserIds, $group->members()->pluck('user_id')->toArray());
        }

        // Notifier les apprenants des formations
        $formations = $publication->formations()->where('is_visible', true)->get();
        $learnerIds = [];
        foreach ($formations as $formation) {
            $learnerIds = array_merge($learnerIds, $formation->learnerProgress()->pluck('user_id')->toArray());
        }
        $learnersToNotify = array_diff(array_unique($learnerIds), $notifiedUserIds);

        foreach ($learnersToNotify as $learnerId) {
            Notification::create([
                'user_id' => $learnerId,
                'type' => 'publication_deleted',
                'title' => "Contenu supprimé : {$publication->title}",
                'message' => "Le contenu « {$publication->title} » faisant partie d'une de vos formations a été supprimé.",
                'data' => [
                    'publication_id' => $publication->id,
                    'publication_title' => $publication->title,
                    'group_id' => $group->id,
                    'group_name' => $group->name,
                    'creator_name' => $user->name,
                    'action' => 'deleted',
                    'formation_id' => $formations->first()?->id,
                ],
            ]);
        }

        foreach ($publication->files as $pubFile) {
            Storage::disk('local')->delete($pubFile->file_path);
        }

        $publication->delete();

        return response()->json([
            'message' => 'Publication supprimée avec succès.',
        ]);
    }

    #[OA\Delete(
        path: '/publications/files/{publicationFile}',
        summary: 'Supprimer un fichier d\'une publication',
        security: [['bearerAuth' => []]],
        tags: ['Publications'],
        parameters: [
            new OA\Parameter(name: 'publicationFile', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Fichier supprimé avec succès', content: new OA\JsonContent(ref: '#/components/schemas/ApiResponse')),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
            new OA\Response(response: 404, description: 'Fichier non trouvé'),
        ]
    )]
    public function destroyPublicationFile(Request $request, PublicationFile $publicationFile)
    {
        $publication = $publicationFile->publication;
        $group = $publication->group;

        if (!$this->canManage($request, $group)) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        if (strtolower(pathinfo($publicationFile->file_name, PATHINFO_EXTENSION)) === 'pdf') {
            $publication->update([
                'summary' => null,
                'summary_status' => 'idle',
                'summary_error' => null,
            ]);
        }

        Storage::disk('local')->delete($publicationFile->file_path);
        $publicationFile->delete();

        return response()->json([
            'message' => 'Fichier supprimé avec succès.',
        ]);
    }

    #[OA\Get(
        path: '/publications/{publication}/files/{publicationFile}',
        summary: 'Servir un fichier d\'une publication',
        security: [['bearerAuth' => []]],
        tags: ['Publications'],
        parameters: [
            new OA\Parameter(name: 'publication', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'publicationFile', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Contenu du fichier'),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
            new OA\Response(response: 404, description: 'Fichier non trouvé'),
        ]
    )]
    public function servePublicationFile(Request $request, Publication $publication, PublicationFile $publicationFile)
    {
        $user = $request->user();
        $group = $publication->group;
        if (!$this->checkAccess($request, $group)) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        if (!$this->canViewPublication($request, $publication)) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        if (!$this->checkFormationAccess($request, $publication)) {
            return response()->json(['message' => 'Vous devez commencer la formation avant d\'accéder à cette publication.'], 403);
        }

        if ($publicationFile->publication_id !== $publication->id) {
            abort(404);
        }
        if (!Storage::disk('local')->exists($publicationFile->file_path)) {
            abort(404);
        }

        $path = Storage::disk('local')->path($publicationFile->file_path);
        $forceDownload = $request->query('download') === '1';

        if ($forceDownload) {
            return response()->download($path, $publicationFile->file_name);
        }

        return response()->file($path, [
            'Content-Type' => mime_content_type($path) ?: 'application/octet-stream',
        ]);
    }

    // ── IA Summary ──

    private function findMarkdownForPublication(Publication $publication): ?string
    {
        $files = $publication->files;
        foreach ($files as $file) {
            if ($file->markdown_path) {
                return $file->markdown_path;
            }
        }

        $mdDir = 'markdown/' . $publication->id;
        if (Storage::disk('public')->exists($mdDir)) {
            $mdFiles = Storage::disk('public')->files($mdDir);
            if (!empty($mdFiles)) {
                return $mdFiles[0];
            }
        }

        return null;
    }

    #[OA\Post(
        path: '/publications/{publication}/generate-summary',
        summary: 'Générer un résumé IA pour une publication',
        description: 'Génère un résumé Markdown de la publication à partir du premier fichier Markdown disponible (issue de la conversion des PDF). Le statut passe de "idle" à "generating", puis "draft" en cas de succès ou "error" en cas d\'échec. Rôle Formateur ou Admin requis.',
        tags: ['Résumé'],
        security: [['bearerAuth' => []]],
        parameters: [
            new OA\Parameter(name: 'publication', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'ID de la publication'),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Résumé généré avec succès (statut draft)', content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'status', type: 'string', enum: ['draft'], example: 'draft'),
                    new OA\Property(property: 'summary', type: 'string', description: 'Résumé Markdown généré'),
                ]
            )),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
            new OA\Response(response: 422, description: 'Aucun fichier Markdown disponible ou fichier vide', content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'status', type: 'string', enum: ['error'], example: 'error'),
                    new OA\Property(property: 'error', type: 'string', description: 'Message d\'erreur détaillé'),
                ]
            )),
            new OA\Response(response: 500, description: 'Erreur lors de la génération du résumé', content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'status', type: 'string', enum: ['error'], example: 'error'),
                    new OA\Property(property: 'error', type: 'string', description: 'Message d\'erreur détaillé'),
                ]
            )),
        ]
    )]
    public function generateSummary(Request $request, Publication $publication)
    {
        $user = $request->user();
        $group = $publication->group;

        if (!$user->hasRole('Admin') && !($user->hasRole('Formateur') && $group->creator_id === $user->id)) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        $mdPath = $this->findMarkdownForPublication($publication);
        if (!$mdPath) {
            return response()->json([
                'status' => 'error',
                'error' => 'Aucun fichier Markdown disponible. Veuillez d\'abord convertir les PDF.',
            ], 422);
        }

        $markdown = Storage::disk('public')->get($mdPath);
        if (empty($markdown)) {
            return response()->json([
                'status' => 'error',
                'error' => 'Le fichier Markdown est vide.',
            ], 422);
        }

        $publication->update(['summary_status' => 'generating']);

        try {
            $openRouter = app(OpenRouterService::class);
            $summary = $openRouter->generateSummary($markdown);

            if (empty(trim($summary))) {
                throw new \Exception('Le résumé généré est vide.');
            }

            $publication->update([
                'summary' => $summary,
                'summary_status' => 'draft',
                'summary_error' => null,
            ]);

            return response()->json([
                'status' => 'draft',
                'summary' => $summary,
            ]);
        } catch (\Throwable $e) {
            Log::error('Erreur génération résumé pour la publication ' . $publication->id . ': ' . $e->getMessage());

            $publication->update([
                'summary_status' => 'error',
                'summary_error' => $e->getMessage(),
            ]);

            return response()->json([
                'status' => 'error',
                'error' => 'Erreur lors de la génération du résumé : ' . $e->getMessage(),
            ], 500);
        }
    }

    #[OA\Get(
        path: '/publications/{publication}/summary-status',
        summary: 'Vérifier le statut du résumé',
        description: 'Permet de poller le statut de génération du résumé (idle → generating → draft ou error).',
        tags: ['Résumé'],
        security: [['bearerAuth' => []]],
        parameters: [
            new OA\Parameter(name: 'publication', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'ID de la publication'),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Statut du résumé', content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'status', type: 'string', enum: ['idle', 'generating', 'draft', 'error'], example: 'draft'),
                    new OA\Property(property: 'summary', type: 'string', nullable: true, description: 'Résumé Markdown généré'),
                    new OA\Property(property: 'error', type: 'string', nullable: true, description: 'Message d\'erreur si le statut est "error"'),
                ]
            )),
            new OA\Response(response: 401, description: 'Non authentifié'),
        ]
    )]
    public function getSummaryStatus(Request $request, Publication $publication)
    {
        return response()->json([
            'status' => $publication->summary_status,
            'summary' => $publication->summary,
            'error' => $publication->summary_error,
        ]);
    }

    #[OA\Get(
        path: '/publications/{publication}/summary',
        summary: 'Récupérer le résumé d\'une publication',
        description: 'Retourne le résumé Markdown généré pour la publication.',
        tags: ['Résumé'],
        security: [['bearerAuth' => []]],
        parameters: [
            new OA\Parameter(name: 'publication', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'ID de la publication'),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Résumé de la publication', content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'summary', type: 'string', nullable: true, description: 'Résumé Markdown de la publication'),
                ]
            )),
            new OA\Response(response: 401, description: 'Non authentifié'),
        ]
    )]
    public function getSummary(Request $request, Publication $publication)
    {
        return response()->json([
            'summary' => $publication->summary,
        ]);
    }

    private function formatSummaryForDownload(?string $summary): string
    {
        if (empty($summary)) {
            return '<p>Aucun résumé disponible.</p>';
        }
        $text = strip_tags($summary);
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        $lines = explode("\n", $text);
        $html = '';
        $inUl = false;
        $inOl = false;

        foreach ($lines as $line) {
            $trimmed = trim($line);

            if ($trimmed === '') {
                if ($inUl) { $html .= "</ul>\n"; $inUl = false; }
                if ($inOl) { $html .= "</ol>\n"; $inOl = false; }
                continue;
            }

            // Heading 1
            if (preg_match('/^#\s+(.+)/', $trimmed, $m)) {
                if ($inUl) { $html .= "</ul>\n"; $inUl = false; }
                if ($inOl) { $html .= "</ol>\n"; $inOl = false; }
                $html .= '<h1 class="main-title">' . e($m[1]) . "</h1>\n";
                continue;
            }

            // Heading 2
            if (preg_match('/^##\s+(.+)/', $trimmed, $m)) {
                if ($inUl) { $html .= "</ul>\n"; $inUl = false; }
                if ($inOl) { $html .= "</ol>\n"; $inOl = false; }
                $html .= '<h2>' . e($m[1]) . "</h2>\n";
                continue;
            }
            
            // Heading 3
            if (preg_match('/^###\s+(.+)/', $trimmed, $m)) {
                if ($inUl) { $html .= "</ul>\n"; $inUl = false; }
                if ($inOl) { $html .= "</ol>\n"; $inOl = false; }
                $html .= '<h3>' . e($m[1]) . "</h3>\n";
                continue;
            }

            // Bullet list
            if (preg_match('/^[-*]\s+(.+)/', $trimmed, $m)) {
                if ($inOl) { $html .= "</ol>\n"; $inOl = false; }
                if (!$inUl) { $html .= "<ul>\n"; $inUl = true; }
                // Handle bold text in list items (**text**)
                $listItem = e($m[1]);
                $listItem = preg_replace('/\*\*(.+?)\*\*/', '<strong>$1</strong>', $listItem);
                $html .= '<li>' . $listItem . "</li>\n";
                continue;
            }

            // Numbered list
            if (preg_match('/^\d+[.)]\s+(.+)/', $trimmed, $m)) {
                if ($inUl) { $html .= "</ul>\n"; $inUl = false; }
                if (!$inOl) { $html .= "<ol>\n"; $inOl = true; }
                $listItem = e($m[1]);
                $listItem = preg_replace('/\*\*(.+?)\*\*/', '<strong>$1</strong>', $listItem);
                $html .= '<li>' . $listItem . "</li>\n";
                continue;
            }

            // Regular paragraph
            if ($inUl) { $html .= "</ul>\n"; $inUl = false; }
            if ($inOl) { $html .= "</ol>\n"; $inOl = false; }
            
            // Check for bold or uppercase lines that should be emphasized
            if (preg_match('/^\*\*(.+?)\*\*$/', $trimmed, $m)) {
                 $html .= '<p class="highlight-text">' . e($m[1]) . "</p>\n";
                 continue;
            }
            
            // Handle bold text in paragraphs (**text**)
            $para = e($trimmed);
            $para = preg_replace('/\*\*(.+?)\*\*/', '<strong>$1</strong>', $para);
            $html .= '<p>' . $para . "</p>\n";
        }

        if ($inUl) { $html .= "</ul>\n"; }
        if ($inOl) { $html .= "</ol>\n"; }

        return $html;
    }

    #[OA\Get(
        path: '/publications/{publication}/summary/pdf',
        summary: 'Télécharger le résumé au format PDF',
        description: 'Génère et télécharge un PDF stylisé du résumé de la publication.',
        tags: ['Résumé'],
        security: [['bearerAuth' => []]],
        parameters: [
            new OA\Parameter(name: 'publication', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'ID de la publication'),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Fichier PDF du résumé', content: new OA\MediaType(mediaType: 'application/pdf', schema: new OA\Schema(type: 'string', format: 'binary'))),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
        ]
    )]
    public function downloadSummaryPdf(Request $request, Publication $publication)
    {
        $user = $request->user();
        $group = $publication->group;
        if (!$this->checkAccess($request, $group)) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        $summary = $this->formatSummaryForDownload($publication->summary);
        $title = htmlspecialchars($publication->title);
        $groupName = htmlspecialchars($group->name);
        $dateLabel = $publication->updated_at ? $publication->updated_at->format('d/m/Y H:i') : date('d/m/Y H:i');

        $html = <<<HTML
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>$title</title>
<style>
    @import url('https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap');
    
    @page {
        margin: 40px 50px;
    }
    
    body { 
        font-family: 'Lato', 'Helvetica', 'Arial', sans-serif; 
        color: #2d3436; 
        font-size: 14px; 
        line-height: 1.6; 
        background-color: #ffffff;
    }
    
    .header {
        border-bottom: 3px solid #79C300;
        padding-bottom: 15px;
        margin-bottom: 30px;
    }
    
    .header h1 { 
        color: #79C300; 
        font-size: 28px; 
        font-weight: 700; 
        margin: 0 0 10px 0;
        line-height: 1.2;
    }
    
    .meta { 
        color: #7f8c8d; 
        font-size: 12px; 
        font-style: italic;
    }
    
    .meta-item {
        display: inline-block;
        margin-right: 15px;
    }
    
    .meta-item strong {
        color: #636e72;
        font-weight: 700;
    }
    
    .summary-content {
        margin-bottom: 40px;
    }
    
    h1.main-title {
        color: #e0004d;
        font-size: 22px;
        font-weight: 700;
        margin-top: 20px;
        margin-bottom: 15px;
        padding-bottom: 5px;
        border-bottom: 2px solid rgba(224, 0, 77, 0.2);
    }
    
    h2 { 
        color: #79C300; 
        font-size: 18px; 
        font-weight: 700; 
        margin-top: 25px; 
        margin-bottom: 15px;
        padding-bottom: 5px;
        border-bottom: 1px solid rgba(121, 195, 0, 0.2);
    }
    
    h3 { 
        color: #2d3436; 
        font-size: 16px; 
        font-weight: 700; 
        margin-top: 20px; 
        margin-bottom: 10px;
    }
    
    ul, ol { 
        margin-left: 15px; 
        margin-bottom: 15px; 
        padding-left: 20px;
    }
    
    li { 
        margin-bottom: 8px; 
        color: #2d3436;
        line-height: 1.6;
    }
    
    p { 
        margin-bottom: 15px; 
        color: #2d3436;
        text-align: justify;
    }
    
    strong {
        color: #2d3436;
        font-weight: 700;
    }
    
    .highlight-text {
        font-weight: 700;
        color: #79C300;
        font-size: 16px;
        margin: 20px 0;
    }
    
    .footer {
        position: fixed;
        bottom: 0px;
        left: 0px;
        right: 0px;
        height: 30px;
        text-align: center;
        font-size: 10px;
        color: #b2bec3;
        border-top: 1px solid #dfe6e9;
        padding-top: 10px;
    }
</style>
</head>
<body>
    <div class="header">
        <h1>$title</h1>
        <div class="meta">
            <span class="meta-item"><strong>Groupe:</strong> $groupName</span>
            <span class="meta-item"><strong>Généré le:</strong> $dateLabel</span>
        </div>
    </div>
    
    <div class="summary-content">
        $summary
    </div>
    
    <div class="footer">
        Document généré via PixiForma - Confidentiel
    </div>
</body>
</html>
HTML;

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::setOptions([
            'isRemoteEnabled' => true,
            'isHtml5ParserEnabled' => true,
            'defaultFont' => 'Lato'
        ])->loadHTML($html);
        
        $pdf->setPaper('A4', 'portrait');
        $filename = \Illuminate\Support\Str::slug($title) . '-resume.pdf';

        return $pdf->download($filename);
    }
}
