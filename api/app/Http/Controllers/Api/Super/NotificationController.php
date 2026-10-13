<?php

namespace App\Http\Controllers\Api\Super;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;

/**
 * إشعارات مستوى المنصّة (تسجيل عيادات جديدة…) لصاحب المنصّة.
 * super لا يملك سياق عيادة، فالنطاق العام معطّل ونصفّي يدوياً على audience=platform.
 */
class NotificationController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'notifications' => Notification::where('audience', 'platform')
                ->orderByDesc('id')->limit(30)->get(),
            'unread' => Notification::where('audience', 'platform')->whereNull('read_at')->count(),
        ]);
    }

    public function markAll(): JsonResponse
    {
        Notification::where('audience', 'platform')->whereNull('read_at')->update(['read_at' => now()]);

        return response()->json(['ok' => true]);
    }
}
