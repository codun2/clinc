<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Patient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminPatientController extends Controller
{
    /** قائمة المرضى مع بحث بالاسم/الجوال/رقم الملف + فلاتر سريعة. */
    public function index(Request $request): JsonResponse
    {
        $q = Patient::query()
            ->withCount('consultations')
            ->withSum(['invoices as pending_total' => fn ($i) => $i->where('status', 'pending')], 'total');

        if ($search = trim((string) $request->query('q'))) {
            $q->where(function ($w) use ($search) {
                $w->where('name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('file_no', 'like', "%{$search}%");
            });
        }

        if ($request->query('filter') === 'pending_invoices') {
            $q->whereHas('invoices', fn ($i) => $i->where('status', 'pending'));
        }
        if ($request->query('filter') === 'chronic') {
            $q->whereNotNull('chronic_conditions')->where('chronic_conditions', '!=', '');
        }

        $patients = $q->orderByDesc('id')->paginate(20);

        return response()->json($patients);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $data['file_no'] = Patient::nextFileNo();

        $patient = Patient::create($data);

        return response()->json(['patient' => $patient], 201);
    }

    /** ملف المريض الكامل: بيانات + زيارات + فواتير + مواعيد قادمة. */
    public function show(Patient $patient): JsonResponse
    {
        $patient->load([
            'consultations' => fn ($q) => $q->with('doctor:id,name')->limit(20),
            'invoices'      => fn ($q) => $q->limit(20),
            'appointments'  => fn ($q) => $q->with('doctor:id,name')->where('scheduled_at', '>=', now())->limit(5),
        ]);

        return response()->json([
            'patient' => $patient,
            'stats'   => [
                'visits_total'  => $patient->consultations()->count(),
                'paid_total'    => (float) $patient->invoices()->where('status', 'paid')->sum('total'),
                'pending_total' => (float) $patient->invoices()->where('status', 'pending')->sum('total'),
            ],
        ]);
    }

    public function update(Request $request, Patient $patient): JsonResponse
    {
        $patient->update($this->validated($request));

        return response()->json(['patient' => $patient]);
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'name'               => ['required', 'string', 'max:120'],
            'phone'              => ['required', 'string', 'max:30'],
            'gender'             => ['nullable', 'in:male,female'],
            'birthdate'          => ['nullable', 'date'],
            'national_id'        => ['nullable', 'string', 'max:30'],
            'address'            => ['nullable', 'string', 'max:255'],
            'blood_type'         => ['nullable', 'string', 'max:5'],
            'allergies'          => ['nullable', 'string'],
            'chronic_conditions' => ['nullable', 'string'],
            'emergency_phone'    => ['nullable', 'string', 'max:30'],
            'notes'              => ['nullable', 'string'],
        ]);
    }
}
