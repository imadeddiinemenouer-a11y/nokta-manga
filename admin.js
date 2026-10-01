/* ============================================================
   Alpha Comix — لوحة الإدارة المستقلة
   ============================================================ */

// ============ الإعداد ============
const C = window.NOKTA_CONFIG || {};
const hasConfig = C.supabaseUrl && C.supabasePublishableKey && !C.supabaseUrl.includes('YOUR_') && !C.supabasePublishableKey.includes('YOUR_');
const sb = hasConfig ? supabase.createClient(C.supabaseUrl, C.supabasePublishableKey) : null;
const adminApp = document.querySelector('#adminApp');

let session = null;
let profile = null;
let adminTab = 'overview';
let adminSearchQuery = '';
let adminChartInstance = null;
let cachedWorks = [];
let cachedChapters = [];

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const esc = s => String(s ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));

// ============ الأيقونات ============
const SVG_DEFS = `<defs>
<linearGradient id="icoGold" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#f0d78a"/><stop offset="50%" stop-color="#c9a961"/><stop offset="100%" stop-color="#8b6f2f"/></linearGradient>
<linearGradient id="icoGoldV" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#e0c88a"/><stop offset="100%" stop-color="#8b6f2f"/></linearGradient>
<linearGradient id="icoRed" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ff5a6b"/><stop offset="100%" stop-color="#b91c37"/></linearGradient>
<filter id="icoShadow"><feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#000" flood-opacity=".5"/></filter>
</defs>`;

