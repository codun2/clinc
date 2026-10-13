<?php

namespace App\Support;

use App\Models\Notification;
use Throwable;

/**
 * منشئ إشعارات بسيط يُستدعى من نقاط الأحداث (حجز أونلاين، مخزون منخفض،
 * تسجيل عيادة…). يتجاوز نطاق العيادة ويحدّد clinic_id صراحةً ليعمل حتى في
 * المسارات العامة. لا يكسر العملية الأساسية أبداً لو فشل الإنشاء.
 */
class Notify
{
    /** إشعار لعيادة محددة (يظهر في جرس لوحة العيادة). */
    public static function clinic(
        int $clinicId,
        string $type,
        string $title,
        ?string $body = null,
        ?string $icon = null,
        ?string $link = null,
        array $data = [],
    ): void {
        self::make('clinic', $clinicId, $type, $title, $body, $icon, $link, $data);
    }

    /** إشعار على مستوى المنصّة (يظهر لصاحب المنصّة super). */
    public static function platform(
        string $type,
        string $title,
        ?string $body = null,
        ?string $icon = null,
        ?string $link = null,
        array $data = [],
    ): void {
        self::make('platform', null, $type, $title, $body, $icon, $link, $data);
    }

    private static function make(
        string $audience,
        ?int $clinicId,
        string $type,
        string $title,
        ?string $body,
        ?string $icon,
        ?string $link,
        array $data,
    ): void {
        try {
            Notification::withoutGlobalScopes()->create([
                'clinic_id' => $clinicId,
                'audience'  => $audience,
                'type'      => $type,
                'title'     => $title,
                'body'      => $body,
                'icon'      => $icon,
                'link'      => $link,
                'data'      => $data ?: null,
            ]);
        } catch (Throwable $e) {
            // الإشعار مكمّل وليس حرجاً — لا نُفشل العملية الأساسية بسببه.
            report($e);
        }
    }
}
