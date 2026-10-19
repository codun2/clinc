// منصّة عيادتي — لوحة صاحب المنصّة (توكن منفصل عن لوحة العيادة)
const TOKEN_KEY = 'clinic_super_token';

const SAPI = {
  token: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  async call(path, opts = {}) {
    const headers = { Accept: 'application/json', ...(opts.headers || {}) };
    if (opts.body && !(opts.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(opts.body);
    }
    const t = SAPI.token();
    if (t) headers['Authorization'] = 'Bearer ' + t;
    const res = await fetch('/api' + path, { ...opts, headers });
    if (res.status === 401) { localStorage.removeItem(TOKEN_KEY); showLogin(); throw new Error('unauthenticated'); }
    let data = null; try { data = await res.json(); } catch {}
    if (!res.ok) {
      const msg = data?.errors ? Object.values(data.errors).flat().join(' — ') : (data?.message || 'حدث خطأ');
      const e = new Error(msg); e.status = res.status; throw e;
    }
    return data;
  },
  get: (p) => SAPI.call(p),
  post: (p, b) => SAPI.call(p, { method: 'POST', body: b }),
  patch: (p, b) => SAPI.call(p, { method: 'PATCH', body: b }),
};

const CLINIC_STATUS = {
  pending:   { label: 'بانتظار الاعتماد', cls: 'b-warn' },
  active:    { label: 'نشطة',            cls: 'b-ok' },
  suspended: { label: 'موقوفة',          cls: 'b-dgr' },
};

const supTimeAgo = (iso) => {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60) return 'الآن';
  const m = Math.floor(s / 60); if (m < 60) return `قبل ${m} د`;
  const h = Math.floor(m / 60); if (h < 24) return `قبل ${h} س`;
  const d = Math.floor(h / 24); if (d < 7) return `قبل ${d} ي`;
  return dateOf(iso);
};

// ===== مودال عام =====
function openModal({ title, body, footer, onOpen, width }) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `<div class="overlay"><div class="modal" ${width ? `style="max-width:${width}px"` : ''}>
    <div class="modal-h"><b>${esc(title)}</b><i class="ti ti-x" id="modal-x"></i></div>
    <div class="modal-b">${body}</div>
    ${footer ? `<div class="modal-f">${footer}</div>` : ''}
  </div></div>`;
  const close = () => { root.innerHTML = ''; };
  root.querySelector('#modal-x').onclick = close;
  root.querySelector('.overlay').onclick = (e) => { if (e.target.classList.contains('overlay')) close(); };
  onOpen?.(root, close);
  I18N.apply(root);
  return close;
}

