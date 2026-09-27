<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('formation_user_publication', function (Blueprint $table) {
            $table->unsignedInteger('bonus_attempts')->default(0)->after('quiz_highest_score');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('formation_user_publication', function (Blueprint $table) {
            $table->dropColumn('bonus_attempts');
        });
    }
};
