<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Volumes/weights (ml, mg…) need fractions — integers can't hold "97.5 ml".
        Schema::table('medicines', function (Blueprint $table) {
            $table->decimal('quantity', 10, 2)->default(0)->change();
            $table->decimal('low_stock_threshold', 10, 2)->default(5)->change();
        });

        Schema::table('medical_records', function (Blueprint $table) {
            $table->decimal('quantity_used', 8, 2)->nullable()->after('dosage');
            $table->string('used_unit', 20)->nullable()->after('quantity_used');
        });
    }

    public function down(): void
    {
        Schema::table('medical_records', function (Blueprint $table) {
            $table->dropColumn(['quantity_used', 'used_unit']);
        });
        Schema::table('medicines', function (Blueprint $table) {
            $table->integer('quantity')->default(0)->change();
            $table->integer('low_stock_threshold')->default(5)->change();
        });
    }
};
