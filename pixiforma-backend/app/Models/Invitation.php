<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Invitation extends Model
{
    use HasFactory;

    protected $fillable = ['group_id', 'sender_id', 'recipient_id', 'status'];

    protected function casts(): array
    {
        return [
            'status' => 'string',
        ];
    }

    public function group(){return $this->belongsTo(Group::class);}
    public function sender(){return $this->belongsTo(User::class, 'sender_id');}
    public function recipient(){return $this->belongsTo(User::class, 'recipient_id');}
}
