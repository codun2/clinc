<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AdminAuthController extends Controller
{
    /**
     * Staff/admin login by email + password. Owners are rejected.
     */
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $data['email'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => [__('These credentials do not match our records.')],
            ]);
        }

        if (! $user->isStaff()) {
            throw ValidationException::withMessages([
                'email' => [__('This account is not a clinic staff account.')],
            ]);
        }

        // Gate staff access on the clinic's subscription/approval status.
        $clinic = $user->clinic;

        if (! $clinic || $clinic->status === 'pending') {
            throw ValidationException::withMessages([
                'email' => ['العيادة بانتظار التفعيل من إدارة المنصّة. / Your clinic is awaiting platform approval.'],
            ]);
        }

        if ($clinic->status === 'suspended') {
            throw ValidationException::withMessages([
                'email' => ['تم إيقاف هذه العيادة. الرجاء التواصل مع إدارة المنصّة. / This clinic has been suspended — please contact the platform.'],
            ]);
        }

        $token = $user->createToken('clinic-admin', ['staff'])->plainTextToken;

        return response()->json(['user' => $user, 'token' => $token]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $clinic = $user->clinic; // belongsTo (Clinic has no clinic scope)

        // Settings are auto-scoped to this clinic by SetClinicContext.
        $s = Setting::whereIn('key', ['clinic_name', 'clinic_photo', 'primary_color'])
            ->pluck('value', 'key');

        $plan = $clinic?->plan;

        return response()->json([
            'user'   => $user,
            'clinic' => [
                'name'          => $s['clinic_name'] ?? ($clinic->name ?? 'Clinic'),
                'logo'          => $s['clinic_photo'] ?? null,
                'primary_color' => $s['primary_color'] ?? null,
                'plan'          => $plan ? [
                    'name'         => $plan->name,
                    'slug'         => $plan->slug,
                    'max_doctors'  => $plan->max_doctors,
                    'max_users'    => $plan->max_users,
                    'doctors_used' => $clinic->doctorsCount(),
                    'users_used'   => $clinic->usersCount(),
                ] : null,
                // الميزات المفعّلة (بلا باقة = كلها — توافق خلفي)
                'features'      => $plan ? ($plan->features ?? []) : \App\Models\Plan::FEATURES,
            ],
        ]);
    }

    /**
     * Live sidebar badge counts — only for sections the user can access.
     */
    public function badges(Request $request): JsonResponse
    {
        $user = $request->user();
        // الطبيب يرى أرقامه هو فقط؛ المدير/الاستقبال يرون كامل العيادة.
        $onlyMine = $user->title && $user->role !== 'admin';
        $scope = fn ($q) => $onlyMine ? $q->where('doctor_id', $user->id) : $q;

        return response()->json([
            // طلبات حجز جديدة بانتظار التأكيد (قادمة) — تُعرض كعدّاد على "المواعيد"
            'pending' => $user->hasPerm('appointments')
                ? $scope(\App\Models\Appointment::where('status', 'scheduled')
                    ->where('scheduled_at', '>=', now()->startOfDay()))->count()
                : null,
            // قائمة الانتظار الحالية (وصلوا ولم يُكشف عليهم بعد)
            'queue' => $user->hasPerm('appointments')
                ? $scope(\App\Models\Appointment::where('status', 'arrived'))->count()
                : null,
            'pending_invoices' => $user->hasPerm('invoices')
                ? \App\Models\Invoice::where('status', 'pending')->count()
                : null,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out.']);
    }
}
