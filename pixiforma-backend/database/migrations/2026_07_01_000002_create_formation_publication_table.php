<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('formation_publication', function (Blueprint $table) {
            $table->id();
            $table->foreignId('formation_id')->constrained()->onDelete('cascade');
            $table->foreignId('publication_id')->constrained()->onDelete('cascade');
            $table->unsignedInteger('order')->default(0);
            $table->unsignedInteger('recommended_duration_minutes')->nullable();
            $table->timestamps();

            $table->unique(['formation_id', 'publication_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('formation_publication');
    }
};
