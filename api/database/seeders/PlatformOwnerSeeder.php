<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class PlatformOwnerSeeder extends Seeder
{
    /**
     * Create the single platform-owner (super-admin) account used to manage
     * clinics. Idempotent — safe to run repeatedly. Override the defaults with
     * SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD env vars.
     */
    public function run(): void
    {
        $email = env('SUPER_ADMIN_EMAIL', 'owner@clinic.sa');
        $password = env('SUPER_ADMIN_PASSWORD', 'Owner2026!');

        User::updateOrCreate(
            ['email' => $email],
            [
                'clinic_id' => null,
                'name'      => 'Platform Owner',
                'role'      => 'super',
                'password'  => $password, // hashed via model cast
            ]
        );

        $this->command?->info("Platform owner ready: {$email}");
    }
}
