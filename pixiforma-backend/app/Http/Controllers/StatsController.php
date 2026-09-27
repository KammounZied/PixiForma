<?php

namespace App\Http\Controllers;

use App\Models\Formation;
use App\Models\FormationUser;
use App\Models\FormationUserPublication;
use App\Models\Quiz;
use App\Models\QuizSubmission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StatsController extends Controller
{
    public function myProgress(Request $request)
    {
        $user = $request->user();

        $formations = Formation::whereHas('learnerProgress', fn($q) => $q->where('user_id', $user->id))
            ->with([
                'group:id,name',
                'formationPublications.publication:id,title',
            ])
            ->get();

        $data = $formations->map(function ($formation) use ($user) {
            $fu = $formation->learnerProgress()->where('user_id', $user->id)->first();

            $pubProgress = [];
            if ($fu) {
                $pubProgress = $fu->publicationProgress()
                    ->with('publication:id,title')
                    ->get();
            }

            $myStatus = $fu->status ?? 'not_started';
            
            $deadline = null;
            $isOverdue = false;
            if ($fu?->started_at && $formation->duration_days) {
                $extendedDays = $fu->deadline_extended_days ?? 0;
                $deadlineDate = $fu->started_at->copy()->addDays($formation->duration_days + $extendedDays);
                $deadline = $deadlineDate->toDateString();
                if ($deadlineDate->copy()->endOfDay()->isPast() && $myStatus !== 'completed') {
                    $isOverdue = true;
                }
            }

            $publicationsList = $formation->formationPublications()->orderBy('order')->get();
            $quizzesData = $publicationsList->map(function ($fp) use ($pubProgress, $formation, $publicationsList, $myStatus, $isOverdue) {
                $pp = $pubProgress->firstWhere('publication_id', $fp->publication_id);
                $status = $pp ? $pp->status : null;

                if ($myStatus === 'not_started' || $isOverdue) {
                    $status = 'locked';
                } elseif (!$status) {
                    $prevPub = $publicationsList->firstWhere('order', $fp->order - 1);
                    if (!$prevPub) {
                        $status = 'available';
                    } else {
                        $prevPp = $pubProgress->firstWhere('publication_id', $prevPub->publication_id);
                        $prevStatus = $prevPp ? $prevPp->status : 'locked';
                        $status = $prevStatus === 'completed' ? 'available' : 'locked';
                    }
                }

                $quiz = Quiz::where('formation_id', $formation->id)
                    ->where('publication_id', $fp->publication_id)
                    ->where('status', 'published')
                    ->first();

                $lastSubmission = null;
                if ($quiz && $pp) {
                    $lastSubmission = QuizSubmission::where('quiz_id', $quiz->id)
                        ->where('user_id', request()->user()->id)
                        ->orderByDesc('submitted_at')
                        ->first();
                }

                return [
                    'publication_id' => $fp->publication_id,
                    'title' => $fp->publication->title ?? '',
                    'order' => $fp->order,
                    'fup_status' => $status,
                    'quiz_attempts' => $pp->quiz_attempts ?? 0,
                    'bonus_attempts' => $pp->bonus_attempts ?? 0,
                    'max_attempts' => $formation->max_attempts,
                    'quiz_highest_score' => $pp->quiz_highest_score ?? null,
                    'quiz_passed' => $lastSubmission?->passed ?? false,
                    'last_score' => $lastSubmission?->score ?? null,
                    'completed_at' => $pp->completed_at ?? null,
                ];
            });

            $totalPubs = $publicationsList->count();
            $completedPubs = $quizzesData->where('fup_status', 'completed')->count();
            $availablePubs = $quizzesData->where('fup_status', 'available')->count();
            $lockedPubs = $quizzesData->where('fup_status', 'locked')->count();

            $totalAttemptsUsed = $pubProgress->sum('quiz_attempts');
            $totalBonusUsed = $pubProgress->sum('bonus_attempts');

            return [
                'formation_id' => $formation->id,
                'title' => $formation->title,
                'group_name' => $formation->group->name ?? '',
                'progression_mode' => $formation->progression_mode,
                'my_status' => $fu->status ?? 'not_started',
                'started_at' => $fu?->started_at?->toISOString(),
                'deadline' => $deadline,
                'total_publications' => $totalPubs,
                'completed_publications' => $completedPubs,
                'available_publications' => $availablePubs,
                'locked_publications' => $lockedPubs,
                'progress_percentage' => $totalPubs > 0 ? round(($completedPubs / $totalPubs) * 100, 2) : 0,
                'total_attempts_used' => $totalAttemptsUsed,
                'total_bonus_used' => $totalBonusUsed,
                'quizzes' => $quizzesData,
            ];
        });

        return response()->json(['data' => $data]);
    }

    public function formationStats(Request $request, Formation $formation)
    {
        $user = $request->user();
        $group = $formation->group;

        if (!$user->hasRole('Admin') && $group->creator_id !== $user->id) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        $learnerProgress = $formation->learnerProgress()
            ->with(['user:id,name,email', 'publicationProgress.publication:id,title'])
            ->get();

        $totalLearners = $learnerProgress->count();
        $byStatus = [
            'not_started' => $learnerProgress->where('status', 'not_started')->count(),
            'in_progress' => $learnerProgress->where('status', 'in_progress')->count(),
            'blocked' => $learnerProgress->where('status', 'blocked')->count(),
            'completed' => $learnerProgress->where('status', 'completed')->count(),
        ];

        $totalPubs = $formation->formationPublications()->count();

        $avgScoreRaw = $learnerProgress->map(function ($fu) use ($formation) {
            $subs = QuizSubmission::whereHas('quiz', fn($q) => $q->where('formation_id', $formation->id))
                ->where('user_id', $fu->user_id)
                ->get();
            return $subs->isNotEmpty() ? $subs->avg('score') : null;
        })->filter(function($val) { return $val !== null; });
        $avgScore = $avgScoreRaw->isNotEmpty() ? round($avgScoreRaw->avg(), 2) : 0;

        $passedLearners = $learnerProgress->filter(function ($fu) use ($formation) {
            return QuizSubmission::whereHas('quiz', fn($q) => $q->where('formation_id', $formation->id))
                ->where('user_id', $fu->user_id)
                ->where('passed', true)
                ->exists();
        })->count();
        $completedFormations = $learnerProgress->where('status', 'completed')->count();
        
        $passRate = $completedFormations > 0 ? round(($passedLearners / $completedFormations) * 100, 2) : 0;
        
        $totalAttempts = QuizSubmission::whereHas('quiz', fn($q) => $q->where('formation_id', $formation->id))->count();
        
        $completionRate = $totalLearners > 0 ? round(($completedFormations / $totalLearners) * 100, 2) : 0;

        $learners = $learnerProgress->map(function ($fu) use ($formation, $totalPubs) {
            $pubProgress = $fu->publicationProgress()
                ->with('publication:id,title')
                ->get();

            $completedPubs = $pubProgress->where('status', 'completed')->count();
            $totalAttempts = $pubProgress->sum('quiz_attempts');
            $totalBonus = $pubProgress->sum('bonus_attempts');
            $completedAttempts = $pubProgress->where('status', 'completed')->sum('quiz_attempts');
            $completedBonus = $pubProgress->where('status', 'completed')->sum('bonus_attempts');
            $highestScore = $pubProgress->whereNotNull('quiz_highest_score')->max('quiz_highest_score');

            $hasPassedAny = $pubProgress->contains('status', 'completed');

            $avgAttemptsPerPub = $completedPubs > 0 ? round($completedAttempts / $completedPubs, 2) : 0;
            $avgAttemptsWithBonus = $completedPubs > 0 ? round(($completedAttempts + $completedBonus) / $completedPubs, 2) : 0;

            $learnerDeadline = null;
            if ($fu->started_at && $formation->duration_days) {
                $extendedDays = $fu->deadline_extended_days ?? 0;
                $learnerDeadline = $fu->started_at->copy()->addDays($formation->duration_days + $extendedDays)->toDateString();
            }

            return [
                'user_id' => $fu->user_id,
                'name' => $fu->user->name ?? 'Inconnu',
                'email' => $fu->user->email ?? '',
                'status' => $fu->status,
                'started_at' => $fu->started_at?->toISOString(),
                'deadline' => $learnerDeadline,
                'deadline_extended_days' => $fu->deadline_extended_days ?? 0,
                'completed_publications' => $completedPubs,
                'total_publications' => $totalPubs,
                'progress_percentage' => $totalPubs > 0 ? round(($completedPubs / $totalPubs) * 100, 2) : 0,
                'total_attempts' => $totalAttempts,
                'bonus_attempts_used' => $totalBonus,
                'highest_score' => $highestScore !== null ? round($highestScore, 2) : null,
                'has_passed_quiz' => $hasPassedAny,
                'avg_attempts_per_pub' => $avgAttemptsPerPub,
                'avg_attempts_with_bonus' => $avgAttemptsWithBonus,
                'publication_progress' => $pubProgress->map(function ($pp) {
                    return [
                        'publication_id' => $pp->publication_id,
                        'title' => $pp->publication->title ?? '',
                        'status' => $pp->status,
                        'quiz_attempts' => $pp->quiz_attempts,
                        'bonus_attempts' => $pp->bonus_attempts ?? 0,
                        'quiz_highest_score' => $pp->quiz_highest_score,
                        'completed_at' => $pp->completed_at?->toISOString(),
                    ];
                }),
            ];
        });

        $avgAttemptsToCompletePub = 0;
        $completedFups = FormationUserPublication::whereHas('formationUser', fn($q) => $q->where('formation_id', $formation->id))
            ->where('status', 'completed')
            ->get();
        if ($completedFups->isNotEmpty()) {
            $avgAttemptsToCompletePub = round($completedFups->avg('quiz_attempts'), 2);
        }

        return response()->json([
            'data' => [
                'formation_id' => $formation->id,
                'formation_title' => $formation->title,
                'progression_mode' => $formation->progression_mode,
                'created_at' => $formation->created_at?->toISOString(),
                'total_publications' => $totalPubs,
                'total_learners' => $totalLearners,
                'by_status' => $byStatus,
                'completion_rate' => $completionRate,
                'total_attempts' => $totalAttempts,
                'avg_score' => $avgScore,
                'pass_rate' => $passRate,
                'avg_attempts_per_completed_pub' => $avgAttemptsToCompletePub,
                'max_attempts' => $formation->max_attempts,
                'learners' => $learners,
            ],
        ]);
    }

    public function myFormations(Request $request)
    {
        $user = $request->user();

        $formations = Formation::where('creator_id', $user->id)
            ->with('group:id,name')
            ->get()
            ->map(function ($formation) {
                $totalLearners = $formation->learnerProgress()->count();
                $completed = $formation->learnerProgress()->where('status', 'completed')->count();

                return [
                    'id' => $formation->id,
                    'title' => $formation->title,
                    'group_name' => $formation->group->name ?? '',
                    'progression_mode' => $formation->progression_mode,
                    'max_attempts' => $formation->max_attempts,
                    'total_learners' => $totalLearners,
                    'completed_learners' => $completed,
                    'total_publications' => $formation->formationPublications()->count(),
                ];
            });

        return response()->json(['data' => $formations]);
    }
}
