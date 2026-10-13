<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Consultation;
use App\Models\Invoice;
use App\Models\Patient;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * تقارير أداء العيادة — كلها مشمولة بنطاق العيادة تلقائياً.
 */
class AdminReportController extends Controller
{
    public function index(): JsonResponse
    {
        $now = now();

        // سلسلة 6 أشهر: إيراد + مرضى جدد + مواعيد
        $monthly = collect(range(5, 0))->map(function ($i) use ($now) {
            $m = $now->copy()->subMonths($i);

            return [
                'month'        => $m->format('Y-m'),
                'revenue'      => (float) Invoice::where('status', 'paid')->whereYear('created_at', $m->year)->whereMonth('created_at', $m->month)->sum('total'),
                'patients'     => Patient::whereYear('created_at', $m->year)->whereMonth('created_at', $m->month)->count(),
                'appointments' => Appointment::whereYear('scheduled_at', $m->year)->whereMonth('scheduled_at', $m->month)->count(),
            ];
        });

        $mStart = $now->copy()->startOfMonth();

        $appt = Appointment::where('scheduled_at', '>=', $mStart);
        $appointments = [
            'total'     => (clone $appt)->count(),
            'completed' => (clone $appt)->where('status', 'completed')->count(),
            'no_show'   => (clone $appt)->where('status', 'no_show')->count(),
            'cancelled' => (clone $appt)->where('status', 'cancelled')->count(),
            'online'    => (clone $appt)->where('source', 'online')->count(),
        ];

        // طرق الدفع هذا الشهر
        $methods = Invoice::where('status', 'paid')->where('created_at', '>=', $mStart)
            ->select('method', DB::raw('sum(total) as total'))
            ->groupBy('method')->pluck('total', 'method');

        // أكثر الخدمات دخلاً (من بنود الفواتير المدفوعة هذا الشهر)
        $agg = [];
        foreach (Invoice::where('status', 'paid')->where('created_at', '>=', $mStart)->pluck('items') as $list) {
            foreach ((array) $list as $it) {
                $name = $it['name'] ?? '—';
                $agg[$name] ??= ['name' => $name, 'count' => 0, 'total' => 0];
                $agg[$name]['count']++;
                $agg[$name]['total'] += (float) ($it['price'] ?? 0);
            }
        }
        usort($agg, fn ($a, $b) => $b['total'] <=> $a['total']);
        $topServices = array_slice(array_values($agg), 0, 6);

        // أداء الأطباء هذا الشهر (عدد الكشوفات)
        $doctors = Consultation::where('created_at', '>=', $mStart)
            ->whereNotNull('doctor_id')
            ->select('doctor_id', DB::raw('count(*) as visits'))
            ->groupBy('doctor_id')
            ->with('doctor:id,name')
            ->orderByDesc('visits')->limit(8)->get()
            ->map(fn ($c) => ['name' => $c->doctor?->name ?? '—', 'visits' => (int) $c->visits]);

        return response()->json([
            'monthly'      => $monthly,
            'appointments' => $appointments,
            'methods'      => [
                'cash'     => (float) ($methods['cash'] ?? 0),
                'card'     => (float) ($methods['card'] ?? 0),
                'transfer' => (float) ($methods['transfer'] ?? 0),
            ],
            'top_services' => $topServices,
            'doctors'      => $doctors,
            'totals'       => [
                'revenue_month'  => (float) Invoice::where('status', 'paid')->where('created_at', '>=', $mStart)->sum('total'),
                'pending_total'  => (float) Invoice::where('status', 'pending')->sum('total'),
                'patients_total' => Patient::count(),
            ],
        ]);
    }
}
