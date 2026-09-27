<?php

namespace App\Services;

use App\Models\User;

class UserRoleService
{
    public function assignRole(User $user, string $role): void
    {
        $user->syncRoles([$role]);
    }
}