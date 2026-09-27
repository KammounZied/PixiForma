<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Formation extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'group_id', 'creator_id', 'title', 'description', 'pedagogical_objective',
        'start_date', 'end_date', 'duration_days', 'progression_mode', 'is_visible',
        'max_attempts', 'min_pass_percentage', 'quiz_question_count', 'quiz_difficulty', 'quiz_time_per_question',
    ];

    protected function casts(): array
    {
        return [
            'is_visible' => 'boolean',
            'start_date' => 'date',
            'end_date' => 'date',
            'duration_days' => 'integer',
        ];
    }

    public function group()
    {
        return $this->belongsTo(Group::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function publications()
    {
        return $this->belongsToMany(Publication::class, 'formation_publication')
            ->withPivot(['id', 'order', 'recommended_duration_minutes'])
            ->withTimestamps()
            ->orderBy('formation_publication.order');
    }

    public function formationPublications()
    {
        return $this->hasMany(FormationPublication::class)->orderBy('order');
    }

    public function learners()
    {
        return $this->belongsToMany(User::class, 'formation_user')
            ->withPivot(['id', 'status', 'blocked_at', 'unblocked_at'])
            ->withTimestamps();
    }

    public function learnerProgress()
    {
        return $this->hasMany(FormationUser::class);
    }

    public function blockRequests()
    {
        return $this->hasMany(FormationBlockRequest::class);
    }

    public function quizzes()
    {
        return $this->hasMany(Quiz::class);
    }

    public function getDurationDaysAttribute($value)
    {
        if ($value !== null) return (int) $value;
        if ($this->start_date && $this->end_date) {
            return $this->start_date->diffInDays($this->end_date) + 1;
        }
        return null;
    }
}
