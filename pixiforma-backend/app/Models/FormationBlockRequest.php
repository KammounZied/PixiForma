<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FormationBlockRequest extends Model
{
    protected $table = 'formation_block_requests';

    protected $fillable = [
        'formation_user_id', 'user_id', 'formation_id', 'publication_id',
        'block_reason',
        'status', 'formateur_response', 'processed_by', 'processed_at',
    ];

    protected function casts(): array
    {
        return [
            'processed_at' => 'datetime',
        ];
    }

    public function formationUser()
    {
        return $this->belongsTo(FormationUser::class, 'formation_user_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function formation()
    {
        return $this->belongsTo(Formation::class);
    }

    public function processor()
    {
        return $this->belongsTo(User::class, 'processed_by');
    }

    public function publication()
    {
        return $this->belongsTo(Publication::class);
    }
}
