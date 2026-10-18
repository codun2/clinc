// عيادتي — الشِل والراوتر والمودال
if (!API.token()) location.replace('/');

// "منذ ..." بصيغة مختصرة
const timeAgo = (iso) => {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60) return 'الآن';
  const m = Math.floor(s / 60); if (m < 60) return `قبل ${m} د`;
  const h = Math.floor(m / 60); if (h < 24) return `قبل ${h} س`;
  const d = Math.floor(h / 24); if (d < 7) return `قبل ${d} ي`;
  return dateOf(iso);
};

const App = {
  me: null, clinic: null, badges: {},

  async boot() {
    try {
      const d = await API.get('/admin/me');
      App.me = d.user; App.clinic = d.clinic;
    } catch { return; }

    const u = App.me;
    document.getElementById('me-av').textContent = initials(u.name);
    document.getElementById('me-name').textContent = u.name;
    document.getElementById('me-role').textContent = u.title || (u.role === 'admin' ? 'مدير العيادة' : 'موظف');
    document.getElementById('brand-clinic').textContent = App.clinic?.name || 'عيادتي';

    // إخفاء الأقسام غير المسموح بها
    App.applyPerms();

    document.querySelectorAll('.nav-item[data-page]').forEach((n) =>
      n.addEventListener('click', () => App.go(n.dataset.page)));
    document.getElementById('logout').addEventListener('click', App.logout);

    App.loadBadges();
    App.setupNotifications();

    // تبديل اللغة
    const lt = document.getElementById('lang-toggle');
    if (lt) { lt.textContent = I18N.label(); lt.onclick = () => I18N.toggle(); }
    I18N.apply(document.body); // ترجمة الشِل (القائمة الجانبية) عند الإقلاع

    App.go(location.hash.replace('#', '') || 'dashboard');
  },

  applyPerms() {
    const u = App.me;
    const can = (k) => u.role === 'admin' || (u.permissions || []).includes(k);
    const show = { appointments: can('appointments'), patients: can('patients'), invoices: can('invoices'),
      inventory: can('inventory'), reports: can('invoices'), staff: can('staff'), settings: can('settings') };
    document.querySelectorAll('.nav-item[data-page]').forEach((n) => {
      const p = n.dataset.page;
      if (p !== 'dashboard' && show[p] === false) n.classList.add('hidden');
    });
  },

  async loadBadges() {
    try {
      App.badges = await API.get('/admin/badges');
      // عدّاد "المواعيد" = طلبات حجز جديدة بانتظار التأكيد + مَن في الانتظار الآن
      const n = (App.badges.pending || 0) + (App.badges.queue || 0);
      const nav = document.querySelector('.nav-item[data-page="appointments"]');
      nav?.querySelector('.count')?.remove();
      if (n > 0 && nav) { const s = document.createElement('span'); s.className = 'count'; s.textContent = n; nav.appendChild(s); }
    } catch {}
  },

  // ===== الإشعارات =====
  async loadNotifications() {
    try { App.renderNotifs(await API.get('/admin/notifications')); } catch {}
  },

  renderNotifs(d) {
    const cEl = document.getElementById('notif-count');
    if (cEl) {
      if (d.unread > 0) { cEl.textContent = d.unread > 99 ? '99+' : d.unread; cEl.hidden = false; }
      else cEl.hidden = true;
    }
    const list = document.getElementById('notif-list');
    if (!list) return;
    const items = d.notifications || [];
    list.innerHTML = items.length ? items.map((n) => `
      <div class="notif-item ${n.read_at ? '' : 'unread'}" data-id="${n.id}" data-link="${esc(n.link || '')}">
        <div class="notif-ic"><i class="ti ti-${esc(n.icon || 'bell')}"></i></div>
        <div class="notif-body"><b>${esc(n.title)}</b><small>${esc(n.body || '')}</small><em>${timeAgo(n.created_at)}</em></div>
      </div>`).join('') : '<div class="empty" style="padding:26px">لا إشعارات</div>';
    list.querySelectorAll('.notif-item').forEach((it) => it.onclick = async () => {
      const id = it.dataset.id, link = it.dataset.link;
      try { await API.patch('/admin/notifications/' + id + '/read'); } catch {}
      document.getElementById('notif-panel')?.classList.add('hidden');
      if (link && Pages[link]) App.go(link);
      App.loadNotifications();
    });
  },

  setupNotifications() {
    const widget = document.getElementById('notif-widget');
    const bell = document.getElementById('notif-bell');
    const panel = document.getElementById('notif-panel');
    if (!bell || !panel) return;
    bell.onclick = (e) => { e.stopPropagation(); panel.classList.toggle('hidden'); };
    document.addEventListener('click', (e) => { if (widget && !widget.contains(e.target)) panel.classList.add('hidden'); });
    document.getElementById('notif-readall').onclick = async () => {
      try { await API.post('/admin/notifications/read-all'); } catch {}
      App.loadNotifications();
    };
    App.loadNotifications();
    setInterval(() => App.loadNotifications(), 60000);
  },

  async go(page, arg) {
    if (!Pages[page]) page = 'dashboard';
    document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
    document.querySelectorAll('.nav-item[data-page]').forEach((n) => n.classList.toggle('active', n.dataset.page === page));
    const el = document.getElementById('page-' + page);
    el.classList.add('active');
    el.innerHTML = '<div class="empty"><span class="spin" style="border-color:var(--border);border-top-color:var(--teal)"></span></div>';
    if (['patient', 'consult'].indexOf(page) === -1) location.hash = page;
    window.scrollTo({ top: 0 });
    try { await Pages[page](el, arg); }
    catch (ex) { el.innerHTML = `<div class="empty">تعذّر التحميل — ${esc(ex.message)}</div>`; }
    I18N.apply(el); // ترجمة محتوى الصفحة عند اختيار الإنجليزية
    enhanceSelects(el); // قوائم منسدلة عصرية
  },

  logout() {
    API.post('/admin/logout').catch(() => {});
    localStorage.removeItem('clinic_token'); localStorage.removeItem('clinic_user');
    location.replace('/');
  },
};

