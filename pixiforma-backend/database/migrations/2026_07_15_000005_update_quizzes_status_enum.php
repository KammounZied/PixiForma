<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE `quizzes` MODIFY `status` ENUM('draft', 'published', 'generating', 'error') NOT NULL DEFAULT 'draft'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE `quizzes` MODIFY `status` ENUM('draft', 'published') NOT NULL DEFAULT 'draft'");
    }
};
