<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('formations', function (Blueprint $table) {
            $table->unsignedTinyInteger('quiz_question_count')->nullable()->after('min_pass_percentage');
            $table->string('quiz_difficulty')->nullable()->after('quiz_question_count');
        });
    }

    public function down(): void
    {
        Schema::table('formations', function (Blueprint $table) {
            $table->dropColumn(['quiz_question_count', 'quiz_difficulty']);
        });
    }
};
