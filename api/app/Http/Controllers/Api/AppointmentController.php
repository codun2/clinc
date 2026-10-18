<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Clinic;
use App\Models\Patient;
use App\Models\Service;
use App\Models\User;
use App\Support\Notify;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * الحجز الأونلاين العام — بدون تسجيل دخول.
 * الصفحة تحدد العيادة بالـ slug، والحجز ينشئ مريضاً (أو يطابق جواله) وموعداً.
 */
class AppointmentController extends Controller
{
    /** بيانات صفحة الحجز: الأقسام والأطباء والخدمات. */
    public function bookingInfo(string $slug): JsonResponse
    {
        $clinic = Clinic::where('slug', $slug)->where('status', 'active')->firstOrFail();

        $doctors = User::withoutGlobalScopes()
            ->where('clinic_id', $clinic->id)
            ->whereIn('role', ['staff', 'admin'])
            ->whereNotNull('title')
            ->get(['id', 'name', 'title']);

        $services = Service::withoutGlobalScopes()
            ->where('clinic_id', $clinic->id)
            ->where('active', true)
            ->get(['id', 'name', 'department', 'price']);

        return response()->json([
            'clinic'      => ['id' => $clinic->id, 'name' => $clinic->name, 'slug' => $clinic->slug],
            'doctors'     => $doctors,
            'departments' => $services->pluck('department')->filter()->unique()->values(),
            'services'    => $services,
        ]);
    }

    /** الأوقات المتاحة ليوم/طبيب: كل نصف ساعة ضمن الدوام ناقص المحجوز. */
    public function slots(Request $request, string $slug): JsonResponse
    {
        $clinic = Clinic::where('slug', $slug)->where('status', 'active')->firstOrFail();

        $data = $request->validate([
            'date'      => ['required', 'date'],
            'doctor_id' => ['nullable', 'integer'],
        ]);

        // الوقت لا يُشطب إلا بعد أن يؤكّد الطبيب الموعد؛ الطلبات المعلّقة
        // (scheduled) تبقى الأوقات متاحة لغيرها حتى التأكيد.
        $taken = Appointment::withoutGlobalScopes()
            ->where('clinic_id', $clinic->id)
            ->whereDate('scheduled_at', $data['date'])
            ->when($data['doctor_id'] ?? null, fn ($q, $d) => $q->where('doctor_id', $d))
            ->whereIn('status', ['confirmed', 'arrived', 'in_progress', 'completed'])
            ->pluck('scheduled_at')
            ->map(fn ($dt) => $dt->format('H:i'));

        $slots = [];
        foreach ([['09:00', '12:30'], ['16:00', '20:30']] as [$from, $to]) {
            for ($t = strtotime($from); $t <= strtotime($to); $t += 1800) {
                $hm = date('H:i', $t);
                $slots[] = ['time' => $hm, 'available' => ! $taken->contains($hm)];
            }
        }

        return response()->json(['date' => $data['date'], 'slots' => $slots]);
    }

    /** تأكيد الحجز: مطابقة المريض بالجوال أو إنشاؤه + إنشاء الموعد. */
    public function book(Request $request, string $slug): JsonResponse
    {
        $clinic = Clinic::where('slug', $slug)->where('status', 'active')->firstOrFail();

        $data = $request->validate([
            'name'         => ['required', 'string', 'max:120'],
            'phone'        => ['required', 'string', 'max:30'],
            'department'   => ['nullable', 'string', 'max:60'],
            'doctor_id'    => ['nullable', 'integer'],
            'scheduled_at' => ['required', 'date', 'after:now'],
        ]);

        // لا نمنع الطلبات المعلّقة على نفس الوقت (الطلب لا يحجز)، لكن نمنع
        // الحجز على وقت سبق أن أكّده الطبيب لنفس الطبيب.
        if (! empty($data['doctor_id'])) {
            $confirmed = Appointment::withoutGlobalScopes()
                ->where('clinic_id', $clinic->id)
                ->where('doctor_id', $data['doctor_id'])
                ->where('scheduled_at', $data['scheduled_at'])
                ->whereIn('status', ['confirmed', 'arrived', 'in_progress', 'completed'])
                ->exists();
            if ($confirmed) {
                throw ValidationException::withMessages([
                    'scheduled_at' => ['هذا الوقت حُجز للتوّ — اختر وقتاً آخر.'],
                ]);
            }
        }

        $appointment = DB::transaction(function () use ($clinic, $data) {
            $patient = Patient::withoutGlobalScopes()
                ->where('clinic_id', $clinic->id)
                ->where('phone', $data['phone'])
                ->first();

            if (! $patient) {
                $max = Patient::withoutGlobalScopes()->where('clinic_id', $clinic->id)->max('file_no');
                $patient = Patient::withoutGlobalScopes()->create([
                    'clinic_id' => $clinic->id,
                    'file_no'   => (string) max((int) $max + 1, 10001),
                    'name'      => $data['name'],
                    'phone'     => $data['phone'],
                ]);
            }

            return Appointment::withoutGlobalScopes()->create([
                'clinic_id'    => $clinic->id,
                'patient_id'   => $patient->id,
                'doctor_id'    => $data['doctor_id'] ?? null,
                'department'   => $data['department'] ?? null,
                'type'         => 'new',
                'scheduled_at' => $data['scheduled_at'],
                'status'       => 'scheduled',
                'source'       => 'online',
            ]);
        });

        // إشعار لطاقم العيادة بوجود حجز أونلاين جديد
        Notify::clinic(
            $clinic->id,
            'booking',
            'حجز أونلاين جديد',
            $data['name'].' · '.$appointment->scheduled_at->format('Y-m-d H:i'),
            'calendar-plus',
            'appointments',
            ['appointment_id' => $appointment->id],
        );

        return response()->json([
            'message'     => 'تم استلام طلب الحجز — بانتظار تأكيد العيادة، وسيصلك إشعار بالتأكيد.',
            'appointment' => $appointment,
        ], 201);
    }
}
