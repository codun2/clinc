<?php

namespace App\Models;

use App\Models\Concerns\BelongsToClinic;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'clinic_id', 'user_id', 'employee_number',
    'name', 'name_en', 'job_title', 'job_title_en', 'department', 'phone', 'email',
    'national_id', 'id_issue_date', 'id_expiry_date',
    'passport_number', 'passport_issue_date', 'passport_expiry_date',
    'birth_date', 'gender', 'nationality', 'marital_status',
    'hire_date', 'base_salary', 'iban', 'bank_name', 'status', 'notes',
])]
class Employee extends Model
{
    use BelongsToClinic, SoftDeletes;

    public const GENDERS = ['male', 'female'];
    public const MARITAL = ['single', 'married', 'divorced', 'widowed'];
    public const STATUSES = ['active', 'inactive'];

    protected function casts(): array
    {
        return [
            'id_issue_date'       => 'date',
            'id_expiry_date'      => 'date',
            'passport_issue_date' => 'date',
            'passport_expiry_date' => 'date',
            'birth_date'          => 'date',
            'hire_date'           => 'date',
            'base_salary'         => 'decimal:2',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** رقم وظيفي تسلسلي لكل عيادة: EMP-1001… */
    public static function nextNumber(): string
    {
        $max = (int) static::query()
            ->selectRaw("MAX(CAST(SUBSTRING(employee_number, 5) AS UNSIGNED)) AS n")
            ->value('n');

        return 'EMP-'.max($max + 1, 1001);
    }
}
