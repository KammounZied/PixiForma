<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('formation_block_requests', function (Blueprint $table) {
            $table->foreignId('publication_id')->nullable()->constrained('publications')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('formation_block_requests', function (Blueprint $table) {
            $table->dropForeign(['publication_id']);
            $table->dropColumn('publication_id');
        });
    }
};
