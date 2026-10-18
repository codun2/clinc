// عيادتي — عارضات الصفحات (كلها تجلب من /api)
const Pages = {};
const avColor = (g) => g === 'female' ? 'style="background:var(--info-bg);color:var(--info)"' : '';

// ============ لوحة التحكم ============
Pages.dashboard = async (el) => {
  const d = await API.get('/admin/dashboard');
  const today = new Date().toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const depMax = Math.max(1, ...Object.values(d.by_department || {}));

  el.innerHTML = `
  <div class="topbar">
    <div><h1>مرحباً ${esc(App.me.name)} 👋</h1><div class="sub">${today} · نظرة عامة على يومك</div></div>
    <div class="top-actions">
      <button class="btn btn-primary" id="dash-new"><i class="ti ti-plus"></i> موعد جديد</button>
    </div>
  </div>
  <div class="kpis">
    <div class="kpi"><div class="t"><i class="ti ti-calendar-check"></i> مواعيد اليوم</div><div class="v">${d.appointments_today}</div><div class="d up">${d.appointments_completed} مكتملة · ${d.appointments_today - d.appointments_completed} متبقية</div></div>
    <div class="kpi"><div class="t"><i class="ti ti-user-plus"></i> مرضى جدد</div><div class="v">${d.new_patients_week}</div><div class="d">هذا الأسبوع</div></div>
    <div class="kpi"><div class="t"><i class="ti ti-clock-hour-4"></i> قائمة الانتظار</div><div class="v">${d.queue_count}</div><div class="d warn">${d.queue_count ? 'بانتظار الكشف الآن' : 'لا أحد ينتظر'}</div></div>
    <div class="kpi"><div class="t"><i class="ti ti-cash"></i> إيرادات اليوم</div><div class="v">${money(d.revenue_today)}</div><div class="d">ريال · ${d.invoices_today} فاتورة</div></div>
  </div>
  <div class="grid2">
    <div class="card">
      <div class="card-h"><b>مواعيد اليوم</b><span class="link" id="dash-all">عرض الكل</span></div>
      ${(d.today_list || []).length ? `<table>${d.today_list.map((a) => {
        const s = APPT_STATUS[a.status] || APPT_STATUS.scheduled;
        return `<tr class="row" data-pid="${a.patient.id}">
          <td style="color:var(--faint);width:60px">${timeOf(a.scheduled_at)}</td>
          <td><div class="cell-p"><div class="avatar">${esc(initials(a.patient.name))}</div><div>${esc(a.patient.name)}<small>${a.type === 'followup' ? 'متابعة' : 'كشف'} · ${esc(a.department || '')}</small></div></div></td>
          <td style="width:100px"><span class="badge ${s.cls}">${s.label}</span></td>
        </tr>`; }).join('')}</table>` : '<div class="empty">لا مواعيد اليوم</div>'}
    </div>
    <div style="display:flex;flex-direction:column;gap:14px">
      ${d.next_patient ? `<div class="card pad" style="background:var(--teal);border-color:var(--teal);color:#fff">
        <div style="display:flex;align-items:center;gap:8px;font-size:12.5px;opacity:.9"><i class="ti ti-user-check"></i> المريض التالي</div>
        <div style="font-size:17px;font-weight:700;margin-top:7px">${esc(d.next_patient.patient.name)}</div>
        <div style="font-size:12px;opacity:.85">ملف ${esc(d.next_patient.patient.file_no)} · ${esc(d.next_patient.department || '')}</div>
        <div style="display:flex;gap:8px;margin-top:13px">
          <div class="finish sm" style="background:rgba(255,255,255,.22)" id="next-consult">بدء الكشف</div>
          <div class="finish sm" style="background:rgba(255,255,255,.22)" id="next-file">فتح الملف</div>
        </div>
      </div>` : ''}
      <div class="card">
        <div class="card-h"><b>توزيع المواعيد حسب القسم</b></div>
        <div class="pad">${Object.entries(d.by_department || {}).map(([k, v]) =>
          `<div class="bar-row"><div class="lbl"><span>${esc(k || 'غير محدد')}</span><span>${v}</span></div><div class="bar"><span style="width:${Math.round(v / depMax * 100)}%"></span></div></div>`
        ).join('') || '<div class="empty">—</div>'}</div>
      </div>
    </div>
  </div>`;

  el.querySelectorAll('tr.row').forEach((r) => r.onclick = () => App.go('patient', r.dataset.pid));
  el.querySelector('#dash-all').onclick = () => App.go('appointments');
  el.querySelector('#dash-new').onclick = () => AppointmentForm();
  const np = d.next_patient;
  if (np) {
    el.querySelector('#next-file').onclick = () => App.go('patient', np.patient.id);
    el.querySelector('#next-consult').onclick = () => startConsultation({ appointment_id: np.id });
  }
};