const ICONS = {
  sun: `<svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">${SVG_DEFS}<g filter="url(#icoShadow)"><circle cx="12" cy="12" r="4.5" fill="url(#icoGold)" stroke="#8b6f2f" stroke-width="0.5"/><g stroke="url(#icoGoldV)" stroke-width="1.8" stroke-linecap="butt"><line x1="12" y1="1.5" x2="12" y2="4.5"/><line x1="12" y1="19.5" x2="12" y2="22.5"/><line x1="3.6" y1="3.6" x2="5.7" y2="5.7"/><line x1="18.3" y1="18.3" x2="20.4" y2="20.4"/><line x1="1.5" y1="12" x2="4.5" y2="12"/><line x1="19.5" y1="12" x2="22.5" y2="12"/><line x1="3.6" y1="20.4" x2="5.7" y2="18.3"/><line x1="18.3" y1="5.7" x2="20.4" y2="3.6"/></g></g></svg>`,
  moon: `<svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">${SVG_DEFS}<g filter="url(#icoShadow)"><path d="M20.5 15.5A9 9 0 1 1 10.5 3.5a7 7 0 0 0 10 12z" fill="url(#icoGold)" stroke="#8b6f2f" stroke-width="0.6"/></g></svg>`,
  bell: `<svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">${SVG_DEFS}<g filter="url(#icoShadow)"><path d="M6 17V10a6 6 0 0 1 12 0v7z" fill="url(#icoGold)" stroke="#8b6f2f" stroke-width="0.6"/><rect x="4" y="16.5" width="16" height="1.8" fill="url(#icoGoldV)"/><path d="M10.5 20.5a1.5 1.5 0 0 0 3 0z" fill="url(#icoGoldV)"/><circle cx="12" cy="4" r="1.3" fill="url(#icoRed)"/></g></svg>`,
  settings: `<svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">${SVG_DEFS}<g filter="url(#icoShadow)"><path d="M12 2l1.5 2.3 2.7-.3 1 2.5 2.5 1-.3 2.7L21.7 12l-2.3 1.5.3 2.7-2.5 1-1 2.5-2.7-.3L12 22l-1.5-2.3-2.7.3-1-2.5-2.5-1 .3-2.7L2.3 12l2.3-1.5-.3-2.7 2.5-1 1-2.5 2.7.3z" fill="url(#icoGold)" stroke="#8b6f2f" stroke-width="0.6"/><circle cx="12" cy="12" r="3.2" fill="#0f1117" stroke="url(#icoRed)" stroke-width="1"/></g></svg>`,
  user: `<svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">${SVG_DEFS}<g filter="url(#icoShadow)"><circle cx="12" cy="8" r="4.5" fill="url(#icoGold)" stroke="#8b6f2f" stroke-width="0.6"/><path d="M3 21c0-4.5 4-8 9-8s9 3.5 9 8z" fill="url(#icoGoldV)" stroke="#8b6f2f" stroke-width="0.6"/></g></svg>`,
  search: `<svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">${SVG_DEFS}<g filter="url(#icoShadow)"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="url(#icoGold)" stroke-width="2"/><line x1="15.5" y1="15.5" x2="21" y2="21" stroke="url(#icoRed)" stroke-width="2.5" stroke-linecap="butt"/></g></svg>`,
  book: `<svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">${SVG_DEFS}<g filter="url(#icoShadow)"><path d="M2 4v15c0 1 1 2 2 2h6V6H4c-1 0-2-1-2-2z" fill="url(#icoGold)" stroke="#8b6f2f" stroke-width="0.6"/><path d="M22 4v15c0 1-1 2-2 2h-6V6h6c1 0 2-1 2-2z" fill="url(#icoGoldV)" stroke="#8b6f2f" stroke-width="0.6"/><line x1="12" y1="4" x2="12" y2="21" stroke="#b91c37" stroke-width="0.8"/></g></svg>`,
  library: `<svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">${SVG_DEFS}<g filter="url(#icoShadow)"><rect x="3" y="3" width="4.5" height="18" fill="url(#icoGold)" stroke="#8b6f2f" stroke-width="0.5"/><rect x="9" y="3" width="4.5" height="18" fill="url(#icoGoldV)" stroke="#8b6f2f" stroke-width="0.5"/><path d="M16 4.5l4 1-2.5 15-4-1z" fill="url(#icoRed)" stroke="#8b6f2f" stroke-width="0.5"/></g></svg>`,
  shield: `<svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">${SVG_DEFS}<g filter="url(#icoShadow)"><path d="M12 2L3 6v6c0 5 4 9 9 10 5-1 9-5 9-10V6z" fill="url(#icoGold)" stroke="#8b6f2f" stroke-width="0.6"/><path d="M12 7v9M8 12h8" stroke="#b91c37" stroke-width="1"/></g></svg>`,
  handshake: `<svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">${SVG_DEFS}<g filter="url(#icoShadow)"><path d="M11 17l-4 4-6-6 5-5" fill="url(#icoGold)" stroke="#8b6f2f" stroke-width="0.6"/><path d="M13 7l4-4 6 6-5 5" fill="url(#icoGoldV)" stroke="#8b6f2f" stroke-width="0.6"/><path d="M9 15l3 3 3-3-3-3z" fill="url(#icoRed)"/></g></svg>`,
  fire: `<svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">${SVG_DEFS}<g filter="url(#icoShadow)"><path d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3 1-5-2 2-3 4-3 6a7 7 0 0 0 14 0c0-5-4-8-7-12z" fill="url(#icoRed)" stroke="#8b6f2f" stroke-width="0.5"/><path d="M12 10c.5 2 2 3 2 5a2 2 0 0 1-4 0c0-1 .5-1.5.5-2.5C9.5 13 9 14 9 15a3 3 0 0 0 6 0c0-2.5-2-4-3-5z" fill="url(#icoGold)"/></g></svg>`,
  lightning: `<svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">${SVG_DEFS}<g filter="url(#icoShadow)"><path d="M13 2L3 14h7l-1 8 10-12h-7z" fill="url(#icoGold)" stroke="#8b6f2f" stroke-width="0.6"/></g></svg>`,
  edit: `<svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">${SVG_DEFS}<g filter="url(#icoShadow)"><path d="M3 21l4-1L20 7l-3-3L4 17z" fill="url(#icoGold)" stroke="#8b6f2f" stroke-width="0.6"/><path d="M17 4l3 3-2 2-3-3z" fill="url(#icoRed)"/></g></svg>`,
  trash: `<svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">${SVG_DEFS}<g filter="url(#icoShadow)"><path d="M3 6h18M9 3h6l1 3H8z" fill="url(#icoGold)" stroke="#8b6f2f" stroke-width="0.5"/><path d="M5 6l1.5 15h11L19 6z" fill="url(#icoGoldV)" stroke="#8b6f2f" stroke-width="0.6"/><line x1="10" y1="10" x2="10" y2="18" stroke="#b91c37" stroke-width="1"/><line x1="14" y1="10" x2="14" y2="18" stroke="#b91c37" stroke-width="1"/></g></svg>`,
  plus: `<svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">${SVG_DEFS}<g filter="url(#icoShadow)"><line x1="12" y1="4" x2="12" y2="20" stroke="url(#icoGold)" stroke-width="3" stroke-linecap="butt"/><line x1="4" y1="12" x2="20" y2="12" stroke="url(#icoGold)" stroke-width="3" stroke-linecap="butt"/></g></svg>`,
  package: `<svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">${SVG_DEFS}<g filter="url(#icoShadow)"><path d="M12 2l10 5v10l-10 5-10-5V7z" fill="url(#icoGold)" stroke="#8b6f2f" stroke-width="0.6"/><path d="M2 7l10 5 10-5M12 12v10" fill="none" stroke="#8b6f2f" stroke-width="0.7"/></g></svg>`,
  dollar: `<svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">${SVG_DEFS}<g filter="url(#icoShadow)"><circle cx="12" cy="12" r="10" fill="url(#icoGold)" stroke="#8b6f2f" stroke-width="0.6"/><path d="M12 4v16M16 7h-6a2.5 2.5 0 0 0 0 5h4a2.5 2.5 0 0 1 0 5H8" fill="none" stroke="#0f1117" stroke-width="1.8"/></g></svg>`,
  folder: `<svg viewBox="0 0 24 24" width="48" height="48" xmlns="http://www.w3.org/2000/svg">${SVG_DEFS}<g filter="url(#icoShadow)"><path d="M2 4h7l3 3h10v13H2z" fill="url(#icoGold)" stroke="#8b6f2f" stroke-width="0.8"/><path d="M2 9h20" stroke="#8b6f2f" stroke-width="0.6"/></g></svg>`,
  alert: `<svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">${SVG_DEFS}<g filter="url(#icoShadow)"><path d="M12 2L1 22h22z" fill="url(#icoGold)" stroke="#8b6f2f" stroke-width="0.6"/><line x1="12" y1="9" x2="12" y2="15" stroke="#b91c37" stroke-width="2"/><circle cx="12" cy="18" r="1.2" fill="#b91c37"/></g></svg>`,
  palette: `<svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">${SVG_DEFS}<g filter="url(#icoShadow)"><path d="M12 2A10 10 0 0 0 2 12a10 10 0 0 0 10 10c1 0 1.8-.7 1.8-1.6 0-.4-.2-.8-.4-1.1-.2-.3-.4-.6-.4-1 0-.9.8-1.6 1.7-1.6H17A5 5 0 0 0 22 11c0-5-4.5-9-10-9z" fill="url(#icoGold)" stroke="#8b6f2f" stroke-width="0.6"/><circle cx="6.5" cy="12.5" r="1.3" fill="#b91c37"/><circle cx="9.5" cy="7.5" r="1.3" fill="#7c5cff"/><circle cx="15" cy="7.5" r="1.3" fill="#2ecc71"/><circle cx="18" cy="12.5" r="1.3" fill="#f5b942"/></g></svg>`
};

// ============ الأدوات ============
function toast(m) {
  const t = $('#toast'); if (!t) return;
  t.textContent = m; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}
function timeAgo(d) {
  if (!d) return '—';
  const df = (Date.now() - new Date(d).getTime()) / 1000;
  if (df < 60) return 'الآن';
  if (df < 3600) return `منذ ${Math.floor(df/60)} دقيقة`;
  if (df < 86400) return `منذ ${Math.floor(df/3600)} ساعة`;
  if (df < 2592000) return `منذ ${Math.floor(df/86400)} يوم`;
  return new Date(d).toLocaleDateString('ar');
}
function theme() {
  const l = localStorage.noktaTheme === 'light';
  if (l) document.documentElement.setAttribute('data-theme', 'light');
  else document.documentElement.removeAttribute('data-theme');
  const b = $('#themeBtn');
  if (b) b.innerHTML = l ? ICONS.moon : ICONS.sun;
}
function toggleTheme() {
  localStorage.noktaTheme = localStorage.noktaTheme === 'light' ? 'dark' : 'light';
  theme();
}
theme();

