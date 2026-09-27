<?php

namespace App\Services\AI;

interface AIService
{
    public function chat(string $prompt): string;

    public function generateQuiz(string $markdown, int $questions = 40): string;

    public function generateSummary(string $markdown): string;
}