// ============ المواعيد ============
Pages.appointments = async (el, date) => {
  date = date || new Date().toISOString().slice(0, 10);
  const d = await API.get('/admin/appointments?date=' + date);
  // الطبيب مقيّد بمواعيده → لا داعي لجلب قائمة الأطباء ولا عرض فلترهم
  const docs = d.scoped ? { doctors: [] } : await API.get('/admin/doctors');
  const dateLabel = new Date(date).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  el.innerHTML = `
  <div class="topbar">
    <div><h1>المواعيد</h1><div class="sub">${dateLabel}</div></div>
    <div class="top-actions">
      <button class="btn btn-ghost" id="prev"><i class="ti ti-chevron-right"></i></button>
      <button class="btn btn-ghost" id="today">اليوم</button>
      <button class="btn btn-ghost" id="next"><i class="ti ti-chevron-left"></i></button>
      <button class="btn btn-primary" id="new-appt"><i class="ti ti-plus"></i> موعد جديد</button>
    </div>
  </div>
  ${d.scoped ? '' : `<div class="chips" style="margin-bottom:14px">
    <span class="chip on" data-doc="">كل الأطباء</span>
    ${docs.doctors.map((x) => `<span class="chip" data-doc="${x.id}">${esc(x.name)}</span>`).join('')}
  </div>`}
  <div class="grid2">
    <div class="card"><div class="card-h"><b>جدول اليوم</b></div><div class="pad" id="sched">
      ${d.appointments.length ? d.appointments.map((a) => {
        const s = APPT_STATUS[a.status] || APPT_STATUS.scheduled;
        const cls = ['completed'].includes(a.status) ? 'a-teal' : ['arrived', 'in_progress'].includes(a.status) ? 'a-amber' : 'a-teal';
        return `<div class="appt ${a.status === 'scheduled' || a.status === 'confirmed' ? 'a-gray' : cls}" data-id="${a.id}" data-pid="${a.patient.id}" data-status="${a.status}">
          <div><b>${timeOf(a.scheduled_at)} · ${esc(a.patient.name)}</b> <small>${esc(a.department || '')} · ${a.doctor ? esc(a.doctor.name) : '—'}</small></div>
          <span class="badge ${s.cls}">${s.label}</span>
        </div>`; }).join('') : '<div class="empty">لا مواعيد في هذا اليوم</div>'}
    </div></div>
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="card">
        <div class="card-h"><b>قائمة الانتظار الآن</b><span class="badge b-teal">${d.queue.length}</span></div>
        <div class="pad" id="queue">${d.queue.length ? d.queue.map((q, i) =>
          `<div style="display:flex;align-items:center;gap:10px;background:var(--bg);border-radius:9px;padding:9px 11px;margin-bottom:8px">
            <b style="color:var(--teal);font-size:15px">${i + 1}</b>
            <div style="flex:1"><div style="font-size:13px;font-weight:600">${esc(q.patient.name)}</div><div style="font-size:11px;color:var(--muted)">وصل ${timeOf(q.arrived_at)}</div></div>
            <button class="btn btn-soft btn-sm" data-consult="${q.id}" data-pid="${q.patient.id}">بدء الكشف</button>
          </div>`).join('') : '<div class="empty">لا أحد في الانتظار</div>'}</div>
      </div>
      <div class="card"><div class="card-h"><b>ملخص اليوم</b></div><div class="pad">
        <div style="display:flex;justify-content:space-between;font-size:13px;padding:6px 0;border-bottom:1px dashed var(--border)"><span style="color:var(--muted)">إجمالي المواعيد</span><b>${d.summary.total}</b></div>
        <div style="display:flex;justify-content:space-between;font-size:13px;padding:6px 0;border-bottom:1px dashed var(--border)"><span style="color:var(--muted)">حضر / أُكمل</span><b style="color:var(--ok)">${d.summary.completed}</b></div>
        <div style="display:flex;justify-content:space-between;font-size:13px;padding:6px 0;border-bottom:1px dashed var(--border)"><span style="color:var(--muted)">لم يحضر</span><b style="color:var(--danger)">${d.summary.no_show}</b></div>
        <div style="display:flex;justify-content:space-between;font-size:13px;padding:6px 0"><span style="color:var(--muted)">حجوزات أونلاين</span><b style="color:var(--teal-dark)">${d.summary.online}</b></div>
      </div></div>
    </div>
  </div>`;

  const shift = (n) => { const dt = new Date(date); dt.setDate(dt.getDate() + n); App.go('appointments', dt.toISOString().slice(0, 10)); };
  el.querySelector('#prev').onclick = () => shift(1);  // RTL: يمين = السابق
  el.querySelector('#next').onclick = () => shift(-1);
  el.querySelector('#today').onclick = () => App.go('appointments');
  el.querySelector('#new-appt').onclick = () => AppointmentForm();
  el.querySelectorAll('.chip[data-doc]').forEach((c) => c.onclick = async () => {
    el.querySelectorAll('.chip').forEach((x) => x.classList.remove('on')); c.classList.add('on');
    const docId = c.dataset.doc;
    const r = await API.get('/admin/appointments?date=' + date + (docId ? '&doctor_id=' + docId : ''));
    el.querySelector('#sched').innerHTML = r.appointments.length ? r.appointments.map((a) => {
      const s = APPT_STATUS[a.status] || APPT_STATUS.scheduled;
      return `<div class="appt ${a.status === 'scheduled' || a.status === 'confirmed' ? 'a-gray' : 'a-teal'}" data-pid="${a.patient.id}"><div><b>${timeOf(a.scheduled_at)} · ${esc(a.patient.name)}</b> <small>${esc(a.department || '')}</small></div><span class="badge ${s.cls}">${s.label}</span></div>`;
    }).join('') : '<div class="empty">لا مواعيد</div>';
    el.querySelectorAll('#sched .appt').forEach((a) => a.onclick = () => a.dataset.pid && App.go('patient', a.dataset.pid));
  });
  el.querySelectorAll('#sched .appt').forEach((a) => a.onclick = () => App.go('patient', a.dataset.pid));
  el.querySelectorAll('[data-consult]').forEach((b) => b.onclick = () => startConsultation({ appointment_id: b.dataset.consult }));
};

