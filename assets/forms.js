// عيادتي — شاشة الكشف الموحّدة + النماذج (مودالات)

// ===== بدء كشف ثم فتح الشاشة =====
async function startConsultation(payload) {
  try {
    const d = await API.post('/admin/consultations', payload);
    App.go('consult', d.consultation.id);
    App.loadBadges();
  } catch (ex) { toast(ex.message, 'err'); }
}

// ===== شاشة الكشف الموحّدة =====
Pages.consult = async (el, id) => {
  const d = await API.get('/admin/consultations/' + id);
  const c = d.consultation; const p = c.patient;
  const [svc, prev] = await Promise.all([
    API.get('/admin/services'),
    API.get('/admin/patients/' + p.id),
  ]);
  const rx = c.prescription || [];
  const orders = c.orders || [];
  const visits = (prev.patient.consultations || []).filter((v) => v.id !== c.id).slice(0, 4);

  el.innerHTML = `
  <div class="topbar">
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <button class="btn btn-ghost btn-sm" id="c-back" style="padding:8px 11px"><i class="ti ti-arrow-right"></i></button>
      <div class="avatar" style="width:44px;height:44px;font-size:14px">${esc(initials(p.name))}</div>
      <div><h1 style="font-size:17px">${esc(p.name)} <span style="font-size:13px;color:var(--muted);font-weight:400">· ${ageOf(p.birthdate)} · ${p.gender === 'female' ? 'أنثى' : 'ذكر'}</span></h1>
        <div class="sub">ملف ${esc(p.file_no)}</div></div>
    </div>
    <div class="top-actions">
      ${p.allergies ? `<span class="badge b-warn"><i class="ti ti-alert-triangle"></i> حساسية: ${esc(p.allergies)}</span>` : ''}
      <span class="badge b-teal">كشف</span>
    </div>
  </div>
  <div class="consult-grid">
    <div style="display:flex;flex-direction:column;gap:12px">
      <div class="card pad">
        <div style="font-size:13px;font-weight:600;margin-bottom:10px"><i class="ti ti-activity-heartbeat" style="color:var(--teal)"></i> العلامات الحيوية</div>
        <div class="vitals">
          <div><div class="vl">الضغط</div><input id="v-bp" value="${esc(c.bp || '')}" placeholder="120/80"></div>
          <div><div class="vl">النبض</div><input id="v-pulse" value="${c.pulse || ''}" placeholder="72"></div>
          <div><div class="vl">الحرارة</div><input id="v-temp" value="${c.temp || ''}" placeholder="36.8"></div>
          <div><div class="vl">الوزن</div><input id="v-weight" value="${c.weight || ''}" placeholder="كجم"></div>
        </div>
      </div>
      <div class="card pad">
        <div style="font-size:13px;font-weight:600;margin-bottom:10px"><i class="ti ti-folders" style="color:var(--teal)"></i> زيارات سابقة</div>
        ${visits.length ? visits.map((v) => `<div class="visit-mini" data-v="${v.id}"><div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:13px">${esc(v.diagnosis || 'كشف')}</b><i class="ti ti-chevron-left" style="color:var(--faint);font-size:14px"></i></div><div style="font-size:11px;color:var(--muted)">${dateOf(v.finished_at || v.created_at)}${v.doctor ? ' · ' + esc(v.doctor.name) : ''}</div></div>`).join('') : '<div class="empty" style="padding:14px">لا زيارات سابقة</div>'}
      </div>
    </div>

    <div class="card pad">
      <div style="font-size:14px;font-weight:600;margin-bottom:10px"><i class="ti ti-notes" style="color:var(--teal)"></i> ملاحظة الكشف</div>
      <div class="field"><label>الشكوى</label><textarea id="c-complaint" rows="2">${esc(c.complaint || '')}</textarea></div>
      <div class="field"><label>الفحص</label><textarea id="c-exam" rows="2">${esc(c.examination || '')}</textarea></div>
      <div class="field"><label>التشخيص</label><textarea id="c-diag" rows="2">${esc(c.diagnosis || '')}</textarea></div>
      <div style="font-size:13px;font-weight:600;margin:4px 0 8px"><i class="ti ti-prescription" style="color:var(--teal)"></i> الوصفة</div>
      <div id="rx-list"></div>
      <div class="rx sugg" style="border-style:dashed;color:var(--faint);position:relative">
        <i class="ti ti-plus" style="color:var(--faint)"></i>
        <input id="rx-input" placeholder="أضف دواء…" style="border:none;outline:none;background:transparent;flex:1;font-family:inherit;font-size:13px;color:var(--text)">
        <span style="font-size:11px">تحقق تلقائي من الحساسية</span>
      </div>
    </div>

    <div style="display:flex;flex-direction:column;gap:12px">
      <div class="card pad">
        <div style="font-size:13px;font-weight:600;margin-bottom:9px"><i class="ti ti-flask" style="color:var(--teal)"></i> طلبات</div>
        <div id="orders-list" style="display:flex;flex-direction:column;gap:7px"></div>
        <div class="rx sugg" style="border-style:dashed;color:var(--faint);margin-top:7px;position:relative">
          <i class="ti ti-plus" style="color:var(--faint)"></i>
          <input id="order-input" placeholder="أضف طلب/تحليل…" style="border:none;outline:none;background:transparent;flex:1;font-family:inherit;font-size:13px;color:var(--text)">
        </div>
      </div>
      <div class="card pad">
        <div style="font-size:13px;font-weight:600;margin-bottom:9px"><i class="ti ti-receipt"></i> بنود الفاتورة</div>
        <div id="bill-list"></div>
        <select id="svc-pick" style="width:100%;border:1px solid var(--border);border-radius:8px;padding:8px;font-family:inherit;font-size:12.5px;margin-top:4px">
          <option value="">+ أضف خدمة للفاتورة…</option>
          ${svc.services.map((x) => `<option value="${x.id}" data-name="${esc(x.name)}" data-price="${x.price}">${esc(x.name)} — ${money(x.price)} ريال</option>`).join('')}
        </select>
        <div style="display:flex;justify-content:space-between;font-size:13px;border-top:1px dashed var(--border);margin-top:10px;padding-top:9px"><b>الإجمالي</b><b style="color:var(--teal-dark)" id="bill-total">0 ريال</b></div>
      </div>
      <div class="finish">
        <div style="font-size:12px;opacity:.9;margin-bottom:9px">طريقة الدفع</div>
        <select id="pay-method" style="width:100%;border:none;border-radius:8px;padding:9px;font-family:inherit;font-size:13px;margin-bottom:9px">
          <option value="cash">نقدي</option><option value="card">شبكة (مدى)</option><option value="transfer">تحويل بنكي</option><option value="">معلّقة (دفع لاحق)</option>
        </select>
        <div class="big" id="finish-btn">حفظ · فاتورة · إنهاء الكشف</div>
        <div style="display:flex;gap:7px;margin-top:8px"><div class="sm" id="followup-btn">موعد متابعة</div></div>
      </div>
    </div>
  </div>`;

  // حالة محلية
  const state = { rx: [...rx], orders: [...orders], bill: [], followup: null };

  const renderRx = () => {
    el.querySelector('#rx-list').innerHTML = state.rx.map((r, i) =>
      `<div class="rx"><i class="ti ti-pill"></i><div style="flex:1">${esc(r.drug)}${r.dose || r.duration ? ` <span style="color:var(--muted)">· ${esc([r.dose, r.duration].filter(Boolean).join(' · '))}</span>` : ''}</div><i class="ti ti-x x" data-i="${i}"></i></div>`).join('');
    el.querySelectorAll('#rx-list .x').forEach((x) => x.onclick = () => { state.rx.splice(x.dataset.i, 1); renderRx(); saveDraft(); });
  };
  const renderOrders = () => {
    el.querySelector('#orders-list').innerHTML = state.orders.map((o, i) =>
      `<div class="visit-mini" style="margin:0;display:flex;justify-content:space-between;align-items:center">${esc(o)} <i class="ti ti-x" style="color:var(--faint);cursor:pointer" data-i="${i}"></i></div>`).join('') || '<div style="font-size:12px;color:var(--faint)">لا طلبات</div>';
    el.querySelectorAll('#orders-list .ti-x').forEach((x) => x.onclick = () => { state.orders.splice(x.dataset.i, 1); renderOrders(); saveDraft(); });
  };
  const renderBill = () => {
    el.querySelector('#bill-list').innerHTML = state.bill.map((b, i) =>
      `<div style="display:flex;justify-content:space-between;font-size:12.5px;padding:5px 0"><span>${esc(b.name)}</span><span>${money(b.price)} <i class="ti ti-x" style="color:var(--faint);cursor:pointer;font-size:12px" data-i="${i}"></i></span></div>`).join('');
    el.querySelector('#bill-total').textContent = money(state.bill.reduce((a, b) => a + Number(b.price), 0)) + ' ريال';
    el.querySelectorAll('#bill-list .ti-x').forEach((x) => x.onclick = () => { state.bill.splice(x.dataset.i, 1); renderBill(); });
  };
  renderRx(); renderOrders(); renderBill();

  // حفظ تدريجي (debounced) — يرجع تحذير الحساسية
  let st;
  const saveDraft = () => {
    clearTimeout(st);
    st = setTimeout(async () => {
      try {
        const r = await API.patch('/admin/consultations/' + c.id, {
          bp: el.querySelector('#v-bp').value || null,
          pulse: el.querySelector('#v-pulse').value || null,
          temp: el.querySelector('#v-temp').value || null,
          weight: el.querySelector('#v-weight').value || null,
          complaint: el.querySelector('#c-complaint').value || null,
          examination: el.querySelector('#c-exam').value || null,
          diagnosis: el.querySelector('#c-diag').value || null,
          prescription: state.rx, orders: state.orders,
        });
        (r.warnings || []).forEach((w) => toast(w, 'warn'));
      } catch (ex) { toast(ex.message, 'err'); }
    }, 700);
  };
  ['#v-bp', '#v-pulse', '#v-temp', '#v-weight', '#c-complaint', '#c-exam', '#c-diag'].forEach((s) => el.querySelector(s).addEventListener('input', saveDraft));

  // إضافة دواء (Enter)
  el.querySelector('#rx-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) { e.preventDefault(); state.rx.push({ drug: e.target.value.trim() }); e.target.value = ''; renderRx(); saveDraft(); }
  });
  el.querySelector('#order-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) { e.preventDefault(); state.orders.push(e.target.value.trim()); e.target.value = ''; renderOrders(); saveDraft(); }
  });
  // إضافة بند فاتورة
  el.querySelector('#svc-pick').onchange = (e) => {
    const o = e.target.selectedOptions[0];
    if (o.value) { state.bill.push({ name: o.dataset.name, price: Number(o.dataset.price) }); renderBill(); e.target.value = ''; }
  };
  // موعد متابعة
  el.querySelector('#followup-btn').onclick = () => {
    const def = new Date(); def.setDate(def.getDate() + 7);
    const val = prompt('تاريخ موعد المتابعة (YYYY-MM-DD):', def.toISOString().slice(0, 10));
    if (val) { state.followup = val + ' 10:00:00'; toast('سيُحجز موعد متابعة ' + val + ' عند الإنهاء'); }
  };
  el.querySelector('#c-back').onclick = () => App.go('patient', p.id);

  // إنهاء الكشف — خطوة واحدة
  el.querySelector('#finish-btn').onclick = async (e) => {
    if (!state.bill.length) { toast('أضف بنداً واحداً على الأقل للفاتورة', 'err'); return; }
    e.target.style.opacity = '.6';
    try {
      const body = { items: state.bill };
      const m = el.querySelector('#pay-method').value;
      if (m) body.method = m;
      if (state.followup) body.followup_at = state.followup;
      const r = await API.post('/admin/consultations/' + c.id + '/finish', body);
      toast('تم إنهاء الكشف — فاتورة #' + r.invoice.number + ' (' + money(r.invoice.total) + ' ريال)');
      App.loadBadges();
      App.go('patient', p.id);
    } catch (ex) { toast(ex.message, 'err'); e.target.style.opacity = '1'; }
  };
};

// ===== نموذج المريض =====
function PatientForm(p = null) {
  const v = (k) => esc(p?.[k] || '');
  const close = openModal({
    title: p ? 'تعديل بيانات المريض' : 'مريض جديد',
    body: `
      <div class="field"><label>الاسم الكامل *</label><input id="f-name" value="${v('name')}"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 12px">
        <div class="field"><label>الجوال *</label><input id="f-phone" value="${v('phone')}" placeholder="05xxxxxxxx"></div>
        <div class="field"><label>الجنس</label><select id="f-gender"><option value="male" ${p?.gender === 'male' ? 'selected' : ''}>ذكر</option><option value="female" ${p?.gender === 'female' ? 'selected' : ''}>أنثى</option></select></div>
        <div class="field"><label>تاريخ الميلاد</label><input id="f-bd" type="date" value="${p?.birthdate ? p.birthdate.slice(0, 10) : ''}"></div>
        <div class="field"><label>الهوية</label><input id="f-nid" value="${v('national_id')}"></div>
        <div class="field"><label>فصيلة الدم</label><input id="f-blood" value="${v('blood_type')}" placeholder="O+"></div>
        <div class="field"><label>جهة الطوارئ</label><input id="f-emg" value="${v('emergency_phone')}"></div>
      </div>
      <div class="field"><label>الحساسية (تظهر كتحذير في الكشف)</label><input id="f-allergy" value="${v('allergies')}"></div>
      <div class="field"><label>الحالات المزمنة</label><input id="f-chronic" value="${v('chronic_conditions')}"></div>
      <div class="field" style="margin:0"><label>العنوان</label><input id="f-addr" value="${v('address')}"></div>`,
    footer: `<button class="btn btn-primary" id="f-save">${p ? 'حفظ' : 'إضافة المريض'}</button><button class="btn btn-ghost" id="f-cancel">إلغاء</button>`,
    width: 540,
    onOpen: (root, close) => {
      root.querySelector('#f-cancel').onclick = close;
      root.querySelector('#f-save').onclick = async (e) => {
        const body = {
          name: root.querySelector('#f-name').value.trim(), phone: root.querySelector('#f-phone').value.trim(),
          gender: root.querySelector('#f-gender').value, birthdate: root.querySelector('#f-bd').value || null,
          national_id: root.querySelector('#f-nid').value || null, blood_type: root.querySelector('#f-blood').value || null,
          emergency_phone: root.querySelector('#f-emg').value || null, allergies: root.querySelector('#f-allergy').value || null,
          chronic_conditions: root.querySelector('#f-chronic').value || null, address: root.querySelector('#f-addr').value || null,
        };
        e.target.disabled = true;
        try {
          const r = p ? await API.patch('/admin/patients/' + p.id, body) : await API.post('/admin/patients', body);
          close(); toast(p ? 'تم تحديث البيانات' : 'تم إنشاء ملف المريض');
          App.go('patient', r.patient.id);
        } catch (ex) { toast(ex.message, 'err'); e.target.disabled = false; }
      };
    },
  });
}

// ===== نموذج موعد جديد =====
async function AppointmentForm() {
  const docs = await API.get('/admin/doctors');
  openModal({
    title: 'موعد جديد',
    body: `
      <div class="field sugg" style="position:relative"><label>المريض *</label><input id="a-patient" placeholder="ابحث بالاسم أو الجوال…" autocomplete="off"><input type="hidden" id="a-pid"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 12px">
        <div class="field"><label>الطبيب</label><select id="a-doc"><option value="">—</option>${docs.doctors.map((x) => `<option value="${x.id}" data-t="${esc(x.title || '')}">${esc(x.name)}</option>`).join('')}</select></div>
        <div class="field"><label>القسم</label><input id="a-dep" placeholder="باطنية…"></div>
        <div class="field"><label>التاريخ والوقت *</label><input id="a-dt" type="datetime-local"></div>
        <div class="field"><label>النوع</label><select id="a-type"><option value="new">كشف جديد</option><option value="followup">متابعة</option></select></div>
      </div>
      <div class="field" style="margin:0"><label>السبب</label><input id="a-reason"></div>`,
    footer: `<button class="btn btn-primary" id="a-save">حجز الموعد</button><button class="btn btn-ghost" id="a-cancel">إلغاء</button>`,
    width: 520,
    onOpen: (root, close) => {
      const inp = root.querySelector('#a-patient');
      attachSuggest(inp, async (q) => (await API.get('/admin/patients?q=' + encodeURIComponent(q))).data,
        (p) => { inp.value = p.name; root.querySelector('#a-pid').value = p.id; },
        (p) => `${esc(p.name)} <span style="color:var(--muted);font-size:11px">· ${esc(p.phone)} · ملف ${esc(p.file_no)}</span>`);
      root.querySelector('#a-doc').onchange = (e) => { const t = e.target.selectedOptions[0]?.dataset.t; if (t && !root.querySelector('#a-dep').value) root.querySelector('#a-dep').value = ''; };
      root.querySelector('#a-cancel').onclick = close;
      root.querySelector('#a-save').onclick = async (e) => {
        const pid = root.querySelector('#a-pid').value;
        if (!pid) { toast('اختر المريض من القائمة', 'err'); return; }
        if (!root.querySelector('#a-dt').value) { toast('حدّد التاريخ والوقت', 'err'); return; }
        e.target.disabled = true;
        try {
          await API.post('/admin/appointments', {
            patient_id: pid, doctor_id: root.querySelector('#a-doc').value || null,
            department: root.querySelector('#a-dep').value || null, type: root.querySelector('#a-type').value,
            reason: root.querySelector('#a-reason').value || null,
            scheduled_at: root.querySelector('#a-dt').value.replace('T', ' ') + ':00',
          });
          close(); toast('تم حجز الموعد'); App.go('appointments');
        } catch (ex) { toast(ex.message, 'err'); e.target.disabled = false; }
      };
    },
  });
}

// ===== فاتورة يدوية =====
async function InvoiceForm() {
  const svc = await API.get('/admin/services');
  const bill = [];
  openModal({
    title: 'فاتورة يدوية',
    body: `
      <div class="field sugg" style="position:relative"><label>المريض *</label><input id="i-patient" placeholder="ابحث…" autocomplete="off"><input type="hidden" id="i-pid"></div>
      <div class="field"><label>أضف خدمة</label><select id="i-svc"><option value="">اختر…</option>${svc.services.map((x) => `<option value="${x.id}" data-name="${esc(x.name)}" data-price="${x.price}">${esc(x.name)} — ${money(x.price)} ريال</option>`).join('')}</select></div>
      <div id="i-items" style="margin-bottom:10px"></div>
      <div class="field" style="margin:0"><label>طريقة الدفع</label><select id="i-method"><option value="cash">نقدي</option><option value="card">شبكة</option><option value="transfer">تحويل</option><option value="">معلّقة</option></select></div>`,
    footer: `<button class="btn btn-primary" id="i-save">إنشاء الفاتورة</button><button class="btn btn-ghost" id="i-cancel">إلغاء</button>`,
    width: 480,
    onOpen: (root, close) => {
      const inp = root.querySelector('#i-patient');
      attachSuggest(inp, async (q) => (await API.get('/admin/patients?q=' + encodeURIComponent(q))).data,
        (p) => { inp.value = p.name; root.querySelector('#i-pid').value = p.id; },
        (p) => `${esc(p.name)} <span style="color:var(--muted);font-size:11px">· ملف ${esc(p.file_no)}</span>`);
      const render = () => {
        root.querySelector('#i-items').innerHTML = bill.map((b, i) => `<div style="display:flex;justify-content:space-between;font-size:13px;padding:5px 0;border-bottom:1px dashed var(--border)"><span>${esc(b.name)}</span><span>${money(b.price)} <i class="ti ti-x" style="cursor:pointer;color:var(--faint)" data-i="${i}"></i></span></div>`).join('') + (bill.length ? `<div style="display:flex;justify-content:space-between;font-size:13px;padding-top:8px;font-weight:700"><span>الإجمالي</span><span style="color:var(--teal-dark)">${money(bill.reduce((a, b) => a + b.price, 0))} ريال</span></div>` : '');
        root.querySelectorAll('#i-items .ti-x').forEach((x) => x.onclick = () => { bill.splice(x.dataset.i, 1); render(); });
      };
      root.querySelector('#i-svc').onchange = (e) => { const o = e.target.selectedOptions[0]; if (o.value) { bill.push({ name: o.dataset.name, price: Number(o.dataset.price) }); render(); e.target.value = ''; } };
      root.querySelector('#i-cancel').onclick = close;
      root.querySelector('#i-save').onclick = async (ev) => {
        const pid = root.querySelector('#i-pid').value;
        if (!pid || !bill.length) { toast('اختر المريض وأضف بنداً', 'err'); return; }
        ev.target.disabled = true;
        try {
          const m = root.querySelector('#i-method').value;
          await API.post('/admin/invoices', { patient_id: pid, items: bill, method: m || undefined });
          close(); toast('تم إنشاء الفاتورة'); App.go('invoices');
        } catch (ex) { toast(ex.message, 'err'); ev.target.disabled = false; }
      };
    },
  });
}

// ===== نموذج الموظف (HR) — متعدد الأقسام + حساب دخول اختياري =====
function EmployeeForm(e = null) {
  const v = (k) => esc(e?.[k] ?? '');
  const dv = (k) => e?.[k] ? String(e[k]).slice(0, 10) : '';
  const sel = (k, val) => e?.[k] === val ? 'selected' : '';
  const sec = (title, icon, body) => `<div style="font-size:12.5px;font-weight:700;color:var(--teal-dark);margin:14px 0 8px;display:flex;align-items:center;gap:6px"><i class="ti ${icon}"></i> ${title}</div>${body}`;
  const g2 = (a, b) => `<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 12px">${a}${b}</div>`;
  const perms = [['appointments', 'المواعيد'], ['patients', 'المرضى'], ['consultations', 'الكشوفات'], ['invoices', 'الفواتير'], ['inventory', 'المخزون'], ['staff', 'الموظفون'], ['settings', 'الإعدادات']];

  openModal({
    title: e ? 'تعديل بيانات الموظف' : 'موظف جديد',
    width: 620,
    body: `
      ${sec('الهوية', 'ti-user', `
        ${g2(
          `<div class="field"><label>الاسم الكامل *</label><input id="e-name" value="${v('name')}"></div>`,
          `<div class="field"><label>الاسم (إنجليزي)</label><input id="e-name_en" value="${v('name_en')}"></div>`)}
        ${g2(
          `<div class="field"><label>الرقم الوظيفي</label><input id="e-employee_number" value="${v('employee_number')}" placeholder="تلقائي إن تُرك فارغاً"></div>`,
          `<div class="field"><label>القسم</label><input id="e-department" value="${v('department')}" placeholder="باطنية…"></div>`)}
        ${g2(
          `<div class="field"><label>المسمّى الوظيفي</label><input id="e-job_title" value="${v('job_title')}"></div>`,
          `<div class="field"><label>المسمّى (إنجليزي)</label><input id="e-job_title_en" value="${v('job_title_en')}"></div>`)}
        ${g2(
          `<div class="field"><label>الجنس</label><select id="e-gender"><option value="">—</option><option value="male" ${sel('gender', 'male')}>ذكر</option><option value="female" ${sel('gender', 'female')}>أنثى</option></select></div>`,
          `<div class="field"><label>تاريخ الميلاد</label><input id="e-birth_date" type="date" value="${dv('birth_date')}"></div>`)}
        ${g2(
          `<div class="field"><label>الجنسية</label><input id="e-nationality" value="${v('nationality')}"></div>`,
          `<div class="field"><label>الحالة الاجتماعية</label><select id="e-marital_status"><option value="">—</option><option value="single" ${sel('marital_status', 'single')}>أعزب</option><option value="married" ${sel('marital_status', 'married')}>متزوج</option><option value="divorced" ${sel('marital_status', 'divorced')}>مطلّق</option><option value="widowed" ${sel('marital_status', 'widowed')}>أرمل</option></select></div>`)}
      `)}
      ${sec('التواصل', 'ti-phone', g2(
        `<div class="field"><label>الجوال</label><input id="e-phone" value="${v('phone')}"></div>`,
        `<div class="field"><label>البريد</label><input id="e-email" value="${v('email')}"></div>`))}
      ${sec('الوثائق', 'ti-id', `
        ${g2(
          `<div class="field"><label>رقم الهوية</label><input id="e-national_id" value="${v('national_id')}"></div>`,
          `<div class="field"><label>رقم الجواز</label><input id="e-passport_number" value="${v('passport_number')}"></div>`)}
        ${g2(
          `<div class="field"><label>إصدار الهوية</label><input id="e-id_issue_date" type="date" value="${dv('id_issue_date')}"></div>`,
          `<div class="field"><label>انتهاء الهوية</label><input id="e-id_expiry_date" type="date" value="${dv('id_expiry_date')}"></div>`)}
        ${g2(
          `<div class="field"><label>إصدار الجواز</label><input id="e-passport_issue_date" type="date" value="${dv('passport_issue_date')}"></div>`,
          `<div class="field"><label>انتهاء الجواز</label><input id="e-passport_expiry_date" type="date" value="${dv('passport_expiry_date')}"></div>`)}
      `)}
      ${sec('التوظيف والراتب', 'ti-briefcase', `
        ${g2(
          `<div class="field"><label>تاريخ التعيين</label><input id="e-hire_date" type="date" value="${dv('hire_date')}"></div>`,
          `<div class="field"><label>الحالة</label><select id="e-status"><option value="active" ${sel('status', 'active')}>نشط</option><option value="inactive" ${sel('status', 'inactive')}>موقوف</option></select></div>`)}
        ${g2(
          `<div class="field"><label>الراتب الأساسي</label><input id="e-base_salary" type="number" value="${e?.base_salary ?? ''}" placeholder="0"></div>`,
          `<div class="field"><label>البنك</label><input id="e-bank_name" value="${v('bank_name')}"></div>`)}
        <div class="field"><label>IBAN</label><input id="e-iban" value="${v('iban')}" style="direction:ltr"></div>
      `)}
      ${sec('ملاحظات', 'ti-note', `<div class="field" style="margin:0"><textarea id="e-notes" rows="2">${v('notes')}</textarea></div>`)}
      ${!e || !e.user_id ? sec('حساب الدخول (اختياري)', 'ti-key', `
        <label style="display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:8px"><input type="checkbox" id="e-create_account" style="width:auto"> إنشاء حساب دخول لهذا الموظف</label>
        <div id="account-fields" class="hidden">
          ${g2(
            `<div class="field"><label>البريد *</label><input id="e-account_email" type="email"></div>`,
            `<div class="field"><label>كلمة المرور *</label><input id="e-account_password" type="text" placeholder="6 أحرف على الأقل"></div>`)}
          <div class="field"><label>الدور</label><select id="e-account_role"><option value="staff">موظف (صلاحيات محدّدة)</option><option value="admin">مدير العيادة (كل الصلاحيات)</option></select></div>
          <div class="field" style="margin:0"><label>الصلاحيات (للموظف)</label><div id="e-perms" style="display:flex;flex-wrap:wrap;gap:7px">${perms.map(([k, lbl]) => `<label class="chip" style="cursor:pointer;display:flex;gap:5px;align-items:center"><input type="checkbox" value="${k}" style="width:auto"> ${lbl}</label>`).join('')}</div></div>
        </div>
      `) : ''}
    `,
    footer: `<button class="btn btn-primary" id="e-save">${e ? 'حفظ' : 'إضافة الموظف'}</button><button class="btn btn-ghost" id="e-cancel">إلغاء</button>`,
    onOpen: (root, close) => {
      root.querySelector('#e-cancel').onclick = close;
      const acc = root.querySelector('#e-create_account');
      if (acc) acc.onchange = () => root.querySelector('#account-fields').classList.toggle('hidden', !acc.checked);
      root.querySelector('#e-save').onclick = async (ev) => {
        const val = (k) => { const n = root.querySelector('#e-' + k); return n ? (n.value.trim?.() ?? n.value) : undefined; };
        const body = {};
        ['employee_number', 'name', 'name_en', 'job_title', 'job_title_en', 'department', 'phone', 'email',
          'national_id', 'id_issue_date', 'id_expiry_date', 'passport_number', 'passport_issue_date', 'passport_expiry_date',
          'birth_date', 'gender', 'nationality', 'marital_status', 'hire_date', 'base_salary', 'iban', 'bank_name', 'status', 'notes']
          .forEach((k) => { const x = val(k); if (x !== undefined && x !== '') body[k] = x; });
        if (!body.name) { toast('اسم الموظف مطلوب', 'err'); return; }
        if (acc && acc.checked) {
          body.create_account = true;
          body.account_email = val('account_email');
          body.account_password = val('account_password');
          body.account_role = val('account_role');
          body.account_permissions = [...root.querySelectorAll('#e-perms input:checked')].map((c) => c.value);
        }
        ev.target.disabled = true;
        try {
          const r = e ? await API.patch('/admin/employees/' + e.id, body) : await API.post('/admin/employees', body);
          close(); toast(e ? 'تم حفظ البيانات' : 'تم إضافة الموظف');
          App.go('employee', r.employee.id);
        } catch (ex) { toast(ex.message, 'err'); ev.target.disabled = false; }
      };
    },
  });
}

