<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'name', 'slug', 'max_doctors', 'max_users', 'features',
    'price_monthly', 'trial_days', 'is_active', 'sort',
])]
class Plan extends Model
{
    public const FEATURES = ['online_booking', 'sms_reminders', 'inventory', 'reports', 'patient_portal', 'multi_branch'];

    protected function casts(): array
    {
        return [
            'features'      => 'array',
            'price_monthly' => 'decimal:2',
            'is_active'     => 'boolean',
        ];
    }

    public function clinics(): HasMany
    {
        return $this->hasMany(Clinic::class);
    }

    public function hasFeature(string $feature): bool
    {
        return in_array($feature, $this->features ?? [], true);
    }
}