// ============ المرضى ============
Pages.patients = async (el, state = {}) => {
  const q = state.q || ''; const filter = state.filter || '';
  const d = await API.get(`/admin/patients?q=${encodeURIComponent(q)}${filter ? '&filter=' + filter : ''}`);
  el.innerHTML = `
  <div class="topbar">
    <div><h1>المرضى</h1><div class="sub">${d.total} ملف مريض</div></div>
    <div class="top-actions">
      <div class="search" style="min-width:260px"><i class="ti ti-search"></i><input id="psearch" placeholder="بالاسم، الجوال، أو رقم الملف…" value="${esc(q)}"></div>
      <button class="btn btn-primary" id="new-patient"><i class="ti ti-user-plus"></i> مريض جديد</button>
    </div>
  </div>
  <div class="chips" style="margin-bottom:14px">
    <span class="chip ${!filter ? 'on' : ''}" data-f="">الكل</span>
    <span class="chip ${filter === 'pending_invoices' ? 'on' : ''}" data-f="pending_invoices">لديهم فواتير معلّقة</span>
    <span class="chip ${filter === 'chronic' ? 'on' : ''}" data-f="chronic">حالات مزمنة</span>
  </div>
  <div class="card">
    ${d.data.length ? `<table>
      <tr><th>المريض</th><th>رقم الملف</th><th>الجوال</th><th>العمر</th><th>الزيارات</th><th>الحالة المالية</th><th></th></tr>
      ${d.data.map((p) => `<tr class="row" data-pid="${p.id}">
        <td><div class="cell-p"><div class="avatar" ${avColor(p.gender)}>${esc(initials(p.name))}</div><div>${esc(p.name)}<small>${p.gender === 'female' ? 'أنثى' : 'ذكر'}${p.allergies ? ' · حساسية ' + esc(p.allergies) : ''}</small></div></div></td>
        <td>${esc(p.file_no)}</td>
        <td style="direction:ltr;text-align:right">${esc(p.phone)}</td>
        <td>${p.birthdate ? ageOf(p.birthdate) : '—'}</td>
        <td>${p.consultations_count}</td>
        <td>${Number(p.pending_total) > 0 ? `<span class="badge b-dgr">معلّق ${money(p.pending_total)} ريال</span>` : '<span class="badge b-ok">خالص</span>'}</td>
        <td><i class="ti ti-chevron-left" style="color:var(--faint)"></i></td>
      </tr>`).join('')}
    </table>
    <div class="pag"><span>عرض ${d.data.length} من ${d.total}</span></div>` : '<div class="empty">لا نتائج</div>'}
  </div>`;

  let t;
  el.querySelector('#psearch').oninput = (e) => { clearTimeout(t); const v = e.target.value; t = setTimeout(() => Pages.patients(el, { q: v, filter }), 350); };
  el.querySelectorAll('.chip[data-f]').forEach((c) => c.onclick = () => Pages.patients(el, { q, filter: c.dataset.f }));
  el.querySelectorAll('tr.row').forEach((r) => r.onclick = () => App.go('patient', r.dataset.pid));
  el.querySelector('#new-patient').onclick = () => PatientForm();
};