// ===== إجراءات الموعد (تأكيد/وصول/كشف/لم يحضر/إلغاء) =====
function AppointmentActions(appt, done) {
  const setStatus = async (status) => {
    try { await API.patch('/admin/appointments/' + appt.id + '/status', { status }); toast('تم تحديث الموعد'); close(); done?.(); App.loadBadges(); }
    catch (ex) { toast(ex.message, 'err'); }
  };
  // نغمات الألوان لكل إجراء (دائرة أيقونة + حافة)
  const TONE = {
    teal:   { ic: 'var(--teal)',   bg: 'rgba(14,138,138,.12)' },
    ok:     { ic: 'var(--ok)',     bg: 'var(--ok-bg)' },
    info:   { ic: 'var(--info)',   bg: 'var(--info-bg)' },
    warn:   { ic: 'var(--warn)',   bg: 'var(--warn-bg)' },
    danger: { ic: 'var(--danger)', bg: 'var(--danger-bg)' },
    neutral:{ ic: 'var(--muted)',  bg: 'var(--bg)' },
  };

  // الإجراءات المتاحة حسب الحالة — كل إجراء: {act|fn, title, desc, icon, tone, primary}
  const acts = [];
  if (appt.status === 'scheduled') {
    acts.push({ act: 'confirmed', title: 'تأكيد الموعد', desc: 'يُثبّت الحجز ويحجز الوقت', icon: 'ti-circle-check', tone: 'teal', primary: true });
    acts.push({ act: 'arrived', title: 'تسجيل وصول', desc: 'المريض حضر الآن → قائمة الانتظار', icon: 'ti-user-check', tone: 'info' });
  } else if (appt.status === 'confirmed') {
    acts.push({ act: 'arrived', title: 'تسجيل وصول', desc: 'المريض حضر الآن → قائمة الانتظار', icon: 'ti-user-check', tone: 'info', primary: true });
  }
  if (['scheduled', 'confirmed', 'arrived'].includes(appt.status)) {
    acts.push({ title: 'بدء الكشف', desc: 'يفتح شاشة الكشف مباشرة', icon: 'ti-stethoscope', tone: 'teal', primary: appt.status === 'arrived', fn: () => { close(); startConsultation({ appointment_id: appt.id }); } });
  }
  acts.push({ title: 'فتح ملف المريض', desc: 'السجل الكامل والتاريخ الطبي', icon: 'ti-folder', tone: 'neutral', fn: () => { close(); App.go('patient', appt.pid); } });
  if (appt.status !== 'completed' && appt.status !== 'cancelled') {
    acts.push({ act: 'no_show', title: 'لم يحضر', desc: 'تعليم الموعد كمتغيّب', icon: 'ti-calendar-x', tone: 'warn' });
    acts.push({ act: 'cancelled', title: 'إلغاء الموعد', desc: 'إلغاء نهائي للموعد', icon: 'ti-x', tone: 'danger' });
  }

  const st = APPT_STATUS[appt.status] || {};
  const close = openModal({
    title: 'إجراءات الموعد',
    body: `<style>
      .act-row{display:flex;align-items:center;gap:12px;width:100%;text-align:start;background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:11px 13px;cursor:pointer;transition:border-color .15s,background .15s,transform .05s;font-family:inherit}
      .act-row:hover{border-color:var(--teal);background:var(--bg)}
      .act-row:active{transform:scale(.99)}
      .act-row .act-ic{flex-shrink:0;width:40px;height:40px;border-radius:12px;display:grid;place-items:center;font-size:20px}
      .act-row .act-tx{flex:1;min-width:0;line-height:1.4}
      .act-row .act-tx b{font-size:14px;color:var(--text);display:block}
      .act-row .act-tx small{font-size:11.5px;color:var(--muted)}
      .act-row .act-go{color:var(--faint);font-size:16px;flex-shrink:0}
      .act-row.is-primary{background:var(--teal);border-color:var(--teal)}
      .act-row.is-primary:hover{background:var(--teal-dark)}
      .act-row.is-primary .act-ic{background:rgba(255,255,255,.2)!important;color:#fff!important}
      .act-row.is-primary .act-tx b{color:#fff}
      .act-row.is-primary .act-tx small{color:rgba(255,255,255,.82)}
      .act-row.is-primary .act-go{color:rgba(255,255,255,.7)}
    </style>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
      <span style="font-size:12.5px;color:var(--muted)">الحالة الحالية</span>
      <span class="badge ${st.cls || ''}">${st.label || appt.status}</span>
    </div>
    <div id="appt-actions" style="display:flex;flex-direction:column;gap:9px"></div>`,
    width: 380,
    onOpen: (root) => {
      const box = root.querySelector('#appt-actions');
      acts.forEach((a) => {
        const t = TONE[a.tone] || TONE.neutral;
        const b = document.createElement('button');
        b.className = 'act-row' + (a.primary ? ' is-primary' : '');
        b.innerHTML = `
          <span class="act-ic" style="background:${t.bg};color:${t.ic}"><i class="ti ${a.icon}"></i></span>
          <span class="act-tx"><b>${a.title}</b><small>${a.desc}</small></span>
          <i class="ti ti-chevron-left act-go"></i>`;
        b.onclick = a.fn || (() => setStatus(a.act));
        box.appendChild(b);
      });
    },
  });
}

