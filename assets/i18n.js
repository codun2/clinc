// عيادتي — طبقة الترجمة (عربي ⇄ إنجليزي)
// المصدر عربي؛ عند اختيار الإنجليزية نستبدل النصوص الظاهرة اعتماداً على النص العربي كمفتاح.
// تُطبَّق على الشِل مرة، وبعد عرض كل صفحة (App.go)، وعلى النماذج عند فتحها.

const DICT = {
  // ===== الشِل والتنقّل =====
  'القائمة الرئيسية': 'Main', 'لوحة التحكم': 'Dashboard', 'المواعيد': 'Appointments',
  'المرضى': 'Patients', 'الفواتير': 'Invoices', 'الإدارة': 'Management', 'التقارير': 'Reports',
  'الأطباء والموظفون': 'Doctors & Staff', 'الإعدادات': 'Settings', 'عام': 'Public',
  'صفحة الحجز العامة': 'Public booking page', 'تسجيل الخروج': 'Log out', 'المخزون': 'Inventory',
  'الإشعارات': 'Notifications', 'تعليم الكل كمقروء': 'Mark all read', 'لا إشعارات': 'No notifications',
  'مدير العيادة': 'Clinic manager', 'موظف': 'Staff', 'عيادتي': 'My Clinic',

  // ===== لوحة التحكم =====
  'موعد جديد': 'New appointment', 'مواعيد اليوم': "Today's appointments", 'مرضى جدد': 'New patients',
  'هذا الأسبوع': 'This week', 'قائمة الانتظار': 'Waiting list', 'بانتظار الكشف الآن': 'Waiting now',
  'لا أحد ينتظر': 'No one waiting', 'إيرادات اليوم': "Today's revenue", 'ريال': 'SAR', 'فاتورة': 'invoice',
  'عرض الكل': 'View all', 'لا مواعيد اليوم': 'No appointments today', 'المريض التالي': 'Next patient',
  'بدء الكشف': 'Start visit', 'فتح الملف': 'Open file', 'توزيع المواعيد حسب القسم': 'Appointments by department',
  'متابعة': 'Follow-up', 'كشف': 'Visit', 'مكتملة': 'completed', 'متبقية': 'remaining', 'مكتمل': 'Completed',
  'غير محدد': 'Unspecified',

  // ===== المواعيد =====
  'اليوم': 'Today', 'كل الأطباء': 'All doctors', 'جدول اليوم': "Today's schedule",
  'لا مواعيد في هذا اليوم': 'No appointments this day', 'قائمة الانتظار الآن': 'Waiting now',
  'ملخص اليوم': "Today's summary", 'إجمالي المواعيد': 'Total appointments', 'حضر / أُكمل': 'Arrived / done',
  'لم يحضر': 'No-show', 'حجوزات أونلاين': 'Online bookings', 'لا أحد في الانتظار': 'No one waiting',
  'لا مواعيد': 'No appointments',

  // ===== المرضى =====
  'مريض جديد': 'New patient', 'الكل': 'All', 'لديهم فواتير معلّقة': 'Has pending invoices',
  'حالات مزمنة': 'Chronic', 'المريض': 'Patient', 'رقم الملف': 'File no.', 'الجوال': 'Mobile',
  'العمر': 'Age', 'الزيارات': 'Visits', 'الحالة المالية': 'Billing', 'خالص': 'Settled',
  'لا نتائج': 'No results', 'ذكر': 'Male', 'أنثى': 'Female', 'حساسية': 'Allergy',

  // ===== ملف المريض =====
  'تعديل البيانات': 'Edit details', 'بدء كشف': 'Start visit', 'إجمالي الزيارات': 'Total visits',
  'إجمالي المدفوعات': 'Total paid', 'مستحقات معلّقة': 'Outstanding', 'لا مستحقات': 'Nothing due',
  'سجل الزيارات': 'Visit history', 'التاريخ': 'Date', 'التشخيص': 'Diagnosis', 'الطبيب': 'Doctor',
  'البيانات الشخصية': 'Personal details', 'تاريخ الميلاد': 'Date of birth', 'الهوية': 'ID',
  'العنوان': 'Address', 'جهة طوارئ': 'Emergency contact', 'الحالات المزمنة': 'Chronic conditions',
  'لا زيارات سابقة': 'No previous visits',

  // ===== الفواتير =====
  'فاتورة يدوية': 'Manual invoice', 'إيرادات الشهر': 'Monthly revenue', 'معلّقة': 'Pending',
  'رقم': 'No.', 'طريقة الدفع': 'Payment method', 'المبلغ': 'Amount', 'الحالة': 'Status',
  'تحصيل': 'Collect', 'مدفوعة': 'Paid', 'ملغاة': 'Cancelled', 'لا فواتير': 'No invoices',
  'نقدي': 'Cash', 'شبكة (مدى)': 'Card (mada)', 'تحويل بنكي': 'Bank transfer', 'تحويل': 'Transfer',
  'شبكة': 'Card',

  // ===== حالات المواعيد =====
  'مجدول': 'Scheduled', 'مؤكد': 'Confirmed', 'بالانتظار': 'Waiting', 'قيد الكشف': 'In progress',
  'ملغي': 'Cancelled',

  // ===== التقارير =====
  'إجمالي 6 أشهر': '6-month total', 'إيراد هذا الشهر': 'This month', 'معلّق إجمالي': 'Total pending',
  'الإيرادات الشهرية (ريال)': 'Monthly revenue (SAR)',

  // ===== الموظفون =====
  'إضافة مستخدم': 'Add user', 'بقية الفريق': 'Rest of the team', 'الاسم': 'Name', 'الدور': 'Role',
  'البريد': 'Email', 'نشط': 'Active', 'موقوف': 'Idle', 'مدير': 'Admin', 'طبيب': 'Doctor',
  'لا أطباء': 'No doctors',

  // ===== الإعدادات =====
  'إعدادات العيادة والنظام': 'Clinic & system settings', 'حفظ التغييرات': 'Save changes',
  'بيانات العيادة': 'Clinic details', 'اسم العيادة': 'Clinic name', 'الهاتف': 'Phone',
  'دوام أيام الأسبوع': 'Weekday hours', 'الخدمات والأسعار': 'Services & prices', '+ خدمة جديدة': '+ New service',
  'الخدمة': 'Service', 'القسم': 'Department', 'السعر': 'Price', 'التذكيرات والحجز': 'Reminders & booking',
  'تفعيل الحجز الأونلاين': 'Enable online booking', 'نسخ': 'Copy',

  // ===== شاشة الكشف =====
  'العلامات الحيوية': 'Vitals', 'الضغط': 'BP', 'النبض': 'Pulse', 'الحرارة': 'Temp', 'الوزن': 'Weight',
  'زيارات سابقة': 'Previous visits', 'ملاحظة الكشف': 'Visit note', 'الشكوى': 'Complaint',
  'الفحص': 'Examination', 'الوصفة': 'Prescription', 'طلبات': 'Orders', 'بنود الفاتورة': 'Invoice items',
  'الإجمالي': 'Total', 'موعد متابعة': 'Follow-up appointment', 'لا طلبات': 'No orders',
  'حفظ · فاتورة · إنهاء الكشف': 'Save · Invoice · Finish',

  // ===== النماذج =====
  'تعديل بيانات المريض': 'Edit patient', 'الاسم الكامل *': 'Full name *', 'الجنس': 'Gender',
  'فصيلة الدم': 'Blood type', 'جهة الطوارئ': 'Emergency contact',
  'الحساسية (تظهر كتحذير في الكشف)': 'Allergies (shown as a warning in visits)',
  'إضافة المريض': 'Add patient', 'حفظ': 'Save', 'إلغاء': 'Cancel',
  'التاريخ والوقت *': 'Date & time *', 'النوع': 'Type', 'كشف جديد': 'New visit', 'السبب': 'Reason',
  'حجز الموعد': 'Book appointment', 'أضف خدمة': 'Add service', 'إنشاء الفاتورة': 'Create invoice',
  'تحصيل الفاتورة': 'Collect invoice', 'تأكيد الدفع': 'Confirm payment', 'المريض *': 'Patient *',

  // ===== صفحة الحجز العامة =====
  'احجز موعدك أونلاين': 'Book online', 'دخول الموظفين': 'Staff login',
  'احجز موعدك في دقيقة': 'Book your appointment in a minute',
  'اختر القسم والطبيب والوقت المناسب — يصلك تأكيد وتذكير برسالة SMS': 'Pick a department, doctor and time — you get an SMS confirmation and reminder',
  'القسم والطبيب': 'Department & doctor', 'الموعد': 'Appointment', 'بياناتك': 'Your details',
  'اختر القسم': 'Choose department', 'اختر الطبيب': 'Choose doctor', 'ملخص الحجز': 'Booking summary',
  'أي طبيب': 'Any doctor', 'رقم الجوال *': 'Mobile number *', 'تأكيد الحجز': 'Confirm booking',
  'سيصلك تأكيد وتذكير قبل الموعد بـ 24 ساعة': 'You will get a confirmation and a reminder 24h before',
  'تم تأكيد حجزك': 'Your booking is confirmed', 'حجز موعد آخر': 'Book another',
  'تعذّر تحميل صفحة الحجز': 'Could not load the booking page', 'عام': 'General',

  // ===== صفحة الهبوط =====
  'نظام متكامل لإدارة العيادات': 'A complete clinic management system',
  'احجز موعدك': 'Book an appointment', 'دخول العيادة': 'Clinic login',
  'سجّل عيادتك': 'Register your clinic', 'مميزات النظام': 'Features',
  'ابدأ الآن': 'Get started', 'تسجيل الدخول': 'Log in',

  // ===== صفحة الدخول =====
  'نظام إدارة العيادات الذكي': 'Smart clinic management',
  'نظام عربي أولاً لإدارة العيادة: مواعيد، ملفات مرضى، كشوفات بشاشة واحدة، فواتير وتقارير — بدون تعقيد وبدون تدريب.':
    'A clinic system for appointments, patient files, single-screen visits, invoices and reports — simple, no training needed.',
  'كشف كامل بشاشة واحدة وزر واحد': 'A full visit on one screen, one button',
  'حجز أونلاين وتذكير SMS للمرضى': 'Online booking and SMS reminders for patients',
  'يعمل من أي جهاز — بالعربي وبالكامل RTL': 'Works on any device — Arabic & English',
  'أدخل بياناتك للوصول إلى لوحة العيادة': 'Enter your details to access the clinic dashboard',
  'البريد الإلكتروني': 'Email', 'كلمة المرور': 'Password', 'دخول': 'Log in', 'مريض؟': 'Patient?',

  // ===== لوحة المنصّة (سوبر-أدمن) =====
  'منصّة عيادتي': 'Clinic Platform', 'إدارة العيادات': 'Clinic management',
  'لوحة صاحب المنصّة: اعتماد العيادات الجديدة، تفعيلها أو إيقافها، ومتابعة الاشتراكات.':
    'Platform owner panel: approve new clinics, activate or suspend them, and track subscriptions.',
  'اعتماد طلبات التسجيل الجديدة': 'Approve new registration requests',
  'تفعيل / إيقاف العيادات': 'Activate / suspend clinics',
  'نظرة شاملة على كل العيادات': 'A full overview of all clinics',
  'دخول إدارة المنصّة': 'Platform admin login', 'حساب صاحب المنصّة فقط': 'Platform owner account only',
  'عيادة جديدة': 'New clinic', 'العيادات': 'Clinics', 'بانتظار الاعتماد': 'Pending approval',
  'نشطة': 'Active', 'موقوفة': 'Suspended', 'العيادة': 'Clinic', 'الرابط': 'Link', 'الطاقم': 'Staff',
  'الاشتراك': 'Plan', 'انضمّت': 'Joined', 'لا عيادات': 'No clinics', 'اعتماد': 'Approve',
  'إيقاف': 'Suspend', 'تفعيل': 'Activate', 'تعديل': 'Edit', 'إجمالي العيادات': 'Total clinics',
  'مسجّلة': 'registered', 'تحتاج مراجعة': 'Needs review', 'لا طلبات': 'No requests', 'تعمل الآن': 'Running',
  'تعديل العيادة': 'Edit clinic', 'الاشتراك / الباقة': 'Subscription / plan', 'اسم العيادة *': 'Clinic name *',
  'اسم المدير *': 'Admin name *', 'جوال المدير': 'Admin mobile', 'بريد المدير *': 'Admin email *',
  'كلمة المرور *': 'Password *', 'نشطة (فعّالة فوراً)': 'Active (live now)', 'إنشاء العيادة': 'Create clinic',

  // ===== التقارير والمخزون الإضافية =====
  'مواعيد هذا الشهر': 'Appointments this month', 'طرق الدفع هذا الشهر': 'Payment methods this month',
  'أكثر الخدمات دخلاً': 'Top services by revenue', 'أداء الأطباء (كشوفات الشهر)': 'Doctor performance (visits/month)',
  'إجمالي المرضى': 'Total patients', 'غير محصّل': 'Uncollected', 'لا بيانات': 'No data', 'عدد': 'Count',
  'إجمالي': 'Total', 'أونلاين': 'Online', 'ملف': 'files', 'صنف جديد': 'New item', 'منخفض': 'Low',
  'متوفّر': 'In stock', 'الصنف': 'Item', 'التصنيف': 'Category', 'الكمية': 'Quantity',
  'إضافة مستخدم': 'Add user', 'تعديل مستخدم': 'Edit user', 'إضافة': 'Add', 'حذف': 'Delete',
  'خدمة جديدة': 'New service', 'تعديل خدمة': 'Edit service', 'تعديل صنف': 'Edit item', 'صنف جديد ': 'New item',
};

