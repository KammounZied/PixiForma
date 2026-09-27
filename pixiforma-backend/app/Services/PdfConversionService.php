<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class PdfConversionService
{
    private string $pythonBin;
    private string $scriptPath;

    public function __construct()
    {
        $this->pythonBin = env('PYTHON_BIN', 'python');
        $this->scriptPath = base_path('scripts/pdf_to_markdown.py');
    }

    public function convert(string $pdfDiskPath): ?string
    {
        $fullPath = Storage::disk('local')->path($pdfDiskPath);
        $fullPath = str_replace('\\', '/', $fullPath);

        if (!file_exists($fullPath)) {
            Log::error("PDF file not found: {$fullPath}");
            return null;
        }

        $tmpFile = tempnam(sys_get_temp_dir(), 'md_');
        $escapedPath = escapeshellarg($fullPath);
        $escapedScript = escapeshellarg($this->scriptPath);
        $escapedTmp = escapeshellarg($tmpFile);
        $command = "{$this->pythonBin} {$escapedScript} {$escapedPath} {$escapedTmp} 2>&1";

        Log::info("Running PDF conversion: python={$this->pythonBin} pdf={$fullPath}");

        $output = [];
        $exitCode = 0;
        exec($command, $output, $exitCode);

        if ($exitCode !== 0) {
            Log::error("PDF conversion failed (exit {$exitCode}): " . implode("\n", $output));
            @unlink($tmpFile);
            return null;
        }

        if (file_exists($tmpFile) && filesize($tmpFile) > 0) {
            $result = file_get_contents($tmpFile);
            @unlink($tmpFile);
            if (!empty(trim($result))) {
                return $result;
            }
        }

        @unlink($tmpFile);
        Log::warning("PDF conversion produced no output file for: {$pdfDiskPath}");
        return null;
    }
}
