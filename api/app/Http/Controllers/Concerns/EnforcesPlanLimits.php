<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Clinic;

trait EnforcesPlanLimits
{
    /**
     * يمنع إنشاء حساب دخول جديد إذا تجاوز حدود باقة العيادة.
     * $isDoctor: الحساب الجديد طبيب (له مسمّى) → يُفحص حدّ الأطباء أيضاً.
     */
    protected function enforcePlanLimits(?Clinic $clinic, bool $isDoctor = false): void
    {
        if (! $clinic || ! $clinic->plan) {
            return; // بلا باقة = غير محدود (توافق خلفي)
        }

        if ($clinic->userLimitReached()) {
            abort(422, "بلغت باقة «{$clinic->plan->name}» الحدّ الأقصى لعدد المستخدمين ({$clinic->plan->max_users}). رقِّ الباقة لإضافة المزيد.");
        }

        if ($isDoctor && $clinic->doctorLimitReached()) {
            abort(422, "بلغت باقة «{$clinic->plan->name}» الحدّ الأقصى لعدد الأطباء ({$clinic->plan->max_doctors}). رقِّ الباقة لإضافة طبيب آخر.");
        }
    }
}
