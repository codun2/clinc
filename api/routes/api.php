<?php

use App\Http\Controllers\Api\AdminAppointmentController;
use App\Http\Controllers\Api\AdminAuthController;
use App\Http\Controllers\Api\AdminConsultationController;
use App\Http\Controllers\Api\AdminDashboardController;
use App\Http\Controllers\Api\AdminEmployeeController;
use App\Http\Controllers\Api\AdminInventoryController;
use App\Http\Controllers\Api\AdminInvoiceController;
use App\Http\Controllers\Api\AdminNotificationController;
use App\Http\Controllers\Api\AdminPatientController;
use App\Http\Controllers\Api\AdminPharmacyController;
use App\Http\Controllers\Api\AdminReportController;
use App\Http\Controllers\Api\AdminServiceController;
use App\Http\Controllers\Api\AdminSettingController;
use App\Http\Controllers\Api\AdminStaffController;
use App\Http\Controllers\Api\AppointmentController;
use App\Http\Controllers\Api\ClinicRegistrationController;
use App\Http\Controllers\Api\Super\ClinicController;
use App\Http\Controllers\Api\Super\PlanController as SuperPlanController;
use App\Http\Controllers\Api\Super\NotificationController as SuperNotificationController;
use App\Http\Controllers\Api\SuperAuthController;
use Illuminate\Support\Facades\Route;

// ===== عام (بدون مصادقة) =====

// تسجيل عيادة جديدة + قائمة العيادات النشطة
Route::get('clinics', [ClinicRegistrationController::class, 'publicList']);
Route::post('clinics/register', [ClinicRegistrationController::class, 'register']);
Route::get('clinics/{slug}', [ClinicRegistrationController::class, 'publicShow']);

// الحجز الأونلاين — لكل عيادة عبر الـ slug
Route::prefix('booking/{slug}')->group(function () {
    Route::get('info', [AppointmentController::class, 'bookingInfo']);
    Route::get('slots', [AppointmentController::class, 'slots']);
    Route::post('book', [AppointmentController::class, 'book']);
});

