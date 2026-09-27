<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

use App\Enums\RoleEnum;
use App\Enums\PermissionEnum;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $validPermissions = array_map(fn($p) => $p->value, PermissionEnum::cases());

        Permission::whereNotIn('name', $validPermissions)->delete();

        foreach (PermissionEnum::cases() as $permission) {
            Permission::firstOrCreate([
                'name' => $permission->value,
                'guard_name' => 'api',
            ]);
        }

        $admin = Role::firstOrCreate([
            'name' => RoleEnum::ADMIN->value,
            'guard_name' => 'api',
        ]);

        $trainer = Role::firstOrCreate([
            'name' => RoleEnum::TRAINER->value,
            'guard_name' => 'api',
        ]);

        $collaborator = Role::firstOrCreate([
            'name' => RoleEnum::COLLABORATOR->value,
            'guard_name' => 'api',
        ]);

        $admin->syncPermissions(Permission::all());

        $trainer->syncPermissions([
            PermissionEnum::VIEW_USERS->value,
            PermissionEnum::VIEW_GROUPS->value,
            PermissionEnum::CREATE_GROUPS->value,
            PermissionEnum::EDIT_GROUPS->value,
            PermissionEnum::DELETE_GROUPS->value,
            PermissionEnum::VIEW_INVITATIONS->value,
            PermissionEnum::CREATE_INVITATIONS->value,
            PermissionEnum::EDIT_INVITATIONS->value,
            PermissionEnum::DELETE_INVITATIONS->value,
            PermissionEnum::VIEW_REQUESTS->value,
            PermissionEnum::EDIT_REQUESTS->value,
            PermissionEnum::VIEW_PUBLICATIONS->value,
            PermissionEnum::CREATE_PUBLICATIONS->value,
            PermissionEnum::EDIT_PUBLICATIONS->value,
            PermissionEnum::DELETE_PUBLICATIONS->value,
            PermissionEnum::CREATE_FORMATIONS->value,
            PermissionEnum::VIEW_FORMATIONS->value,
            PermissionEnum::EDIT_FORMATIONS->value,
            PermissionEnum::DELETE_FORMATIONS->value,
            PermissionEnum::VIEW_COMMENTS->value,
            PermissionEnum::CREATE_COMMENTS->value,
            PermissionEnum::EDIT_COMMENTS->value,
            PermissionEnum::DELETE_COMMENTS->value,
        ]);

        $collaborator->syncPermissions([
            PermissionEnum::VIEW_GROUPS->value,
            PermissionEnum::VIEW_INVITATIONS->value,
            PermissionEnum::EDIT_INVITATIONS->value,
            PermissionEnum::VIEW_REQUESTS->value,
            PermissionEnum::CREATE_REQUESTS->value,
            PermissionEnum::DELETE_REQUESTS->value,
            PermissionEnum::VIEW_PUBLICATIONS->value,
            PermissionEnum::VIEW_FORMATIONS->value,
            PermissionEnum::VIEW_COMMENTS->value,
            PermissionEnum::CREATE_COMMENTS->value,
        ]);

        Role::where('name', 'Formateur autorisé')->delete();
    }
}