// ============ ملف المريض ============
Pages.patient = async (el, id) => {
  const d = await API.get('/admin/patients/' + id);
  const p = d.patient;
  el.innerHTML = `
  <div class="topbar">
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <button class="btn btn-ghost btn-sm" id="back" style="padding:8px 11px"><i class="ti ti-arrow-right"></i></button>
      <div class="avatar" ${avColor(p.gender)} style="width:46px;height:46px;font-size:15px">${esc(initials(p.name))}</div>
      <div><h1 style="font-size:17px">${esc(p.name)}</h1><div class="sub">ملف ${esc(p.file_no)} · ${p.gender === 'female' ? 'أنثى' : 'ذكر'} · ${ageOf(p.birthdate)} · ${esc(p.phone)}</div></div>
      ${p.allergies ? `<span class="badge b-warn"><i class="ti ti-alert-triangle"></i> حساسية: ${esc(p.allergies)}</span>` : ''}
      ${p.blood_type ? `<span class="badge b-teal">فصيلة ${esc(p.blood_type)}</span>` : ''}
    </div>
    <div class="top-actions">
      <button class="btn btn-ghost" id="edit-p"><i class="ti ti-edit"></i> تعديل البيانات</button>
      <button class="btn btn-primary" id="start-c"><i class="ti ti-stethoscope"></i> بدء كشف</button>
    </div>
  </div>
  <div class="kpis">
    <div class="kpi"><div class="t"><i class="ti ti-folders"></i> إجمالي الزيارات</div><div class="v">${d.stats.visits_total}</div><div class="d">—</div></div>
    <div class="kpi"><div class="t"><i class="ti ti-cash"></i> إجمالي المدفوعات</div><div class="v">${money(d.stats.paid_total)}</div><div class="d">ريال</div></div>
    <div class="kpi"><div class="t"><i class="ti ti-receipt"></i> مستحقات معلّقة</div><div class="v" style="color:${d.stats.pending_total > 0 ? 'var(--danger)' : 'var(--ok)'}">${money(d.stats.pending_total)}</div><div class="d">${d.stats.pending_total > 0 ? 'ريال معلّق' : 'لا مستحقات'}</div></div>
  </div>
  <div class="grid2">
    <div class="card">
      <div class="card-h"><b>سجل الزيارات</b></div>
      ${p.consultations.length ? `<table><tr><th>التاريخ</th><th>التشخيص</th><th>الطبيب</th></tr>
        ${p.consultations.map((c) => `<tr class="row"><td>${dateOf(c.finished_at || c.created_at)}</td><td>${esc(c.diagnosis || '—')}</td><td>${c.doctor ? esc(c.doctor.name) : '—'}</td></tr>`).join('')}
      </table>` : '<div class="empty">لا زيارات سابقة</div>'}
    </div>
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="card"><div class="card-h"><b>البيانات الشخصية</b></div><div class="pad">
        <div style="display:flex;justify-content:space-between;font-size:13px;padding:6px 0;border-bottom:1px dashed var(--border)"><span style="color:var(--muted)">تاريخ الميلاد</span><b>${p.birthdate ? dateOf(p.birthdate) : '—'}</b></div>
        <div style="display:flex;justify-content:space-between;font-size:13px;padding:6px 0;border-bottom:1px dashed var(--border)"><span style="color:var(--muted)">الهوية</span><b>${esc(p.national_id || '—')}</b></div>
        <div style="display:flex;justify-content:space-between;font-size:13px;padding:6px 0;border-bottom:1px dashed var(--border)"><span style="color:var(--muted)">العنوان</span><b>${esc(p.address || '—')}</b></div>
        <div style="display:flex;justify-content:space-between;font-size:13px;padding:6px 0"><span style="color:var(--muted)">جهة طوارئ</span><b style="direction:ltr">${esc(p.emergency_phone || '—')}</b></div>
      </div></div>
      ${p.chronic_conditions ? `<div class="card"><div class="card-h"><b>الحالات المزمنة</b></div><div class="pad"><div style="display:flex;align-items:center;gap:8px;font-size:13px"><span style="width:7px;height:7px;border-radius:50%;background:#d97706"></span> ${esc(p.chronic_conditions)}</div></div></div>` : ''}
    </div>
  </div>`;
  el.querySelector('#back').onclick = () => App.go('patients');
  el.querySelector('#edit-p').onclick = () => PatientForm(p);
  el.querySelector('#start-c').onclick = () => startConsultation({ patient_id: p.id });
};