// ===== لوحة العيادة (staff/admin) =====
Route::prefix('admin')->group(function () {
    Route::post('login', [AdminAuthController::class, 'login']);

    Route::middleware(['auth:sanctum', 'staff', 'clinic'])->group(function () {
        Route::get('me', [AdminAuthController::class, 'me']);
        Route::get('badges', [AdminAuthController::class, 'badges']);
        Route::post('logout', [AdminAuthController::class, 'logout']);

        // لوحة التحكم — متاحة لكل الموظفين
        Route::get('dashboard', [AdminDashboardController::class, 'index']);

        // قوائم مرجعية متاحة لكل الموظفين (اختيار طبيب/خدمة في النماذج)
        Route::get('doctors', [AdminStaffController::class, 'doctors']);
        Route::get('services', [AdminServiceController::class, 'index']);

        // الإشعارات — متاحة لكل الموظفين
        Route::get('notifications', [AdminNotificationController::class, 'index']);
        Route::get('notifications/unread', [AdminNotificationController::class, 'unread']);
        Route::post('notifications/read-all', [AdminNotificationController::class, 'markAll']);
        Route::patch('notifications/{notification}/read', [AdminNotificationController::class, 'markRead']);

        // المرضى
        Route::middleware('perm:patients')->group(function () {
            Route::get('patients', [AdminPatientController::class, 'index']);
            Route::post('patients', [AdminPatientController::class, 'store']);
            Route::get('patients/{patient}', [AdminPatientController::class, 'show']);
            Route::patch('patients/{patient}', [AdminPatientController::class, 'update']);
        });

        // المواعيد + قائمة الانتظار
        Route::middleware('perm:appointments')->group(function () {
            Route::get('appointments', [AdminAppointmentController::class, 'index']);
            Route::post('appointments', [AdminAppointmentController::class, 'store']);
            Route::patch('appointments/{appointment}', [AdminAppointmentController::class, 'update']);
            Route::patch('appointments/{appointment}/status', [AdminAppointmentController::class, 'updateStatus']);
        });

        // الكشوفات — شاشة الكشف الموحّدة
        Route::middleware('perm:consultations')->group(function () {
            Route::post('consultations', [AdminConsultationController::class, 'store']);
            Route::get('consultations/{consultation}', [AdminConsultationController::class, 'show']);
            Route::patch('consultations/{consultation}', [AdminConsultationController::class, 'update']);
            Route::post('consultations/{consultation}/finish', [AdminConsultationController::class, 'finish']);
        });

        // الفواتير
        Route::middleware('perm:invoices')->group(function () {
            Route::get('invoices', [AdminInvoiceController::class, 'index']);
            Route::post('invoices', [AdminInvoiceController::class, 'store']);
            Route::patch('invoices/{invoice}/pay', [AdminInvoiceController::class, 'pay']);
            Route::patch('invoices/{invoice}/cancel', [AdminInvoiceController::class, 'cancel']);
            Route::get('reports', [AdminReportController::class, 'index']);
        });

        // الموظفون
        Route::middleware('perm:staff')->group(function () {
            Route::get('staff', [AdminStaffController::class, 'index']);
            Route::post('staff', [AdminStaffController::class, 'store']);
            Route::patch('staff/{user}', [AdminStaffController::class, 'update']);
            Route::delete('staff/{user}', [AdminStaffController::class, 'destroy']);
            Route::post('staff/{user}/photo', [AdminStaffController::class, 'uploadPhoto']);
            Route::delete('staff/{user}/photo', [AdminStaffController::class, 'deletePhoto']);

            // ملفات الموظفين (HR) — صفحة وتفاصيل كاملة + حساب دخول اختياري
            Route::get('employees', [AdminEmployeeController::class, 'index']);
            Route::post('employees', [AdminEmployeeController::class, 'store']);
            Route::get('employees/{employee}', [AdminEmployeeController::class, 'show']);
            Route::patch('employees/{employee}', [AdminEmployeeController::class, 'update']);
            Route::delete('employees/{employee}', [AdminEmployeeController::class, 'destroy']);
        });

        // المخزون (أدوية) — القراءة لكل الموظفين (اقتراحات الوصفة)
        Route::get('inventory', [AdminInventoryController::class, 'index']);
        Route::middleware('perm:inventory')->group(function () {
            Route::post('inventory', [AdminInventoryController::class, 'store']);
            Route::patch('inventory/{medicine}', [AdminInventoryController::class, 'update']);
            Route::delete('inventory/{medicine}', [AdminInventoryController::class, 'destroy']);
        });

        // الصيدلية: الطبيب يرسل طلب صرف (perm:consultations)، والصيدلي يصرف (perm:pharmacy)
        Route::post('pharmacy/orders', [AdminPharmacyController::class, 'store'])->middleware('perm:consultations');
        Route::middleware('perm:pharmacy')->group(function () {
            Route::get('pharmacy', [AdminPharmacyController::class, 'index']);
            Route::patch('pharmacy/orders/{dispenseOrder}/dispense', [AdminPharmacyController::class, 'dispense']);
            Route::patch('pharmacy/orders/{dispenseOrder}/cancel', [AdminPharmacyController::class, 'cancel']);
        });

        // الإعدادات + الخدمات والأسعار
        Route::middleware('perm:settings')->group(function () {
            Route::get('settings', [AdminSettingController::class, 'index']);
            Route::patch('settings', [AdminSettingController::class, 'update']);
            Route::post('settings/photo', [AdminSettingController::class, 'uploadPhoto']);
            Route::post('services', [AdminServiceController::class, 'store']);
            Route::patch('services/{service}', [AdminServiceController::class, 'update']);
            Route::delete('services/{service}', [AdminServiceController::class, 'destroy']);
        });
    });
});

// ===== مالك المنصّة (super-admin) =====
Route::prefix('super')->group(function () {
    Route::post('login', [SuperAuthController::class, 'login']);

    Route::middleware(['auth:sanctum', 'super'])->group(function () {
        Route::get('me', [SuperAuthController::class, 'me']);
        Route::post('logout', [SuperAuthController::class, 'logout']);

        Route::get('notifications', [SuperNotificationController::class, 'index']);
        Route::post('notifications/read-all', [SuperNotificationController::class, 'markAll']);

        Route::get('clinics', [ClinicController::class, 'index']);
        Route::post('clinics', [ClinicController::class, 'store']);
        Route::patch('clinics/{clinic}', [ClinicController::class, 'update']);
        Route::post('clinics/{clinic}/approve', [ClinicController::class, 'approve']);
        Route::post('clinics/{clinic}/suspend', [ClinicController::class, 'suspend']);
        Route::post('clinics/{clinic}/activate', [ClinicController::class, 'activate']);

        // الباقات (plans) — يديرها صاحب المنصّة
        Route::get('plans', [SuperPlanController::class, 'index']);
        Route::post('plans', [SuperPlanController::class, 'store']);
        Route::patch('plans/{plan}', [SuperPlanController::class, 'update']);
        Route::delete('plans/{plan}', [SuperPlanController::class, 'destroy']);
    });
});
