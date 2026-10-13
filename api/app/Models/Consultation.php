<?php

namespace App\Models;

use App\Models\Concerns\BelongsToClinic;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'clinic_id', 'patient_id', 'doctor_id', 'appointment_id',
    'bp', 'pulse', 'temp', 'weight',
    'complaint', 'examination', 'diagnosis', 'notes',
    'prescription', 'orders', 'status', 'finished_at',
])]
class Consultation extends Model
{
    use BelongsToClinic;

    protected function casts(): array
    {
        return [
            'temp'         => 'decimal:1',
            'weight'       => 'decimal:2',
            'prescription' => 'array',
            'orders'       => 'array',
            'finished_at'  => 'datetime',
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

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }
}
