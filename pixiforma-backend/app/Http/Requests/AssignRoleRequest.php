<?php

namespace App\Http\Requests;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use App\Models\User;

class AssignRoleRequest extends FormRequest
{
    public function authorize(): bool
    {return $this->user() && $this->user()->hasRole('Admin');}
    public function rules(): array
    {
        return [
            'roles' => [
                'required',
                'array',
                'min:1',
            ],
            'roles.*' => [
                'required',
                'string',
                'distinct',
                Rule::in(['Admin', 'Formateur', 'Collaborateur'])
            ],
        ];
    }
}
