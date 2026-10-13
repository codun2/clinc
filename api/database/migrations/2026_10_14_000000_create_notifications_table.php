<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * إشعارات داخل التطبيق. لكل عيادة إشعاراتها (audience=clinic)، وإشعارات
 * المنصّة لصاحب المنصّة (audience=platform, clinic_id=null).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('audience')->default('clinic');   // clinic | platform
            $table->string('type')->default('info');         // booking | invoice | inventory | clinic | system
            $table->string('title');
            $table->text('body')->nullable();
            $table->string('icon')->nullable();              // اسم أيقونة Tabler بدون البادئة
            $table->string('link')->nullable();              // تلميح توجيه داخل اللوحة: appointments/invoices/...
            $table->json('data')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
            $table->index(['clinic_id', 'audience', 'read_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