async function signOut() {
  if (!sb) return;
  await sb.auth.signOut();
  location.href = 'index.html';
}

// ============ البدء ============
async function initAdmin() {
  if (!sb) {
    adminApp.innerHTML = `<div class="panel"><h2>${ICONS.alert} إعداد Supabase مطلوب</h2></div>`;
    return;
  }

  const r = await sb.auth.getSession();
  session = r.data.session;

  if (!session) {
    adminApp.innerHTML = `
      <div class="panel" style="max-width:480px;margin:60px auto;text-align:center">
        <h2 style="color:var(--gold2);margin-bottom:16px">${ICONS.alert} غير مسجل</h2>
        <p style="color:var(--muted);margin-bottom:20px">يجب تسجيل الدخول أولاً للوصول إلى لوحة الإدارة</p>
        <a href="index.html#/auth" class="btn">← تسجيل الدخول</a>
      </div>`;
    return;
  }

  const { data: prof } = await sb.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
  profile = prof;

  if (profile?.role !== 'admin') {
    adminApp.innerHTML = `
      <div class="panel" style="max-width:480px;margin:60px auto;text-align:center">
        <h2 style="color:var(--red);margin-bottom:16px">${ICONS.alert} غير مصرح</h2>
        <p style="color:var(--muted);margin-bottom:20px">هذه الصفحة للمشرفين فقط</p>
        <a href="index.html" class="btn">← العودة للموقع</a>
      </div>`;
    return;
  }

  // مسجل الدخول كمشرف → اعرض اللوحة
  await renderDashboard();
}

// ============ عرض اللوحة ============
async function renderDashboard() {
  adminApp.innerHTML = '<div class="loading">جارٍ التحميل</div>';

  const [
    { count: usersCount }, { count: worksCount }, { count: chaptersCount },
    { count: joinsCount }, { count: paymentsCount },
    { data: works }, { data: chapters }, { data: payments }, { data: joins },
    { data: profiles }, { data: notifications }
  ] = await Promise.all([
    sb.from('profiles').select('*', { count: 'exact', head: true }),
    sb.from('works').select('*', { count: 'exact', head: true }),
    sb.from('chapters').select('*', { count: 'exact', head: true }),
    sb.from('join_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    sb.from('payment_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    sb.from('works').select('id,title,type,cover_url,status,created_at,updated_at').order('updated_at', { ascending: false }).limit(20),
    sb.from('chapters').select('id,number,title,work_id,is_locked,kind,created_at,works(title)').order('created_at', { ascending: false }).limit(50),
    sb.from('payment_requests').select('id,reference,status,created_at,point_packs(points,usdt_price),profiles(username)').eq('status', 'pending').order('created_at', { ascending: false }),
    sb.from('join_requests').select('id,name,contact,role,status,created_at').eq('status', 'pending').order('created_at', { ascending: false }),
    sb.from('profiles').select('id,username,role,points,created_at').order('created_at', { ascending: false }).limit(30),
    sb.from('notifications').select('id,message,created_at,type').order('created_at', { ascending: false }).limit(15)
  ]);

  cachedWorks = works || [];
  cachedChapters = chapters || [];

  const chartData = await getAdminChartData();

  const sidebarNav = `
    <div class="admin-sidebar">
      <div class="admin-sidebar-title">لوحة التحكم</div>
      <div class="admin-nav-item ${adminTab === 'overview' ? 'active' : ''}" onclick="switchAdminTab('overview')">${ICONS.settings} نظرة عامة</div>
      <div class="admin-nav-item ${adminTab === 'works' ? 'active' : ''}" onclick="switchAdminTab('works')">${ICONS.library} الأعمال <span class="badge-count">${worksCount || 0}</span></div>
      <div class="admin-nav-item ${adminTab === 'chapters' ? 'active' : ''}" onclick="switchAdminTab('chapters')">${ICONS.list} الفصول <span class="badge-count">${chaptersCount || 0}</span></div>
      <div class="admin-nav-item ${adminTab === 'users' ? 'active' : ''}" onclick="switchAdminTab('users')">${ICONS.user} المستخدمون <span class="badge-count">${usersCount || 0}</span></div>
      <div class="admin-nav-item ${adminTab === 'bulk' ? 'active' : ''}" onclick="switchAdminTab('bulk')">${ICONS.package} الرفع الجماعي</div>
      <div class="admin-nav-item ${adminTab === 'payments' ? 'active' : ''}" onclick="switchAdminTab('payments')">${ICONS.dollar} الدفعات ${paymentsCount > 0 ? `<span class="badge-count">${paymentsCount}</span>` : ''}</div>
      <div class="admin-nav-item ${adminTab === 'joins' ? 'active' : ''}" onclick="switchAdminTab('joins')">${ICONS.handshake} طلبات الانضمام ${joinsCount > 0 ? `<span class="badge-count">${joinsCount}</span>` : ''}</div>
      <div class="admin-nav-item ${adminTab === 'add-work' ? 'active' : ''}" onclick="switchAdminTab('add-work')">${ICONS.plus} إضافة عمل</div>
      <div class="admin-nav-item ${adminTab === 'add-chapter' ? 'active' : ''}" onclick="switchAdminTab('add-chapter')">${ICONS.plus} إضافة فصل</div>
    </div>`;

  const panels = {
    overview: buildOverviewPanel(worksCount, chaptersCount, usersCount, paymentsCount, chartData, notifications || [], cachedWorks),
    works: buildWorksPanel(cachedWorks),
    chapters: buildChaptersPanel(cachedChapters),
    users: buildUsersPanel(profiles || []),
    bulk: buildBulkPanel(cachedWorks),
    payments: buildPaymentsPanel(payments || []),
    joins: buildJoinsPanel(joins || []),
    'add-work': buildAddWorkPanel(),
    'add-chapter': buildAddChapterPanel(cachedWorks)
  };

  const activePanel = panels[adminTab] || panels.overview;

  adminApp.innerHTML = `<div class="admin-dashboard">${sidebarNav}<div class="admin-content">${activePanel}</div></div>`;

  setTimeout(() => {
    if (adminTab === 'overview') initAdminCharts(chartData);
    if (adminTab === 'bulk') initBulkUploader();
  }, 100);
}

function switchAdminTab(tab) {
  adminTab = tab;
  adminSearchQuery = '';
  renderDashboard();
}

// ============ الرسوم البيانية ============
async function getAdminChartData() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const isoDate = sevenDaysAgo.toISOString();

  const [ { data: newUsers }, { data: newChapters } ] = await Promise.all([
    sb.from('profiles').select('created_at').gte('created_at', isoDate),
    sb.from('chapters').select('created_at').gte('created_at', isoDate)
  ]);

  const labels = [], usersData = [], chaptersData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    labels.push(d.toLocaleDateString('ar', { weekday: 'short' }));
    const dayStr = d.toISOString().split('T')[0];
    usersData.push((newUsers || []).filter(u => u.created_at.startsWith(dayStr)).length);
    chaptersData.push((newChapters || []).filter(c => c.created_at.startsWith(dayStr)).length);
  }
  return { labels, usersData, chaptersData };
}

