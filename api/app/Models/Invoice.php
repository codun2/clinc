<?php

namespace App\Models;

use App\Models\Concerns\BelongsToClinic;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'clinic_id', 'patient_id', 'consultation_id', 'number',
    'items', 'total', 'method', 'status', 'paid_at', 'recorded_by',
])]
class Invoice extends Model
{
    use BelongsToClinic;

    protected function casts(): array
    {
        return [
            'items'   => 'array',
            'total'   => 'decimal:2',
            'paid_at' => 'datetime',
        ];
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function consultation(): BelongsTo
    {
        return $this->belongsTo(Consultation::class);
    }

    /** رقم فاتورة تسلسلي لكل عيادة يبدأ من 1001 */
    public static function nextNumber(): string
    {
        $max = static::max('number');

        return (string) max((int) $max + 1, 1001);
    }
}
