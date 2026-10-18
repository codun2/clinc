<?php

use App\Models\Clinic;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * ملف الموظف (HR) — مستوحى من مشروع الورش: بيانات كاملة للموظف مع حساب
 * دخول اختياري مرتبط (user_id). مشمول بنطاق العيادة (clinic_id).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->foreignIdFor(Clinic::class)->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete(); // حساب الدخول المرتبط
            $table->string('employee_number', 40)->nullable();      // رقم وظيفي
            // الهوية
            $table->string('name', 120);
            $table->string('name_en', 120)->nullable();
            $table->string('job_title', 120)->nullable();           // المسمّى الوظيفي
            $table->string('job_title_en', 120)->nullable();
            $table->string('department', 60)->nullable();           // القسم (نص — كأقسام العيادة)
            $table->string('phone', 30)->nullable();
            $table->string('email', 150)->nullable();
            // الوثائق
            $table->string('national_id', 40)->nullable();
            $table->date('id_issue_date')->nullable();
            $table->date('id_expiry_date')->nullable();
            $table->string('passport_number', 50)->nullable();
            $table->date('passport_issue_date')->nullable();
            $table->date('passport_expiry_date')->nullable();
            // بيانات شخصية
            $table->date('birth_date')->nullable();
            $table->string('gender', 10)->nullable();               // male | female
            $table->string('nationality', 80)->nullable();
            $table->string('marital_status', 30)->nullable();       // single | married | divorced | widowed
            // التوظيف والمالية
            $table->date('hire_date')->nullable();
            $table->decimal('base_salary', 10, 2)->default(0);
            $table->string('iban', 40)->nullable();
            $table->string('bank_name', 80)->nullable();
            $table->string('status', 20)->default('active');        // active | inactive
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['clinic_id', 'status']);
        });

        // Backfill: أنشئ ملف موظف لكل مستخدم طاقم حالي واربطه بحسابه.
        $seq = 1001;
        foreach (DB::table('users')->whereIn('role', ['staff', 'admin'])->orderBy('id')->get() as $u) {
            DB::table('employees')->insert([
                'clinic_id'       => $u->clinic_id,
                'user_id'         => $u->id,
                'employee_number' => 'EMP-'.($seq++),
                'name'            => $u->name,
                'job_title'       => $u->title,
                'phone'           => $u->phone,
                'email'           => $u->email,
                'status'          => $u->status ?? 'active',
                'created_at'      => now(),
                'updated_at'      => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('employees');
    }
};
