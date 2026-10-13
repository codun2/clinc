<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Invoice;
use App\Models\Patient;
use Illuminate\Http\JsonResponse;

class AdminDashboardController extends Controller
{
    /** أرقام لوحة التحكم — كلها ليوم/أسبوع واحد ومشمولة بنطاق العيادة تلقائياً. */
    public function index(): JsonResponse
    {
        $today = Appointment::whereDate('scheduled_at', today());

        $byDepartment = (clone $today)
            ->selectRaw('department, count(*) as count')
            ->groupBy('department')
            ->orderByDesc('count')
            ->pluck('count', 'department');

        $queue = Appointment::where('status', 'arrived')
            ->with(['patient:id,name,file_no', 'doctor:id,name'])
            ->orderBy('arrived_at')
            ->get();

        return response()->json([
            'appointments_today'     => (clone $today)->count(),
            'appointments_completed' => (clone $today)->where('status', 'completed')->count(),
            'new_patients_week'      => Patient::where('created_at', '>=', now()->startOfWeek())->count(),
            'queue_count'            => $queue->count(),
            'revenue_today'          => (float) Invoice::where('status', 'paid')->whereDate('created_at', today())->sum('total'),
            'invoices_today'         => Invoice::whereDate('created_at', today())->count(),
            'pending_invoices'       => Invoice::where('status', 'pending')->count(),
            'by_department'          => $byDepartment,
            'next_patient'           => $queue->first(),
            'today_list'             => (clone $today)
                ->with(['patient:id,name,file_no', 'doctor:id,name'])
                ->orderBy('scheduled_at')
                ->limit(10)
                ->get(),
        ]);
    }
}