function initAdminCharts(chartData) {
  const canvas = document.getElementById('adminChartUsers');
  if (!canvas) return;
  if (adminChartInstance) adminChartInstance.destroy();
  adminChartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels: chartData.labels,
      datasets: [
        { label: 'فصول جديدة', data: chartData.chaptersData, borderColor: '#ef3f56', backgroundColor: 'rgba(239,63,86,.15)', borderWidth: 2.5, tension: 0.4, fill: true, pointBackgroundColor: '#ef3f56', pointBorderColor: '#fff', pointRadius: 4 },
        { label: 'مستخدمون جدد', data: chartData.usersData, borderColor: '#c9a961', backgroundColor: 'rgba(201,169,97,.15)', borderWidth: 2.5, tension: 0.4, fill: true, pointBackgroundColor: '#c9a961', pointBorderColor: '#fff', pointRadius: 4 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#a8a49a', font: { family: 'Cairo', size: 11, weight: '800' } } },
        tooltip: { backgroundColor: 'rgba(8,8,12,.95)', titleColor: '#e0c88a', bodyColor: '#ede9e0', borderColor: 'rgba(201,169,97,.3)', borderWidth: 1, padding: 12 }
      },
      scales: {
        x: { grid: { color: 'rgba(201,169,97,.08)' }, ticks: { color: '#6b6860', font: { family: 'Cairo', size: 10 } } },
        y: { grid: { color: 'rgba(201,169,97,.08)' }, ticks: { color: '#6b6860', font: { family: 'Cairo', size: 10 }, stepSize: 1 }, beginAtZero: true }
      }
    }
  });
}

// ============ البناء: اللوحات ============
function buildOverviewPanel(worksCount, chaptersCount, usersCount, paymentsCount, chartData, activityFeed, recentWorks) {
  return `
  <div class="admin-header"><h2>${ICONS.settings} نظرة عامة</h2></div>
  <div class="kpi-grid">
    <div class="kpi-card" onclick="switchAdminTab('works')"><div class="kpi-icon">${ICONS.library}</div><div class="kpi-label">إجمالي الأعمال</div><div class="kpi-value">${worksCount || 0}</div></div>
    <div class="kpi-card" onclick="switchAdminTab('chapters')"><div class="kpi-icon blue">${ICONS.list}</div><div class="kpi-label">إجمالي الفصول</div><div class="kpi-value">${chaptersCount || 0}</div></div>
    <div class="kpi-card" onclick="switchAdminTab('users')"><div class="kpi-icon green">${ICONS.user}</div><div class="kpi-label">المستخدمون</div><div class="kpi-value">${usersCount || 0}</div></div>
    <div class="kpi-card" onclick="switchAdminTab('payments')"><div class="kpi-icon red">${ICONS.dollar}</div><div class="kpi-label">دفعات معلقة</div><div class="kpi-value">${paymentsCount || 0}</div></div>
  </div>
  <div class="charts-grid">
    <div class="chart-card"><div class="chart-card-header"><div class="chart-card-title">${ICONS.lightning} النشاط الأسبوعي</div></div><div class="chart-container"><canvas id="adminChartUsers"></canvas></div></div>
    <div class="chart-card"><div class="chart-card-header"><div class="chart-card-title">${ICONS.fire} آخر النشاطات</div></div><div class="activity-list">${activityFeed.length ? activityFeed.slice(0, 6).map(a => `<div class="activity-item"><div class="activity-icon ${a.type === 'new_chapter' ? 'red' : 'green'}">${ICONS.bell}</div><div class="activity-content"><p>${esc(a.message || 'نشاط جديد')}</p><time>${timeAgo(a.created_at)}</time></div></div>`).join('') : '<div class="admin-empty"><p>لا توجد نشاطات بعد</p></div>'}</div></div>
  </div>
  <div class="admin-card"><div class="admin-card-title">${ICONS.fire} أحدث الأعمال<span class="count-badge">آخر 6</span></div><div class="admin-manga-list">${recentWorks.slice(0, 6).map(w => `<div class="admin-manga-card"><div class="cover-mini">${w.cover_url ? `<img src="${esc(w.cover_url)}" alt="">` : ICONS.book}</div><div class="info"><h4>${esc(w.title)}</h4><div class="meta-line"><span class="dot"></span> ${esc(w.type)} • ${esc(w.status || 'مستمرة')}</div><div class="actions"><button class="btn-edit-sm" onclick="editWork('${w.id}')">${ICONS.edit} تعديل</button></div></div></div>`).join('') || '<div class="admin-empty"><p>لا توجد أعمال</p></div>'}</div></div>`;
}