// ===== تحصيل فاتورة معلّقة =====
function PayInvoice(id, done) {
  openModal({
    title: 'تحصيل الفاتورة',
    body: `<div class="field" style="margin:0"><label>طريقة الدفع</label><select id="pay-m"><option value="cash">نقدي</option><option value="card">شبكة (مدى)</option><option value="transfer">تحويل بنكي</option></select></div>`,
    footer: `<button class="btn btn-primary" id="pay-ok">تأكيد الدفع</button><button class="btn btn-ghost" id="pay-cancel">إلغاء</button>`,
    width: 380,
    onOpen: (root, close) => {
      root.querySelector('#pay-cancel').onclick = close;
      root.querySelector('#pay-ok').onclick = async (e) => {
        e.target.disabled = true;
        try { await API.patch('/admin/invoices/' + id + '/pay', { method: root.querySelector('#pay-m').value }); close(); toast('تم التحصيل'); done?.(); }
        catch (ex) { toast(ex.message, 'err'); e.target.disabled = false; }
      };
    },
  });
}

// ===== نموذج موظف / طبيب =====
const PERM_LABELS = { appointments: 'المواعيد', patients: 'المرضى', consultations: 'الكشوفات', invoices: 'الفواتير', staff: 'الموظفون', inventory: 'المخزون', settings: 'الإعدادات' };
function StaffForm(u = null) {
  const edit = !!u;
  const v = (k) => esc(u?.[k] || '');
  const perms = u?.permissions || [];
  const permBoxes = Object.entries(PERM_LABELS).map(([k, l]) =>
    `<label style="display:flex;align-items:center;gap:6px;font-size:12.5px"><input type="checkbox" class="perm" value="${k}" ${perms.includes(k) ? 'checked' : ''} style="width:auto"> ${l}</label>`).join('');
  openModal({
    title: edit ? 'تعديل مستخدم' : 'إضافة مستخدم',
    width: 540,
    body: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 12px">
        <div class="field"><label>الاسم *</label><input id="s-name" value="${v('name')}"></div>
        <div class="field"><label>المسمّى (للأطباء)</label><input id="s-title" value="${v('title')}" placeholder="طبيب باطنية…"></div>
        <div class="field"><label>البريد *</label><input id="s-email" type="email" value="${v('email')}" ${edit ? 'disabled' : ''}></div>
        <div class="field"><label>الجوال</label><input id="s-phone" value="${v('phone')}"></div>
        <div class="field"><label>الدور</label><select id="s-role"><option value="staff" ${u?.role === 'staff' ? 'selected' : ''}>موظف</option><option value="admin" ${u?.role === 'admin' ? 'selected' : ''}>مدير</option></select></div>
        ${edit
          ? `<div class="field"><label>الحالة</label><select id="s-status"><option value="active" ${u?.status === 'active' ? 'selected' : ''}>نشط</option><option value="idle" ${u?.status === 'idle' ? 'selected' : ''}>موقوف</option></select></div>`
          : `<div class="field"><label>كلمة المرور *</label><input id="s-pass" type="text" placeholder="6 أحرف على الأقل"></div>`}
      </div>
      <div class="field" style="margin-bottom:6px"><label>الصلاحيات (للموظف — المدير يملك كل شيء)</label>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:4px">${permBoxes}</div></div>`,
    footer: `<button class="btn btn-primary" id="s-save">${edit ? 'حفظ' : 'إضافة'}</button>${edit ? '<button class="btn btn-ghost" id="s-del" style="color:var(--danger)">حذف</button>' : ''}<button class="btn btn-ghost" id="s-cancel">إلغاء</button>`,
    onOpen: (root, close) => {
      root.querySelector('#s-cancel').onclick = close;
      const getPerms = () => [...root.querySelectorAll('.perm:checked')].map((c) => c.value);
      root.querySelector('#s-save').onclick = async (e) => {
        e.target.disabled = true;
        try {
          if (edit) {
            await API.patch('/admin/staff/' + u.id, {
              name: root.querySelector('#s-name').value, title: root.querySelector('#s-title').value || null,
              phone: root.querySelector('#s-phone').value || null, role: root.querySelector('#s-role').value,
              status: root.querySelector('#s-status').value, permissions: getPerms(),
            });
            toast('تم تحديث المستخدم');
          } else {
            await API.post('/admin/staff', {
              name: root.querySelector('#s-name').value, email: root.querySelector('#s-email').value,
              title: root.querySelector('#s-title').value || null, phone: root.querySelector('#s-phone').value || null,
              role: root.querySelector('#s-role').value, password: root.querySelector('#s-pass').value, permissions: getPerms(),
            });
            toast('تم إضافة المستخدم');
          }
          close(); App.go('staff');
        } catch (ex) { toast(ex.message, 'err'); e.target.disabled = false; }
      };
      if (edit) {
        root.querySelector('#s-del').onclick = async () => {
          if (!confirm('حذف المستخدم «' + u.name + '»؟')) return;
          try { await API.del('/admin/staff/' + u.id); close(); toast('تم الحذف'); App.go('staff'); }
          catch (ex) { toast(ex.message, 'err'); }
        };
      }
    },
  });
}

