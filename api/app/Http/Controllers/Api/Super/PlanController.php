<?php

namespace App\Http\Controllers\Api\Super;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PlanController extends Controller
{
    public function index(): JsonResponse
    {
        $plans = Plan::withCount('clinics')->orderBy('sort')->orderBy('id')->get();

        return response()->json(['plans' => $plans, 'features' => Plan::FEATURES]);
    }

    public function store(Request $request): JsonResponse
    {
        $plan = Plan::create($this->validated($request));

        return response()->json(['plan' => $plan], 201);
    }

    public function update(Request $request, Plan $plan): JsonResponse
    {
        $plan->update($this->validated($request, $plan));

        return response()->json(['plan' => $plan]);
    }

    public function destroy(Plan $plan): JsonResponse
    {
        if ($plan->clinics()->exists()) {
            return response()->json(['message' => 'لا يمكن حذف باقة مرتبطة بعيادات. انقل العيادات أولاً أو عطّل الباقة.'], 422);
        }
        $plan->delete();

        return response()->json(['message' => 'تم حذف الباقة.']);
    }

    private function validated(Request $request, ?Plan $plan = null): array
    {
        $data = $request->validate([
            'name'          => ['required', 'string', 'max:80'],
            'slug'          => ['required', 'string', 'max:60', 'alpha_dash', Rule::unique('plans', 'slug')->ignore($plan?->id)],
            'max_doctors'   => ['nullable', 'integer', 'min:1'],
            'max_users'     => ['nullable', 'integer', 'min:1'],
            'features'      => ['nullable', 'array'],
            'features.*'    => ['string', Rule::in(Plan::FEATURES)],
            'price_monthly' => ['nullable', 'numeric', 'min:0'],
            'trial_days'    => ['nullable', 'integer', 'min:0'],
            'is_active'     => ['nullable', 'boolean'],
            'sort'          => ['nullable', 'integer', 'min:0'],
        ]);
        $data['features'] = $data['features'] ?? [];

        return $data;
    }
}
