<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DispenseOrder;
use App\Models\Medicine;
use App\Models\Patient;
use App\Support\Notify;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * الصيدلية: الطبيب يرسل طلب صرف (من الوصفة)، والصيدلي يصرف فيُخصم من المخزون.
 */
class AdminPharmacyController extends Controller
{
    /** لوحة الصيدلي: طلبات معلّقة + آخر ما صُرف + أدوية منخفضة المخزون. */
    public function index(Request $request): JsonResponse
    {
        $pending = DispenseOrder::where('status', 'pending')
            ->with(['patient:id,name,file_no', 'doctor:id,name'])
            ->orderBy('created_at')
            ->get();

        $recent = DispenseOrder::where('status', 'dispensed')
            ->with(['patient:id,name,file_no', 'doctor:id,name', 'dispenser:id,name'])
            ->latest('dispensed_at')
            ->limit(20)
            ->get();

        $lowStock = Medicine::whereColumn('quantity', '<=', 'low_stock_threshold')
            ->orderBy('quantity')
            ->get(['id', 'name', 'quantity', 'unit', 'low_stock_threshold']);

        return response()->json([
            'pending'   => $pending,
            'recent'    => $recent,
            'low_stock' => $lowStock,
        ]);
    }

    /** إنشاء طلب صرف — يستدعيه الطبيب من شاشة الكشف. */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'patient_id'        => ['required', 'exists:patients,id'],
            'consultation_id'   => ['nullable', 'exists:consultations,id'],
            'items'             => ['required', 'array', 'min:1'],
            'items.*.drug'      => ['required', 'string', 'max:160'],
            'items.*.dose'      => ['nullable', 'string', 'max:120'],
            'items.*.duration'  => ['nullable', 'string', 'max:120'],
            'items.*.medicine_id' => ['nullable', 'integer'],
            'items.*.qty'       => ['nullable', 'numeric', 'min:0'],
            'note'              => ['nullable', 'string', 'max:500'],
        ]);

        $order = DispenseOrder::create([
            'patient_id'      => $data['patient_id'],
            'consultation_id' => $data['consultation_id'] ?? null,
            'doctor_id'       => $request->user()->id,
            'status'          => 'pending',
            'items'           => $data['items'],
            'note'            => $data['note'] ?? null,
        ]);

        $patient = Patient::find($data['patient_id']);
        Notify::clinic(
            $order->clinic_id,
            'pharmacy',
            'طلب صرف دواء جديد',
            ($patient?->name ?? 'مريض').' · '.count($data['items']).' صنف',
            'prescription',
            'pharmacy',
            ['dispense_order_id' => $order->id],
        );

        return response()->json(['order' => $order->load(['patient:id,name,file_no', 'doctor:id,name'])], 201);
    }

    /** صرف الطلب: يُخصم من المخزون كل صنف مرتبط بدواء، ويُعلَّم كمصروف. */
    public function dispense(Request $request, DispenseOrder $dispenseOrder): JsonResponse
    {
        if ($dispenseOrder->status !== 'pending') {
            throw ValidationException::withMessages(['status' => ['هذا الطلب لم يَعُد معلّقاً.']]);
        }

        DB::transaction(function () use ($dispenseOrder, $request) {
            foreach ($dispenseOrder->items as $it) {
                if (! empty($it['medicine_id'])) {
                    $med = Medicine::find($it['medicine_id']);
                    if ($med) {
                        $qty = (float) ($it['qty'] ?? 1);
                        $med->quantity = max(0, (float) $med->quantity - $qty);
                        $med->save();
                    }
                }
            }
            $dispenseOrder->update([
                'status'       => 'dispensed',
                'dispensed_by' => $request->user()->id,
                'dispensed_at' => now(),
            ]);
        });

        Notify::clinic(
            $dispenseOrder->clinic_id,
            'pharmacy',
            'تم صرف الدواء',
            ($dispenseOrder->patient?->name ?? 'مريض').' — بواسطة '.$request->user()->name,
            'checkup-list',
            'pharmacy',
            ['dispense_order_id' => $dispenseOrder->id],
        );

        return response()->json(['order' => $dispenseOrder->fresh()->load(['patient:id,name,file_no', 'doctor:id,name', 'dispenser:id,name'])]);
    }

    /** إلغاء طلب صرف معلّق. */
    public function cancel(Request $request, DispenseOrder $dispenseOrder): JsonResponse
    {
        if ($dispenseOrder->status !== 'pending') {
            throw ValidationException::withMessages(['status' => ['لا يمكن إلغاء طلب غير معلّق.']]);
        }
        $dispenseOrder->update(['status' => 'cancelled']);

        return response()->json(['order' => $dispenseOrder->fresh()]);
    }
}
