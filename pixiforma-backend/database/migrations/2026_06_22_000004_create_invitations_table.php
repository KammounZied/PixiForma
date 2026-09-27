<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invitations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('group_id')->constrained('groups')->onDelete('cascade');
            $table->foreignId('sender_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('recipient_id')->constrained('users')->onDelete('cascade');
            $table->enum('status', ['sent', 'accepted', 'declined'])->default('sent');
            $table->timestamps();

            $table->unique(['group_id', 'recipient_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invitations');
    }
};