const Sup = {
  filter: '',

  showLogin() {
    document.getElementById('app').classList.add('hidden');
    document.getElementById('login').classList.remove('hidden');
    const lt = document.getElementById('lang-toggle');
    if (lt) { lt.textContent = I18N.label(); lt.onclick = () => I18N.toggle(); }
    I18N.apply(document.body);
  },

  async boot() {
    if (!SAPI.token()) return Sup.showLogin();
    try { await SAPI.get('/super/me'); } catch { return Sup.showLogin(); }

    document.getElementById('login').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');

    const lt = document.getElementById('lang-toggle');
    if (lt) { lt.textContent = I18N.label(); lt.onclick = () => I18N.toggle(); }

    document.getElementById('logout').onclick = Sup.logout;
    document.getElementById('new-clinic').onclick = () => ClinicForm();
    document.getElementById('new-plan').onclick = () => PlanForm();
    document.querySelectorAll('.chip[data-s]').forEach((c) => c.onclick = () => {
      document.querySelectorAll('.chip[data-s]').forEach((x) => x.classList.remove('on'));
      c.classList.add('on'); Sup.filter = c.dataset.s; Sup.load();
    });
    document.querySelectorAll('.chip[data-tab]').forEach((c) => c.onclick = () => Sup.tab(c.dataset.tab));

    Sup.setupNotifications();
    I18N.apply(document.body);
    Sup.load();
  },

  // تبديل التبويبات: العيادات / الباقات
  tab(name) {
    document.querySelectorAll('.chip[data-tab]').forEach((x) => x.classList.toggle('on', x.dataset.tab === name));
    document.getElementById('view-clinics').classList.toggle('hidden', name !== 'clinics');
    document.getElementById('view-plans').classList.toggle('hidden', name !== 'plans');
    document.getElementById('new-clinic').classList.toggle('hidden', name !== 'clinics');
    document.getElementById('new-plan').classList.toggle('hidden', name !== 'plans');
    if (name === 'plans') Sup.loadPlans();
  },

  async load() {
    const el = document.getElementById('list');
    el.innerHTML = '<div class="empty"><span class="spin" style="border-color:var(--border);border-top-color:var(--teal)"></span></div>';
    let d;
    try { d = await SAPI.get('/super/clinics' + (Sup.filter ? '?status=' + Sup.filter : '')); }
    catch (ex) { el.innerHTML = `<div class="empty">تعذّر التحميل — ${esc(ex.message)}</div>`; return; }
    const clinics = d.clinics || [];

    // لوحة الأرقام (دائماً من القائمة الكاملة — نجلبها بدون فلتر لو كنا مفلترين)
    Sup.renderKpis();

    document.getElementById('sub-count').textContent = `${clinics.length} عيادة`;
    el.innerHTML = clinics.length ? `<table>
      <tr><th>العيادة</th><th>الرابط</th><th>الطاقم</th><th>المرضى</th><th>الاشتراك</th><th>الحالة</th><th>انضمّت</th><th></th></tr>
      ${clinics.map((c) => { const st = CLINIC_STATUS[c.status] || CLINIC_STATUS.pending;
        return `<tr data-id="${c.id}">
          <td><div class="cell-p"><div class="avatar">${esc(initials(c.name))}</div><div>${esc(c.name)}<small>${esc(c.email || '—')}</small></div></div></td>
          <td style="direction:ltr;text-align:right"><a href="/book.html?c=${esc(c.slug)}" target="_blank" style="color:var(--teal)">/${esc(c.slug)}</a></td>
          <td>${c.staff_count ?? 0}${c.plan?.max_users ? ` <small style="color:var(--faint)">/ ${c.plan.max_users}</small>` : ''}</td>
          <td>${c.patients_count ?? 0}</td>
          <td>${c.plan ? `<span class="badge b-teal">${esc(c.plan.name)}</span>` : '<span class="badge b-mut">بلا باقة</span>'}</td>
          <td><span class="badge ${st.cls}">${st.label}</span></td>
          <td style="color:var(--faint)">${dateOf(c.created_at)}</td>
          <td style="white-space:nowrap">${Sup.actions(c)}</td>
        </tr>`; }).join('')}
    </table>` : '<div class="empty">لا عيادات</div>';

    el.querySelectorAll('[data-approve]').forEach((b) => b.onclick = () => Sup.act(b.dataset.approve, 'approve'));
    el.querySelectorAll('[data-suspend]').forEach((b) => b.onclick = () => Sup.act(b.dataset.suspend, 'suspend'));
    el.querySelectorAll('[data-activate]').forEach((b) => b.onclick = () => Sup.act(b.dataset.activate, 'activate'));
    el.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => {
      const c = clinics.find((x) => x.id == b.dataset.edit); if (c) ClinicForm(c);
    });
    I18N.apply(el);
  },

  actions(c) {
    const btn = (attr, id, cls, label) => `<button class="btn ${cls} btn-sm" data-${attr}="${id}">${label}</button>`;
    let a = '';
    if (c.status === 'pending') a += btn('approve', c.id, 'btn-soft', 'اعتماد');
    if (c.status === 'active') a += btn('suspend', c.id, 'btn-ghost', 'إيقاف');
    if (c.status === 'suspended') a += btn('activate', c.id, 'btn-soft', 'تفعيل');
    a += ' ' + btn('edit', c.id, 'btn-ghost', 'تعديل');
    return a;
  },

  async renderKpis() {
    let all;
    try { all = (await SAPI.get('/super/clinics')).clinics || []; } catch { all = []; }
    const n = (s) => all.filter((c) => c.status === s).length;
    document.getElementById('kpis').innerHTML = `
      <div class="kpi"><div class="t"><i class="ti ti-building"></i> إجمالي العيادات</div><div class="v">${all.length}</div><div class="d">مسجّلة</div></div>
      <div class="kpi"><div class="t"><i class="ti ti-clock-exclamation"></i> بانتظار الاعتماد</div><div class="v" style="color:var(--warn)">${n('pending')}</div><div class="d warn">${n('pending') ? 'تحتاج مراجعة' : 'لا طلبات'}</div></div>
      <div class="kpi"><div class="t"><i class="ti ti-circle-check"></i> نشطة</div><div class="v" style="color:var(--ok)">${n('active')}</div><div class="d">تعمل الآن</div></div>
      <div class="kpi"><div class="t"><i class="ti ti-ban"></i> موقوفة</div><div class="v" style="color:var(--danger)">${n('suspended')}</div><div class="d">—</div></div>`;
    I18N.apply(document.getElementById('kpis'));
  },

  async act(id, action) {
    try {
      await SAPI.post(`/super/clinics/${id}/${action}`);
      toast(action === 'approve' ? 'تم اعتماد العيادة' : action === 'suspend' ? 'تم إيقاف العيادة' : 'تم تفعيل العيادة');
      Sup.load();
    } catch (ex) { toast(ex.message, 'err'); }
  },

  // ===== الإشعارات =====
  async loadNotifications() {
    try {
      const d = await SAPI.get('/super/notifications');
      const cEl = document.getElementById('notif-count');
      if (d.unread > 0) { cEl.textContent = d.unread > 99 ? '99+' : d.unread; cEl.hidden = false; } else cEl.hidden = true;
      const list = document.getElementById('notif-list');
      const items = d.notifications || [];
      list.innerHTML = items.length ? items.map((nf) => `
        <div class="notif-item ${nf.read_at ? '' : 'unread'}">
          <div class="notif-ic"><i class="ti ti-${esc(nf.icon || 'bell')}"></i></div>
          <div class="notif-body"><b>${esc(nf.title)}</b><small>${esc(nf.body || '')}</small><em>${supTimeAgo(nf.created_at)}</em></div>
        </div>`).join('') : '<div class="empty" style="padding:26px">لا إشعارات</div>';
      I18N.apply(list);
    } catch {}
  },

  setupNotifications() {
    const widget = document.getElementById('notif-widget');
    const bell = document.getElementById('notif-bell');
    const panel = document.getElementById('notif-panel');
    bell.onclick = (e) => { e.stopPropagation(); panel.classList.toggle('hidden'); };
    document.addEventListener('click', (e) => { if (!widget.contains(e.target)) panel.classList.add('hidden'); });
    document.getElementById('notif-readall').onclick = async () => {
      try { await SAPI.post('/super/notifications/read-all'); } catch {}
      Sup.loadNotifications();
    };
    Sup.loadNotifications();
    setInterval(() => Sup.loadNotifications(), 60000);
  },

  logout() {
    SAPI.post('/super/logout').catch(() => {});
    localStorage.removeItem(TOKEN_KEY);
    Sup.showLogin();
  },
};