const I18N = {
  lang: (() => { try { return localStorage.getItem('clinic_lang') || 'ar'; } catch { return 'ar'; } })(),

  t(ar) { return this.lang === 'en' ? (DICT[ar] || ar) : ar; },

  /** استبدال النصوص الظاهرة داخل عنصر (يُشغَّل فقط في وضع الإنجليزية). */
  apply(root) {
    if (this.lang !== 'en' || !root) return;
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    while (walk.nextNode()) nodes.push(walk.currentNode);
    nodes.forEach((n) => {
      const k = n.nodeValue.trim();
      if (k && DICT[k]) n.nodeValue = n.nodeValue.replace(k, DICT[k]);
    });
    root.querySelectorAll('[placeholder]').forEach((e) => {
      const k = (e.getAttribute('placeholder') || '').trim();
      if (DICT[k]) e.setAttribute('placeholder', DICT[k]);
    });
    root.querySelectorAll('[title]').forEach((e) => {
      const k = (e.getAttribute('title') || '').trim();
      if (DICT[k]) e.setAttribute('title', DICT[k]);
    });
  },

  /** ضبط اتجاه/لغة الصفحة من التفضيل المحفوظ (يُستدعى مبكراً). */
  init() {
    document.documentElement.lang = this.lang;
    document.documentElement.dir = this.lang === 'en' ? 'ltr' : 'rtl';
  },

  set(lang) {
    this.lang = lang;
    try { localStorage.setItem('clinic_lang', lang); } catch {}
    location.reload();
  },

  toggle() { this.set(this.lang === 'ar' ? 'en' : 'ar'); },

  /** نص زر التبديل: يعرض اللغة الأخرى. */
  label() { return this.lang === 'en' ? 'عربي' : 'EN'; },
};

I18N.init();
