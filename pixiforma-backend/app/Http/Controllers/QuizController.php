<?php

namespace App\Http\Controllers;

use App\Jobs\GenerateQuizJob;
use App\Services\AI\OpenRouterService;
use App\Models\Formation;
use App\Models\FormationUser;
use App\Models\FormationUserPublication;
use App\Models\Group;
use App\Models\Publication;
use App\Models\Quiz;
use App\Models\QuizSubmission;
use App\Services\PdfConversionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'Quiz', description: 'Gestion des quiz de formation : génération IA, review formateur, soumission collaborateur')]
class QuizController extends Controller
{
    private function canManage(Request $request, Group $group): bool
    {
        $user = $request->user();
        if ($user->hasRole('Admin')) return true;
        if ($user->hasRole('Formateur')) return $group->creator_id === $user->id;
        return false;
    }

    #[OA\Post(
        path: '/formations/{formation}/publications/{publication}/generate-quiz',
        summary: 'Générer un quiz IA pour une publication',
        description: 'Lance la génération asynchrone (1-2 min) de 40-50 questions via l\'IA. Le statut passe de "generating" à "draft" une fois terminé. Polling possible via GET /quizzes/{quiz}/status.',
        tags: ['Quiz'],
        security: [['bearerAuth' => []]],
        parameters: [
            new OA\Parameter(name: 'formation', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'ID de la formation'),
            new OA\Parameter(name: 'publication', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'ID de la publication'),
        ],
        responses: [
            new OA\Response(response: 202, description: 'Génération lancée (asynchrone)', content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'message', type: 'string'),
                    new OA\Property(property: 'data', ref: '#/components/schemas/Quiz'),
                ]
            )),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
            new OA\Response(response: 422, description: 'Aucun fichier Markdown disponible ou fichier vide'),
        ]
    )]
    public function generateQuiz(Request $request, Formation $formation, Publication $publication)
    {
        $group = $formation->group;
        if (!$this->canManage($request, $group)) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        $existing = Quiz::where('formation_id', $formation->id)
            ->where('publication_id', $publication->id)
            ->whereIn('status', ['generating', 'draft'])
            ->first();

        if ($existing && $existing->status === 'generating') {
            $elapsed = $existing->created_at ? now()->diffInMinutes($existing->created_at) : 0;
            if ($elapsed > 7) {
                $existing->update([
                    'status' => 'error',
                    'generation_error' => 'Génération timeout: aucune réponse de l\'IA après '.$elapsed.' minutes.',
                ]);
            } else {
                return response()->json(['message' => 'Une génération est déjà en cours.', 'data' => $existing]);
            }
        }

        $mdPath = $this->findMarkdownForPublication($publication);
        if (!$mdPath) {
            return response()->json(['message' => 'Aucun fichier Markdown disponible pour cette publication. Veuillez d\'abord convertir les fichiers PDF associés.'], 422);
        }

        $markdown = Storage::disk('public')->get($mdPath);
        if (empty($markdown)) {
            return response()->json(['message' => 'Le fichier Markdown est vide.'], 422);
        }

        if ($existing && $existing->status === 'draft') {
            $existing->delete();
        }

        $quiz = Quiz::create([
            'formation_id' => $formation->id,
            'publication_id' => $publication->id,
            'questions' => [],
            'status' => 'generating',
            'approved_count' => 0,
            'generated_at' => null,
        ]);

        try {
            $job = new GenerateQuizJob($quiz, $markdown);
            $job->handle(app(OpenRouterService::class));
        } catch (\Throwable $e) {
            Log::error("Erreur génération quiz {$quiz->id}: " . $e->getMessage());
            $quiz->update([
                'status' => 'error',
                'generation_error' => $e->getMessage(),
            ]);
            return response()->json([
                'message' => 'Échec de la génération: ' . $e->getMessage(),
                'data' => $quiz->fresh(),
            ], 500);
        }

        return response()->json([
            'message' => 'Génération du quiz en cours. Vous serez notifié(e) lorsque ce sera prêt.',
            'data' => $quiz->fresh(),
        ], 200, [], JSON_INVALID_UTF8_SUBSTITUTE);
    }

    #[OA\Get(
        path: '/formations/{formation}/publications/{publication}/quiz',
        summary: 'Récupérer le quiz publié d\'une publication (collaborateur)',
        description: 'Retourne 5 ou 10 questions tirées aléatoirement du pool approuvé (selon quiz_question_count de la formation).',
        tags: ['Quiz'],
        security: [['bearerAuth' => []]],
        parameters: [
            new OA\Parameter(name: 'formation', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'ID de la formation'),
            new OA\Parameter(name: 'publication', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'ID de la publication'),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Quiz publié avec questions aléatoires', content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'data', ref: '#/components/schemas/QuizForCollaborator'),
                ]
            )),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 404, description: 'Aucun quiz publié pour cette publication'),
        ]
    )]
    public function getQuizForPublication(Request $request, Formation $formation, Publication $publication)
    {
        $quiz = Quiz::where('formation_id', $formation->id)
            ->where('publication_id', $publication->id)
            ->published()
            ->latest()
            ->first();

        if (!$quiz) {
            return response()->json(['message' => 'Aucun quiz publié pour cette publication.'], 404);
        }

        $user = $request->user();
        $fu = \App\Models\FormationUser::where('formation_id', $formation->id)
            ->where('user_id', $user->id)
            ->first();

        if ($fu) {
            $fup = \App\Models\FormationUserPublication::where('formation_user_id', $fu->id)
                ->where('publication_id', $publication->id)
                ->first();

            $maxAttempts = $formation->max_attempts;
            if ($maxAttempts && $fup && $fup->status !== 'completed') {
                $effectiveMax = $maxAttempts + ($fup->bonus_attempts ?? 0);
                if (($fup->quiz_attempts ?? 0) >= $effectiveMax) {
                    return response()->json(['message' => 'Vous avez épuisé le nombre maximum de tentatives pour ce quiz.'], 403);
                }
            }
        }

        $attemptsUsed = 0;
        $effectiveMax = null;
        if (isset($fup)) {
            $attemptsUsed = $fup->quiz_attempts ?? 0;
            if ($formation->max_attempts) {
                $effectiveMax = $formation->max_attempts + ($fup->bonus_attempts ?? 0);
            }
        }

        $formationData = $quiz->formation;
        $questionCount = $formationData->quiz_question_count ?? 10;
        $randomQuestions = $quiz->getRandomQuestions($questionCount);

        $quizData = [
            'id' => $quiz->id,
            'formation_id' => $quiz->formation_id,
            'publication_id' => $quiz->publication_id,
            'questions' => $randomQuestions,
            'status' => $quiz->status,
            'approved_count' => $quiz->approved_count,
            'min_pass_percentage' => $formationData->min_pass_percentage ?? 70,
            'max_attempts' => $effectiveMax,
            'attempts_used' => $attemptsUsed,
            'time_per_question' => $formationData->quiz_time_per_question ?? 15,
        ];

        return response()->json(['data' => $quizData], 200, [], JSON_INVALID_UTF8_SUBSTITUTE);
    }

    #[OA\Get(
        path: '/formations/{formation}/publications/{publication}/quiz/review',
        summary: 'Récupérer le quiz pour review formateur',
        description: 'Retourne le quiz complet (toutes les questions) pour que le formateur puisse approuver/rejeter. Rôle Formateur ou Admin requis.',
        tags: ['Quiz'],
        security: [['bearerAuth' => []]],
        parameters: [
            new OA\Parameter(name: 'formation', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'ID de la formation'),
            new OA\Parameter(name: 'publication', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'ID de la publication'),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Quiz complet pour review', content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'data', ref: '#/components/schemas/Quiz'),
                ]
            )),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
            new OA\Response(response: 404, description: 'Aucun quiz pour cette publication'),
        ]
    )]
    public function getQuizForReview(Request $request, Formation $formation, Publication $publication)
    {
        $user = $request->user();
        $group = $publication->group;

        if (!$user->hasRole('Admin') && !($user->hasRole('Formateur') && $group->creator_id === $user->id)) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        $quiz = Quiz::where('formation_id', $formation->id)
            ->where('publication_id', $publication->id)
            ->latest()
            ->first();

        if (!$quiz) {
            return response()->json(['message' => 'Aucun quiz pour cette publication.'], 404);
        }

        return response()->json(['data' => $quiz], 200, [], JSON_INVALID_UTF8_SUBSTITUTE);
    }

    #[OA\Get(
        path: '/quizzes/{quiz}/status',
        summary: 'Vérifier le statut de génération d\'quiz',
        description: 'Permet de poller le statut d\'une génération asynchrone (generating → draft ou error).',
        tags: ['Quiz'],
        security: [['bearerAuth' => []]],
        parameters: [
            new OA\Parameter(name: 'quiz', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'ID du quiz'),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Statut du quiz', content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'data', type: 'object', properties: [
                        new OA\Property(property: 'id', type: 'integer'),
                        new OA\Property(property: 'status', type: 'string', enum: ['generating', 'draft', 'published', 'error']),
                        new OA\Property(property: 'approved_count', type: 'integer'),
                        new OA\Property(property: 'questions_count', type: 'integer'),
                        new OA\Property(property: 'generated_at', type: 'string', format: 'date-time', nullable: true),
                        new OA\Property(property: 'generation_error', type: 'string', nullable: true),
                    ]),
                ]
            )),
            new OA\Response(response: 401, description: 'Non authentifié'),
        ]
    )]
    public function getQuizStatus(Request $request, Quiz $quiz)
    {
        if ($quiz->status === 'generating' && $quiz->created_at) {
            $elapsed = now()->diffInMinutes($quiz->created_at);
            if ($elapsed > 7) {
                $quiz->update([
                    'status' => 'error',
                    'generation_error' => 'Génération timeout: aucune réponse après '.$elapsed.' minutes.',
                ]);
            }
        }

        return response()->json([
            'data' => [
                'id' => $quiz->id,
                'status' => $quiz->status,
                'approved_count' => $quiz->approved_count,
                'questions_count' => count($quiz->questions ?? []),
                'generated_at' => $quiz->generated_at,
                'generation_error' => $quiz->generation_error,
            ],
        ]);
    }

    #[OA\Get(
        path: '/quizzes/{quiz}/questions',
        summary: 'Récupérer toutes les questions d\'un quiz (formateur)',
        description: 'Retourne le quiz complet avec toutes les questions pour l\'édition. Rôle Formateur ou Admin requis.',
        tags: ['Quiz'],
        security: [['bearerAuth' => []]],
        parameters: [
            new OA\Parameter(name: 'quiz', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'ID du quiz'),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Quiz avec toutes les questions', content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'data', ref: '#/components/schemas/Quiz'),
                ]
            )),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
        ]
    )]
    public function getQuizQuestions(Request $request, Quiz $quiz)
    {
        $group = $quiz->formation->group;
        if (!$this->canManage($request, $group)) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        return response()->json(['data' => $quiz], 200, [], JSON_INVALID_UTF8_SUBSTITUTE);
    }

    #[OA\Patch(
        path: '/quizzes/{quiz}/toggle-question/{index}',
        summary: 'Approuver/rejeter une question du quiz',
        description: 'Inverse le statut approved d\'une question. Si < 30 questions validées après l\'opération, un warning est retourné avec un conseil de régénérer.',
        tags: ['Quiz'],
        security: [['bearerAuth' => []]],
        parameters: [
            new OA\Parameter(name: 'quiz', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'ID du quiz'),
            new OA\Parameter(name: 'index', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'Index de la question (0-based)'),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Question toggled avec succès', content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'message', type: 'string'),
                    new OA\Property(property: 'warning', type: 'string', nullable: true, description: 'Avertissement si < 30 questions validées'),
                    new OA\Property(property: 'data', ref: '#/components/schemas/QuizToggleResponse'),
                ]
            )),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
            new OA\Response(response: 404, description: 'Question introuvable'),
            new OA\Response(response: 422, description: 'Quiz déjà publié'),
        ]
    )]
    public function toggleQuestion(Request $request, Quiz $quiz, int $index)
    {
        $group = $quiz->formation->group;
        if (!$this->canManage($request, $group)) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        if ($quiz->status === 'published') {
            return response()->json(['message' => 'Ce quiz est déjà publié. Impossible de modifier les questions.'], 422);
        }

        $questions = $quiz->questions;
        if (!isset($questions[$index])) {
            return response()->json(['message' => 'Question introuvable.'], 404);
        }

        $questions[$index]['approved'] = !($questions[$index]['approved'] ?? true);
        $approvedCount = count(array_filter($questions, fn($q) => ($q['approved'] ?? false) === true));
        $totalCount = count($questions);
        $deselectedCount = $totalCount - $approvedCount;

        $quiz->update([
            'questions' => $questions,
            'approved_count' => $approvedCount,
        ]);

        $message = $questions[$index]['approved'] ? 'Question approuvée.' : 'Question rejetée.';
        $warning = null;

        if ($approvedCount < 30) {
            $warning = "Le nombre de questions validées est insuffisant ({$approvedCount} sur {$totalCount}). " .
                "Il est recommandé de régénérer un nouveau quiz pour obtenir un pool de questions plus consistant. " .
                "Vous ne pourrez pas publier le quiz tant qu'au moins 30 questions ne sont pas approuvées.";
        }

        return response()->json([
            'message' => $message,
            'warning' => $warning,
            'data' => [
                'index' => $index,
                'approved' => $questions[$index]['approved'],
                'approved_count' => $approvedCount,
                'total_questions' => $totalCount,
                'deselected_count' => $deselectedCount,
                'can_publish' => $approvedCount >= 30,
            ],
        ]);
    }

    #[OA\Post(
        path: '/quizzes/{quiz}/publish',
        summary: 'Publier un quiz',
        description: 'Publie le quiz (min. 30 questions approuvées requises). Désactive automatiquement le quiz précédent pour la même publication.',
        tags: ['Quiz'],
        security: [['bearerAuth' => []]],
        parameters: [
            new OA\Parameter(name: 'quiz', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'ID du quiz'),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Quiz publié', content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'message', type: 'string'),
                    new OA\Property(property: 'data', ref: '#/components/schemas/Quiz'),
                ]
            )),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
            new OA\Response(response: 422, description: 'Quiz déjà publié ou moins de 30 questions approuvées'),
        ]
    )]
    public function publishQuiz(Request $request, Quiz $quiz)
    {
        $group = $quiz->formation->group;
        if (!$this->canManage($request, $group)) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        if ($quiz->status === 'published') {
            return response()->json(['message' => 'Ce quiz est déjà publié.'], 422);
        }

        $approvedCount = count(array_filter($quiz->questions, fn($q) => ($q['approved'] ?? false) === true));

        if ($approvedCount < 30) {
            return response()->json([
                'message' => "Le nombre de questions approuvées est insuffisant ({$approvedCount} sur " . count($quiz->questions) . "). Il en faut au moins 30.",
                'approved_count' => $approvedCount,
            ], 422);
        }

        Quiz::where('formation_id', $quiz->formation_id)
            ->where('publication_id', $quiz->publication_id)
            ->where('id', '!=', $quiz->id)
            ->update(['status' => 'draft']);

        $quiz->publish();

        return response()->json([
            'message' => 'Quiz publié avec succès.',
            'data' => $quiz->fresh(),
        ], 200, [], JSON_INVALID_UTF8_SUBSTITUTE);
    }

    #[OA\Post(
        path: '/quizzes/{quiz}/regenerate',
        summary: 'Régénérer un quiz via l\'IA',
        description: 'Supprime le quiz actuel et lance une nouvelle génération asynchrone à partir du Markdown source.',
        tags: ['Quiz'],
        security: [['bearerAuth' => []]],
        parameters: [
            new OA\Parameter(name: 'quiz', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'ID du quiz'),
        ],
        responses: [
            new OA\Response(response: 202, description: 'Régénération lancée (asynchrone)', content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'message', type: 'string'),
                    new OA\Property(property: 'data', ref: '#/components/schemas/Quiz'),
                ]
            )),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
            new OA\Response(response: 422, description: 'Fichier Markdown non disponible'),
        ]
    )]
    public function regenerateQuiz(Request $request, Quiz $quiz)
    {
        $group = $quiz->formation->group;
        if (!$this->canManage($request, $group)) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        $publication = $quiz->publication;
        $formation = $quiz->formation;

        $mdPath = $this->findMarkdownForPublication($publication);
        if (!$mdPath) {
            return response()->json(['message' => 'Aucun fichier Markdown disponible.'], 422);
        }

        $markdown = Storage::disk('public')->get($mdPath);
        if (empty($markdown)) {
            return response()->json(['message' => 'Le fichier Markdown est vide.'], 422);
        }

        $quiz->delete();

        $newQuiz = Quiz::create([
            'formation_id' => $formation->id,
            'publication_id' => $publication->id,
            'questions' => [],
            'status' => 'generating',
            'approved_count' => 0,
            'generated_at' => null,
        ]);

        try {
            $job = new GenerateQuizJob($newQuiz, $markdown);
            $job->handle(app(OpenRouterService::class));
        } catch (\Throwable $e) {
            Log::error("Erreur régénération quiz {$newQuiz->id}: " . $e->getMessage());
            $newQuiz->update([
                'status' => 'error',
                'generation_error' => $e->getMessage(),
            ]);
            return response()->json([
                'message' => 'Échec de la régénération: ' . $e->getMessage(),
                'data' => $newQuiz->fresh(),
            ], 500);
        }

        return response()->json([
            'message' => 'Régénération du quiz en cours. Vous serez notifié(e) lorsque ce sera prêt.',
            'data' => $newQuiz->fresh(),
        ], 200, [], JSON_INVALID_UTF8_SUBSTITUTE);
    }

    #[OA\Post(
        path: '/quizzes/{quiz}/submit',
        summary: 'Soumettre ses réponses au quiz',
        description: 'Le collaborateur soumet ses réponses. Le score est calculé sur les questions approuvées. Si score >= min_pass_percentage, la publication suivante est débloquée.',
        tags: ['Quiz'],
        security: [['bearerAuth' => []]],
        parameters: [
            new OA\Parameter(name: 'quiz', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'ID du quiz'),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/QuizSubmissionRequest')
        ),
        responses: [
            new OA\Response(response: 200, description: 'Résultat du quiz', content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'message', type: 'string'),
                    new OA\Property(property: 'data', ref: '#/components/schemas/QuizResult'),
                ]
            )),
            new OA\Response(response: 403, description: 'Non assigné à la formation'),
            new OA\Response(response: 422, description: 'Nombre maximum de tentatives atteint ou réponses invalides'),
        ]
    )]
    public function submitQuiz(Request $request, Quiz $quiz)
    {
        $user = $request->user();
        $formation = $quiz->formation;

        $fu = FormationUser::where('formation_id', $formation->id)
            ->where('user_id', $user->id)
            ->first();

        if (!$fu) {
            return response()->json(['message' => 'Vous n\'êtes pas assigné à cette formation.'], 403);
        }

        // ── Deadline check ──
        if ($formation->progression_mode === 'guided' && $fu->started_at && $formation->duration_days) {
            $extendedDays = $fu->deadline_extended_days ?? 0;
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
                        'user_id' => $user->id,
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
                            'message' => "{$user->name} a dépassé le délai de la formation « {$formation->title} ».",
                            'data' => [
                                'formation_id' => $formation->id,
                                'formation_title' => $formation->title,
                                'group_id' => $group->id,
                                'group_name' => $group->name,
                                'user_id' => $user->id,
                            ],
                        ]);
                    }
                }

                return response()->json([
                    'message' => 'Le délai de la formation a été dépassé. Une demande a été envoyée à votre formateur.',
                    'deadline_passed' => true,
                    'blocked' => true,
                ], 422);
            }
        }

        $fup = FormationUserPublication::where('formation_user_id', $fu->id)
            ->where('publication_id', $quiz->publication_id)
            ->first();

        $maxAttempts = $formation->max_attempts;
        $effectiveMax = $maxAttempts + ($fup->bonus_attempts ?? 0);
        
        if ($maxAttempts && $fup && $fup->status !== 'completed' && ($fup->quiz_attempts ?? 0) >= $effectiveMax) {
            $fu->update(['status' => 'blocked', 'blocked_at' => now()]);

            $existingRequest = \App\Models\FormationBlockRequest::where('formation_user_id', $fu->id)
                ->where('publication_id', $quiz->publication_id)
                ->where('status', 'pending')
                ->first();

            if (!$existingRequest) {
                $blockRequest = \App\Models\FormationBlockRequest::create([
                    'formation_user_id' => $fu->id,
                    'user_id' => $user->id,
                    'formation_id' => $formation->id,
                    'publication_id' => $quiz->publication_id,
                    'block_reason' => 'attempts_exhausted',
                    'status' => 'pending',
                ]);

                $group = $formation->group;
                $formateur = $group->creator;
                if ($formateur) {
                    $pubTitle = $quiz->publication->title ?? 'Publication inconnue';
                    \App\Models\Notification::create([
                        'user_id' => $formateur->id,
                        'type' => 'training_assignment',
                        'title' => 'Demande de déblocage',
                        'message' => "{$user->name} a épuisé ses tentatives pour le quiz de « {$pubTitle} » dans la formation « {$formation->title} ».",
                        'data' => [
                            'formation_id' => $formation->id,
                            'formation_title' => $formation->title,
                            'group_id' => $group->id,
                            'group_name' => $group->name,
                            'block_request_id' => $blockRequest->id,
                            'user_id' => $user->id,
                            'user_name' => $user->name,
                            'publication_id' => $quiz->publication_id,
                            'publication_title' => $pubTitle,
                        ],
                    ]);
                }
            }

            return response()->json([
                'message' => "Vous avez atteint le nombre maximum de tentatives ({$effectiveMax}). Une demande a été envoyée à votre formateur.",
                'max_attempts_reached' => true,
                'blocked' => true,
                'attempts' => $fup->quiz_attempts,
                'max_attempts' => $effectiveMax,
            ], 422);
        }

        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
            'answers' => 'required|array',
            'answers.*' => 'required|integer|min:-1|max:3',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first()], 422);
        }

        $approvedQuestions = [];
        foreach ($quiz->questions as $idx => $q) {
            if (($q['approved'] ?? false) === true) {
                $approvedQuestions[] = ['original_index' => $idx] + $q;
            }
        }

        $presentedIndices = array_map('intval', array_keys($request->answers));

        $questionsToScore = array_filter(
            $approvedQuestions,
            fn($q) => in_array($q['original_index'], $presentedIndices, true)
        );

        $correctCount = 0;
        $results = [];

        foreach ($questionsToScore as $q) {
            $originalIdx = $q['original_index'];
            $userAnswer = $request->answers[$originalIdx] ?? -1;
            $isUnanswered = $userAnswer === -1;
            $isCorrect = $userAnswer === $q['answer'];
            if ($isCorrect) $correctCount++;
            $results[] = [
                'question_index' => $originalIdx,
                'user_answer' => $userAnswer,
                'correct_answer' => $q['answer'],
                'is_correct' => $isCorrect,
                'is_unanswered' => $isUnanswered,
            ];
        }

        $total = count($questionsToScore);
        $score = $total > 0 ? round(($correctCount / $total) * 100) : 0;
        $minPass = $formation->min_pass_percentage ?? 70;
        $passed = $score >= $minPass;

        $submission = QuizSubmission::create([
            'quiz_id' => $quiz->id,
            'user_id' => $user->id,
            'answers' => $results,
            'score' => $score,
            'total_questions' => $total,
            'passed' => $passed,
            'submitted_at' => now(),
        ]);

        if ($fup) {
            $attempts = ($fup->quiz_attempts ?? 0) + 1;
            $highest = max($fup->quiz_highest_score ?? 0, $score);

            $updateData = [
                'quiz_attempts' => $attempts,
                'quiz_highest_score' => $highest,
            ];

            if ($passed) {
                $updateData['status'] = 'completed';
                $updateData['completed_at'] = now();
            }

            $fup->update($updateData);

            if (!$passed && $maxAttempts && $fup->status !== 'completed' && $attempts >= $effectiveMax) {
                $fu->update(['status' => 'blocked', 'blocked_at' => now()]);

                if (($fup->bonus_attempts ?? 0) > 0) {
                    $pubTitle = $quiz->publication->title ?? 'Publication inconnue';
                    \App\Models\Notification::create([
                        'user_id' => $user->id,
                        'type' => 'training_assignment',
                        'title' => 'Échec définitif',
                        'message' => "Vous avez échoué le quiz de la publication « {$pubTitle} » après l'ajout d'une tentative supplémentaire. La formation « {$formation->title} » est définitivement bloquée.",
                        'data' => [
                            'formation_id' => $formation->id,
                            'formation_title' => $formation->title,
                        ],
                    ]);

                    $group = $formation->group;
                    $formateur = $group->creator;
                    if ($formateur) {
                        \App\Models\Notification::create([
                            'user_id' => $formateur->id,
                            'type' => 'training_assignment',
                            'title' => 'Échec définitif d\'un collaborateur',
                            'message' => "{$user->name} a définitivement échoué le quiz de « {$pubTitle} » dans la formation « {$formation->title} » après l'utilisation de sa tentative supplémentaire.",
                            'data' => [
                                'formation_id' => $formation->id,
                                'formation_title' => $formation->title,
                                'user_id' => $user->id,
                                'user_name' => $user->name,
                            ],
                        ]);
                    }
                } else {
                    $existingRequest = \App\Models\FormationBlockRequest::where('formation_user_id', $fu->id)
                        ->where('publication_id', $quiz->publication_id)
                        ->where('status', 'pending')
                        ->first();

                    if (!$existingRequest) {
                        $blockRequest = \App\Models\FormationBlockRequest::create([
                            'formation_user_id' => $fu->id,
                            'user_id' => $user->id,
                            'formation_id' => $formation->id,
                            'publication_id' => $quiz->publication_id,
                            'block_reason' => 'attempts_exhausted',
                            'status' => 'pending',
                        ]);

                        $group = $formation->group;
                        $formateur = $group->creator;
                        if ($formateur) {
                            $pubTitle = $quiz->publication->title ?? 'Publication inconnue';
                            \App\Models\Notification::create([
                                'user_id' => $formateur->id,
                                'type' => 'training_assignment',
                                'title' => 'Demande de déblocage',
                                'message' => "{$user->name} a épuisé ses tentatives pour le quiz de « {$pubTitle} » dans la formation « {$formation->title} ».",
                                'data' => [
                                    'formation_id' => $formation->id,
                                    'formation_title' => $formation->title,
                                    'group_id' => $group->id,
                                    'group_name' => $group->name,
                                    'block_request_id' => $blockRequest->id,
                                    'user_id' => $user->id,
                                    'user_name' => $user->name,
                                    'publication_id' => $quiz->publication_id,
                                    'publication_title' => $pubTitle,
                                ],
                            ]);
                        }
                    }
                }
            }

            if ($passed) {
                $currentFp = $formation->formationPublications()
                    ->where('publication_id', $quiz->publication_id)
                    ->first();

                if ($currentFp) {
                    $nextFp = $formation->formationPublications()
                        ->where('order', '>', $currentFp->order)
                        ->orderBy('order')
                        ->first();

                    if ($nextFp) {
                        $nextFup = FormationUserPublication::where('formation_user_id', $fu->id)
                            ->where('publication_id', $nextFp->publication_id)
                            ->where('status', 'locked')
                            ->first();

                        if ($nextFup) {
                            $nextFup->update(['status' => 'available']);
                        }
                    }
                }

                $currentPubIds = $formation->formationPublications()->pluck('publication_id');
                $allCompleted = FormationUserPublication::where('formation_user_id', $fu->id)
                    ->whereIn('publication_id', $currentPubIds)
                    ->where('status', '!=', 'completed')
                    ->count() === 0 && $currentPubIds->isNotEmpty();

                if ($allCompleted) {
                    $fu->update(['status' => 'completed']);
                }
            }
        }

        $remainingAttempts = null;
        if ($maxAttempts && $fup) {
            $remainingAttempts = max(0, $effectiveMax - ($fup->quiz_attempts ?? 0));
        }

        $formationCompleted = false;
        if ($passed) {
            $totalPubs = $formation->formationPublications()->count();
            $completedPubs = FormationUserPublication::where('formation_user_id', $fu->id)
                ->where('status', 'completed')
                ->count();
            $formationCompleted = $totalPubs > 0 && $completedPubs >= $totalPubs;
        }

        return response()->json([
            'message' => $passed ? 'Quiz réussi !' : 'Quiz échoué.',
            'data' => [
                'submission_id' => $submission->id,
                'score' => $score,
                'total_questions' => $total,
                'correct_answers' => $correctCount,
                'passed' => $passed,
                'min_pass_percentage' => $minPass,
                'results' => $results,
                'attempts_used' => $fup->quiz_attempts ?? 0,
                'max_attempts' => $effectiveMax,
                'remaining_attempts' => $remainingAttempts,
                'formation_completed' => $formationCompleted,
            ],
        ]);
    }

    #[OA\Post(
        path: '/publications/{publication}/convert-pdfs',
        summary: 'Convertir les PDF d\'une publication en Markdown',
        description: 'Convertit synchronement tous les PDF non encore convertis en fichiers Markdown. Nécessaire avant de pouvoir générer un quiz.',
        tags: ['Quiz'],
        security: [['bearerAuth' => []]],
        parameters: [
            new OA\Parameter(name: 'publication', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'ID de la publication'),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Résultat de la conversion', content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'message', type: 'string'),
                    new OA\Property(property: 'markdown_available', type: 'boolean'),
                    new OA\Property(property: 'markdown_path', type: 'string', nullable: true),
                    new OA\Property(property: 'errors', type: 'array', items: new OA\Items(type: 'string')),
                ]
            )),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
        ]
    )]
    public function convertPdfs(Request $request, Publication $publication)
    {
        $user = $request->user();
        $group = $publication->group;

        if (!$user->hasRole('Admin') && !($user->hasRole('Formateur') && $group->creator_id === $user->id)) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        $allPdfs = $publication->files()->get()->filter(function ($file) {
            return strtolower(pathinfo($file->file_name, PATHINFO_EXTENSION)) === 'pdf';
        });

        $toConvert = $allPdfs->filter(function ($file) {
            if ($file->markdown_path) {
                $mdFull = Storage::disk('public')->path($file->markdown_path);
                if (file_exists($mdFull)) {
                    return false;
                }
            }
            return true;
        });

        if ($toConvert->isEmpty()) {
            $existingMd = $this->findMarkdownForPublication($publication);
            return response()->json([
                'message' => $existingMd ? 'Tous les PDF ont déjà été convertis.' : 'Aucun fichier PDF à convertir.',
                'markdown_available' => $existingMd !== null,
                'markdown_path' => $existingMd,
                'converting' => false,
            ]);
        }

        $converted = 0;
        $errors = [];

        foreach ($toConvert as $pubFile) {
            \App\Jobs\ConvertPdfToMarkdownJob::dispatchSync($pubFile);

            $mdDir = 'markdown/' . $pubFile->publication_id;
            $mdFileName = pathinfo($pubFile->file_name, PATHINFO_FILENAME) . '.md';
            $mdFullPath = Storage::disk('public')->path($mdDir . '/' . $mdFileName);

            if (file_exists($mdFullPath) && filesize($mdFullPath) > 0) {
                if (!$pubFile->markdown_path) {
                    $pubFile->update(['markdown_path' => $mdDir . '/' . $mdFileName]);
                }
                $converted++;
            } else {
                $errors[] = $pubFile->file_name;
            }
        }

        $publication->unsetRelation('files');
        $mdPath = $this->findMarkdownForPublication($publication);

        $msg = "{$converted} fichier(s) PDF converti(s) en Markdown.";
        if (!empty($errors)) {
            $msg .= ' Erreur(s): ' . implode(', ', $errors);
        }

        return response()->json([
            'message' => $msg,
            'markdown_available' => $mdPath !== null,
            'markdown_path' => $mdPath,
            'errors' => $errors,
        ]);
    }

    #[OA\Get(
        path: '/publications/{publication}/markdown-status',
        summary: 'Vérifier le statut de conversion Markdown',
        description: 'Indique si un fichier Markdown est disponible pour la publication et combien de PDF restent à convertir.',
        tags: ['Quiz'],
        security: [['bearerAuth' => []]],
        parameters: [
            new OA\Parameter(name: 'publication', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'ID de la publication'),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Statut Markdown', content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'data', type: 'object', properties: [
                        new OA\Property(property: 'markdown_available', type: 'boolean'),
                        new OA\Property(property: 'markdown_path', type: 'string', nullable: true),
                        new OA\Property(property: 'pending_count', type: 'integer', description: 'Nombre de PDF encore à convertir'),
                    ]),
                ]
            )),
            new OA\Response(response: 401, description: 'Non authentifié'),
        ]
    )]
    public function checkMarkdownStatus(Request $request, Publication $publication)
    {
        $mdPath = $this->findMarkdownForPublication($publication);

        $allPdfs = $publication->files()->get()->filter(function ($file) {
            return strtolower(pathinfo($file->file_name, PATHINFO_EXTENSION)) === 'pdf';
        });

        $pendingCount = $allPdfs->filter(function ($file) {
            if ($file->markdown_path) {
                $mdFull = Storage::disk('public')->path($file->markdown_path);
                if (file_exists($mdFull)) return false;
            }
            return true;
        })->count();

        return response()->json([
            'data' => [
                'markdown_available' => $mdPath !== null,
                'markdown_path' => $mdPath,
                'pending_count' => $pendingCount,
            ],
        ]);
    }

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
            $files = Storage::disk('public')->files($mdDir);
            if (!empty($files)) {
                return $files[0];
            }
        }

        return null;
    }
}
