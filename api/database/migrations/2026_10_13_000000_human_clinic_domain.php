<?php

use App\Models\Clinic;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * تحويل الدومين من عيادة بيطرية إلى عيادة طبية بشرية.
 * يسقط جداول البيطري (pets/medical_records/adoption_ads/messages/payments
 * والـappointments القديم) ويبني جداول العيادة البشرية:
 * patients / appointments / consultations / invoices / services.
 */
return new class extends Migration
{
    public function up(): void
    {
        // children first (FKs), then parents
        Schema::dropIfExists('adoption_ads');
        Schema::dropIfExists('medical_records');
        Schema::dropIfExists('appointments');
        Schema::dropIfExists('pets');
        Schema::dropIfExists('messages');
        Schema::dropIfExists('payments');

        // المريض هو الشخص نفسه (لا "مالك" كما في البيطري)
        Schema::create('patients', function (Blueprint $table) {
            $table->id();
            $table->foreignIdFor(Clinic::class)->nullable()->constrained()->cascadeOnDelete();
            $table->string('file_no');                       // رقم الملف — تسلسلي لكل عيادة
            $table->string('name');
            $table->string('phone');
            $table->string('gender')->nullable();            // male | female
            $table->date('birthdate')->nullable();
            $table->string('national_id')->nullable();
            $table->string('address')->nullable();
            $table->string('blood_type')->nullable();        // O+ | A- | ...
            $table->text('allergies')->nullable();           // حساسية — تظهر كتحذير في الكشف
            $table->text('chronic_conditions')->nullable();  // حالات مزمنة
            $table->string('emergency_phone')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->unique(['clinic_id', 'file_no']);
            $table->index(['clinic_id', 'phone']);
        });

        Schema::create('appointments', function (Blueprint $table) {
            $table->id();
            $table->foreignIdFor(Clinic::class)->nullable()->constrained()->cascadeOnDelete();
            $table->foreignIdFor(Patient::class)->constrained()->cascadeOnDelete();
            $table->foreignId('doctor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('department')->nullable();        // باطنية | أسنان | ...
            $table->string('type')->default('new');          // new | followup
            $table->string('reason')->nullable();
            $table->dateTime('scheduled_at');
            // scheduled → confirmed → arrived (قائمة الانتظار) → in_progress → completed | no_show | cancelled
            $table->string('status')->default('scheduled');
            $table->dateTime('arrived_at')->nullable();
            $table->string('source')->default('desk');       // desk | online
            $table->timestamps();
            $table->index(['clinic_id', 'scheduled_at']);
        });

        // الكشف — شاشة واحدة: علامات حيوية + ملاحظة + وصفة + طلبات
        Schema::create('consultations', function (Blueprint $table) {
            $table->id();
            $table->foreignIdFor(Clinic::class)->nullable()->constrained()->cascadeOnDelete();
            $table->foreignIdFor(Patient::class)->constrained()->cascadeOnDelete();
            $table->foreignId('doctor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('appointment_id')->nullable()->constrained()->nullOnDelete();
            $table->string('bp')->nullable();                // "128/82"
            $table->unsignedSmallInteger('pulse')->nullable();
            $table->decimal('temp', 4, 1)->nullable();
            $table->decimal('weight', 5, 2)->nullable();
            $table->text('complaint')->nullable();           // الشكوى
            $table->text('examination')->nullable();         // الفحص
            $table->text('diagnosis')->nullable();           // التشخيص
            $table->text('notes')->nullable();
            $table->json('prescription')->nullable();        // [{drug, dose, duration}]
            $table->json('orders')->nullable();              // ["تحليل دم شامل", ...]
            $table->string('status')->default('draft');      // draft | final
            $table->dateTime('finished_at')->nullable();
            $table->timestamps();
            $table->index(['clinic_id', 'patient_id']);
        });

        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignIdFor(Clinic::class)->nullable()->constrained()->cascadeOnDelete();
            $table->foreignIdFor(Patient::class)->constrained()->cascadeOnDelete();
            $table->foreignId('consultation_id')->nullable()->constrained()->nullOnDelete();
            $table->string('number');                        // تسلسلي لكل عيادة: 2451…
            $table->json('items');                           // [{name, price}]
            $table->decimal('total', 10, 2);
            $table->string('method')->nullable();            // cash | card | transfer
            $table->string('status')->default('pending');    // pending | paid | cancelled
            $table->dateTime('paid_at')->nullable();
            $table->string('recorded_by')->nullable();
            $table->timestamps();
            $table->unique(['clinic_id', 'number']);
            $table->index(['clinic_id', 'status']);
        });

        // الخدمات والأسعار (تظهر في الإعدادات وشاشة الكشف)
        Schema::create('services', function (Blueprint $table) {
            $table->id();
            $table->foreignIdFor(Clinic::class)->nullable()->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('department')->nullable();
            $table->decimal('price', 8, 2);
            $table->boolean('active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('services');
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('consultations');
        Schema::dropIfExists('appointments');
        Schema::dropIfExists('patients');
    }
};
