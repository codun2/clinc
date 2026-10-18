<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * إسقاط عمود clinics.plan النصّي القديم — استُبدل بعلاقة plan_id.
 * (كان يحجب علاقة plan() بسبب تطابق الاسم.)
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('clinics', 'plan')) {
            Schema::table('clinics', function (Blueprint $table) {
                $table->dropColumn('plan');
            });
        }
    }

    public function down(): void
    {
        Schema::table('clinics', function (Blueprint $table) {
            $table->string('plan')->nullable()->after('status');
        });
    }
};
