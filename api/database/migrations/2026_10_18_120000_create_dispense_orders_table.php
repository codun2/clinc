<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * طلبات صرف الأدوية (الصيدلية): الطبيب يرسل الوصفة للصيدلي، والصيدلي يصرف.
 * items = [{drug, dose, duration, medicine_id?, qty, dispensed?}]
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dispense_orders', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('clinic_id')->index();
            $table->unsignedBigInteger('consultation_id')->nullable();
            $table->unsignedBigInteger('patient_id');
            $table->unsignedBigInteger('doctor_id')->nullable();     // الطبيب الطالب
            $table->string('status')->default('pending');            // pending | dispensed | cancelled
            $table->json('items');
            $table->string('note')->nullable();
            $table->unsignedBigInteger('dispensed_by')->nullable();  // الصيدلي
            $table->timestamp('dispensed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dispense_orders');
    }
};
