<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clinics', function (Blueprint $table) {
            $table->foreignId('plan_id')->nullable()->after('status')->constrained('plans')->nullOnDelete();
        });

        // العيادات الحالية → الباقة الوسطى "عيادة" حتى لا تتعطّل أي ميزة.
        $defaultId = DB::table('plans')->where('slug', 'clinic')->value('id');
        if ($defaultId) {
            DB::table('clinics')->whereNull('plan_id')->update(['plan_id' => $defaultId]);
        }
    }

    public function down(): void
    {
        Schema::table('clinics', function (Blueprint $table) {
            $table->dropConstrainedForeignId('plan_id');
        });
    }
};