// ============ الفواتير ============
Pages.invoices = async (el, state = {}) => {
  const status = state.status || '';
  const d = await API.get('/admin/invoices' + (status ? '?status=' + status : ''));
  const s = d.stats; const list = d.invoices.data;
  el.innerHTML = `
  <div class="topbar">
    <div><h1>الفواتير</h1><div class="sub">${new Date().toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { month: 'long', year: 'numeric' })}</div></div>
    <div class="top-actions"><button class="btn btn-primary" id="new-inv"><i class="ti ti-plus"></i> فاتورة يدوية</button></div>
  </div>
  <div class="kpis">
    <div class="kpi"><div class="t"><i class="ti ti-cash"></i> إيرادات الشهر</div><div class="v">${money(s.month_total)}</div><div class="d">${s.month_count} فاتورة</div></div>
    <div class="kpi"><div class="t"><i class="ti ti-clock-exclamation"></i> معلّقة</div><div class="v" style="color:var(--danger)">${money(s.pending_total)}</div><div class="d warn">${s.pending_count} فاتورة</div></div>
    <div class="kpi"><div class="t"><i class="ti ti-cash-banknote"></i> اليوم</div><div class="v">${money(s.today_total)}</div><div class="d">${s.today_count} فاتورة</div></div>
  </div>
  <div class="chips" style="margin-bottom:14px">
    <span class="chip ${!status ? 'on' : ''}" data-s="">الكل</span>
    <span class="chip ${status === 'paid' ? 'on' : ''}" data-s="paid">مدفوعة</span>
    <span class="chip ${status === 'pending' ? 'on' : ''}" data-s="pending">معلّقة</span>
    <span class="chip ${status === 'cancelled' ? 'on' : ''}" data-s="cancelled">ملغاة</span>
  </div>
  <div class="card">${list.length ? `<table>
    <tr><th>رقم</th><th>المريض</th><th>التاريخ</th><th>طريقة الدفع</th><th>المبلغ</th><th>الحالة</th><th></th></tr>
    ${list.map((inv) => { const st = INV_STATUS[inv.status];
      return `<tr><td>#${esc(inv.number)}</td><td>${esc(inv.patient?.name || '—')}</td><td>${dateOf(inv.created_at)}</td>
      <td>${inv.method ? PAY_METHOD[inv.method] : '—'}</td><td><b>${money(inv.total)} ريال</b></td>
      <td><span class="badge ${st.cls}">${st.label}</span></td>
      <td style="white-space:nowrap"><button class="btn btn-ghost btn-sm" data-print="${inv.id}" title="طباعة"><i class="ti ti-printer"></i></button>${inv.status === 'pending' ? ` <button class="btn btn-soft btn-sm" data-pay="${inv.id}">تحصيل</button>` : ''}</td></tr>`;
    }).join('')}
  </table>` : '<div class="empty">لا فواتير</div>'}</div>`;
  el.querySelectorAll('.chip[data-s]').forEach((c) => c.onclick = () => Pages.invoices(el, { status: c.dataset.s }));
  el.querySelector('#new-inv').onclick = () => InvoiceForm();
  el.querySelectorAll('[data-pay]').forEach((b) => b.onclick = () => PayInvoice(b.dataset.pay, () => Pages.invoices(el, { status })));
  el.querySelectorAll('[data-print]').forEach((b) => b.onclick = () => { const inv = list.find((x) => x.id == b.dataset.print); if (inv) printInvoice(inv); });
};

