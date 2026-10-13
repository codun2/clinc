<?php

namespace App\Models;

use App\Models\Concerns\BelongsToClinic;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'clinic_id', 'file_no', 'name', 'phone', 'gender', 'birthdate', 'national_id',
    'address', 'blood_type', 'allergies', 'chronic_conditions', 'emergency_phone', 'notes',
])]
class Patient extends Model
{
    use BelongsToClinic;

    protected function casts(): array
    {
        return [
            'birthdate' => 'date',
        ];
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class)->orderByDesc('scheduled_at');
    }

    public function consultations(): HasMany
    {
        return $this->hasMany(Consultation::class)->orderByDesc('created_at');
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class)->orderByDesc('created_at');
    }

    /** رقم ملف تسلسلي لكل عيادة يبدأ من 10001 */
    public static function nextFileNo(): string
    {
        $max = static::max('file_no');

        return (string) max((int) $max + 1, 10001);
    }
}
