<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\EnforcesPlanLimits;
use App\Http\Controllers\Controller;
use App\Models\Clinic;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class AdminStaffController extends Controller
{
    use EnforcesPlanLimits;

    /**
     * All clinic staff / admins.
     */
    public function index(Request $request): JsonResponse
    {
        $staff = User::whereIn('role', ['staff', 'admin'])
            ->orderByRaw("FIELD(role,'admin','staff')")
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'phone', 'role', 'title', 'status', 'photo', 'permissions']);

        return response()->json(['staff' => $staff]);
    }

    /**
     * الأطباء فقط (أصحاب مسمّى وظيفي) — متاح لكل الموظفين لقوائم الاختيار
     * (موعد جديد، فلتر المواعيد) دون الحاجة لصلاحية staff الكاملة.
     */
    public function doctors(): JsonResponse
    {
        $doctors = User::whereIn('role', ['staff', 'admin'])
            ->whereNotNull('title')
            ->where('status', 'active')
            ->orderBy('name')
            ->get(['id', 'name', 'title']);

        return response()->json(['doctors' => $doctors]);
    }

    /**
     * Public "meet the team" list for a clinic's own page — no contact details.
     * Scoped to ?clinic=<slug>; without a valid slug returns an empty team.
     */
    public function publicIndex(Request $request): JsonResponse
    {
        $slug = $request->query('clinic');
        $clinicId = $slug ? Clinic::where('slug', $slug)->where('status', 'active')->value('id') : null;
        if (! $clinicId) {
            return response()->json(['team' => []]);
        }

        $team = User::whereIn('role', ['staff', 'admin'])
            ->where('status', 'active')
            ->where('clinic_id', $clinicId)
            ->orderByRaw("FIELD(role,'admin','staff')")
            ->orderBy('name')
            ->get(['id', 'name', 'title', 'photo']);

        return response()->json(['team' => $team]);
    }

    /**
     * Upload / replace a staff member's profile photo.
     */
    public function uploadPhoto(Request $request, User $user): JsonResponse
    {
        abort_unless($user->isStaff(), 404);

        $request->validate(['photo' => ['required', 'image', 'max:4096']]);

        $file = $request->file('photo');
        $name = 'staff-'.$user->id.'-'.now()->format('YmdHis').'.'.strtolower($file->getClientOriginalExtension());

        $dir = public_path('uploads');
        if (! is_dir($dir)) {
            mkdir($dir, 0775, true);
        }
        if ($user->photo && is_file(public_path(ltrim($user->photo, '/')))) {
            @unlink(public_path(ltrim($user->photo, '/')));
        }

        $file->move($dir, $name);
        $user->update(['photo' => '/uploads/'.$name]);

        return response()->json(['staff' => $user->fresh()]);
    }

    /**
     * Remove a staff member's photo (falls back to the icon).
     */
    public function deletePhoto(Request $request, User $user): JsonResponse
    {
        abort_unless($user->isStaff(), 404);

        if ($user->photo && is_file(public_path(ltrim($user->photo, '/')))) {
            @unlink(public_path(ltrim($user->photo, '/')));
        }
        $user->update(['photo' => null]);

        return response()->json(['staff' => $user->fresh()]);
    }

    /**
     * Add a doctor / staff member.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'     => ['required', 'string', 'max:100'],
            'email'    => ['required', 'email', 'max:150', 'unique:users,email'],
            'phone'    => ['nullable', 'string', 'max:30'],
            'title'    => ['nullable', 'string', 'max:80'],
            'role'     => ['sometimes', Rule::in(['staff', 'admin'])],
            'permissions'   => ['sometimes', 'array'],
            'permissions.*' => [Rule::in(User::PERMISSIONS)],
            'password' => ['required', Password::min(6)],
        ]);

        $this->enforcePlanLimits($request->user()->clinic, ! empty($data['title']));

        $staff = User::create([
            'name'     => $data['name'],
            'email'    => $data['email'],
            'phone'    => $data['phone'] ?? null,
            'title'    => $data['title'] ?? null,
            'role'        => $data['role'] ?? 'staff',
            'status'      => 'active',
            'permissions' => $data['permissions'] ?? [],
            'password'    => $data['password'],
        ]);

        return response()->json(['staff' => $staff], 201);
    }

    /**
     * Edit a staff member.
     */
    public function update(Request $request, User $user): JsonResponse
    {
        abort_unless($user->isStaff(), 404);

        $data = $request->validate([
            'name'   => ['sometimes', 'string', 'max:100'],
            'phone'  => ['sometimes', 'nullable', 'string', 'max:30'],
            'title'  => ['sometimes', 'nullable', 'string', 'max:80'],
            'role'   => ['sometimes', Rule::in(['staff', 'admin'])],
            'status' => ['sometimes', Rule::in(['active', 'idle'])],
            'permissions'   => ['sometimes', 'array'],
            'permissions.*' => [Rule::in(User::PERMISSIONS)],
        ]);

        $user->update($data);

        return response()->json(['staff' => $user->fresh()]);
    }

    /**
     * Remove a staff member (cannot delete yourself).
     */
    public function destroy(Request $request, User $user): JsonResponse
    {
        abort_unless($user->isStaff(), 404);

        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'You cannot delete your own account.'], 422);
        }

        $user->delete();

        return response()->json(['ok' => true]);
    }
}
