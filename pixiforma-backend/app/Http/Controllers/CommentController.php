<?php

namespace App\Http\Controllers;

use App\Models\Comment;
use App\Models\Group;
use App\Models\Notification;
use App\Models\Publication;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'Commentaires', description: 'Gestion des commentaires et des réponses sur les publications')]
class CommentController extends Controller
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

    private function authorizeAccess(Request $request, Publication $publication): bool
    {
        $user = $request->user();
        $group = $publication->group;

        if (!$this->checkAccess($request, $group)) return false;
        if (!$user->hasPermissionTo('voir-commentaires')) return false;
        if (!$this->checkFormationAccess($request, $publication)) return false;

        return true;
    }

    private function canModifyComment(Request $request, Comment $comment): bool
    {
        $user = $request->user();

        if ($user->hasRole('Admin')) return true;

        return (int) $comment->user_id === (int) $user->id;
    }

    private function canDeleteComment(Request $request, Comment $comment): bool
    {
        $user = $request->user();

        if ($user->hasRole('Admin')) return true;

        if ($user->hasRole('Formateur')) {
            return (int) $comment->user_id === (int) $user->id
                || $comment->user->hasRole('Collaborateur');
        }

        return (int) $comment->user_id === (int) $user->id;
    }

    private function authorizeCommentAction(Request $request, Comment $comment): bool
    {
        $user = $request->user();

        if (!$user->hasPermissionTo('voir-commentaires')) return false;

        return $this->checkAccess($request, $comment->publication->group);
    }

    private function isGroupParticipant(User $user, Group $group): bool
    {
        if ((int) $group->creator_id === (int) $user->id) return true;

        return $group->members()->where('user_id', $user->id)->exists();
    }

    private function canReceivePublicationNotification(User $user, Publication $publication): bool
    {
        if (!$user->hasRole('Collaborateur')) return true;

        return $publication->formations()
            ->where('is_visible', true)
            ->whereHas('learnerProgress', function ($q) use ($user) {
                $q->where('user_id', $user->id);
            })
            ->exists();
    }

    private function notifyGroupOfComment(Group $group, Publication $publication, Comment $comment, string $excludeUserId): void
    {
        $members = $group->members()
            ->where('user_id', '!=', $excludeUserId)
            ->get();

        $formationId = $publication->formations()->first()?->id;

        $data = [
            'publication_id' => $publication->id,
            'publication_title' => $publication->title,
            'group_id' => $group->id,
            'group_name' => $group->name,
            'comment_id' => $comment->id,
            'commenter_name' => $comment->user->name,
            'formation_id' => $formationId,
        ];

        $targetIds = [];

        foreach ($members as $member) {
            if (!$this->isGroupParticipant($member, $group)) continue;
            if (!$this->canReceivePublicationNotification($member, $publication)) continue;
            $targetIds[] = $member->id;
        }

        if ($group->creator_id != $excludeUserId) {
            $alreadyNotified = in_array($group->creator_id, $targetIds);
            if (!$alreadyNotified) {
                $targetIds[] = $group->creator_id;
            }
        }

        foreach (array_unique($targetIds) as $targetId) {
            Notification::create([
                'user_id' => $targetId,
                'type' => 'new_comment',
                'title' => "Nouveau commentaire dans « {$group->name} »",
                'message' => "{$comment->user->name} a commenté la publication « {$publication->title} ».",
                'data' => $data,
            ]);
        }
    }

    private function notifyReplyAuthor(Publication $publication, Comment $reply, Comment $parent): void
    {
        if ((int) $parent->user_id === (int) $reply->user_id) return;

        $parentAuthor = $parent->user;
        if (!$this->isGroupParticipant($parentAuthor, $publication->group)) return;
        if (!$this->canReceivePublicationNotification($parentAuthor, $publication)) return;

        $formationId = $publication->formations()->first()?->id;

        Notification::create([
            'user_id' => $parent->user_id,
            'type' => 'new_comment',
            'title' => "Réponse à votre commentaire",
            'message' => "{$reply->user->name} a répondu à votre commentaire sur « {$publication->title} ».",
            'data' => [
                'publication_id' => $publication->id,
                'publication_title' => $publication->title,
                'group_id' => $publication->group_id,
                'group_name' => $publication->group?->name,
                'comment_id' => $reply->id,
                'parent_comment_id' => $parent->id,
                'commenter_name' => $reply->user->name,
                'formation_id' => $formationId,
            ],
        ]);
    }

    #[OA\Get(
        path: '/publications/{publication}/comments',
        summary: 'Liste des commentaires d\'une publication',
        description: 'Retourne les commentaires racines (les plus récents en premier) avec leurs réponses imbriquées.',
        security: [['bearerAuth' => []]],
        tags: ['Commentaires'],
        parameters: [
            new OA\Parameter(name: 'publication', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'page', in: 'query', required: false, schema: new OA\Schema(type: 'integer', default: 1)),
            new OA\Parameter(name: 'per_page', in: 'query', required: false, schema: new OA\Schema(type: 'integer', default: 20)),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Liste des commentaires racines paginée avec leurs réponses imbriquées', content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/Comment')),
                    new OA\Property(property: 'total', type: 'integer'),
                    new OA\Property(property: 'per_page', type: 'integer'),
                    new OA\Property(property: 'current_page', type: 'integer'),
                    new OA\Property(property: 'has_more', type: 'boolean'),
                ]
            )),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
            new OA\Response(response: 404, description: 'Publication non trouvée'),
        ]
    )]
    public function index(Request $request, Publication $publication)
    {
        if (!$this->authorizeAccess($request, $publication)) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        $page = max(1, (int) $request->query('page', 1));
        $perPage = min(50, max(1, (int) $request->query('per_page', 20)));

        $query = $publication->comments()
            ->whereNull('parent_id')
            ->with([
                'user:id,name,email',
                'user.roles:id,name',
                'replies.user:id,name,email',
                'replies.user.roles:id,name',
            ])
            ->latest();

        $rootTotal = $query->count();
        $total = $publication->comments()->count();
        $comments = $query->forPage($page, $perPage)->get();

        return response()->json([
            'data' => $comments,
            'total' => $total,
            'per_page' => $perPage,
            'current_page' => $page,
            'has_more' => ($page * $perPage) < $rootTotal,
        ]);
    }

    #[OA\Post(
        path: '/publications/{publication}/comments',
        summary: 'Ajouter un commentaire ou une réponse',
        description: 'Crée un commentaire sur la publication. Si `parent_id` est fourni, crée une réponse au commentaire indiqué (niveau unique).',
        security: [['bearerAuth' => []]],
        tags: ['Commentaires'],
        parameters: [
            new OA\Parameter(name: 'publication', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/CommentCreateRequest')
        ),
        responses: [
            new OA\Response(response: 201, description: 'Commentaire créé', content: new OA\JsonContent(ref: '#/components/schemas/ApiResponse')),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
            new OA\Response(response: 404, description: 'Publication non trouvée'),
            new OA\Response(response: 422, description: 'Données invalides'),
        ]
    )]
    public function store(Request $request, Publication $publication)
    {
        $user = $request->user();

        if (!$this->authorizeAccess($request, $publication)) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        if (!$user->hasPermissionTo('creer-commentaires')) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'content' => 'required|string|max:5000',
            'parent_id' => 'nullable|integer|exists:comments,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $parent = null;
        if ($request->filled('parent_id')) {
            $parent = Comment::find($request->input('parent_id'));

            if (!$parent) {
                return response()->json(['message' => 'Le commentaire parent n\'existe plus.'], 422);
            }

            if ((int) $parent->publication_id !== (int) $publication->id) {
                return response()->json(['message' => 'Le commentaire parent n\'appartient pas à cette publication.'], 422);
            }

            if ($parent->parent_id !== null) {
                return response()->json(['message' => 'Une réponse ne peut pas avoir elle-même une réponse.'], 422);
            }
        }

        $comment = $publication->comments()->create([
            'user_id' => $user->id,
            'parent_id' => $parent?->id,
            'content' => $request->content,
        ]);

        $comment->load('user:id,name,email', 'parent.user:id,name,email');

        if ($parent) {
            $this->notifyReplyAuthor($publication, $comment, $parent);
        } else {
            $this->notifyGroupOfComment($publication->group, $publication, $comment, $user->id);
        }

        return response()->json(['data' => $comment], 201);
    }

    #[OA\Put(
        path: '/publications/{publication}/comments/{comment}',
        summary: 'Modifier un commentaire',
        description: 'L\'auteur peut modifier son propre commentaire. L\'Admin peut modifier n\'importe quel commentaire.',
        security: [['bearerAuth' => []]],
        tags: ['Commentaires'],
        parameters: [
            new OA\Parameter(name: 'publication', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'comment', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/CommentUpdateRequest')
        ),
        responses: [
            new OA\Response(response: 200, description: 'Commentaire modifié', content: new OA\JsonContent(ref: '#/components/schemas/ApiResponse')),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
            new OA\Response(response: 404, description: 'Commentaire non trouvé'),
            new OA\Response(response: 422, description: 'Données invalides'),
        ]
    )]
    public function update(Request $request, Publication $publication, Comment $comment)
    {
        if ((int) $comment->publication_id !== (int) $publication->id) {
            return response()->json(['message' => 'Commentaire non trouvé.'], 404);
        }

        if (!$this->authorizeCommentAction($request, $comment)) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        if (!$this->canModifyComment($request, $comment)) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'content' => 'required|string|max:5000',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $comment->update([
            'content' => $request->content,
            'edited_at' => now(),
        ]);

        $comment->load('user:id,name,email', 'parent.user:id,name,email');

        return response()->json(['data' => $comment]);
    }

    #[OA\Delete(
        path: '/publications/{publication}/comments/{comment}',
        summary: 'Supprimer un commentaire',
        description: 'L\'auteur peut supprimer son propre commentaire. Le Formateur peut supprimer les commentaires des Collaborateurs et les siens. L\'Admin peut supprimer n\'importe quel commentaire. Les réponses associées sont supprimées.',
        security: [['bearerAuth' => []]],
        tags: ['Commentaires'],
        parameters: [
            new OA\Parameter(name: 'publication', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'comment', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Commentaire supprimé', content: new OA\JsonContent(ref: '#/components/schemas/ApiResponse')),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
            new OA\Response(response: 404, description: 'Commentaire non trouvé'),
        ]
    )]
    public function destroy(Request $request, Publication $publication, Comment $comment)
    {
        if ((int) $comment->publication_id !== (int) $publication->id) {
            return response()->json(['message' => 'Commentaire non trouvé.'], 404);
        }

        if (!$this->authorizeCommentAction($request, $comment)) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        if (!$this->canDeleteComment($request, $comment)) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        $comment->delete();

        return response()->json(['message' => 'Commentaire supprimé avec succès.']);
    }
}
