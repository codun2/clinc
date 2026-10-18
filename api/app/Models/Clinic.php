<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'name', 'slug', 'status', 'plan_id', 'trial_ends_at', 'subscription_ends_at',
    'phone', 'email', 'address', 'logo',
])]
class Clinic extends Model
{
    protected function casts(): array
    {
        return [
            'trial_ends_at'        => 'datetime',
            'subscription_ends_at' => 'datetime',
        ];
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    /** هل الباقة تتيح هذه الميزة؟ (بلا باقة = كل الميزات مفعّلة — توافق خلفي) */
    public function can(string $feature): bool
    {
        return ! $this->plan || $this->plan->hasFeature($feature);
    }

    /** عدد حسابات الدخول الحالية (طاقم + مدير). */
    public function usersCount(): int
    {
        return $this->users()->whereIn('role', ['admin', 'staff'])->count();
    }

    /** عدد الأطباء = مستخدمون لهم مسمّى طبي. */
    public function doctorsCount(): int
    {
        return $this->users()->whereIn('role', ['admin', 'staff'])->whereNotNull('title')->count();
    }

    /** هل بلغنا حدّ المستخدمين؟ (null = غير محدود) */
    public function userLimitReached(): bool
    {
        $max = $this->plan?->max_users;

        return $max !== null && $this->usersCount() >= $max;
    }

    /** هل بلغنا حدّ الأطباء؟ (null = غير محدود) */
    public function doctorLimitReached(): bool
    {
        $max = $this->plan?->max_doctors;

        return $max !== null && $this->doctorsCount() >= $max;
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function patients(): HasMany
    {
        return $this->hasMany(Patient::class);
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }
}
