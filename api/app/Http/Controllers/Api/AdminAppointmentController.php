<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminAppointmentController extends Controller
{
    /** مواعيد يوم محدد + قائمة الانتظار الحيّة + ملخص. */
    public function index(Request $request): JsonResponse
    {
        $date = $request->query('date', today()->toDateString());
        $user = $request->user();

        // الطبيب (صاحب مسمّى وظيفي، غير المدير) يرى مواعيده فقط — لا مواعيد زملائه.
        $onlyMine = $user->title && $user->role !== 'admin';
        $scope = fn ($query) => $onlyMine ? $query->where('doctor_id', $user->id) : $query;

        $q = $scope(Appointment::whereDate('scheduled_at', $date))
            ->with(['patient:id,name,file_no,phone', 'doctor:id,name']);

        // الفلتر اليدوي بالطبيب متاح فقط لغير المقيّدين (الاستقبال/المدير).
        if (! $onlyMine && ($doctorId = $request->query('doctor_id'))) {
            $q->where('doctor_id', $doctorId);
        }
        if ($status = $request->query('status')) {
            $q->where('status', $status);
        }

        $appointments = $q->orderBy('scheduled_at')->get();

        $queue = $scope(Appointment::where('status', 'arrived'))
            ->with(['patient:id,name,file_no', 'doctor:id,name'])
            ->orderBy('arrived_at')
            ->get();

        $all = $scope(Appointment::whereDate('scheduled_at', $date));

        return response()->json([
            'appointments' => $appointments,
            'queue'        => $queue,
            'scoped'       => $onlyMine, // تُخبر الواجهة أن تخفي فلتر الأطباء
            'summary'      => [
                'total'     => (clone $all)->count(),
                'completed' => (clone $all)->where('status', 'completed')->count(),
                'no_show'   => (clone $all)->where('status', 'no_show')->count(),
                'online'    => (clone $all)->where('source', 'online')->count(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'patient_id'   => ['required', 'exists:patients,id'],
            'doctor_id'    => ['nullable', 'exists:users,id'],
            'department'   => ['nullable', 'string', 'max:60'],
            'type'         => ['nullable', 'in:new,followup'],
            'reason'       => ['nullable', 'string', 'max:255'],
            'scheduled_at' => ['required', 'date'],
        ]);

        $appointment = Appointment::create($data + ['status' => 'scheduled', 'source' => 'desk']);

        return response()->json(['appointment' => $appointment->load(['patient:id,name,file_no', 'doctor:id,name'])], 201);
    }

    public function update(Request $request, Appointment $appointment): JsonResponse
    {
        $data = $request->validate([
            'doctor_id'    => ['nullable', 'exists:users,id'],
            'department'   => ['nullable', 'string', 'max:60'],
            'type'         => ['nullable', 'in:new,followup'],
            'reason'       => ['nullable', 'string', 'max:255'],
            'scheduled_at' => ['sometimes', 'date'],
        ]);

        $appointment->update($data);

        return response()->json(['appointment' => $appointment->load(['patient:id,name,file_no', 'doctor:id,name'])]);
    }

    /** تغيير الحالة — الوصول يسجّل وقت الوصول (يدخل قائمة الانتظار). */
    public function updateStatus(Request $request, Appointment $appointment): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(Appointment::STATUSES)],
        ]);

        $appointment->update([
            'status'     => $data['status'],
            'arrived_at' => $data['status'] === 'arrived' ? now() : $appointment->arrived_at,
        ]);

        return response()->json(['appointment' => $appointment->load(['patient:id,name,file_no', 'doctor:id,name'])]);
    }
}