function buildWorksPanel(works) {
  const filtered = works.filter(w => !adminSearchQuery || w.title.toLowerCase().includes(adminSearchQuery.toLowerCase()));
  return `<div class="admin-header"><h2>${ICONS.library} إدارة الأعمال</h2><div class="admin-header-actions"><div class="admin-search">${ICONS.search}<input placeholder="ابحث..." value="${esc(adminSearchQuery)}" oninput="adminSearch(this.value)"></div><button class="btn sm" onclick="switchAdminTab('add-work')">${ICONS.plus} إضافة عمل</button></div></div>
  <div class="admin-card"><div class="admin-card-title">${ICONS.library} جميع الأعمال<span class="count-badge">${filtered.length}</span></div><div class="admin-manga-list">${filtered.length ? filtered.map(w => `<div class="admin-manga-card"><div class="cover-mini">${w.cover_url ? `<img src="${esc(w.cover_url)}" alt="">` : ICONS.book}</div><div class="info"><h4>${esc(w.title)}</h4><div class="meta-line"><span class="dot"></span> ${esc(w.type)} • ${esc(w.status || 'مستمرة')}</div><div class="actions"><button class="btn-edit-sm" onclick="editWork('${w.id}')">${ICONS.edit} تعديل</button><button class="btn-del-sm" onclick="deleteWork('${w.id}','${esc(w.title)}')">${ICONS.trash} حذف</button></div></div></div>`).join('') : '<div class="admin-empty"><p>لا توجد أعمال</p></div>'}</div></div>`;
}

function buildChaptersPanel(chapters) {
  const filtered = chapters.filter(c => !adminSearchQuery || (c.title || '').toLowerCase().includes(adminSearchQuery.toLowerCase()));
  return `<div class="admin-header"><h2>${ICONS.list} إدارة الفصول</h2><div class="admin-header-actions"><div class="admin-search">${ICONS.search}<input placeholder="ابحث..." value="${esc(adminSearchQuery)}" oninput="adminSearch(this.value)"></div><button class="btn sm" onclick="switchAdminTab('add-chapter')">${ICONS.plus} إضافة فصل</button></div></div>
  <div class="admin-card"><div class="admin-card-title">${ICONS.list} جميع الفصول<span class="count-badge">${filtered.length}</span></div><div class="admin-manga-list">${filtered.length ? filtered.map(c => `<div class="admin-manga-card"><div class="cover-mini">${c.kind === 'comic' ? ICONS.palette : ICONS.book}</div><div class="info"><h4>الفصل ${c.number}${c.title ? `: ${esc(c.title)}` : ''}</h4><div class="meta-line"><span class="dot"></span> ${esc(c.works?.title || '')} • ${c.is_locked ? 'مقفل' : 'مجاني'}</div><div class="actions"><button class="btn-edit-sm" onclick="editChapter('${c.id}')">${ICONS.edit} تعديل</button><button class="btn-del-sm" onclick="deleteChapter('${c.id}','الفصل ${c.number}')">${ICONS.trash} حذف</button></div></div></div>`).join('') : '<div class="admin-empty"><p>لا توجد فصول</p></div>'}</div></div>`;
}

function buildUsersPanel(profiles) {
  const filtered = profiles.filter(p => !adminSearchQuery || (p.username || '').toLowerCase().includes(adminSearchQuery.toLowerCase()));
  return `<div class="admin-header"><h2>${ICONS.user} المستخدمون</h2><div class="admin-header-actions"><div class="admin-search">${ICONS.search}<input placeholder="ابحث..." value="${esc(adminSearchQuery)}" oninput="adminSearch(this.value)"></div></div></div>
  <div class="admin-card"><div class="admin-card-title">${ICONS.user} قائمة المستخدمين<span class="count-badge">${filtered.length}</span></div><div style="overflow-x:auto"><table class="admin-table"><tr><th>المستخدم</th><th>الدور</th><th>النقاط</th><th>التسجيل</th></tr>${filtered.length ? filtered.map(u => `<tr><td><div class="user-avatar-cell"><div class="user-avatar-sm">${esc((u.username || '?')[0])}</div><span>${esc(u.username || 'مجهول')}</span></div></td><td><span class="role-badge ${u.role || 'user'}">${u.role === 'admin' ? 'مشرف' : u.role === 'team' ? 'فريق' : 'مستخدم'}</span></td><td><b style="color:var(--gold)">${u.points || 0}</b></td><td style="color:var(--muted);font-size:.72rem">${timeAgo(u.created_at)}</td></tr>`).join('') : '<tr><td colspan="4"><div class="admin-empty"><p>لا يوجد مستخدمون</p></div></td></tr>'}</table></div></div>`;
}

function buildBulkPanel(works) {
  return `<div class="admin-header"><h2>${ICONS.package} الرفع الجماعي للفصول</h2></div>
  <div class="admin-card">
    <div class="notice"><b>طريقة العمل:</b><br>1. نظّم الفصول في مجلد رئيسي، كل فصل في مجلد فرعي.<br>2. أسماء المجلدات يجب أن تحتوي على رقم الفصل.<br>3. اختر العمل ← ارفع المجلد الرئيسي.</div>
    <div class="field"><label>اختر العمل</label><select id="bulkWork">${works.map(w=>`<option value="${w.id}">${esc(w.title)}</option>`).join('')}</select></div>
    <div class="field"><label>الوضع الافتراضي</label><select id="bulkDefault"><option value="free">مجاني</option><option value="locked">مقفل</option></select></div>
    <div class="bulk-uploader" id="bulkUploader">${ICONS.folder}<h4>اختر مجلد الفصول</h4><p>اضغط هنا لاختيار المجلد الرئيسي</p><input type="file" id="bulkInput" webkitdirectory multiple accept="image/*" style="display:none"></div>
  </div>`;
}

