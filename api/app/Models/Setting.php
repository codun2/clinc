<?php

namespace App\Models;

use App\Models\Concerns\BelongsToClinic;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['key', 'value'])]
class Setting extends Model
{
    use BelongsToClinic;

    /** All settings as a flat key => value map (scoped to the current clinic). */
    public static function map(): array
    {
        return static::query()->pluck('value', 'key')->all();
    }
}
