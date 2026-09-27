<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Http;
use App\Http\Controllers\AIController;
Route::get('/', function () {
    return view('welcome');
});

Route::get('/test-ai', [AIController::class, 'test']);
Route::get('/test-quiz', [AIController::class, 'testQuiz']);
Route::get('/test-summary', [AIController::class, 'testSummary']);