function buildPaymentsPanel(payments) {
  return `<div class="admin-header"><h2>${ICONS.dollar} الدفعات المعلقة</h2></div>
  <div class="admin-card"><div class="admin-card-title">${ICONS.dollar} طلبات الدفع<span class="count-badge">${payments.length}</span></div>
  <div style="overflow-x:auto"><table class="admin-table"><tr><th>المرجع</th><th>المستخدم</th><th>المبلغ</th><th>TX Hash</th><th>إجراء</th></tr>${payments.length ? payments.map(p => `<tr><td>${esc(p.reference)}</td><td>${esc(p.profiles?.username || '')}</td><td><b style="color:var(--gold)">${p.point_packs?.usdt_price} USDT</b></td><td><input id="tx-${p.id}" placeholder="TX Hash" style="background:var(--card2);border:1px solid var(--border-gold);color:var(--txt);padding:6px;border-radius:2px;width:140px;font-size:.75rem"></td><td><button class="btn sm" onclick="reviewPay('${p.id}','paid')">تأكيد</button><button class="btn sm danger" onclick="reviewPay('${p.id}','rejected')">رفض</button></td></tr>`).join('') : '<tr><td colspan="5"><div class="admin-empty"><p>لا توجد دفعات معلقة</p></div></td></tr>'}</table></div></div>`;
}

function buildJoinsPanel(joins) {
  return `<div class="admin-header"><h2>${ICONS.handshake} طلبات الانضمام</h2></div>
  <div class="admin-card"><div class="admin-card-title">${ICONS.handshake} طلبات جديدة<span class="count-badge">${joins.length}</span></div>
  <div style="overflow-x:auto"><table class="admin-table"><tr><th>الاسم</th><th>الدور</th><th>التواصل</th><th>إجراء</th></tr>${joins.length ? joins.map(j => `<tr><td><b>${esc(j.name)}</b></td><td><span class="role-badge team">${esc(j.role)}</span></td><td>${esc(j.contact)}</td><td><button class="btn sm" onclick="reviewJoin('${j.id}','approved')">قبول</button><button class="btn sm danger" onclick="reviewJoin('${j.id}','rejected')">رفض</button></td></tr>`).join('') : '<tr><td colspan="4"><div class="admin-empty"><p>لا توجد طلبات</p></div></td></tr>'}</table></div></div>`;
}

function buildAddWorkPanel() {
  return `<div class="admin-header"><h2>${ICONS.plus} إضافة عمل جديد</h2></div>
  <div class="admin-card">
    <div class="admin-card-title">${ICONS.library} تفاصيل العمل</div>
    <div class="field"><label>العنوان</label><input id="awTitle"></div>
    <div class="field"><label>النوع</label><select id="awType"><option>مانهوا</option><option>مانجا</option><option>مانها</option><option>رواية</option><option>كوميكس</option></select></div>
    <div class="field"><label>القسم</label><select id="awKind"><option value="comic">كوميكس</option><option value="novel">رواية</option></select></div>
    <div class="field"><label>العمر</label><select id="awAge"><option>13+</option><option>16+</option><option>18+</option></select></div>
    <div class="field"><label>الحالة</label><select id="awStatus"><option>مستمرة</option><option>متوقفة</option><option>منتهية</option></select></div>
    <div class="field"><label>الأنواع (بفاصلة)</label><input id="awGenres" placeholder="أكشن, فانتازيا"></div>
    <div class="field"><label>رابط صورة الغلاف</label><input id="awCover" placeholder="https://..."></div>
    <div class="field"><label>الكاتب</label><input id="awAuthor"></div>
    <div class="field"><label>الملخص</label><textarea id="awSyn"></textarea></div>
    <button class="btn" onclick="adminAddWork()">${ICONS.plus} حفظ العمل</button>
  </div>`;
}

function buildAddChapterPanel(works) {
  return `<div class="admin-header"><h2>${ICONS.plus} إضافة فصل جديد</h2></div>
  <div class="admin-card">
    <div class="admin-card-title">${ICONS.list} تفاصيل الفصل</div>
    <div class="field"><label>العمل</label><select id="acWork">${works.map(w=>`<option value="${w.id}">${esc(w.title)}</option>`).join('')}</select></div>
    <div class="field"><label>رقم الفصل</label><input id="acNum" type="number"></div>
    <div class="field"><label>العنوان</label><input id="acTitle"></div>
    <div class="field"><label>النوع</label><select id="acKind"><option value="novel">رواية</option><option value="comic">كوميكس</option></select></div>
    <div class="field"><label>مقفل؟</label><select id="acLock"><option value="false">لا</option><option value="true">نعم</option></select></div>
    <div class="field"><label>النص (للروايات)</label><textarea id="acContent"></textarea></div>
    <div class="field"><label>صور (للكوميكس)</label><input id="acFiles" type="file" accept="image/*" multiple></div>
    <button class="btn" onclick="adminAddChapter()">${ICONS.plus} حفظ الفصل</button>
  </div>`;
}

function adminSearch(query) {
  adminSearchQuery = query;
  const cur = document.activeElement;
  const pos = cur?.selectionStart || 0;
  renderDashboard();
  setTimeout(() => {
    const inp = document.querySelector('.admin-search input');
    if (inp) { inp.focus(); inp.setSelectionRange(pos, pos); }
  }, 50);
}

// ============ العمليات ============
async function adminAddWork() {
  const p = {
    title: $('#awTitle').value.trim(), type: $('#awType').value, kind: $('#awKind').value,
    age_rating: $('#awAge').value, status: $('#awStatus').value,
    genres: $('#awGenres').value.split(',').map(x=>x.trim()).filter(Boolean),
    synopsis: $('#awSyn').value.trim(),
    cover_url: $('#awCover').value.trim() || null,
    author: $('#awAuthor').value.trim() || null,
    published: true, owner_id: session.user.id
  };
  if (!p.title) return toast('أدخل العنوان');
  const { error } = await sb.from('works').insert(p);
  toast(error ? error.message : 'تم الحفظ');
  if (!error) { adminTab = 'works'; renderDashboard(); }
}

