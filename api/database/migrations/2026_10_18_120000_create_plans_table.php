<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * باقات الاشتراك (plans) — يديرها صاحب المنصّة. كل باقة تحدّد حدود الحجم
 * (أطباء/مستخدمين) والميزات المفعّلة والسعر. null في الحدود = غير محدود.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('name', 80);                 // فردية / عيادة / مجمّع طبي
            $table->string('slug', 60)->unique();
            $table->unsignedInteger('max_doctors')->nullable();   // null = غير محدود
            $table->unsignedInteger('max_users')->nullable();     // إجمالي حسابات الدخول
            $table->json('features')->nullable();        // ['online_booking','sms_reminders','inventory','reports','patient_portal','multi_branch']
            $table->decimal('price_monthly', 10, 2)->default(0);
            $table->unsignedSmallInteger('trial_days')->default(0);
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort')->default(0);
            $table->timestamps();
        });

        $now = now();
        DB::table('plans')->insert([
            [
                'name' => 'فردية', 'slug' => 'solo', 'max_doctors' => 1, 'max_users' => 3,
                'features' => json_encode(['reports']),
                'price_monthly' => 149, 'trial_days' => 14, 'is_active' => true, 'sort' => 1,
                'created_at' => $now, 'updated_at' => $now,
            ],
            [
                'name' => 'عيادة', 'slug' => 'clinic', 'max_doctors' => 5, 'max_users' => 12,
                'features' => json_encode(['online_booking', 'sms_reminders', 'inventory', 'reports']),
                'price_monthly' => 399, 'trial_days' => 14, 'is_active' => true, 'sort' => 2,
                'created_at' => $now, 'updated_at' => $now,
            ],
            [
                'name' => 'مجمّع طبي', 'slug' => 'group', 'max_doctors' => null, 'max_users' => null,
                'features' => json_encode(['online_booking', 'sms_reminders', 'inventory', 'reports', 'patient_portal', 'multi_branch']),
                'price_monthly' => 899, 'trial_days' => 14, 'is_active' => true, 'sort' => 3,
                'created_at' => $now, 'updated_at' => $now,
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('plans');
    }
};
