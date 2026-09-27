<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class FormationUser extends Pivot
{
    protected $table = 'formation_user';
    public $incrementing = true;

    protected $fillable = [
        'formation_id', 'user_id', 'status',
        'started_at', 'blocked_at', 'unblocked_at',
        'deadline_extended_days',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'blocked_at' => 'datetime',
            'unblocked_at' => 'datetime',
            'deadline_extended_days' => 'integer',
        ];
    }

    public function formation()
    {
        return $this->belongsTo(Formation::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function publicationProgress()
    {
        return $this->hasMany(FormationUserPublication::class, 'formation_user_id');
    }

    public function blockRequests()
    {
        return $this->hasMany(FormationBlockRequest::class, 'formation_user_id');
    }
}
