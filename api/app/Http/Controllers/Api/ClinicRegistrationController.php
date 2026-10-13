<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Clinic;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class ClinicRegistrationController extends Controller
{
    /**
     * Public list of active clinics — feeds the pet-owner signup dropdown so a
     * new owner can pick which clinic their account belongs to.
     */
    public function publicList(): JsonResponse
    {
        $clinics = Clinic::where('status', 'active')
            ->orderBy('name')
            ->get(['id', 'name', 'slug']);

        return response()->json(['clinics' => $clinics]);
    }

    /**
     * Public profile of a single active clinic, by slug — powers that clinic's
     * own public page (name, logo, contact, hours). 404 if missing or not active.
     */
    public function publicShow(string $slug): JsonResponse
    {
        $clinic = Clinic::where('slug', $slug)->where('status', 'active')->first();
        abort_unless($clinic, 404);

        // Settings are per-clinic; read this clinic's values explicitly (the
        // global scope is off on public routes), then merge over the defaults.
        $defaults = [
            'clinic_name'    => $clinic->name,
            'phone'          => $clinic->phone ?? '',
            'email'          => $clinic->email ?? '',
            'address'        => $clinic->address ?? '',
            'weekday_hours'  => '08:00 - 20:00',
            'weekend_hours'  => '09:00 - 18:00',
            'emergency_24_7' => '1',
            'online_booking' => '1',
            'clinic_photo'   => '',
            'primary_color'  => '#FF7A4D',
            'bg_color'       => '#FFF6EF',
            'hero_title'     => '',
            'hero_lead'      => '',
            'hero_badge'     => '',
            'hero_image'     => '',
            'stat1_value'    => '',
            'stat1_label'    => '',
            'stat2_value'    => '',
            'stat2_label'    => '',
            'stat3_value'    => '',
            'stat3_label'    => '',
            'show_services'  => '1',
            'show_team'      => '1',
            'show_booking'   => '1',
        ];
        $stored = Setting::where('clinic_id', $clinic->id)->pluck('value', 'key')->all();
        $settings = array_merge($defaults, array_intersect_key($stored, $defaults));

        return response()->json([
            'clinic' => [
                'id'       => $clinic->id,
                'name'     => $settings['clinic_name'] ?: $clinic->name,
                'slug'     => $clinic->slug,
                'logo'     => $clinic->logo,
                'settings' => $settings,
            ],
        ]);
    }

    /**
     * Public self-service clinic signup. Creates the clinic in a `pending` state
     * plus its first admin user, then waits for the platform owner to approve it.
     */
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'clinic_name'   => ['required', 'string', 'max:120'],
            'admin_name'    => ['required', 'string', 'max:100'],
            'email'         => ['required', 'email', 'max:150', 'unique:users,email'],
            'phone'         => ['nullable', 'string', 'max:30'],
            'password'      => ['required', Password::min(6)],
        ]);

        $clinic = DB::transaction(function () use ($data) {
            $clinic = Clinic::create([
                'name'   => $data['clinic_name'],
                'slug'   => $this->uniqueSlug($data['clinic_name']),
                'status' => 'pending',
                'phone'  => $data['phone'] ?? null,
                'email'  => $data['email'],
            ]);

            User::create([
                'clinic_id' => $clinic->id,
                'name'      => $data['admin_name'],
                'email'     => $data['email'],
                'phone'     => $data['phone'] ?? null,
                'role'      => 'admin',
                'password'  => $data['password'], // hashed via model cast
            ]);

            return $clinic;
        });

        return response()->json([
            'message' => 'تم استلام طلب تسجيل عيادتك. سيتم تفعيلها بعد مراجعة إدارة المنصّة. / '
                .'Your clinic registration was received and will be activated after review.',
            'clinic'  => ['name' => $clinic->name, 'slug' => $clinic->slug, 'status' => $clinic->status],
        ], 201);
    }

    /** Build a slug that is unique in the clinics table. */
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
