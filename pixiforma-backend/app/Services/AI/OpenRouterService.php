<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OpenRouterService implements AIService
{
    private const CHUNK_SIZE = 25000;
    private const MAX_CHUNKS = 2;

    private function sendPrompt(string $prompt): string
    {
        $response = Http::withoutVerifying()
            ->timeout(200)
            ->connectTimeout(30)
            ->withHeaders([
                'Authorization' => 'Bearer '.config('services.openrouter.key'),
                'Content-Type' => 'application/json',
            ])
            ->post(
                'https://openrouter.ai/api/v1/chat/completions',
                [
                    'model' => config('services.openrouter.model', 'openrouter/free'),
                    'messages' => [
                        [
                            'role' => 'user',
                            'content' => $prompt,
                        ],
                    ],
                ]
            );

        if ($response->failed()) {
            $errorBody = $response->body();
            Log::error('OpenRouter API error', [
                'status' => $response->status(),
                'body' => $errorBody,
            ]);
            throw new \RuntimeException('Erreur API OpenRouter (HTTP '.$response->status().'): '.$errorBody);
        }

        $body = json_decode($response->body(), true);

        if (!is_array($body)) {
            throw new \RuntimeException('Réponse API invalide: '.$response->body());
        }

        if (isset($body['error'])) {
            $errorMsg = $body['error']['message'] ?? json_encode($body['error']);
            Log::error('OpenRouter API returned error', ['error' => $errorMsg]);
            throw new \RuntimeException('Erreur API OpenRouter: '.$errorMsg);
        }

        if (isset($body['choices'][0]['message']['content'])) {
            return $body['choices'][0]['message']['content'];
        }

        throw new \RuntimeException('Réponse API inattendue (pas de contenu): '.json_encode($body));
    }

    public function chat(string $prompt): string
    {
        return $this->sendPrompt($prompt);
    }

    public function generateSummary(string $markdown): string
    {
        $prompt = "Tu es un expert pédagogique.

Lis attentivement le document Markdown suivant et synthétise-le.

Génère un résumé ultra-concis, clair et qualitatif de ce document (environ 25 à 40 lignes maximum). Va à l'essentiel.

RÈGLES DE FORMATAGE (à respecter impérativement) :
- Utilise la même langue que le document (français par défaut).
- Sois bref : pas de phrases inutiles, privilégie les listes à puces pour les points clés.
- Utilise # pour un grand titre principal (optionnel).
- Utilise ## pour les titres de sections et ### pour les sous-sections.
- Utilise - pour les listes à puces.
- Tu PEUX utiliser du texte en **gras** pour mettre en valeur les concepts clés.
- Sépare les sections par une ligne vide.
- N'utilise PAS de guillemets courbes (« » \" \" ' ') — utilise les guillemets droits simples (').
- PAS de tirets cadratins (—) — utilise le tiret simple (-).
- Conserve uniquement les notions primordiales.
- Ne pas inventer d'informations.

Exemple de structure :
# Titre Principal du Document

## 1. Concepts Fondamentaux
- **Concept clé** : Explication brève.
- Autre notion importante.

## 2. Applications Pratiques
- Point important.

Document :

".$markdown;

        $raw = $this->sendPrompt($prompt);
        return $this->sanitizeSummary($raw);
    }

    private function sanitizeSummary(string $text): string
    {
        $text = preg_replace('/[«»""]/u', "'", $text);
        // em dash, en dash → simple dash
        $text = preg_replace('/[—–]/u', '-', $text);
        // non-breaking spaces & thin spaces → normal space
        $text = preg_replace('/[\x{00A0}\x{2000}-\x{200B}\x{202F}\x{FEFF}]/u', ' ', $text);
        // smart apostrophe → straight apostrophe
        $text = preg_replace('/[’ʼ]/u', "'", $text);
        // remove zero-width chars
        $text = preg_replace('/[\x{200B}\x{200C}\x{200D}]/u', '', $text);
        // strip code markers
        $text = preg_replace('/`{1,3}([^`]+)`{1,3}/u', '$1', $text);
        // strip HTML tags that might sneak in
        $text = strip_tags($text);
        // collapse multiple blank lines
        $text = preg_replace("/\n{3,}/", "\n\n", $text);
        // ensure headings have a space after # (clean up things like ##Title → ## Title)
        // Fixed regex: prevents backtracking from splitting '## ' into '# #'
        $text = preg_replace('/^(#{1,6})([^#\s])/m', '$1 $2', $text);
        // trim
        return trim($text);
    }

    public function generateQuiz(string $markdown, int $questions = 50): string
    {
        $chunks = $this->splitMarkdownIntoChunks($markdown, self::CHUNK_SIZE, self::MAX_CHUNKS);
        $totalChunks = count($chunks);

        if ($totalChunks === 1) {
            return $this->generateQuizFromChunk($chunks[0], $questions);
        }

        $questionsPerChunk = 30;

        Log::info("Quiz generation: markdown decoupe en {$totalChunks} morceaux ({$questionsPerChunk} questions/morceau).");

        $allQuestions = [];
        $failedChunks = 0;
        foreach ($chunks as $i => $chunk) {
            try {
                $raw = $this->generateQuizFromChunk($chunk, $questionsPerChunk);
                $data = $this->parseQuizResponse($raw);

                if (!$data || !isset($data['questions']) || empty($data['questions'])) {
                    Log::warning("Chunk " . ($i + 1) . "/" . $totalChunks . ": reponse IA invalide, ignore.");
                    $failedChunks++;
                    continue;
                }

                foreach ($data['questions'] as $q) {
                    $allQuestions[] = $q;
                }
            } catch (\Throwable $e) {
                Log::error("Chunk " . ($i + 1) . "/" . $totalChunks . ": erreur - " . $e->getMessage());
                $failedChunks++;
            }
        }

        if (empty($allQuestions)) {
            throw new \RuntimeException(
                "Aucune question générée. " .
                ($failedChunks > 0 ? "{$failedChunks} morceau(x) ont échoué." : "Le document est peut-être trop court.")
            );
        }

        $allQuestions = $this->deduplicateQuestions($allQuestions);

        Log::info("Quiz generation: " . count($allQuestions) . " questions uniques générées.");

        return json_encode(['questions' => $allQuestions]);
    }

    private function generateQuizFromChunk(string $markdown, int $questions): string
    {
        $prompt = "Tu es un expert en conception pédagogique.

À partir du document Markdown ci-dessous, génère {$questions} questions QCM en français.
- chaque question possède 4 propositions (choices)
- une seule bonne réponse
- trois mauvaises réponses plausibles
- ne pas inventer d'informations absentes du document
- couvrir l'ensemble du document
- RESPECTER STRICTEMENT LA FORMAT ATTENDU CI-DESSOUS
Retourne UNIQUEMENT un objet JSON brut, sans markdown, sans bloc de code, sans texte autour.
Le format exact attendu est :
{\"questions\":[{\"question\":\"...\",\"choices\":[\"...\",\"...\",\"...\",\"...\"],\"answer\":0}]}

answer est l'index (0-3) de la bonne réponse dans le tableau choices.

Document :
{$markdown}";

        return $this->sendPrompt($prompt);
    }

    private function splitMarkdownIntoChunks(string $markdown, int $maxSize, int $maxChunks): array
    {
        $paragraphs = preg_split('/\n\n+/', $markdown);
        $chunks = [];
        $currentChunk = '';

        foreach ($paragraphs as $p) {
            $p = trim($p);
            if (empty($p)) continue;
            
            if (mb_strlen($currentChunk) + mb_strlen($p) + 2 > $maxSize && !empty($currentChunk)) {
                $chunks[] = $currentChunk;
                if (count($chunks) >= $maxChunks) {
                    break;
                }
                $currentChunk = $p;
            } else {
                $currentChunk .= (empty($currentChunk) ? '' : "\n\n") . $p;
            }
        }

        if (count($chunks) < $maxChunks && !empty($currentChunk)) {
            $chunks[] = $currentChunk;
        }

        if (empty($chunks)) {
            $chunks[] = mb_substr($markdown, 0, $maxSize);
        }

        return $chunks;
    }

    private function deduplicateQuestions(array $questions): array
    {
        $seen = [];
        $unique = [];
        foreach ($questions as $q) {
            $key = strtolower(trim($q['question'] ?? ''));
            if (!empty($key) && !isset($seen[$key])) {
                $seen[$key] = true;
                $unique[] = $q;
            }
        }
        return $unique;
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
            if (json_last_error() === JSON_ERROR_NONE && isset($data['questions'])) {
                return $data;
            }
        }

        $arrayStart = strpos($cleaned, '[');
        $arrayEnd = strrpos($cleaned, ']');

        if ($arrayStart !== false && $arrayEnd !== false) {
            $jsonStr = substr($cleaned, $arrayStart, $arrayEnd - $arrayStart + 1);
            $data = json_decode($jsonStr, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($data) && isset($data[0]['question'])) {
                return ['questions' => $data];
            }
        }

        return null;
    }

    public function parseQuizResponse(string $raw): ?array
    {
        if (empty(trim($raw))) {
            return null;
        }

        $cleaned = preg_replace('/```(?:json)?\s*/i', '', $raw);
        $cleaned = preg_replace('/```\s*/', '', $cleaned);
        $cleaned = trim($cleaned);

        $data = json_decode($cleaned, true);
        if (json_last_error() === JSON_ERROR_NONE && isset($data['questions'])) {
            return $data;
        }

        $jsonStart = strpos($cleaned, '{');
        $jsonEnd = strrpos($cleaned, '}');

        if ($jsonStart !== false && $jsonEnd !== false) {
            $jsonStr = substr($cleaned, $jsonStart, $jsonEnd - $jsonStart + 1);
            $data = json_decode($jsonStr, true);
            if (json_last_error() === JSON_ERROR_NONE && isset($data['questions'])) {
                return $data;
            }
        }

        $arrayStart = strpos($cleaned, '[');
        $arrayEnd = strrpos($cleaned, ']');

        if ($arrayStart !== false && $arrayEnd !== false) {
            $jsonStr = substr($cleaned, $arrayStart, $arrayEnd - $arrayStart + 1);
            $data = json_decode($jsonStr, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($data)) {
                if (isset($data[0]['question'])) {
                    return ['questions' => $data];
                }
            }
        }

        if (preg_match('/\{[\s\S]*"questions"[\s\S]*\}/', $cleaned, $matches)) {
            $data = json_decode($matches[0], true);
            if (json_last_error() === JSON_ERROR_NONE && isset($data['questions'])) {
                return $data;
            }
        }

        return null;
    }
}
