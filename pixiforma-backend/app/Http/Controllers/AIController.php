<?php

namespace App\Http\Controllers;

use App\Services\AI\OpenRouterService;
use Illuminate\Support\Facades\Storage;

class AIController extends Controller
{
    public function test(OpenRouterService $ai)
    {
        return $ai->chat("bonjour !");
    }
    public function testQuiz(OpenRouterService $ai)
    {
    $markdown = Storage::disk('public')
        ->get('markdown/cours.md');

    return $ai->generateQuiz($markdown, 40);
    }
    public function testSummary(OpenRouterService $ai)
    {
    $markdown = Storage::disk('public')
        ->get('markdown/cours.md');

    return $ai->generateSummary($markdown);
    }
}