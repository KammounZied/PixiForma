<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Passport\HasApiTokens;
use App\Notifications\ResetPasswordNotification;
use Spatie\Permission\Traits\HasRoles;

#[Fillable(['name', 'email', 'password','force_password_change', 'is_active'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    use HasFactory, Notifiable, HasApiTokens, HasRoles;

    protected string $guard_name = 'api';

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    public function createdGroups(){return $this->hasMany(Group::class, 'creator_id');}
    public function groups(){
        return $this->belongsToMany(Group::class, 'group_user')
            ->withTimestamps();
    }

    public function sentInvitations(){return $this->hasMany(Invitation::class, 'sender_id');}
    public function receivedInvitations(){return $this->hasMany(Invitation::class, 'recipient_id');}
    public function sendPasswordResetNotification($token): void{$this->notify(new ResetPasswordNotification($token));}
}