// ============ التقارير ============
Pages.reports = async (el) => {
  const d = await API.get('/admin/reports');
  const m = d.monthly || [];
  const maxRev = Math.max(1, ...m.map((x) => x.revenue));
  const monName = (ym) => new Date(ym + '-01').toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { month: 'short' });
  const a = d.appointments, mt = d.methods;
  const methodMax = Math.max(1, mt.cash, mt.card, mt.transfer);
  const docMax = Math.max(1, ...d.doctors.map((x) => x.visits));
  el.innerHTML = `
  <div class="topbar"><div><h1>التقارير</h1><div class="sub">أداء العيادة — آخر 6 أشهر</div></div></div>
  <div class="kpis">
    <div class="kpi"><div class="t"><i class="ti ti-cash"></i> إجمالي 6 أشهر</div><div class="v">${money(m.reduce((s, x) => s + x.revenue, 0))}</div><div class="d">ريال</div></div>
    <div class="kpi"><div class="t"><i class="ti ti-receipt"></i> إيراد هذا الشهر</div><div class="v">${money(d.totals.revenue_month)}</div><div class="d">ريال</div></div>
    <div class="kpi"><div class="t"><i class="ti ti-clock-exclamation"></i> معلّق إجمالي</div><div class="v" style="color:var(--danger)">${money(d.totals.pending_total)}</div><div class="d warn">غير محصّل</div></div>
    <div class="kpi"><div class="t"><i class="ti ti-users"></i> إجمالي المرضى</div><div class="v">${d.totals.patients_total}</div><div class="d">ملف</div></div>
  </div>
  <div class="card">
    <div class="card-h"><b>الإيرادات الشهرية (ريال)</b></div>
    <div class="cols">${m.map((x) => `<div class="col ${x.revenue === maxRev ? 'hot' : ''}"><span style="height:${Math.max(4, Math.round(x.revenue / maxRev * 100))}%"></span><em>${monName(x.month)}<br>${money(x.revenue)}</em></div>`).join('')}</div>
  </div>
  <div class="grid2" style="margin-top:14px">
    <div class="card"><div class="card-h"><b>مواعيد هذا الشهر</b></div><div class="pad">
      ${[['إجمالي', a.total, 'var(--teal-dark)'], ['مكتملة', a.completed, 'var(--ok)'], ['لم يحضر', a.no_show, 'var(--danger)'], ['ملغاة', a.cancelled, 'var(--muted)'], ['أونلاين', a.online, 'var(--info)']].map(([l, v, c]) =>
        `<div style="display:flex;justify-content:space-between;font-size:13px;padding:7px 0;border-bottom:1px dashed var(--border)"><span style="color:var(--muted)">${l}</span><b style="color:${c}">${v}</b></div>`).join('')}
    </div></div>
    <div class="card"><div class="card-h"><b>طرق الدفع هذا الشهر</b></div><div class="pad">
      ${[['نقدي', mt.cash], ['شبكة (مدى)', mt.card], ['تحويل بنكي', mt.transfer]].map(([l, v]) =>
        `<div class="bar-row"><div class="lbl"><span>${l}</span><span>${money(v)} ريال</span></div><div class="bar"><span style="width:${Math.round(v / methodMax * 100)}%"></span></div></div>`).join('')}
    </div></div>
  </div>
  <div class="grid2" style="margin-top:14px">
    <div class="card"><div class="card-h"><b>أكثر الخدمات دخلاً</b></div>
      ${d.top_services.length ? `<table><tr><th>الخدمة</th><th>عدد</th><th>الإجمالي</th></tr>
      ${d.top_services.map((s) => `<tr><td>${esc(s.name)}</td><td>${s.count}</td><td><b>${money(s.total)} ريال</b></td></tr>`).join('')}</table>` : '<div class="empty">لا بيانات</div>'}
    </div>
    <div class="card"><div class="card-h"><b>أداء الأطباء (كشوفات الشهر)</b></div><div class="pad">
      ${d.doctors.length ? d.doctors.map((x) => `<div class="bar-row"><div class="lbl"><span>${esc(x.name)}</span><span>${x.visits}</span></div><div class="bar"><span style="width:${Math.round(x.visits / docMax * 100)}%"></span></div></div>`).join('') : '<div class="empty">لا بيانات</div>'}
    </div></div>
  </div>`;
};

