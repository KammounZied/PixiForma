<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$user = App\Models\User::first();
$token = $user->createToken('TestToken')->accessToken;

$context = stream_context_create([
    'http' => [
        'header' => "Authorization: Bearer $token\r\n"
    ]
]);

$response = @file_get_contents('http://localhost:8000/api/roles', false, $context);
if ($response === false) {
    $error = error_get_last();
    echo "HTTP request failed: " . $error['message'] . "\n";
} else {
    echo $response;
}
