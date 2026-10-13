<?php

namespace App\Http\Controllers\Api\Super;

use App\Http\Controllers\Controller;
use App\Models\Clinic;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class ClinicController extends Controller
{
    /**
     * List clinics for the platform owner, newest first, with staff/pet counts.
     * Optional ?status= filter (pending|active|suspended).
     */
    public function index(Request $request): JsonResponse
    {
        $clinics = Clinic::query()
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->withCount([
                'users as staff_count' => fn ($q) => $q->whereIn('role', ['admin', 'staff']),
                'patients as patients_count',
            ])
            ->orderByDesc('id')
            ->get();

        return response()->json(['clinics' => $clinics]);
    }

    /**
     * Manually create a clinic plus its first admin user (active immediately).
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'          => ['required', 'string', 'max:120'],
            'admin_name'    => ['required', 'string', 'max:100'],
            'admin_email'   => ['required', 'email', 'max:150', 'unique:users,email'],
            'admin_phone'   => ['nullable', 'string', 'max:30'],
            'admin_password'=> ['required', Password::min(6)],
            'status'        => ['nullable', 'in:pending,active,suspended'],
        ]);

        $clinic = DB::transaction(function () use ($data) {
            $clinic = Clinic::create([
                'name'   => $data['name'],
                'slug'   => $this->uniqueSlug($data['name']),
                'status' => $data['status'] ?? 'active',
                'phone'  => $data['admin_phone'] ?? null,
                'email'  => $data['admin_email'],
            ]);

            User::create([
                'clinic_id' => $clinic->id,
                'name'      => $data['admin_name'],
                'email'     => $data['admin_email'],
                'phone'     => $data['admin_phone'] ?? null,
                'role'      => 'admin',
                'password'  => $data['admin_password'],
            ]);

            return $clinic;
        });

        return response()->json(['clinic' => $clinic], 201);
    }

    public function update(Request $request, Clinic $clinic): JsonResponse
    {
        $data = $request->validate([
            'name'    => ['sometimes', 'string', 'max:120'],
            'phone'   => ['sometimes', 'nullable', 'string', 'max:30'],
            'email'   => ['sometimes', 'nullable', 'email', 'max:150'],
            'address' => ['sometimes', 'nullable', 'string', 'max:200'],
            'plan'    => ['sometimes', 'nullable', 'string', 'max:60'],
        ]);

        $clinic->update($data);

        return response()->json(['clinic' => $clinic]);
    }

    public function approve(Clinic $clinic): JsonResponse
    {
        $clinic->update(['status' => 'active']);

        return response()->json(['clinic' => $clinic]);
    }

    public function suspend(Clinic $clinic): JsonResponse
    {
        $clinic->update(['status' => 'suspended']);

        return response()->json(['clinic' => $clinic]);
    }

    public function activate(Clinic $clinic): JsonResponse
    {
        $clinic->update(['status' => 'active']);

        return response()->json(['clinic' => $clinic]);
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'clinic';
        $slug = $base;
        $i = 2;

        while (Clinic::where('slug', $slug)->exists()) {
            $slug = $base.'-'.$i++;
        }

        return $slug;
    }
}
