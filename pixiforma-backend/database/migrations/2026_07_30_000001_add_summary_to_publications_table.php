<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('publications', function (Blueprint $table) {
            $table->text('summary')->nullable()->after('content');
            $table->string('summary_status', 20)->default('idle')->after('summary');
            $table->text('summary_error')->nullable()->after('summary_status');
        });
    }

    public function down(): void
    {
        Schema::table('publications', function (Blueprint $table) {
            $table->dropColumn(['summary', 'summary_status', 'summary_error']);
        });
    }
};
