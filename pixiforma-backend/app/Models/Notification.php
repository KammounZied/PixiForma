<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    use HasFactory;
    protected $fillable = ['user_id', 'type', 'title', 'message', 'data', 'is_read', 'read_at'];
    protected function casts(): array
    {
        return [
            'is_read' => 'boolean',
            'data' => 'array',
            'read_at' => 'datetime',
        ];
    }

    public function user(){return $this->belongsTo(User::class);}

    public function scopeUnread($query){return $query->where('is_read', false);}
}
