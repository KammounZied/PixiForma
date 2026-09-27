<?php

use App\Models\Publication;
use App\Models\PublicationFile;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

return new class extends Migration
{
    public function up(): void
    {
        foreach (Publication::whereNotNull('file_path')->cursor() as $publication) {
            $publication->files()->create([
                'file_path' => $publication->file_path,
                'file_name' => $publication->file_name,
                'file_size' => Storage::disk('local')->exists($publication->file_path)
                    ? Storage::disk('local')->size($publication->file_path)
                    : null,
            ]);
        }

        Schema::table('publications', function (Blueprint $table) {
            $table->dropColumn(['file_path', 'file_name']);
        });
    }

    public function down(): void
    {
        Schema::table('publications', function (Blueprint $table) {
            $table->string('file_path')->nullable()->after('content');
            $table->string('file_name')->nullable()->after('file_path');
        });

        foreach (PublicationFile::cursor() as $pubFile) {
            $publication = $pubFile->publication;
            if ($publication && !$publication->file_path) {
                $publication->update([
                    'file_path' => $pubFile->file_path,
                    'file_name' => $pubFile->file_name,
                ]);
            }
        }
    }
};
