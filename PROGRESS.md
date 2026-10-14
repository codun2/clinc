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
- [x] 2. الإشعارات — جرس في لوحة العيادة (UI) ✅
- [ ] 3. ثنائية اللغة عربي/إنجليزي (i18n + تبديل + dir) للوحة والواجهات
- [x] 4. لوحة السوبر-أدمن (super.html + super.js + /super/notifications) — إدارة العيادات والاشتراكات ✅
- [x] 5. التقارير — endpoint مخصّص (AdminReportController) + صفحة تقارير أغنى ✅
- [x] 6. إكمال العمليات: StaffForm/ServiceForm/MedicineForm (إضافة/تعديل/حذف) + صفحة المخزون ✅
- [x] 7. طباعة الفاتورة (printInvoice) + أزرار الطباعة ✅
- [x] 8. deploy.sh ✅ + اختبار شامل للباك-إند (smoke test: كل النقاط نجحت ✅) + كل الصفحات تُخدَم 200
      باقي فقط: git push لـGitHub (يحتاج ربط اعتماد الدفع مرة وحدة) + تسجيل PORTS (ملف مشترك بإذنك)

## ملاحظات ما بعد الـreload (أول ما ترجع التوكنز/الجلسة بوضع التجاوز)
1. `docker exec clinic-api php artisan route:list` للتأكد من المسارات الجديدة.
2. اختبار طرف-لطرف: إشعارات، لغة EN، لوحة السوبر، تقارير، CRUD موظفين/خدمات/مخزون، طباعة.
3. `git add -A && git commit && git push` (بعد ربط اعتماد الدفع add_repo مرة وحدة).
4. تسجيل clinc في `/opt/PORTS.md` (ملف مشترك — بإذن المستخدم فقط، ممنوع تلقائياً).

## سجل
- 2026-10-14: بدأ العمل. ضبط compose/env، إنشاء settings.local.json، بدء بناء الإشعارات.
