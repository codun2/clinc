<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Medicine;
use App\Support\Notify;
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
        $this->warnIfLow($medicine);

        return response()->json(['item' => $medicine], 201);
    }

    public function update(Request $request, Medicine $medicine): JsonResponse
    {
        $medicine->update($this->validated($request, creating: false));
        $this->warnIfLow($medicine->fresh());

        return response()->json(['item' => $medicine->fresh()]);
    }

    /** إشعار عند هبوط الكمية إلى حد التنبيه أو أقل. */
    private function warnIfLow(Medicine $medicine): void
    {
        if ($medicine->quantity <= $medicine->low_stock_threshold) {
            Notify::clinic(
                (int) $medicine->clinic_id,
                'inventory',
                'مخزون منخفض',
                $medicine->name.' — المتبقي '.rtrim(rtrim((string) $medicine->quantity, '0'), '.').' '.($medicine->unit ?? ''),
                'alert-triangle',
                'inventory',
                ['medicine_id' => $medicine->id],
            );
        }
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
