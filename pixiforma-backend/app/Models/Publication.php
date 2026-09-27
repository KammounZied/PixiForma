<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Publication extends Model
{
    use HasFactory;

    protected $fillable = ['group_id', 'creator_id', 'title', 'description', 'content', 'is_visible', 'summary', 'summary_status', 'summary_error'];

    public function group()
    {
        return $this->belongsTo(Group::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function files()
    {
        return $this->hasMany(PublicationFile::class);
    }

    public function comments()
    {
        return $this->hasMany(Comment::class);
    }

    public function formations()
    {
        return $this->belongsToMany(Formation::class, 'formation_publication');
    }

    public function quizzes()
    {
        return $this->hasMany(Quiz::class);
    }
}
