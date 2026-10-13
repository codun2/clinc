<?php

namespace App\Models;

use App\Models\Concerns\BelongsToClinic;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['name', 'category', 'quantity', 'unit', 'low_stock_threshold', 'price'])]
class Medicine extends Model
{
    use BelongsToClinic;

    protected function casts(): array
    {
        return [
            'quantity'            => 'decimal:2',
            'low_stock_threshold' => 'decimal:2',
            'price'               => 'decimal:2',
        ];
    }
}
