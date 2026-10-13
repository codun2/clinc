<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Give every pre-existing row a home: create the original "Layla Vet" clinic
     * (active) and point all current tenant data at it. Runs via the query builder
     * so model global scopes don't interfere.
     */
    public function up(): void
    {
        if (DB::table('clinics')->count() > 0) {
            return;
        }

        $clinicId = DB::table('clinics')->insertGetId([
            'name'       => 'عيادة النور الطبية',
            'slug'       => 'alnoor',
            'status'     => 'active',
            'phone'      => '920001234',
            'email'      => 'info@alnoor-clinic.com',
            'address'    => 'الرياض — حي الملقا، طريق الملك فهد',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // الجداول البيطرية القديمة تُسقَط في migration لاحقة؛ يكفي ما يبقى منها
        foreach (['users', 'medicines', 'settings'] as $table) {
            DB::table($table)->whereNull('clinic_id')->update(['clinic_id' => $clinicId]);
        }
    }

    public function down(): void
    {
        // Irreversible data backfill — no-op.
    }
};