// ============ الأطباء والموظفون ============
Pages.staff = async (el) => {
  const d = await API.get('/admin/staff');
  const roleName = (u) => u.title || (u.role === 'admin' ? 'مدير العيادة' : 'موظف');
  const doctors = d.staff.filter((u) => u.title);
  const others = d.staff.filter((u) => !u.title);
  el.innerHTML = `
  <div class="topbar"><div><h1>الأطباء والموظفون</h1><div class="sub">${d.staff.length} مستخدمين</div></div>
    <div class="top-actions"><button class="btn btn-primary" id="new-staff"><i class="ti ti-user-plus"></i> إضافة مستخدم</button></div></div>
  <div class="grid3">${doctors.map((u) => `<div class="card pad" data-uid="${u.id}" style="text-align:center;cursor:pointer">
    <div class="avatar" style="width:56px;height:56px;font-size:17px;margin:4px auto 10px">${esc(initials(u.name))}</div>
    <b>${esc(u.name)}</b><div style="font-size:12px;color:var(--muted)">${esc(u.title)}</div>
    <div style="display:flex;gap:6px;justify-content:center;margin-top:10px"><span class="badge b-teal">${u.role === 'admin' ? 'مدير' : 'طبيب'}</span><span class="badge ${u.status === 'active' ? 'b-ok' : 'b-mut'}">${u.status === 'active' ? 'نشط' : 'موقوف'}</span></div>
  </div>`).join('') || '<div class="empty">لا أطباء</div>'}</div>
  <div class="card" style="margin-top:16px"><div class="card-h"><b>بقية الفريق</b></div>
    ${others.length ? `<table><tr><th>الاسم</th><th>الدور</th><th>البريد</th><th>الحالة</th></tr>
    ${others.map((u) => `<tr data-uid="${u.id}" style="cursor:pointer"><td><div class="cell-p"><div class="avatar">${esc(initials(u.name))}</div>${esc(u.name)}</div></td><td>${roleName(u)}</td><td style="direction:ltr;text-align:right">${esc(u.email)}</td><td><span class="badge ${u.status === 'active' ? 'b-ok' : 'b-mut'}">${u.status === 'active' ? 'نشط' : 'موقوف'}</span></td></tr>`).join('')}
    </table>` : '<div class="empty">—</div>'}</div>`;
  el.querySelector('#new-staff').onclick = () => StaffForm();
  el.querySelectorAll('[data-uid]').forEach((n) => n.onclick = () => { const u = d.staff.find((x) => x.id == n.dataset.uid); if (u) StaffForm(u); });
};

