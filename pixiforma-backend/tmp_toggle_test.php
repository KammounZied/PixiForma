<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// Find a formateur user for quiz 29
$quiz = App\Models\Quiz::find(29);
$group = $quiz->formation->group;
$creator = $group->creator;

echo "User: {$creator->name} (id={$creator->id})\n";
echo "Roles: " . $creator->getRoleNames()->implode(', ') . "\n";

// Create a Passport token for this user
$token = $creator->createToken('test-toggle', ['*'])->accessToken;
echo "Token: " . substr($token, 0, 40) . "...\n\n";

// Make HTTP request to Laravel
$client = new \GuzzleHttp\Client([
    'base_uri' => 'http://localhost:8000',
    'http_errors' => false,
]);

$response = $client->patch("/api/quizzes/29/toggle-question/0", [
    'headers' => [
        'Authorization' => 'Bearer ' . $token,
        'Content-Type' => 'application/json',
        'Accept' => 'application/json',
    ],
    'json' => new \stdClass(),
]);

echo "Status: {$response->getStatusCode()}\n";
echo "Body: " . $response->getBody()->getContents() . "\n";