function showLogin() { Sup.showLogin(); }

// ===== الباقات =====
const FEATURE_LABELS = {
  online_booking: 'حجز أونلاين', sms_reminders: 'تذكير SMS', inventory: 'المخزون',
  reports: 'التقارير', patient_portal: 'بوابة المريض', multi_branch: 'فروع متعددة',
};
let PLAN_FEATURES = Object.keys(FEATURE_LABELS);

Sup.loadPlans = async function () {
  const el = document.getElementById('plans-list');
  el.innerHTML = '<div class="empty"><span class="spin" style="border-color:var(--border);border-top-color:var(--teal)"></span></div>';
  let d;
  try { d = await SAPI.get('/super/plans'); } catch (ex) { el.innerHTML = `<div class="empty">تعذّر التحميل — ${esc(ex.message)}</div>`; return; }
  if (Array.isArray(d.features)) PLAN_FEATURES = d.features;
  const plans = d.plans || [];
  const lim = (n) => n == null ? 'غير محدود' : n;
  el.innerHTML = `<div class="grid3">${plans.map((p) => `
    <div class="card pad" style="display:flex;flex-direction:column;gap:10px">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <b style="font-size:16px">${esc(p.name)}</b>
        <span class="badge ${p.is_active ? 'b-ok' : 'b-mut'}">${p.is_active ? 'مفعّلة' : 'موقوفة'}</span>
      </div>
      <div style="font-size:24px;font-weight:700;color:var(--teal-dark)">${money(p.price_monthly)} <span style="font-size:12px;color:var(--muted);font-weight:400">ريال / شهرياً</span></div>
      <div style="display:flex;gap:8px">
        <div style="flex:1;background:var(--bg);border-radius:9px;padding:8px;text-align:center"><div style="font-size:11px;color:var(--muted)">الأطباء</div><b>${lim(p.max_doctors)}</b></div>
        <div style="flex:1;background:var(--bg);border-radius:9px;padding:8px;text-align:center"><div style="font-size:11px;color:var(--muted)">المستخدمون</div><b>${lim(p.max_users)}</b></div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:5px">${(p.features || []).map((f) => `<span class="badge b-teal" style="font-size:10.5px">${esc(FEATURE_LABELS[f] || f)}</span>`).join('') || '<span style="font-size:12px;color:var(--faint)">الميزات الأساسية فقط</span>'}</div>
      <div style="font-size:11.5px;color:var(--muted);border-top:1px dashed var(--border);padding-top:8px">${p.clinics_count ?? 0} عيادة على هذه الباقة · تجربة ${p.trial_days} يوم</div>
      <div style="display:flex;gap:7px">
        <button class="btn btn-ghost btn-sm" data-edit-plan="${p.id}"><i class="ti ti-edit"></i> تعديل</button>
        <button class="btn btn-ghost btn-sm" data-del-plan="${p.id}" ${p.clinics_count ? 'disabled title="مرتبطة بعيادات"' : ''}><i class="ti ti-trash"></i></button>
      </div>
    </div>`).join('')}</div>`;
  el.querySelectorAll('[data-edit-plan]').forEach((b) => b.onclick = () => PlanForm(plans.find((x) => x.id == b.dataset.editPlan)));
  el.querySelectorAll('[data-del-plan]').forEach((b) => b.onclick = async () => {
    if (!confirm('حذف هذه الباقة؟')) return;
    try { await SAPI.call('/super/plans/' + b.dataset.delPlan, { method: 'DELETE' }); toast('تم حذف الباقة'); Sup.loadPlans(); }
    catch (ex) { toast(ex.message, 'err'); }
  });
  I18N.apply(el);
};