// ===== نموذج خدمة =====
function ServiceForm(s = null, onDone) {
  const edit = !!s;
  openModal({
    title: edit ? 'تعديل خدمة' : 'خدمة جديدة', width: 440,
    body: `
      <div class="field"><label>اسم الخدمة *</label><input id="sv-name" value="${esc(s?.name || '')}"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 12px">
        <div class="field"><label>القسم</label><input id="sv-dep" value="${esc(s?.department || '')}" placeholder="باطنية…"></div>
        <div class="field" style="margin-bottom:0"><label>السعر *</label><input id="sv-price" type="number" value="${s?.price ?? ''}"></div>
      </div>`,
    footer: `<button class="btn btn-primary" id="sv-save">${edit ? 'حفظ' : 'إضافة'}</button>${edit ? '<button class="btn btn-ghost" id="sv-del" style="color:var(--danger)">حذف</button>' : ''}<button class="btn btn-ghost" id="sv-cancel">إلغاء</button>`,
    onOpen: (root, close) => {
      root.querySelector('#sv-cancel').onclick = close;
      root.querySelector('#sv-save').onclick = async (e) => {
        const body = { name: root.querySelector('#sv-name').value.trim(), department: root.querySelector('#sv-dep').value || null, price: Number(root.querySelector('#sv-price').value || 0) };
        if (!body.name) { toast('أدخل اسم الخدمة', 'err'); return; }
        e.target.disabled = true;
        try { edit ? await API.patch('/admin/services/' + s.id, body) : await API.post('/admin/services', body); close(); toast('تم الحفظ'); onDone?.(); }
        catch (ex) { toast(ex.message, 'err'); e.target.disabled = false; }
      };
      if (edit) {
        root.querySelector('#sv-del').onclick = async () => {
          if (!confirm('حذف خدمة «' + s.name + '»؟')) return;
          try { await API.del('/admin/services/' + s.id); close(); toast('تم الحذف'); onDone?.(); } catch (ex) { toast(ex.message, 'err'); }
        };
      }
    },
  });
}

