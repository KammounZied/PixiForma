<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PublicationFile extends Model
{
    use HasFactory;

    protected $fillable = ['publication_id', 'file_path', 'file_name', 'file_size'];

    public function publication()
    {
        return $this->belongsTo(Publication::class);
    }
}