function PlanForm(p = null) {
  const edit = !!p;
  const v = (k, d = '') => p?.[k] ?? d;
  const feats = new Set(p?.features || []);
  openModal({
    title: edit ? 'تعديل الباقة' : 'باقة جديدة',
    width: 520,
    body: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 12px">
        <div class="field"><label>اسم الباقة *</label><input id="p-name" value="${esc(v('name'))}" placeholder="فردية / عيادة …"></div>
        <div class="field"><label>المعرّف (slug) *</label><input id="p-slug" value="${esc(v('slug'))}" placeholder="solo" style="direction:ltr" ${edit ? 'readonly' : ''}></div>
        <div class="field"><label>حد الأطباء</label><input id="p-docs" type="number" value="${v('max_doctors', '')}" placeholder="فارغ = غير محدود"></div>
        <div class="field"><label>حد المستخدمين</label><input id="p-users" type="number" value="${v('max_users', '')}" placeholder="فارغ = غير محدود"></div>
        <div class="field"><label>السعر الشهري (ريال)</label><input id="p-price" type="number" value="${v('price_monthly', 0)}"></div>
        <div class="field"><label>أيام التجربة</label><input id="p-trial" type="number" value="${v('trial_days', 0)}"></div>
      </div>
      <div class="field"><label>الميزات المفعّلة</label>
        <div id="p-feats" style="display:flex;flex-wrap:wrap;gap:7px">${PLAN_FEATURES.map((f) => `<label class="chip ${feats.has(f) ? 'on' : ''}" style="cursor:pointer;display:flex;gap:5px;align-items:center"><input type="checkbox" value="${f}" ${feats.has(f) ? 'checked' : ''} style="width:auto"> ${esc(FEATURE_LABELS[f] || f)}</label>`).join('')}</div>
      </div>
      <label style="display:flex;align-items:center;gap:8px;font-size:13px;margin:0"><input type="checkbox" id="p-active" ${p?.is_active !== false ? 'checked' : ''} style="width:auto"> الباقة مفعّلة (متاحة للعيادات الجديدة)</label>`,
    footer: `<button class="btn btn-primary" id="p-save">${edit ? 'حفظ' : 'إنشاء الباقة'}</button><button class="btn btn-ghost" id="p-cancel">إلغاء</button>`,
    onOpen: (root, close) => {
      root.querySelectorAll('#p-feats label input').forEach((c) => c.onchange = () => c.closest('label').classList.toggle('on', c.checked));
      root.querySelector('#p-cancel').onclick = close;
      root.querySelector('#p-save').onclick = async (e) => {
        const num = (id) => { const x = root.querySelector(id).value.trim(); return x === '' ? null : Number(x); };
        const body = {
          name: root.querySelector('#p-name').value.trim(),
          slug: root.querySelector('#p-slug').value.trim(),
          max_doctors: num('#p-docs'), max_users: num('#p-users'),
          price_monthly: num('#p-price') ?? 0, trial_days: num('#p-trial') ?? 0,
          is_active: root.querySelector('#p-active').checked,
          features: [...root.querySelectorAll('#p-feats input:checked')].map((c) => c.value),
        };
        if (!body.name || !body.slug) { toast('الاسم والمعرّف مطلوبان', 'err'); return; }
        e.target.disabled = true;
        try {
          if (edit) await SAPI.patch('/super/plans/' + p.id, body);
          else await SAPI.post('/super/plans', body);
          close(); toast(edit ? 'تم حفظ الباقة' : 'تم إنشاء الباقة'); Sup.loadPlans();
        } catch (ex) { toast(ex.message, 'err'); e.target.disabled = false; }
      };
    },
  });
}

// ===== نموذج إنشاء/تعديل عيادة =====
async function ClinicForm(c = null) {
  const edit = !!c;
  const v = (k) => esc(c?.[k] || '');
  // جلب الباقات المفعّلة لقائمة الاختيار
  let plans = [];
  try { plans = (await SAPI.get('/super/plans')).plans.filter((p) => p.is_active); } catch {}
  const curPlan = c?.plan?.id;
  const planOpts = `<option value="">— بلا باقة —</option>` + plans.map((p) =>
    `<option value="${p.id}" ${p.id == curPlan ? 'selected' : ''}>${esc(p.name)} · ${p.max_doctors ?? '∞'} طبيب / ${p.max_users ?? '∞'} مستخدم · ${money(p.price_monthly)} ريال</option>`).join('');

  openModal({
    title: edit ? 'تعديل العيادة' : 'عيادة جديدة',
    width: 520,
    body: edit ? `
      <div class="field"><label>اسم العيادة</label><input id="c-name" value="${v('name')}"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 12px">
        <div class="field"><label>الهاتف</label><input id="c-phone" value="${v('phone')}"></div>
        <div class="field"><label>البريد</label><input id="c-email" value="${v('email')}"></div>
      </div>
      <div class="field"><label>العنوان</label><input id="c-address" value="${v('address')}"></div>
      <div class="field"><label>الباقة</label><select id="c-plan">${planOpts}</select></div>
      <div style="border-top:1px dashed var(--border);margin-top:4px;padding-top:12px">
        <div style="font-size:12.5px;font-weight:700;color:var(--teal-dark);margin-bottom:8px"><i class="ti ti-key"></i> دخول مدير العيادة</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 12px">
          <div class="field"><label>بريد الدخول</label><input id="c-admin-email" value="${v('admin_email')}" type="email" style="direction:ltr"></div>
          <div class="field"><label>كلمة مرور جديدة</label><input id="c-admin-pass" type="text" placeholder="اتركها فارغة لعدم التغيير"></div>
        </div>
        <div class="field" style="margin:0"><label>تخصص المدير الطبي (يجعله طبيباً في صفحة الحجز)</label><input id="c-admin-title" value="${v('admin_title')}" placeholder="مثال: طبيب أسنان — اتركه فارغاً إن لم يكن طبيباً"></div>
      </div>
    ` : `
      <div class="field"><label>اسم العيادة *</label><input id="c-name" placeholder="عيادة ..."></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 12px">
        <div class="field"><label>اسم المدير *</label><input id="c-admin"></div>
        <div class="field"><label>جوال المدير</label><input id="c-phone"></div>
        <div class="field"><label>بريد المدير *</label><input id="c-email" type="email"></div>
        <div class="field"><label>كلمة المرور *</label><input id="c-pass" type="text" placeholder="6 أحرف على الأقل"></div>
      </div>
      <div class="field"><label>تخصص المدير الطبي (اختياري)</label><input id="c-admin-title" placeholder="مثال: طبيب أسنان — يجعله طبيباً يظهر في صفحة الحجز"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 12px">
        <div class="field" style="margin:0"><label>الباقة *</label><select id="c-plan">${planOpts}</select></div>
        <div class="field" style="margin:0"><label>الحالة</label>
          <select id="c-status"><option value="active">نشطة (فعّالة فوراً)</option><option value="pending">بانتظار الاعتماد</option></select>
        </div>
      </div>`,
    footer: `<button class="btn btn-primary" id="c-save">${edit ? 'حفظ' : 'إنشاء العيادة'}</button><button class="btn btn-ghost" id="c-cancel">إلغاء</button>`,
    onOpen: (root, close) => {
      root.querySelector('#c-cancel').onclick = close;
      root.querySelector('#c-save').onclick = async (e) => {
        e.target.disabled = true;
        try {
          if (edit) {
            const body = {
              name: root.querySelector('#c-name').value, phone: root.querySelector('#c-phone').value || null,
              email: root.querySelector('#c-email').value || null, address: root.querySelector('#c-address').value || null,
              plan_id: root.querySelector('#c-plan').value || null,
            };
            const ae = root.querySelector('#c-admin-email')?.value.trim();
            const ap = root.querySelector('#c-admin-pass')?.value.trim();
            if (ae) body.admin_email = ae;
            if (ap) body.admin_password = ap;
            // المسمّى يُرسَل دائماً (حتى فارغاً لإزالته)
            body.admin_title = root.querySelector('#c-admin-title')?.value.trim() || '';
            await SAPI.patch('/super/clinics/' + c.id, body);
            toast(ap ? 'تم حفظ العيادة وتحديث كلمة المرور' : 'تم حفظ العيادة');
          } else {
            await SAPI.post('/super/clinics', {
              name: root.querySelector('#c-name').value, admin_name: root.querySelector('#c-admin').value,
              admin_email: root.querySelector('#c-email').value, admin_phone: root.querySelector('#c-phone').value || null,
              admin_password: root.querySelector('#c-pass').value, status: root.querySelector('#c-status').value,
              admin_title: root.querySelector('#c-admin-title')?.value.trim() || null,
              plan_id: root.querySelector('#c-plan').value || null,
            });
            toast('تم إنشاء العيادة');
          }
          close(); Sup.load();
        } catch (ex) { toast(ex.message, 'err'); e.target.disabled = false; }
      };
    },
  });
}

// ===== الدخول =====
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('su-login-btn');
  const err = document.getElementById('su-err');
  err.classList.add('hidden'); btn.disabled = true;
  try {
    const d = await SAPI.post('/super/login', {
      email: document.getElementById('su-email').value.trim(),
      password: document.getElementById('su-pass').value,
    });
    localStorage.setItem(TOKEN_KEY, d.token);
    Sup.boot();
  } catch (ex) {
    err.textContent = ex.message; err.classList.remove('hidden'); btn.disabled = false;
  }
});

Sup.boot();
