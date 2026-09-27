<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FormationUserPublication extends Model
{
    protected $table = 'formation_user_publication';

    protected $fillable = [
        'formation_user_id', 'publication_id', 'status',
        'quiz_attempts', 'quiz_highest_score', 'bonus_attempts', 'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'completed_at' => 'datetime',
        ];
    }

    public function formationUser()
    {
        return $this->belongsTo(FormationUser::class, 'formation_user_id');
    }

    public function publication()
    {
        return $this->belongsTo(Publication::class);
    }
}
