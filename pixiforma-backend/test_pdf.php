<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

try {
    $pdf = \Barryvdh\DomPDF\Facade\Pdf::setOptions(['isRemoteEnabled' => true])->loadHTML('<h1>Test</h1>');
    echo "Success with setOptions!";
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage();
} catch (\Error $e) {
    echo "Fatal Error: " . $e->getMessage();
}
