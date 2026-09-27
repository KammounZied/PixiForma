<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('formation_block_requests', function (Blueprint $table) {
            $table->string('block_reason')->nullable()->default('attempts_exhausted')->after('publication_id');
        });

        Schema::table('formation_user', function (Blueprint $table) {
            $table->unsignedInteger('deadline_extended_days')->default(0)->after('unblocked_at');
        });
    }

    public function down(): void
    {
        Schema::table('formation_block_requests', function (Blueprint $table) {
            $table->dropColumn('block_reason');
        });

        Schema::table('formation_user', function (Blueprint $table) {
            $table->dropColumn('deadline_extended_days');
        });
    }
};