// ===== نموذج دواء (مخزون) =====
function MedicineForm(m = null, onDone) {
  const edit = !!m;
  openModal({
    title: edit ? 'تعديل صنف' : 'صنف جديد', width: 470,
    body: `
      <div class="field"><label>اسم الدواء/الصنف *</label><input id="m-name" value="${esc(m?.name || '')}"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 12px">
        <div class="field"><label>التصنيف</label><input id="m-cat" value="${esc(m?.category || '')}" placeholder="مضاد حيوي…"></div>
        <div class="field"><label>الوحدة</label><input id="m-unit" value="${esc(m?.unit || '')}" placeholder="علبة / شريط…"></div>
        <div class="field"><label>الكمية *</label><input id="m-qty" type="number" value="${m?.quantity ?? ''}"></div>
        <div class="field"><label>حد التنبيه</label><input id="m-low" type="number" value="${m?.low_stock_threshold ?? ''}" placeholder="10"></div>
        <div class="field" style="margin-bottom:0"><label>السعر</label><input id="m-price" type="number" value="${m?.price ?? ''}"></div>
      </div>`,
    footer: `<button class="btn btn-primary" id="m-save">${edit ? 'حفظ' : 'إضافة'}</button>${edit ? '<button class="btn btn-ghost" id="m-del" style="color:var(--danger)">حذف</button>' : ''}<button class="btn btn-ghost" id="m-cancel">إلغاء</button>`,
    onOpen: (root, close) => {
      root.querySelector('#m-cancel').onclick = close;
      root.querySelector('#m-save').onclick = async (e) => {
        const body = {
          name: root.querySelector('#m-name').value.trim(), category: root.querySelector('#m-cat').value || null,
          unit: root.querySelector('#m-unit').value || null, quantity: Number(root.querySelector('#m-qty').value || 0),
          low_stock_threshold: Number(root.querySelector('#m-low').value || 0),
          price: root.querySelector('#m-price').value ? Number(root.querySelector('#m-price').value) : null,
        };
        if (!body.name) { toast('أدخل اسم الصنف', 'err'); return; }
        e.target.disabled = true;
        try { edit ? await API.patch('/admin/inventory/' + m.id, body) : await API.post('/admin/inventory', body); close(); toast('تم الحفظ'); onDone?.(); }
        catch (ex) { toast(ex.message, 'err'); e.target.disabled = false; }
      };
      if (edit) {
        root.querySelector('#m-del').onclick = async () => {
          if (!confirm('حذف «' + m.name + '»؟')) return;
          try { await API.del('/admin/inventory/' + m.id); close(); toast('تم الحذف'); onDone?.(); } catch (ex) { toast(ex.message, 'err'); }
        };
      }
    },
  });
}

