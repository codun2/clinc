<?php

namespace App\Models\Concerns;

use App\Models\Clinic;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Multi-tenant scoping. Any model using this trait is automatically:
 *   - filtered to the current clinic on every query, and
 *   - stamped with the current clinic_id on create.
 *
 * The "current clinic" is bound into the container as `currentClinicId` by the
 * SetClinicContext middleware (derived from the authenticated user's clinic_id).
 * When nothing is bound (console, public endpoints) or it is null (platform
 * super-admin), the scope is disabled and the model behaves globally.
 */
trait BelongsToClinic
{
    protected static function bootBelongsToClinic(): void
    {
        static::addGlobalScope('clinic', function (Builder $builder) {
            if (self::currentClinicId() !== null) {
                $builder->where($builder->getModel()->getTable().'.clinic_id', self::currentClinicId());
            }
        });

        static::creating(function (Model $model) {
            if ($model->getAttribute('clinic_id') === null && self::currentClinicId() !== null) {
                $model->setAttribute('clinic_id', self::currentClinicId());
            }
        });
    }

    /** The clinic context for the current request, or null when unscoped. */
    protected static function currentClinicId(): ?int
    {
        return app()->bound('currentClinicId') ? app('currentClinicId') : null;
    }

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }
}
