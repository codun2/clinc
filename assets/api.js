// عيادتي — طبقة الاتصال بالـ API (same-origin عبر nginx)
const API = {
  token: () => localStorage.getItem('clinic_token'),
  user: () => { try { return JSON.parse(localStorage.getItem('clinic_user') || 'null'); } catch { return null; } },

  async call(path, opts = {}) {
    const headers = { 'Accept': 'application/json', ...(opts.headers || {}) };
    if (opts.body && !(opts.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(opts.body);
    }
    const t = API.token();
    if (t) headers['Authorization'] = 'Bearer ' + t;

    const res = await fetch('/api' + path, { ...opts, headers });
    if (res.status === 401) { localStorage.removeItem('clinic_token'); location.href = '/'; throw new Error('unauthenticated'); }

    let data = null;
    try { data = await res.json(); } catch {}
    if (!res.ok) {
      const msg = data?.errors ? Object.values(data.errors).flat().join(' — ') : (data?.message || 'حدث خطأ غير متوقع');
      const err = new Error(msg); err.status = res.status; err.data = data; throw err;
    }
    return data;
  },

  get: (p) => API.call(p),
  post: (p, body) => API.call(p, { method: 'POST', body }),
  patch: (p, body) => API.call(p, { method: 'PATCH', body }),
  del: (p) => API.call(p, { method: 'DELETE' }),
};

// ===== أدوات عرض مشتركة =====
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => Number(n || 0).toLocaleString('ar-EG-u-nu-latn', { maximumFractionDigits: 0 });
const timeOf = (iso) => iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—';
const dateOf = (iso) => iso ? new Date(iso).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
const ageOf = (b) => b ? Math.floor((Date.now() - new Date(b)) / 31557600000) + ' سنة' : '—';
const initials = (name) => { const p = String(name || '').replace('د. ', '').trim().split(/\s+/); return (p[0]?.[0] || '') + (p[1] ? '.' + p[1][0] : ''); };

const APPT_STATUS = {
  scheduled:   { label: 'مجدول',     cls: 'b-mut'  },
  confirmed:   { label: 'مؤكد',      cls: 'b-info' },
  arrived:     { label: 'بالانتظار', cls: 'b-warn' },
  in_progress: { label: 'قيد الكشف', cls: 'b-warn' },
  completed:   { label: 'مكتمل',     cls: 'b-ok'   },
  no_show:     { label: 'لم يحضر',   cls: 'b-dgr'  },
  cancelled:   { label: 'ملغي',      cls: 'b-mut'  },
};
const INV_STATUS = {
  pending:   { label: 'معلّقة',  cls: 'b-dgr' },
  paid:      { label: 'مدفوعة', cls: 'b-ok'  },
  cancelled: { label: 'ملغاة',  cls: 'b-mut' },
};
const PAY_METHOD = { cash: 'نقدي', card: 'شبكة (مدى)', transfer: 'تحويل بنكي' };

function toast(msg, type = '') {
  let box = document.querySelector('.toasts');
  if (!box) { box = document.createElement('div'); box.className = 'toasts'; document.body.appendChild(box); }
  const t = document.createElement('div');
  t.className = 'toast ' + type; t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => t.remove(), type === 'warn' ? 6000 : 3500);
}
