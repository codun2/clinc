<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Models\Concerns\BelongsToClinic;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['clinic_id', 'name', 'email', 'phone', 'role', 'status', 'title', 'photo', 'permissions', 'password'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use BelongsToClinic, HasApiTokens, HasFactory, Notifiable;

    public const PERMISSIONS = ['appointments', 'patients', 'consultations', 'invoices', 'staff', 'inventory', 'settings'];

    public function isStaff(): bool
    {
        return in_array($this->role, ['staff', 'admin'], true);
    }

    /** Platform owner — manages clinics, lives above tenant data (clinic_id is null). */
    public function isSuper(): bool
    {
        return $this->role === 'super';
    }

    /** Admins can do everything; staff need the page key in their permissions. */
    public function hasPerm(string $key): bool
    {
        if ($this->role === 'admin') {
            return true;
        }

        return $this->isStaff() && in_array($key, $this->permissions ?? [], true);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'permissions' => 'array',
        ];
    }

    /** مواعيد هذا الطبيب */
    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class, 'doctor_id');
    }
}
