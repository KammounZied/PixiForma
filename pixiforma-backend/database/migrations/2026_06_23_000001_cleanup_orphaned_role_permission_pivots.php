<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Nettoyer les enregistrements orphelins dans model_has_roles
        DB::table('model_has_roles')
            ->where('model_type', 'App\\Models\\User')
            ->whereNotExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('users')
                    ->whereColumn('users.id', 'model_has_roles.model_id');
            })
            ->delete();

        // Nettoyer les enregistrements orphelins dans model_has_permissions
        DB::table('model_has_permissions')
            ->where('model_type', 'App\\Models\\User')
            ->whereNotExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('users')
                    ->whereColumn('users.id', 'model_has_permissions.model_id');
            })
            ->delete();
    }

    public function down(): void
    {
        // rien à restaurer
    }
};
