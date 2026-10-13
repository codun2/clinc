<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * إشعارات لوحة العيادة. كلها مشمولة تلقائياً بنطاق العيادة عبر BelongsToClinic،
 * ومقيّدة بـ audience=clinic (إشعارات المنصّة لها مسارها الخاص في السوبر).
 */
class AdminNotificationController extends Controller
{
    /** آخر 30 إشعاراً + عدد غير المقروء. */
    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'notifications' => Notification::where('audience', 'clinic')
                ->orderByDesc('id')
                ->limit(30)
                ->get(),
            'unread' => $this->unreadCount(),
        ]);
    }

    /** عدّاد الجرس فقط (استدعاء خفيف دوري). */
    public function unread(Request $request): JsonResponse
    {
        return response()->json(['unread' => $this->unreadCount()]);
    }

    public function markRead(Notification $notification): JsonResponse
    {
        $notification->markRead();

        return response()->json(['ok' => true, 'unread' => $this->unreadCount()]);
    }

    public function markAll(Request $request): JsonResponse
    {
        Notification::where('audience', 'clinic')
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['ok' => true, 'unread' => 0]);
    }

    private function unreadCount(): int
    {
        return Notification::where('audience', 'clinic')->whereNull('read_at')->count();
    }
}
