<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('publication_files', function (Blueprint $table) {
            $table->string('markdown_path')->nullable()->after('file_size');
        });
    }

    public function down(): void
    {
        Schema::table('publication_files', function (Blueprint $table) {
            $table->dropColumn('markdown_path');
        });
    }
};
