<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Quiz extends Model
{
    use HasFactory;

    protected $fillable = [
        'formation_id',
        'publication_id',
        'questions',
        'status',
        'approved_count',
        'generation_error',
        'generated_at',
        'published_at',
    ];

    protected function casts(): array
    {
        return [
            'questions' => 'array',
            'generated_at' => 'datetime',
            'published_at' => 'datetime',
        ];
    }

    public function formation()
    {
        return $this->belongsTo(Formation::class);
    }

    public function publication()
    {
        return $this->belongsTo(Publication::class);
    }

    public function submissions()
    {
        return $this->hasMany(QuizSubmission::class);
    }

    public function getRandomQuestions(int $count): array
    {
        $approvedWithIndex = [];
        foreach ($this->questions as $idx => $q) {
            if (($q['approved'] ?? false) === true) {
                $approvedWithIndex[] = $q + ['original_index' => $idx];
            }
        }

        if (count($approvedWithIndex) <= $count) {
            return $approvedWithIndex;
        }

        $keys = array_rand($approvedWithIndex, $count);
        if (!is_array($keys)) {
            $keys = [$keys];
        }

        return array_map(fn($k) => $approvedWithIndex[$k], $keys);
    }

    public function approveQuestion(int $index): void
    {
        $questions = $this->questions;
        if (isset($questions[$index])) {
            $questions[$index]['approved'] = true;
            $this->update([
                'questions' => $questions,
                'approved_count' => count(array_filter($questions, fn($q) => ($q['approved'] ?? false) === true)),
            ]);
        }
    }

    public function rejectQuestion(int $index): void
    {
        $questions = $this->questions;
        if (isset($questions[$index])) {
            $questions[$index]['approved'] = false;
            $this->update([
                'questions' => $questions,
                'approved_count' => count(array_filter($questions, fn($q) => ($q['approved'] ?? false) === true)),
            ]);
        }
    }

    public function publish(): bool
    {
        $approved = count(array_filter($this->questions, fn($q) => ($q['approved'] ?? false) === true));
        if ($approved < 30) {
            return false;
        }
        $this->update([
            'status' => 'published',
            'approved_count' => $approved,
            'published_at' => now(),
        ]);
        return true;
    }

    public function scopePublished($query)
    {
        return $query->where('status', 'published');
    }

    public function scopeDraft($query)
    {
        return $query->where('status', 'draft');
    }

    public function scopeGenerating($query)
    {
        return $query->where('status', 'generating');
    }
}