async function editWork(id) {
  const { data: w } = await sb.from('works').select('*').eq('id', id).maybeSingle();
  if (!w) return toast('العمل غير موجود');
  const modal = document.getElementById('modalOverlay');
  const content = document.getElementById('modalContent');
  content.innerHTML = `<h3>${ICONS.edit} تعديل: ${esc(w.title)}</h3>
    <div class="field"><label>العنوان</label><input id="ewTitle" value="${esc(w.title)}"></div>
    <div class="field"><label>النوع</label><select id="ewType">${['مانهوا','مانجا','مانها','رواية','كوميكس'].map(t=>`<option ${w.type===t?'selected':''}>${t}</option>`).join('')}</select></div>
    <div class="field"><label>القسم</label><select id="ewKind"><option value="comic" ${w.kind==='comic'?'selected':''}>كوميكس</option><option value="novel" ${w.kind==='novel'?'selected':''}>رواية</option></select></div>
    <div class="field"><label>العمر</label><select id="ewAge">${['13+','16+','18+'].map(a=>`<option ${w.age_rating===a?'selected':''}>${a}</option>`).join('')}</select></div>
    <div class="field"><label>الحالة</label><select id="ewStatus">${['مستمرة','متوقفة','منتهية'].map(s=>`<option ${w.status===s?'selected':''}>${s}</option>`).join('')}</select></div>
    <div class="field"><label>الأنواع</label><input id="ewGenres" value="${esc((w.genres||[]).join(', '))}"></div>
    <div class="field"><label>رابط الغلاف</label><input id="ewCover" value="${esc(w.cover_url||'')}"></div>
    <div class="field"><label>الكاتب</label><input id="ewAuthor" value="${esc(w.author||'')}"></div>
    <div class="field"><label>الملخص</label><textarea id="ewSyn">${esc(w.synopsis||'')}</textarea></div>
    <div class="modal-actions"><button class="cancel" onclick="closeModal()">إلغاء</button><button class="save" onclick="saveWork('${id}')">حفظ</button></div>`;
  modal.classList.add('show');
}
async function saveWork(id) {
  const p = {
    title: $('#ewTitle').value.trim(), type: $('#ewType').value, kind: $('#ewKind').value,
    age_rating: $('#ewAge').value, status: $('#ewStatus').value,
    genres: $('#ewGenres').value.split(',').map(x=>x.trim()).filter(Boolean),
    cover_url: $('#ewCover').value.trim() || null,
    author: $('#ewAuthor').value.trim() || null,
    synopsis: $('#ewSyn').value.trim()
  };
  const { error } = await sb.from('works').update(p).eq('id', id);
  if (error) return toast(error.message);
  toast('تم التعديل'); closeModal(); renderDashboard();
}
async function deleteWork(id, title) {
  if (!confirm(`حذف "${title}"؟`)) return;
  const { error } = await sb.from('works').delete().eq('id', id);
  if (error) return toast(error.message);
  toast('تم الحذف'); renderDashboard();
}
async function adminAddChapter() {
  const work_id = $('#acWork').value, number = Number($('#acNum').value),
    title = $('#acTitle').value.trim(), kind = $('#acKind').value,
    is_locked = $('#acLock').value === 'true', content = $('#acContent').value;
  const { data: ch, error } = await sb.from('chapters').insert({ work_id, number, title, kind, is_locked, content, published: true }).select().single();
  if (error) return toast(error.message);
  const files = [...($('#acFiles').files||[])], paths = [];
  for (let i=0;i<files.length;i++) {
    const f = files[i];
    const path = `${ch.id}/${String(i+1).padStart(3,'0')}-${f.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
    const r = await sb.storage.from('chapters').upload(path, f, { upsert: true });
    if (r.error) return toast(r.error.message);
    paths.push(path);
  }
  if (paths.length) await sb.from('chapters').update({ pages: paths, kind: 'comic' }).eq('id', ch.id);
  await notifyFollowers(work_id, ch.id, number);
  toast('تم الحفظ'); renderDashboard();
}
async function notifyFollowers(workId, chapterId, number) {
  const { data: favs } = await sb.from('favorites').select('user_id').eq('work_id', workId);
  if (!favs || !favs.length) return;
  const { data: w } = await sb.from('works').select('title').eq('id', workId).maybeSingle();
  const notifs = favs.map(f => ({ user_id: f.user_id, work_id: workId, chapter_id: chapterId, type: 'new_chapter', message: `فصل جديد (${number}) من "${w?.title||''}"` }));
  await sb.from('notifications').insert(notifs);
}
async function editChapter(id) {
  const { data: c } = await sb.from('chapters').select('*').eq('id', id).maybeSingle();
  if (!c) return toast('الفصل غير موجود');
  const modal = document.getElementById('modalOverlay');
  const content = document.getElementById('modalContent');
  content.innerHTML = `<h3>${ICONS.edit} تعديل الفصل ${c.number}</h3>
    <div class="field"><label>رقم الفصل</label><input id="ecNum" type="number" value="${c.number}"></div>
    <div class="field"><label>العنوان</label><input id="ecTitle" value="${esc(c.title||'')}"></div>
    <div class="field"><label>النوع</label><select id="ecKind"><option value="novel" ${c.kind==='novel'?'selected':''}>رواية</option><option value="comic" ${c.kind==='comic'?'selected':''}>كوميكس</option></select></div>
    <div class="field"><label>مقفل؟</label><select id="ecLock"><option value="false" ${!c.is_locked?'selected':''}>لا</option><option value="true" ${c.is_locked?'selected':''}>نعم</option></select></div>
    <div class="field"><label>النص</label><textarea id="ecContent">${esc(c.content||'')}</textarea></div>
    <div class="modal-actions"><button class="cancel" onclick="closeModal()">إلغاء</button><button class="save" onclick="saveChapter('${id}')">حفظ</button></div>`;
  modal.classList.add('show');
}
async function saveChapter(id) {
  const p = { number: Number($('#ecNum').value), title: $('#ecTitle').value.trim(), kind: $('#ecKind').value, is_locked: $('#ecLock').value === 'true', content: $('#ecContent').value };
  const { error } = await sb.from('chapters').update(p).eq('id', id);
  if (error) return toast(error.message);
  toast('تم التعديل'); closeModal(); renderDashboard();
}
async function deleteChapter(id, label) {
  if (!confirm(`حذف ${label}؟`)) return;
  const { error } = await sb.from('chapters').delete().eq('id', id);
  if (error) return toast(error.message);
  toast('تم الحذف'); renderDashboard();
}
function closeModal() { const m = document.getElementById('modalOverlay'); if (m) m.classList.remove('show'); }
async function reviewPay(id, status) {
  const tx = $(`#tx-${id}`)?.value.trim() || null;
  const { error } = await sb.rpc('admin_review_payment', { p_id: id, p_status: status, p_note: tx ? `TX: ${tx}` : null });
  toast(error ? error.message : 'تم'); if (!error) renderDashboard();
}
async function reviewJoin(id, status) {
  const { error } = await sb.from('join_requests').update({ status }).eq('id', id);
  toast(error ? error.message : 'تم'); if (!error) renderDashboard();
}

// ============ الرفع الجماعي ============
function initBulkUploader() {
  const input = document.getElementById('bulkInput');
  const uploader = document.getElementById('bulkUploader');
  if (!input || !uploader) return;
  input.addEventListener('click', (e) => { e.stopPropagation(); });
  uploader.addEventListener('click', (e) => {
    if (e.target !== input) { e.preventDefault(); e.stopPropagation(); input.click(); }
  });
  input.addEventListener('change', (e) => {
    const files = [...e.target.files];
    if (files.length) startBulkUpload(files);
    e.target.value = '';
  });
  uploader.addEventListener('dragover', e => { e.preventDefault(); uploader.classList.add('dragover'); });
  uploader.addEventListener('dragleave', () => uploader.classList.remove('dragover'));
  uploader.addEventListener('drop', e => {
    e.preventDefault(); uploader.classList.remove('dragover');
    const files = [...e.dataTransfer.files];
    if (files.length) startBulkUpload(files);
  });
}

async function startBulkUpload(files) {
  const bulkSelect = document.getElementById('bulkWork');
  const workId = bulkSelect?.value;
  const defaultLock = document.getElementById('bulkDefault')?.value === 'locked';
  if (!workId) return toast('اختر العمل أولاً');
  const workTitle = bulkSelect?.options[bulkSelect.selectedIndex]?.text || 'غير معروف';

  const floating = document.getElementById('bulkFloating');
  if (floating) { floating.classList.add('show'); floating.classList.remove('minimized'); }
  const fill = document.getElementById('bulkFloatingFill');
  const text = document.getElementById('bulkFloatingText');
  const log = document.getElementById('bulkFloatingLog');
  if (log) log.innerHTML = '';

  const logMsg = (msg, cls = 'info') => {
    if (!log) return;
    const line = document.createElement('div');
    line.className = cls; line.textContent = msg;
    log.appendChild(line); log.scrollTop = log.scrollHeight;
  };
  logMsg(`بدء الرفع إلى "${workTitle}" — ${files.length} ملف`, 'info');

  const chaptersMap = new Map();
  files.forEach(f => {
    const path = f.webkitRelativePath || f.name;
    const parts = path.split('/').filter(Boolean);
    let chapFolder = null;
    if (parts.length >= 3) chapFolder = parts[1];
    else if (parts.length === 2) chapFolder = parts[0];
    else return;
    if (!chaptersMap.has(chapFolder)) chaptersMap.set(chapFolder, []);
    chaptersMap.get(chapFolder).push(f);
  });

  if (!chaptersMap.size) {
    logMsg('لم أجد مجلدات فصول.', 'err');
    if (text) text.textContent = 'فشل: لا توجد مجلدات';
    return;
  }

  const chapters = [...chaptersMap.entries()].map(([folder, files]) => {
    const numMatch = folder.match(/\d+/);
    const number = numMatch ? parseInt(numMatch[0]) : 0;
    files.sort((a, b) => {
      const an = a.name.match(/\d+/g)?.join('') || a.name;
      const bn = b.name.match(/\d+/g)?.join('') || b.name;
      return String(an).localeCompare(String(bn), undefined, { numeric: true });
    });
    return { folder, number, title: folder, files };
  }).sort((a, b) => a.number - b.number);

  logMsg(`تم التعرف على ${chapters.length} فصل`, 'ok');

  let done = 0;
  const total = chapters.length;
  let successCount = 0, errorCount = 0;

  for (const chap of chapters) {
    try {
      logMsg(`⏳ الفصل ${chap.number} (${chap.files.length} صورة)…`, 'info');
      const { data: ch, error: chErr } = await sb.from('chapters').insert({
        work_id: workId, number: chap.number, title: chap.title,
        kind: 'comic', is_locked: defaultLock, published: true
      }).select().single();
      if (chErr) throw new Error(chErr.message);
      const paths = [];
      for (let i = 0; i < chap.files.length; i++) {
        const f = chap.files[i];
        const ext = f.name.split('.').pop() || 'jpg';
        const path = `${ch.id}/${String(i + 1).padStart(3, '0')}.${ext}`;
        const r = await sb.storage.from('chapters').upload(path, f, { upsert: true });
        if (r.error) throw new Error(r.error.message);
        paths.push(path);
      }
      await sb.from('chapters').update({ pages: paths }).eq('id', ch.id);
      successCount++;
      logMsg(`✅ الفصل ${chap.number} — تم`, 'ok');
    } catch (err) {
      errorCount++;
      logMsg(`❌ الفصل ${chap.number}: ${err.message}`, 'err');
    }
    done++;
    const pct = Math.round((done / total) * 100);
    if (fill) fill.style.width = pct + '%';
    if (text) text.textContent = `${done}/${total} (${pct}%) — نجح ${successCount} | فشل ${errorCount}`;
  }

  logMsg(`🎉 انتهى — نجح ${successCount} من ${total}`, 'ok');
  if (text) text.textContent = `انتهى — نجح ${successCount} من ${total}`;
  toast(`تم رفع ${successCount} فصل`);
  setTimeout(() => {
    const f = document.getElementById('bulkFloating');
    if (f) f.classList.add('minimized');
  }, 5000);
}

function closeBulkFloating() {
  const f = document.getElementById('bulkFloating');
  if (f) { f.classList.remove('show'); f.classList.remove('minimized'); }
}

// ============ البدء ============
initAdmin();