<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class FormationPublication extends Pivot
{
    protected $table = 'formation_publication';

    protected $fillable = ['formation_id', 'publication_id', 'order', 'recommended_duration_minutes'];

    public function formation()
    {
        return $this->belongsTo(Formation::class);
    }

    public function publication()
    {
        return $this->belongsTo(Publication::class);
    }
}
