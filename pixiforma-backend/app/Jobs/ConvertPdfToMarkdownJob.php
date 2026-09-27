<?php

namespace App\Jobs;

use App\Models\PublicationFile;
use App\Models\Notification;
use App\Services\PdfConversionService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ConvertPdfToMarkdownJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 600;
    public int $tries = 2;

    public function __construct(
        public PublicationFile $publicationFile,
    ) {}

    public function handle(PdfConversionService $converter): void
    {
        $filePath = $this->publicationFile->file_path;

        if (!$this->isPdf($filePath)) {
            return;
        }

        $markdownDir = 'markdown/' . $this->publicationFile->publication_id;
        $mdFileName = pathinfo($this->publicationFile->file_name, PATHINFO_FILENAME) . '.md';
        $mdRelativePath = $markdownDir . '/' . $mdFileName;

        Storage::disk('public')->makeDirectory($markdownDir);

        $markdown = $converter->convert($filePath);

        if ($markdown === null) {
            $this->notifyOwner('error');
            Log::warning("Could not convert PDF to markdown: {$this->publicationFile->file_name}");
            return;
        }

        Storage::disk('public')->put($mdRelativePath, $markdown);

        $this->publicationFile->update(['markdown_path' => $mdRelativePath]);

        Log::info("PDF converted to markdown: {$mdRelativePath}");
    }

    private function notifyOwner(string $status): void
    {
        // Only notify on error, not on success
        if ($status !== 'success') {
            $publication = $this->publicationFile->publication;
            $group = $publication->group;
            $fileName = $this->publicationFile->file_name;
            $formationId = $publication->formations()->first()?->id;

            Notification::create([
                'user_id' => $group->creator_id,
                'type' => 'pdf_conversion_error',
                'title' => 'Échec de conversion PDF',
                'message' => "La conversion du fichier « {$fileName} » de la publication « {$publication->title} » a échoué.",
                'data' => [
                    'publication_id' => $publication->id,
                    'group_id' => $group->id,
                    'formation_id' => $formationId,
                ],
            ]);
        }
    }

    private function isPdf(string $path): bool
    {
        return strtolower(pathinfo($path, PATHINFO_EXTENSION)) === 'pdf';
    }
}
