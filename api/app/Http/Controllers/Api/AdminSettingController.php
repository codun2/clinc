<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminSettingController extends Controller
{
    /** Editable general settings and their defaults. */
    private const KEYS = [
        'clinic_name'    => 'Layla Vet Clinic',
        'phone'          => '+961 70 123 456',
        'email'          => 'hello@laylavet.com',
        'address'        => 'Hamra Street, Beirut',
        'weekday_hours'  => '08:00 - 20:00',
        'weekend_hours'  => '09:00 - 18:00',
        'emergency_24_7' => '1',
        'online_booking' => '1',
        'clinic_photo'   => '',
        // Appearance / theme (Level-2 self-service customization)
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
        'show_adoptions' => '1',
        'show_booking'   => '1',
    ];

    /** Image settings that accept an upload, and their filename prefix. */
    private const IMAGE_KEYS = [
        'clinic_photo' => 'clinic',
        'hero_image'   => 'hero',
    ];

    /**
     * Upload an image setting (clinic logo or hero image). Stored in
     * public/uploads; the path is kept in the matching setting key.
     */
    public function uploadPhoto(Request $request): JsonResponse
    {
        $request->validate([
            'photo' => ['required', 'image', 'max:4096'],
            'key'   => ['sometimes', 'string', Rule::in(array_keys(self::IMAGE_KEYS))],
        ]);

        $key = $request->input('key', 'clinic_photo');
        $prefix = self::IMAGE_KEYS[$key];

        $file = $request->file('photo');
        $name = $prefix.'-'.now()->format('YmdHis').'.'.strtolower($file->getClientOriginalExtension());

        $dir = public_path('uploads');
        if (! is_dir($dir)) {
            mkdir($dir, 0775, true);
        }

        // Replace the previous file for THIS clinic's key only (scoped lookup).
        $old = Setting::where('key', $key)->value('value');
        if ($old && is_file(public_path(ltrim($old, '/')))) {
            @unlink(public_path(ltrim($old, '/')));
        }

        $file->move($dir, $name);
        Setting::updateOrCreate(['key' => $key], ['value' => '/uploads/'.$name]);

        return $this->index($request);
    }

    public function index(Request $request): JsonResponse
    {
        $stored = Setting::map();
        $settings = [];
        foreach (self::KEYS as $key => $default) {
            $settings[$key] = array_key_exists($key, $stored) ? $stored[$key] : $default;
        }

        return response()->json(['settings' => $settings]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'clinic_name'    => ['sometimes', 'string', 'max:120'],
            'phone'          => ['sometimes', 'string', 'max:40'],
            'email'          => ['sometimes', 'nullable', 'email', 'max:120'],
            'address'        => ['sometimes', 'nullable', 'string', 'max:200'],
            'weekday_hours'  => ['sometimes', 'nullable', 'string', 'max:40'],
            'weekend_hours'  => ['sometimes', 'nullable', 'string', 'max:40'],
            'emergency_24_7' => ['sometimes', 'boolean'],
            'online_booking' => ['sometimes', 'boolean'],
            'primary_color'  => ['sometimes', 'nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'bg_color'       => ['sometimes', 'nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'hero_title'     => ['sometimes', 'nullable', 'string', 'max:120'],
            'hero_lead'      => ['sometimes', 'nullable', 'string', 'max:400'],
            'hero_badge'     => ['sometimes', 'nullable', 'string', 'max:60'],
            'stat1_value'    => ['sometimes', 'nullable', 'string', 'max:20'],
            'stat1_label'    => ['sometimes', 'nullable', 'string', 'max:40'],
            'stat2_value'    => ['sometimes', 'nullable', 'string', 'max:20'],
            'stat2_label'    => ['sometimes', 'nullable', 'string', 'max:40'],
            'stat3_value'    => ['sometimes', 'nullable', 'string', 'max:20'],
            'stat3_label'    => ['sometimes', 'nullable', 'string', 'max:40'],
            'show_services'  => ['sometimes', 'boolean'],
            'show_team'      => ['sometimes', 'boolean'],
            'show_adoptions' => ['sometimes', 'boolean'],
            'show_booking'   => ['sometimes', 'boolean'],
        ]);

        foreach ($data as $key => $value) {
            if (is_bool($value)) {
                $value = $value ? '1' : '0';
            }
            Setting::updateOrCreate(['key' => $key], ['value' => $value]);
        }

        return $this->index($request);
    }
}
