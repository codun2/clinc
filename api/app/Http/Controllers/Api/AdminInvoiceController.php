<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminInvoiceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = Invoice::query()->with('patient:id,name,file_no');

        if ($status = $request->query('status')) {
            $q->where('status', $status);
        }
        if ($search = trim((string) $request->query('q'))) {
            $q->where(function ($w) use ($search) {
                $w->where('number', 'like', "%{$search}%")
                    ->orWhereHas('patient', fn ($p) => $p->where('name', 'like', "%{$search}%"));
            });
        }
        if ($from = $request->query('from')) {
            $q->whereDate('created_at', '>=', $from);
        }
        if ($to = $request->query('to')) {
            $q->whereDate('created_at', '<=', $to);
        }

        return response()->json([
            'invoices' => $q->orderByDesc('id')->paginate(20),
            'stats'    => [
                'month_total'   => (float) Invoice::where('status', 'paid')->whereMonth('created_at', now()->month)->whereYear('created_at', now()->year)->sum('total'),
                'month_count'   => Invoice::whereMonth('created_at', now()->month)->whereYear('created_at', now()->year)->count(),
                'pending_total' => (float) Invoice::where('status', 'pending')->sum('total'),
                'pending_count' => Invoice::where('status', 'pending')->count(),
                'today_total'   => (float) Invoice::where('status', 'paid')->whereDate('created_at', today())->sum('total'),
                'today_count'   => Invoice::whereDate('created_at', today())->count(),
                // سلسلة آخر 6 أشهر لمخطط التقارير
                'monthly'       => collect(range(5, 0))->map(function ($i) {
                    $m = now()->subMonths($i);

                    return [
                        'month' => $m->format('Y-m'),
                        'total' => (float) Invoice::where('status', 'paid')
                            ->whereYear('created_at', $m->year)
                            ->whereMonth('created_at', $m->month)
                            ->sum('total'),
                    ];
                }),
            ],
        ]);
    }

    /** فاتورة يدوية (بدون كشف). */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'patient_id'    => ['required', 'exists:patients,id'],
            'items'         => ['required', 'array', 'min:1'],
            'items.*.name'  => ['required', 'string'],
            'items.*.price' => ['required', 'numeric', 'min:0'],
            'method'        => ['nullable', 'in:cash,card,transfer'],
        ]);

        $invoice = Invoice::create([
            'patient_id'  => $data['patient_id'],
            'number'      => Invoice::nextNumber(),
            'items'       => $data['items'],
            'total'       => collect($data['items'])->sum('price'),
            'method'      => $data['method'] ?? null,
            'status'      => isset($data['method']) ? 'paid' : 'pending',
            'paid_at'     => isset($data['method']) ? now() : null,
            'recorded_by' => $request->user()->name,
        ]);

        return response()->json(['invoice' => $invoice->load('patient:id,name,file_no')], 201);
    }

    public function pay(Request $request, Invoice $invoice): JsonResponse
    {
        $data = $request->validate(['method' => ['required', 'in:cash,card,transfer']]);

        $invoice->update(['status' => 'paid', 'method' => $data['method'], 'paid_at' => now()]);

        return response()->json(['invoice' => $invoice]);
    }

    public function cancel(Invoice $invoice): JsonResponse
    {
        $invoice->update(['status' => 'cancelled']);

        return response()->json(['invoice' => $invoice]);
    }
}
