<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminServiceController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['services' => Service::orderBy('department')->orderBy('name')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $service = Service::create($this->validated($request));

        return response()->json(['service' => $service], 201);
    }

    public function update(Request $request, Service $service): JsonResponse
    {
        $service->update($this->validated($request));

        return response()->json(['service' => $service]);
    }

    public function destroy(Service $service): JsonResponse
    {
        $service->delete();

        return response()->json(['message' => 'Deleted.']);
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'name'       => ['required', 'string', 'max:120'],
            'department' => ['nullable', 'string', 'max:60'],
            'price'      => ['required', 'numeric', 'min:0'],
            'active'     => ['sometimes', 'boolean'],
        ]);
    }
}
