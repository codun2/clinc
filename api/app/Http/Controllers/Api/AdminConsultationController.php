<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Consultation;
use App\Models\Invoice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminConsultationController extends Controller
{
    /** بدء كشف — من موعد (يحوّله قيد الكشف) أو مباشرة لمريض. */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'patient_id'     => ['required_without:appointment_id', 'exists:patients,id'],
            'appointment_id' => ['nullable', 'exists:appointments,id'],
        ]);

        $appointment = null;
        if (! empty($data['appointment_id'])) {
            $appointment = Appointment::findOrFail($data['appointment_id']);
            $appointment->update(['status' => 'in_progress']);
        }

        // كشف مسودّة قائم لنفس الموعد؟ أعد استخدامه بدل التكرار.
        $consultation = Consultation::firstOrCreate(
            [
                'appointment_id' => $appointment?->id,
                'patient_id'     => $appointment?->patient_id ?? $data['patient_id'],
                'status'         => 'draft',
            ],
            ['doctor_id' => $request->user()->id],
        );

        $consultation->load('patient');

        return response()->json(['consultation' => $consultation], 201);
    }

    public function show(Consultation $consultation): JsonResponse
    {
        $consultation->load(['patient', 'doctor:id,name', 'appointment']);

        return response()->json(['consultation' => $consultation]);
    }

    /** حفظ تدريجي لحقول الكشف (علامات حيوية/ملاحظة/وصفة/طلبات). */
    public function update(Request $request, Consultation $consultation): JsonResponse
    {
        $data = $request->validate([
            'bp'             => ['nullable', 'string', 'max:12'],
            'pulse'          => ['nullable', 'integer', 'between:20,250'],
            'temp'           => ['nullable', 'numeric', 'between:30,45'],
            'weight'         => ['nullable', 'numeric', 'between:0,400'],
            'complaint'      => ['nullable', 'string'],
            'examination'    => ['nullable', 'string'],
            'diagnosis'      => ['nullable', 'string'],
            'notes'          => ['nullable', 'string'],
            'prescription'   => ['nullable', 'array'],
            'prescription.*.drug'     => ['required_with:prescription', 'string'],
            'prescription.*.dose'     => ['nullable', 'string'],
            'prescription.*.duration' => ['nullable', 'string'],
            'orders'         => ['nullable', 'array'],
            'orders.*'       => ['string'],
        ]);

        // تحقق تلقائي من الحساسية: الدواء المضاف يُقارن بنص حساسية المريض
        $warnings = [];
        $allergies = mb_strtolower((string) $consultation->patient->allergies);
        foreach ($data['prescription'] ?? [] as $rx) {
            $drug = mb_strtolower($rx['drug']);
            if ($allergies !== '' && (str_contains($allergies, $drug) || str_contains($drug, trim($allergies)))) {
                $warnings[] = "تحذير: المريض لديه حساسية مسجّلة ({$consultation->patient->allergies}) — راجع دواء {$rx['drug']}";
            }
        }

        $consultation->update($data);

        return response()->json(['consultation' => $consultation, 'warnings' => $warnings]);
    }

    /**
     * إنهاء الكشف — خطوة واحدة: يعتمد الكشف + يكمل الموعد + ينشئ الفاتورة.
     */
    public function finish(Request $request, Consultation $consultation): JsonResponse
    {
        $data = $request->validate([
            'items'          => ['required', 'array', 'min:1'],
            'items.*.name'   => ['required', 'string'],
            'items.*.price'  => ['required', 'numeric', 'min:0'],
            'method'         => ['nullable', 'in:cash,card,transfer'],  // null = فاتورة معلّقة
            'followup_at'    => ['nullable', 'date'],
        ]);

        $invoice = DB::transaction(function () use ($data, $request, $consultation) {
            $consultation->update(['status' => 'final', 'finished_at' => now()]);

            $consultation->appointment?->update(['status' => 'completed']);

            // موعد متابعة اختياري بنقرة واحدة
            if (! empty($data['followup_at'])) {
                Appointment::create([
                    'patient_id'   => $consultation->patient_id,
                    'doctor_id'    => $consultation->doctor_id,
                    'department'   => $consultation->appointment?->department,
                    'type'         => 'followup',
                    'scheduled_at' => $data['followup_at'],
                    'status'       => 'scheduled',
                ]);
            }

            return Invoice::create([
                'patient_id'      => $consultation->patient_id,
                'consultation_id' => $consultation->id,
                'number'          => Invoice::nextNumber(),
                'items'           => $data['items'],
                'total'           => collect($data['items'])->sum('price'),
                'method'          => $data['method'] ?? null,
                'status'          => isset($data['method']) ? 'paid' : 'pending',
                'paid_at'         => isset($data['method']) ? now() : null,
                'recorded_by'     => $request->user()->name,
            ]);
        });

        return response()->json([
            'consultation' => $consultation->fresh(),
            'invoice'      => $invoice,
        ]);
    }
}
