<?php

namespace App\Models;

use App\Models\Concerns\BelongsToClinic;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'clinic_id', 'patient_id', 'doctor_id', 'department', 'type',
    'reason', 'scheduled_at', 'status', 'arrived_at', 'source',
])]
class Appointment extends Model
{
    use BelongsToClinic;

    public const STATUSES = ['scheduled', 'confirmed', 'arrived', 'in_progress', 'completed', 'no_show', 'cancelled'];

    protected function casts(): array
    {
        return [
            'scheduled_at' => 'datetime',
            'arrived_at'   => 'datetime',
        ];
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }
}
