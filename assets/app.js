// عيادتي — الشِل والراوتر والمودال
if (!API.token()) location.replace('/');

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
    App.go(location.hash.replace('#', '') || 'dashboard');
  },

  applyPerms() {
    const u = App.me;
    const can = (k) => u.role === 'admin' || (u.permissions || []).includes(k);
    const show = { appointments: can('appointments'), patients: can('patients'), invoices: can('invoices'),
      reports: can('invoices'), staff: can('staff'), settings: can('settings') };
    document.querySelectorAll('.nav-item[data-page]').forEach((n) => {
      const p = n.dataset.page;
      if (p !== 'dashboard' && show[p] === false) n.classList.add('hidden');
    });
  },

  async loadBadges() {
    try {
      App.badges = await API.get('/admin/badges');
      const q = App.badges.queue;
      const nav = document.querySelector('.nav-item[data-page="appointments"]');
      nav?.querySelector('.count')?.remove();
      if (q > 0 && nav) { const s = document.createElement('span'); s.className = 'count'; s.textContent = q; nav.appendChild(s); }
    } catch {}
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
  },

  logout() {
    API.post('/admin/logout').catch(() => {});
    localStorage.removeItem('clinic_token'); localStorage.removeItem('clinic_user');
    location.replace('/');
  },
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