// ============ الإعدادات ============
Pages.settings = async (el) => {
  const [st, svc] = await Promise.all([ API.get('/admin/settings'), API.get('/admin/services') ]);
  const s = st.settings || st;
  el.innerHTML = `
  <div class="topbar"><div><h1>الإعدادات</h1><div class="sub">إعدادات العيادة والنظام</div></div>
    <div class="top-actions"><button class="btn btn-primary" id="save-s"><i class="ti ti-device-floppy"></i> حفظ التغييرات</button></div></div>
  <div class="grid2">
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="card"><div class="card-h"><b>بيانات العيادة</b></div><div class="pad">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 14px">
          <div class="field"><label>اسم العيادة</label><input id="s-name" value="${esc(s.clinic_name || '')}"></div>
          <div class="field"><label>الهاتف</label><input id="s-phone" value="${esc(s.phone || '')}"></div>
          <div class="field"><label>البريد</label><input id="s-email" value="${esc(s.email || '')}"></div>
          <div class="field"><label>دوام أيام الأسبوع</label><input id="s-wh" value="${esc(s.weekday_hours || '')}"></div>
        </div>
        <div class="field" style="margin-bottom:0"><label>العنوان</label><input id="s-addr" value="${esc(s.address || '')}"></div>
      </div></div>
      <div class="card"><div class="card-h"><b>الخدمات والأسعار</b><span class="link" id="add-svc">+ خدمة جديدة</span></div>
        <table><tr><th>الخدمة</th><th>القسم</th><th>السعر</th></tr>
        ${svc.services.map((x) => `<tr data-svc="${x.id}" style="cursor:pointer"><td>${esc(x.name)}</td><td>${esc(x.department || '—')}</td><td><b>${money(x.price)} ريال</b></td></tr>`).join('')}
        </table>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="card"><div class="card-h"><b>التذكيرات والحجز</b></div><div class="pad" style="display:flex;flex-direction:column;gap:11px">
        <label style="display:flex;justify-content:space-between;align-items:center;font-size:13px">تفعيل الحجز الأونلاين <input type="checkbox" id="s-booking" ${s.online_booking === '1' ? 'checked' : ''} style="width:auto"></label>
        <div style="display:flex;align-items:center;gap:8px;background:var(--bg);border-radius:9px;padding:9px 12px;font-size:12.5px;color:var(--muted)">
          <i class="ti ti-link"></i> <span style="direction:ltr">${location.origin}/book.html</span>
          <span style="margin-right:auto;color:var(--teal);font-weight:600;cursor:pointer" id="copy-link">نسخ</span>
        </div>
      </div></div>
    </div>
  </div>`;
  el.querySelector('#save-s').onclick = async (e) => {
    e.target.disabled = true;
    try {
      await API.patch('/admin/settings', {
        clinic_name: el.querySelector('#s-name').value, phone: el.querySelector('#s-phone').value,
        email: el.querySelector('#s-email').value, address: el.querySelector('#s-addr').value,
        weekday_hours: el.querySelector('#s-wh').value,
        online_booking: el.querySelector('#s-booking').checked ? '1' : '0',
      });
      toast('تم حفظ الإعدادات');
    } catch (ex) { toast(ex.message, 'err'); } finally { e.target.disabled = false; }
  };
  el.querySelector('#copy-link').onclick = () => { navigator.clipboard?.writeText(location.origin + '/book.html'); toast('نُسخ الرابط'); };
  el.querySelector('#add-svc').onclick = () => ServiceForm(null, () => Pages.settings(el));
  el.querySelectorAll('[data-svc]').forEach((r) => r.onclick = () => { const s = svc.services.find((x) => x.id == r.dataset.svc); if (s) ServiceForm(s, () => Pages.settings(el)); });
};

// ============ المخزون (الأدوية) ============
Pages.inventory = async (el) => {
  const d = await API.get('/admin/inventory');
  const low = (m) => Number(m.quantity) <= Number(m.low_stock_threshold);
  el.innerHTML = `
  <div class="topbar">
    <div><h1>المخزون</h1><div class="sub">${d.items.length} صنف · ${d.low_count} منخفض</div></div>
    <div class="top-actions"><button class="btn btn-primary" id="new-med"><i class="ti ti-plus"></i> صنف جديد</button></div>
  </div>
  ${d.low_count ? `<div class="card pad" style="background:var(--warn-bg);border-color:#fcd34d;color:var(--warn);margin-bottom:14px;font-size:13px"><i class="ti ti-alert-triangle"></i> ${d.low_count} صنف وصل حد التنبيه — يُنصح بإعادة الطلب.</div>` : ''}
  <div class="card">${d.items.length ? `<table>
    <tr><th>الصنف</th><th>التصنيف</th><th>الكمية</th><th>السعر</th><th>الحالة</th></tr>
    ${d.items.map((m) => `<tr data-med="${m.id}" style="cursor:pointer">
      <td><b>${esc(m.name)}</b></td>
      <td>${esc(m.category || '—')}</td>
      <td>${Number(m.quantity)} ${esc(m.unit || '')}</td>
      <td>${m.price ? money(m.price) + ' ريال' : '—'}</td>
      <td>${low(m) ? '<span class="badge b-dgr">منخفض</span>' : '<span class="badge b-ok">متوفّر</span>'}</td>
    </tr>`).join('')}
  </table>` : '<div class="empty">لا أصناف — أضف أول صنف</div>'}</div>`;
  el.querySelector('#new-med').onclick = () => MedicineForm(null, () => App.go('inventory'));
  el.querySelectorAll('[data-med]').forEach((r) => r.onclick = () => { const m = d.items.find((x) => x.id == r.dataset.med); if (m) MedicineForm(m, () => App.go('inventory')); });
};