// ===== قائمة منسدلة عصرية (تستبدل <select> الأصلية وتبقى مزامِنة معها) =====
function enhanceSelects(root) {
  (root || document).querySelectorAll('select:not([data-cs])').forEach((sel) => {
    sel.dataset.cs = '1';
    sel.style.display = 'none';
    const wrap = document.createElement('div'); wrap.className = 'cs';
    const trig = document.createElement('div'); trig.className = 'cs-trigger'; trig.tabIndex = 0;
    const menu = document.createElement('div'); menu.className = 'cs-menu hidden';
    wrap.appendChild(trig); wrap.appendChild(menu);
    sel.parentNode.insertBefore(wrap, sel.nextSibling);

    const paint = () => {
      const o = sel.options[sel.selectedIndex];
      const ph = !o || o.value === '';
      trig.innerHTML = `<span class="${ph ? 'cs-ph' : ''}">${esc(o ? o.textContent : '')}</span><i class="ti ti-chevron-down"></i>`;
    };
    const build = () => {
      menu.innerHTML = Array.from(sel.options).map((o, i) =>
        `<div class="cs-opt ${i === sel.selectedIndex ? 'sel' : ''}" data-i="${i}">${esc(o.textContent)}${i === sel.selectedIndex ? '<i class="ti ti-check"></i>' : ''}</div>`).join('');
      menu.querySelectorAll('.cs-opt').forEach((el) => el.onmousedown = (e) => {
        e.preventDefault();
        sel.selectedIndex = +el.dataset.i;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        close(); paint();
      });
    };
    const outside = (e) => { if (!wrap.contains(e.target)) close(); };
    const open = () => { build(); menu.classList.remove('hidden'); wrap.classList.add('open'); document.addEventListener('mousedown', outside); };
    const close = () => { menu.classList.add('hidden'); wrap.classList.remove('open'); document.removeEventListener('mousedown', outside); };
    trig.onclick = () => wrap.classList.contains('open') ? close() : open();
    trig.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); trig.click(); } };
    sel.addEventListener('change', paint); // يتزامن حين يغيّر الكود القيمة برمجياً
    paint();
  });
}

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
  I18N.apply(root); // ترجمة محتوى المودال عند اختيار الإنجليزية
  enhanceSelects(root); // قوائم منسدلة عصرية
  return close;
}

// حقل اقتراح (بحث مريض مثلاً)
function attachSuggest(input, fetcher, onPick, render) {
  let box;
  const hide = () => { box?.remove(); box = null; };
  input.addEventListener('input', async () => {
    const q = input.value.trim();
    if (q.length < 2) return hide();
    let items = [];
    try { items = await fetcher(q); } catch { return; }
    hide();
    if (!items.length) return;
    box = document.createElement('div'); box.className = 'sugg-list';
    box.innerHTML = items.map((it, i) => `<div class="sugg-item" data-i="${i}">${render(it)}</div>`).join('');
    input.parentElement.appendChild(box);
    box.querySelectorAll('.sugg-item').forEach((el) => el.onclick = () => { onPick(items[el.dataset.i]); hide(); });
  });
  input.addEventListener('blur', () => setTimeout(hide, 180));
}

App.boot();
