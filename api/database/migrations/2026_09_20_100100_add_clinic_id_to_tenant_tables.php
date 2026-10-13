<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tenant-scoped tables that simply gain a nullable clinic_id FK + index.
     * (settings is handled separately because its primary key is the `key` column.)
     */
    private array $tables = [
        'users', 'pets', 'appointments', 'medical_records',
        'medicines', 'messages', 'payments', 'adoption_ads',
    ];

    public function up(): void
    {
        foreach ($this->tables as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->foreignId('clinic_id')->nullable()->after('id')
                    ->constrained('clinics')->nullOnDelete();
            });
        }

        // settings: its primary key is `key`, which can't stay unique across clinics.
        // Promote to an auto-increment id and make (clinic_id, key) the unique pair.
        Schema::table('settings', function (Blueprint $t) {
            $t->dropPrimary(); // drops the primary key on `key`
        });
        Schema::table('settings', function (Blueprint $t) {
            $t->id()->first();
            $t->foreignId('clinic_id')->nullable()->after('id')
                ->constrained('clinics')->nullOnDelete();
            $t->unique(['clinic_id', 'key']);
        });
    }

    public function down(): void
    {
        Schema::table('settings', function (Blueprint $t) {
            $t->dropUnique(['clinic_id', 'key']);
            $t->dropConstrainedForeignId('clinic_id');
            $t->dropColumn('id');
        });
        Schema::table('settings', function (Blueprint $t) {
            $t->primary('key');
        });

        foreach ($this->tables as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->dropConstrainedForeignId('clinic_id');
            });
        }
    }
};
