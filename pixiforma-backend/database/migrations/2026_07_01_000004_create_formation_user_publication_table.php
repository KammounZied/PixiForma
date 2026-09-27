<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('formation_user_publication', function (Blueprint $table) {
            $table->id();
            $table->foreignId('formation_user_id')->constrained('formation_user')->onDelete('cascade');
            $table->foreignId('publication_id')->constrained()->onDelete('cascade');
            $table->enum('status', ['locked', 'available', 'completed'])->default('locked');
            $table->unsignedTinyInteger('quiz_attempts')->default(0);
            $table->decimal('quiz_highest_score', 5, 2)->unsigned()->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->unique(['formation_user_id', 'publication_id'], 'fup_user_pub_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('formation_user_publication');
    }
};
