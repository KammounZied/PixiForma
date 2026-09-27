<?php

namespace App\Jobs;

use App\Models\Quiz;
use App\Models\Notification;
use App\Services\AI\OpenRouterService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class GenerateQuizJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 600;
    public int $tries = 3;
    public int $backoff = 10;

    public function __construct(
        public Quiz $quiz,
        public string $markdownContent,
    ) {}

    public function handle(OpenRouterService $ai): void
    {
        Log::info("Début génération quiz {$this->quiz->id}...");

        $markdown = $this->sanitizeUtf8($this->markdownContent);

        if (empty(trim($markdown))) {
            throw new \Exception('Le contenu Markdown est vide après nettoyage.');
        }

        $raw = $this->sanitizeUtf8($ai->generateQuiz($markdown, 50));

        Log::info("Quiz {$this->quiz->id}: réponse IA reçue (" . strlen($raw) . " octets)");

        $data = $ai->parseQuizResponse($raw);

        if (!$data || !isset($data['questions'])) {
            $data = $this->parseAiResponse($raw);
        }

        if (!$data || !isset($data['questions'])) {
            Log::error("Quiz {$this->quiz->id}: réponse IA non parsable", ['raw' => mb_substr($raw, 0, 500)]);
            throw new \Exception('La réponse de l\'IA n\'est pas au format attendu.');
        }

        $questions = array_map(function ($q) {
            $choices = $q['choices'] ?? [];
            if (!is_array($choices)) {
                $choices = [];
            }
            $choices = array_map(fn($c) => $this->sanitizeUtf8((string) $c), $choices);

            while (count($choices) < 4) {
                $choices[] = 'Réponse non fournie';
            }
            $choices = array_slice($choices, 0, 4);

            $answer = $q['answer'] ?? 0;
            if (!is_int($answer) || $answer < 0 || $answer > 3) {
                $answer = 0;
            }

            $questionText = $this->sanitizeUtf8((string) ($q['question'] ?? ''));
            if (empty(trim($questionText))) {
                return null;
            }

            return [
                'question' => $questionText,
                'choices' => $choices,
                'answer' => $answer,
                'approved' => true,
            ];
        }, $data['questions']);

        $questions = array_filter($questions);
        $questions = array_values($questions);

        if (empty($questions)) {
            throw new \Exception('Aucune question valide générée par l\'IA.');
        }

        $this->quiz->update([
            'questions' => $questions,
            'status' => 'draft',
            'approved_count' => count($questions),
            'generated_at' => now(),
            'generation_error' => null,
        ]);

        Log::info("Quiz {$this->quiz->id} généré avec succès (" . count($questions) . " questions).");
        $this->notifyCreator('success');
    }

    public function failed(\Throwable $exception): void
    {
        Log::error("Erreur (définitive) lors de la génération du quiz {$this->quiz->id}: " . $exception->getMessage());
        $this->quiz->update([
            'status' => 'error',
            'generation_error' => 'Erreur serveur: ' . $exception->getMessage(),
        ]);
        $this->notifyCreator('error');
    }

    private function sanitizeUtf8(string $value): string
    {
        $cleaned = preg_replace('/[^\x{00}-\x{10FFFF}]/u', '', $value);
        return $cleaned !== null ? $cleaned : '';
    }

    private function parseAiResponse(string $raw): ?array
    {
        $cleaned = preg_replace('/```(?:json)?\s*/i', '', $raw);
        $cleaned = preg_replace('/```\s*/', '', $cleaned);
        $cleaned = trim($cleaned);

        $jsonStart = strpos($cleaned, '{');
        $jsonEnd = strrpos($cleaned, '}');

        if ($jsonStart !== false && $jsonEnd !== false) {
            $jsonStr = substr($cleaned, $jsonStart, $jsonEnd - $jsonStart + 1);
            $data = json_decode($jsonStr, true);
            if ($data && isset($data['questions'])) {
                return $data;
            }
        }

        return null;
    }

    private function notifyCreator(string $status): void
    {
        $publication = $this->quiz->publication;
        $formation = $this->quiz->formation;
        $group = $formation->group;
        $questionsCount = count($this->quiz->questions ?? []);

        if ($status === 'success') {
            Notification::create([
                'user_id' => $group->creator_id,
                'type' => 'quiz_generation_success',
                'title' => 'Quiz généré avec succès',
                'message' => "Le quiz pour la publication « {$publication->title} » dans la formation « {$formation->title} » est prêt ({$questionsCount} questions).",
                'data' => [
                    'quiz_id' => $this->quiz->id,
                    'formation_id' => $formation->id,
                    'publication_id' => $publication->id,
                    'group_id' => $group->id,
                ],
            ]);
        } else {
            Notification::create([
                'user_id' => $group->creator_id,
                'type' => 'quiz_generation_error',
                'title' => 'Échec de génération du quiz',
                'message' => "La génération du quiz pour « {$publication->title} » a échoué.",
                'data' => [
                    'quiz_id' => $this->quiz->id,
                    'formation_id' => $formation->id,
                    'publication_id' => $publication->id,
                    'group_id' => $group->id,
                ],
            ]);
        }
    }
}
