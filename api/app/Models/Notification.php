<?php

namespace App\Models;

use App\Models\Concerns\BelongsToClinic;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['clinic_id', 'audience', 'type', 'title', 'body', 'icon', 'link', 'data', 'read_at'])]
class Notification extends Model
{
    use BelongsToClinic;

    protected function casts(): array
    {
        return [
            'data'    => 'array',
            'read_at' => 'datetime',
        ];
    }

    public function markRead(): void
    {
        if (! $this->read_at) {
            $this->update(['read_at' => now()]);
        }
    }
}
