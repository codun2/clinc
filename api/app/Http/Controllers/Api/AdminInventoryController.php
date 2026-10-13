<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Medicine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminInventoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $items = Medicine::orderBy('name')->get();

        return response()->json([
            'items'     => $items,
            'low_count' => $items->filter(fn ($m) => $m->quantity <= $m->low_stock_threshold)->count(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request, creating: true);
        $medicine = Medicine::create($data);

        return response()->json(['item' => $medicine], 201);
    }

    public function update(Request $request, Medicine $medicine): JsonResponse
    {
        $medicine->update($this->validated($request, creating: false));

        return response()->json(['item' => $medicine->fresh()]);
    }

    public function destroy(Request $request, Medicine $medicine): JsonResponse
    {
        $medicine->delete();

        return response()->json(['ok' => true]);
    }

    private function validated(Request $request, bool $creating): array
    {
        $req = $creating ? 'required' : 'sometimes';

        return $request->validate([
            'name'                => [$req, 'string', 'max:100'],
            'category'            => ['nullable', 'string', 'max:50'],
            'quantity'            => [$req, 'numeric', 'min:0'],
            'unit'                => ['nullable', 'string', 'max:20'],
            'low_stock_threshold' => ['sometimes', 'numeric', 'min:0'],
            'price'               => ['nullable', 'numeric', 'min:0'],
        ]);
    }
}