// ===== طباعة فاتورة =====
function printInvoice(inv) {
  const clinic = App.clinic?.name || 'عيادتي';
  const rows = (inv.items || []).map((it) => `<tr><td>${esc(it.name)}</td><td style="text-align:left">${money(it.price)} ريال</td></tr>`).join('');
  const w = window.open('', '_blank', 'width=440,height=660');
  if (!w) { toast('اسمح بالنوافذ المنبثقة للطباعة', 'err'); return; }
  w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>فاتورة #${esc(inv.number)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
  <style>body{font-family:'Cairo',Arial,sans-serif;padding:26px;color:#1e293b}h1{font-size:18px;margin:0}
  table{width:100%;border-collapse:collapse;margin-top:16px;font-size:13px}td,th{padding:8px 4px;border-bottom:1px solid #e2e8f0;text-align:right}
  .tot td{font-weight:700;font-size:15px;border-top:2px solid #0e8a8a;border-bottom:none;padding-top:10px}
  .muted{color:#64748b;font-size:12px}</style></head><body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start">
    <div><h1>${esc(clinic)}</h1><div class="muted">فاتورة رقم #${esc(inv.number)}</div></div>
    <div class="muted" style="text-align:left">${dateOf(inv.created_at)}<br>${INV_STATUS[inv.status]?.label || ''}</div>
  </div>
  <div class="muted" style="margin-top:10px">المريض: <b style="color:#1e293b">${esc(inv.patient?.name || '—')}</b>${inv.patient?.file_no ? ' · ملف ' + esc(inv.patient.file_no) : ''}</div>
  <table><tr><th>البند</th><th style="text-align:left">المبلغ</th></tr>${rows}
  <tr class="tot"><td>الإجمالي</td><td style="text-align:left">${money(inv.total)} ريال</td></tr></table>
  ${inv.method ? `<div class="muted" style="margin-top:12px">طريقة الدفع: ${PAY_METHOD[inv.method] || inv.method}</div>` : ''}
  <div class="muted" style="margin-top:30px;text-align:center">شكراً لزيارتكم — ${esc(clinic)}</div>
  <script>window.onload=function(){window.print()}<\/script></body></html>`);
  w.document.close();
}
