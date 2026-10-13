# تقدّم العمل — نظام «عيادتي» (SaaS عيادات بشرية)

> ملف تتبّع ذاتي. لو انقطعت التوكنز، أرجع أقرأ هذا + `git log` وأكمّل من أول بند غير مكتمل.

## المرجعية
- ستاك: Laravel 13 + Sanctum، multi-tenant عبر `BelongsToClinic` (currentClinicId من `SetClinicContext`).
- 3 أدوار: `super` (منصّة) / `admin` / `staff` + صلاحيات `perm:*`.
- واجهة: ثابتة (`app.html` لوحة العيادة، `book.html` الحجز، `index.html` هبوط) + `assets/*.js`.
- تشغيل: docker compose (web 8093 / api 8094 / db 3394). API key + DB مضبوطة في `docker-compose.yml`.
- حسابات التجربة: `admin@clinic.com/admin123`، `sara@clinic.com/doctor123`، السوبر `owner@clinic.sa/Owner2026!`.

## خطة الأقسام
- [x] 0. تجهيز الإقلاع (env/compose/docker) + ملف صلاحيات Claude
- [x] 1. الإشعارات — باك-إند (migration/model/Notify/controller/routes + hooks) ✅ مُختبَر
- [ ] 2. الإشعارات — جرس في لوحة العيادة (UI)
- [ ] 3. ثنائية اللغة عربي/إنجليزي (i18n + تبديل + dir) للوحة والواجهات
- [ ] 4. لوحة السوبر-أدمن (super.html + super.js) لإدارة العيادات والاشتراكات
- [ ] 5. التقارير — endpoint مخصّص + صفحة تقارير أغنى
- [ ] 6. إكمال العمليات الناقصة: إضافة/تعديل/حذف الموظفين والخدمات (كانت أزرار "قيد الربط") + صفحة المخزون
- [ ] 7. تدقيق شامل add/edit/delete على كل الأقسام + طباعة الفاتورة
- [ ] 8. تشغيل/اختبار فعلي عبر docker + deploy.sh + تسجيل في PORTS (ملف المشروع فقط)

## سجل
- 2026-10-14: بدأ العمل. ضبط compose/env، إنشاء settings.local.json، بدء بناء الإشعارات.
