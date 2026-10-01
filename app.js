/* ============================================================
   ALPHA COMIX — التطبيق الرئيسي
   (لوحة الإدارة في admin.html مستقلة)
   ============================================================ */

// ============ 1. الإعداد ============
const C = window.NOKTA_CONFIG || {};
const hasConfig = C.supabaseUrl && C.supabasePublishableKey && !C.supabaseUrl.includes('YOUR_') && !C.supabasePublishableKey.includes('YOUR_');
const sb = hasConfig ? supabase.createClient(C.supabaseUrl, C.supabasePublishableKey) : null;
const app = document.querySelector('#app');

let session = null;
let profile = null;
let browseWorks = [];
let libraryTab = 'favorites';
let browseSort = 'new';
let fState = { types: [], genres: [], ages: [], status: [] };
let readerTrackingCleanup = null;
let readerSettings = { reading_mode: 'webtoon', font_size: 18, line_height: 2.2, bg_color: 'default', brightness: 100, reading_direction: 'rtl' };

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const esc = s => String(s ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));

const STATIC_TYPES = ['مانهوا', 'مانجا', 'مانها', 'رواية', 'كوميكس'];
const STATIC_AGES = ['13+', '16+', '18+'];
const STATIC_STATUS = ['مستمرة', 'متوقفة', 'منتهية'];
const STATIC_GENRES = ['أكشن','فانتازيا','رومانسية','غموض','نظام','دراما','مغامرة','مدرسي','شونين','قوى خاصة','ناجٍ','مصاصين','سحر','مملكة','تاريخي','ارتقاء','رياضة','خيال','حياة يومية','جوسي','فنون قتالية','سينين','شوجو','إيسيكاي','ميكا','رعب','نفسي','عسكري','موسيقي'];

// ============ 2. الأيقونات ============
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
  crown: `<svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">${SVG_DEFS}<g filter="url(#icoShadow)"><path d="M2 18L4 8l4 3 4-7 4 7 4-3 2 10z" fill="url(#icoGold)" stroke="#8b6f2f" stroke-width="0.6"/><rect x="2" y="18" width="20" height="3" fill="url(#icoGoldV)" stroke="#8b6f2f" stroke-width="0.5"/><circle cx="4" cy="8" r="1.2" fill="url(#icoRed)"/><circle cx="12" cy="4" r="1.2" fill="url(#icoRed)"/><circle cx="20" cy="8" r="1.2" fill="url(#icoRed)"/></g></svg>`,
  handshake: `<svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">${SVG_DEFS}<g filter="url(#icoShadow)"><path d="M11 17l-4 4-6-6 5-5" fill="url(#icoGold)" stroke="#8b6f2f" stroke-width="0.6"/><path d="M13 7l4-4 6 6-5 5" fill="url(#icoGoldV)" stroke="#8b6f2f" stroke-width="0.6"/><path d="M9 15l3 3 3-3-3-3z" fill="url(#icoRed)"/></g></svg>`,
  fire: `<svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">${SVG_DEFS}<g filter="url(#icoShadow)"><path d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3 1-5-2 2-3 4-3 6a7 7 0 0 0 14 0c0-5-4-8-7-12z" fill="url(#icoRed)" stroke="#8b6f2f" stroke-width="0.5"/><path d="M12 10c.5 2 2 3 2 5a2 2 0 0 1-4 0c0-1 .5-1.5.5-2.5C9.5 13 9 14 9 15a3 3 0 0 0 6 0c0-2.5-2-4-3-5z" fill="url(#icoGold)"/></g></svg>`,
  lightning: `<svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">${SVG_DEFS}<g filter="url(#icoShadow)"><path d="M13 2L3 14h7l-1 8 10-12h-7z" fill="url(#icoGold)" stroke="#8b6f2f" stroke-width="0.6"/></g></svg>`,
  heart: `<svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">${SVG_DEFS}<g filter="url(#icoShadow)"><path d="M12 21L3 12l4-7 5 5 5-5 4 7z" fill="none" stroke="url(#icoGold)" stroke-width="2"/></g></svg>`,
  heartFilled: `<svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">${SVG_DEFS}<g filter="url(#icoShadow)"><path d="M12 21L3 12l4-7 5 5 5-5 4 7z" fill="url(#icoRed)" stroke="#8b6f2f" stroke-width="1"/></g></svg>`,
  lock: `<svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">${SVG_DEFS}<g filter="url(#icoShadow)"><rect x="4" y="10" width="16" height="11" rx="1" fill="url(#icoGold)" stroke="#8b6f2f" stroke-width="0.6"/><path d="M8 10V6a4 4 0 0 1 8 0v4" fill="none" stroke="url(#icoGoldV)" stroke-width="2"/><circle cx="12" cy="15" r="1.5" fill="#0f1117"/></g></svg>`,
  unlock: `<svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">${SVG_DEFS}<g filter="url(#icoShadow)"><rect x="4" y="10" width="16" height="11" rx="1" fill="url(#icoGold)" stroke="#8b6f2f" stroke-width="0.6"/><path d="M8 10V6a4 4 0 0 1 7.5-2" fill="none" stroke="url(#icoGoldV)" stroke-width="2"/><circle cx="12" cy="15" r="1.5" fill="#0f1117"/></g></svg>`,
  pen: `<svg viewBox="0 0 24 24" width="14" height="14" xmlns="http://www.w3.org/2000/svg">${SVG_DEFS}<g filter="url(#icoShadow)"><path d="M4 20l4-1L20 7l-3-3L5 16z" fill="url(#icoGold)" stroke="#8b6f2f" stroke-width="0.5"/></g></svg>`,
  list: `<svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">${SVG_DEFS}<g filter="url(#icoShadow)"><circle cx="5" cy="6" r="1.8" fill="url(#icoGold)"/><circle cx="5" cy="12" r="1.8" fill="url(#icoGold)"/><circle cx="5" cy="18" r="1.8" fill="url(#icoGold)"/><line x1="10" y1="6" x2="21" y2="6" stroke="url(#icoGoldV)" stroke-width="2"/><line x1="10" y1="12" x2="21" y2="12" stroke="url(#icoGoldV)" stroke-width="2"/><line x1="10" y1="18" x2="21" y2="18" stroke="url(#icoGoldV)" stroke-width="2"/></g></svg>`,
  message: `<svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">${SVG_DEFS}<g filter="url(#icoShadow)"><path d="M2 4h20v14H8l-6 4z" fill="url(#icoGold)" stroke="#8b6f2f" stroke-width="0.6"/><path d="M6 8h12M6 11h8" stroke="#8b6f2f" stroke-width="0.7"/></g></svg>`,
  cart: `<svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">${SVG_DEFS}<g filter="url(#icoShadow)"><path d="M2 4h3l3 14h11l2-10H6" fill="none" stroke="url(#icoGold)" stroke-width="2"/><circle cx="9" cy="21" r="1.8" fill="url(#icoGold)"/><circle cx="19" cy="21" r="1.8" fill="url(#icoGold)"/></g></svg>`,
  dollar: `<svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">${SVG_DEFS}<g filter="url(#icoShadow)"><circle cx="12" cy="12" r="10" fill="url(#icoGold)" stroke="#8b6f2f" stroke-width="0.6"/><path d="M12 4v16M16 7h-6a2.5 2.5 0 0 0 0 5h4a2.5 2.5 0 0 1 0 5H8" fill="none" stroke="#0f1117" stroke-width="1.8"/></g></svg>`,
  x: `<svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">${SVG_DEFS}<g stroke-linecap="butt"><line x1="6" y1="6" x2="18" y2="18" stroke="url(#icoRed)" stroke-width="3"/><line x1="18" y1="6" x2="6" y2="18" stroke="url(#icoRed)" stroke-width="3"/></g></svg>`,
  alert: `<svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">${SVG_DEFS}<g filter="url(#icoShadow)"><path d="M12 2L1 22h22z" fill="url(#icoGold)" stroke="#8b6f2f" stroke-width="0.6"/><line x1="12" y1="9" x2="12" y2="15" stroke="#b91c37" stroke-width="2"/><circle cx="12" cy="18" r="1.2" fill="#b91c37"/></g></svg>`,
  arrowLeft: `<svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">${SVG_DEFS}<g filter="url(#icoShadow)"><path d="M20 12H5M10 6l-6 6 6 6" fill="none" stroke="url(#icoGold)" stroke-width="2.5" stroke-linecap="butt" stroke-linejoin="miter"/></g></svg>`,
  arrowRight: `<svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">${SVG_DEFS}<g filter="url(#icoShadow)"><path d="M4 12h15M14 6l6 6-6 6" fill="none" stroke="url(#icoGold)" stroke-width="2.5" stroke-linecap="butt" stroke-linejoin="miter"/></g></svg>`,
  arrowUp: `<svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">${SVG_DEFS}<g filter="url(#icoShadow)"><path d="M12 20V5M6 10l6-6 6 6" fill="none" stroke="url(#icoGold)" stroke-width="2.5" stroke-linecap="butt" stroke-linejoin="miter"/></g></svg>`,
  sliders: `<svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">${SVG_DEFS}<g filter="url(#icoShadow)"><line x1="4" y1="6" x2="20" y2="6" stroke="url(#icoGoldV)" stroke-width="2"/><line x1="4" y1="12" x2="20" y2="12" stroke="url(#icoGoldV)" stroke-width="2"/><line x1="4" y1="18" x2="20" y2="18" stroke="url(#icoGoldV)" stroke-width="2"/><circle cx="9" cy="6" r="2.5" fill="url(#icoGold)" stroke="#b91c37" stroke-width="0.6"/><circle cx="15" cy="12" r="2.5" fill="url(#icoGold)" stroke="#b91c37" stroke-width="0.6"/><circle cx="7" cy="18" r="2.5" fill="url(#icoGold)" stroke="#b91c37" stroke-width="0.6"/></g></svg>`,
  maximize: `<svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">${SVG_DEFS}<g stroke="url(#icoGold)" stroke-width="2.5" stroke-linecap="butt" fill="none"><path d="M8 3H3v5M21 8V3h-5M3 16v5h5M16 21h5v-5"/></g></svg>`,
  minimize: `<svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">${SVG_DEFS}<g stroke="url(#icoGold)" stroke-width="2.5" stroke-linecap="butt" fill="none"><path d="M8 3v3H5M16 3v3h3M8 21v-3H5M16 21v-3h3"/></g></svg>`,
  clock: `<svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">${SVG_DEFS}<g filter="url(#icoShadow)"><circle cx="12" cy="12" r="9" fill="url(#icoGold)" stroke="#8b6f2f" stroke-width="0.6"/><path d="M12 6v6l4 2" fill="none" stroke="#0f1117" stroke-width="2" stroke-linecap="butt"/></g></svg>`,
  palette: `<svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">${SVG_DEFS}<g filter="url(#icoShadow)"><path d="M12 2A10 10 0 0 0 2 12a10 10 0 0 0 10 10c1 0 1.8-.7 1.8-1.6 0-.4-.2-.8-.4-1.1-.2-.3-.4-.6-.4-1 0-.9.8-1.6 1.7-1.6H17A5 5 0 0 0 22 11c0-5-4.5-9-10-9z" fill="url(#icoGold)" stroke="#8b6f2f" stroke-width="0.6"/><circle cx="6.5" cy="12.5" r="1.3" fill="#b91c37"/><circle cx="9.5" cy="7.5" r="1.3" fill="#7c5cff"/><circle cx="15" cy="7.5" r="1.3" fill="#2ecc71"/><circle cx="18" cy="12.5" r="1.3" fill="#f5b942"/></g></svg>`,
  home: `<svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">${SVG_DEFS}<g filter="url(#icoShadow)"><path d="M12 2L2 11h3v11h14V11h3z" fill="url(#icoGold)" stroke="#8b6f2f" stroke-width="0.6"/><rect x="9" y="13" width="6" height="9" fill="#0f1117" stroke="#8b6f2f" stroke-width="0.6"/></g></svg>`,
  checkGreen: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="butt" stroke-linejoin="miter"><path d="M4 12l6 6L20 6"/></svg>`
};

// ============ 3. الأدوات ============
function toast(m) {
  const t = $('#toast'); if (!t) return;
  t.textContent = m; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}
function go(r, id) { location.hash = id === undefined ? '#/' + r : '#/' + r + '/' + id; }
function toggleMenu() {
  const s = $('#sidebar'); const o = $('#overlay');
  if (s) s.classList.toggle('show'); if (o) o.classList.toggle('show');
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

// ============ 4. التهيئة ============
async function boot() {
  if (!sb) {
    app.innerHTML = `<div class="panel"><h2>إعداد Supabase مطلوب</h2><p style="color:var(--muted);line-height:2;margin-top:10px">املأ <b>config.js</b> بالقيم الصحيحة.</p></div>`;
    return;
  }
  const r = await sb.auth.getSession();
  session = r.data.session;
  await loadProfile();
  sb.auth.onAuthStateChange(async (_, s) => {
    session = s; await loadProfile(); refreshHeader(); route();
  });
  refreshHeader();
  route();
}

async function loadProfile() {
  profile = null;
  if (session) {
    const { data } = await sb.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
    profile = data;
    await loadReaderSettings();
  }
}

async function loadReaderSettings() {
  if (!session) return;
  try {
    const { data } = await sb.from('reader_settings').select('*').eq('user_id', session.user.id).maybeSingle();
    if (data) readerSettings = data;
  } catch (e) {}
}

function refreshHeader() {
  if (!sb) return;
  const a = $('#adminBtn');
  if (a) a.style.display = profile?.role === 'admin' ? 'flex' : 'none';
  const n = $('#notifBtn'); if (n) n.style.display = session ? 'flex' : 'none';
  const ab = $('#authBtn');
  if (ab) {
    ab.style.background = session ? 'var(--grad-gold)' : '';
    ab.style.color = session ? '#1a1200' : '';
    ab.style.borderColor = session ? 'var(--gold-dark)' : '';
  }
  const um = $('#userMini');
  if (um) um.innerHTML = session
    ? `<span>${ICONS.user}</span><b>${esc(profile?.username || session.user.email)}</b>`
    : `<span>${ICONS.user}</span><span>غير مسجل</span>`;
  if (session) { loadBalance(); checkNotifications(); }
}

async function loadBalance() {
  const { data } = await sb.rpc('get_my_balance');
  if (!data || data.error) return;
}

async function checkNotifications() {
  if (!session) return;
  const { count } = await sb.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id).eq('is_read', false);
  const d = $('#notifDot');
  if (d) d.style.display = count > 0 ? 'block' : 'none';
}

async function signIn() {
  const { error } = await sb.auth.signInWithPassword({ email: $('#email').value.trim(), password: $('#pass').value });
  if (error) toast(error.message);
  else { toast('تم تسجيل الدخول'); route(); }
}
async function signUp() {
  const email = $('#email').value.trim(); const password = $('#pass').value;
  if (password.length < 8) return toast('كلمة المرور 8 أحرف على الأقل');
  const { error } = await sb.auth.signUp({ email, password });
  toast(error ? error.message : 'تم إنشاء الحساب');
}
async function signOut() { await sb.auth.signOut(); toast('تم تسجيل الخروج'); route(); }

// ============ 5. جلب البيانات ============
async function fetchWorks(kind) {
  let q = sb.from('works').select('*').eq('published', true).order('updated_at', { ascending: false });
  if (kind) q = q.eq('kind', kind);
  const { data, error } = await q;
  return error ? [] : data || [];
}
async function fetchFavorites() {
  if (!session) return [];
  const { data } = await sb.from('favorites').select('work_id');
  return (data || []).map(f => f.work_id);
}
async function fetchReadingStatuses() {
  if (!session) return {};
  try {
    const { data } = await sb.from('reading_status').select('work_id, status');
    const map = {};
    (data || []).forEach(r => { map[r.work_id] = r.status; });
    return map;
  } catch (e) { return {}; }
}
async function isFavorite(workId) {
  if (!session) return false;
  const { data } = await sb.from('favorites').select('*').eq('user_id', session.user.id).eq('work_id', workId).maybeSingle();
  return !!data;
}
async function fetchLatestChapters(workId, limit = 4) {
  const { data } = await sb.from('chapters').select('id, number, title, created_at')
    .eq('work_id', workId).eq('published', true)
    .order('number', { ascending: false }).limit(limit);
  return data || [];
}

// ============ 6. البطاقات ============
function statusBadgeHTML(status) {
  if (!status) return '';
  const labels = { reading: 'أقرأ حالياً', plan: 'سأقرأ', completed: 'مكتمل', paused: 'متوقف' };
  return `<span class="card-status-badge ${status}">${labels[status] || ''}</span>`;
}

function cardHTML(w, isFav, status) {
  return `<div class="card" onclick="go('work','${w.id}')">
    <div class="cover" style="background:linear-gradient(140deg,${esc(w.grad_a||'#1a237e')},${esc(w.grad_b||'#4a148c')})">
      ${w.cover_url ? `<img src="${esc(w.cover_url)}" alt="${esc(w.title)}" loading="lazy">` : `<div style="font-size:2.5rem;opacity:.5">${ICONS.book}</div>`}
      <span class="age">${esc(w.age_rating||'13+')}</span>
      <span class="type">${esc(w.type)}</span>
      ${isFav ? `<span class="fav-badge">${ICONS.heartFilled}</span>` : ''}
      ${statusBadgeHTML(status)}
    </div>
    <div class="cinfo">
      <h3>${esc(w.title)}</h3>
      <div class="genres">${(w.genres||[]).slice(0,2).map(g=>`<span class="gtag">${esc(g)}</span>`).join('')}</div>
    </div>
  </div>`;
}

function popularItemHTML(w, i) {
  return `<div class="popular-item" onclick="go('work','${w.id}')">
    <div class="popular-num">${i+1}</div>
    <div class="popular-cover" style="background:linear-gradient(140deg,${esc(w.grad_a||'#1a237e')},${esc(w.grad_b||'#4a148c')})">
      ${w.cover_url ? `<img src="${esc(w.cover_url)}" alt="" loading="lazy">` : `<div style="font-size:1.5rem;opacity:.5">${ICONS.book}</div>`}
    </div>
    <div class="popular-info">
      <h3>${esc(w.title)}</h3>
      <div class="popular-tags">${(w.genres||[]).slice(0,3).map(g=>`<span class="tag">${esc(g)}</span>`).join('')}</div>
    </div>
  </div>`;
}

async function releaseCardHTML(w) {
  const chapters = await fetchLatestChapters(w.id, 4);
  const sc = w.status === 'متوقفة' ? 'paused' : w.status === 'منتهية' ? 'completed' : '';
  const chaptersHTML = chapters.length
    ? chapters.map(c => `<div class="chapter-mini" onclick="event.stopPropagation();go('read','${c.id}')">
        <span>الفصل ${c.number}${c.title ? `: ${esc(c.title)}` : ''}</span>
        <span class="time">${timeAgo(c.created_at)}</span>
      </div>`).join('')
    : '<div style="text-align:center;color:var(--muted);padding:14px;font-size:.75rem">لا توجد فصول بعد</div>';
  return `<div class="release-card">
    <div class="release-info">
      <h3 onclick="go('work','${w.id}')">${esc(w.title)}</h3>
      <div class="release-status ${sc}">${esc(w.status || 'مستمرة')} • ${chapters.length} فصل</div>
      <div class="chapters-mini">${chaptersHTML}</div>
    </div>
    <div class="release-cover" style="background:linear-gradient(140deg,${esc(w.grad_a||'#1a237e')},${esc(w.grad_b||'#4a148c')})" onclick="go('work','${w.id}')">
      ${w.cover_url ? `<img src="${esc(w.cover_url)}" alt="${esc(w.title)}" loading="lazy">` : `<div style="font-size:2rem;opacity:.5">${ICONS.book}</div>`}
      <span class="type-badge">${esc(w.type)}</span>
    </div>
  </div>`;
}

// ============ 7. الصفحة الرئيسية ============
async function vHome() {
  const works = await fetchWorks();
  const favs = await fetchFavorites();
  const statuses = await fetchReadingStatuses();
  const top = [...works].sort((a,b)=>(b.rating||0)-(a.rating||0)).slice(0,5);
  const latest = works.slice(0,4);
  const today = works.slice(0,6);
  const releasesHTML = (await Promise.all(latest.map(releaseCardHTML))).join('');

  return `
  <div class="search-wrap">
    <div class="search-box" onclick="go('search','')">
      <span class="search-icon">${ICONS.search}</span>
      <input placeholder="ابحث عن مانهوا أو مانجا..." readonly>
    </div>
  </div>
  <div class="hero">
    <div class="hero-inner">
      <div class="hero-badge">NEW RELEASES</div>
      <h1>اقرأ أحدث <span>المانهوا والمانجا</span> بالعربية</h1>
      <p>منصة احترافية للفصول والفرق والقراءة، مع حسابات وصلاحيات ونظام نقاط محفوظ في الخادم.</p>
      <div class="hero-actions">
        <button class="btn" onclick="go('comics')">تصفح الكل</button>
        <button class="btn ghost" onclick="go('novels')">الروايات</button>
      </div>
    </div>
  </div>
  <div class="sec-title"><span class="line"></span>${ICONS.fire} الأكثر شعبية</div>
  <div class="popular-list">${top.map((w,i)=>popularItemHTML(w,i)).join('') || `<div class="empty"><span class="empty-icon">${ICONS.library}</span><p>لا توجد أعمال بعد</p></div>`}</div>
  <div class="sec-title"><span class="line"></span>${ICONS.book} أحدث الإصدارات</div>
  <div class="releases-list">${releasesHTML || `<div class="empty"><span class="empty-icon">${ICONS.book}</span><p>لا توجد إصدارات</p></div>`}</div>
  <div class="sec-title"><span class="line"></span>${ICONS.lightning} شائع اليوم</div>
  <div class="grid">${today.map(w=>cardHTML(w,favs.includes(w.id),statuses[w.id])).join('')}</div>`;
}

// ============ 8. صفحة التصفح ============
async function vBrowse(kind) {
  const works = await fetchWorks(kind);
  const favs = await fetchFavorites();
  const statuses = await fetchReadingStatuses();
  browseWorks = works;
  window.__favCache = favs;
  window.__statusCache = statuses;
  fState = { types: [], genres: [], ages: [], status: [] };
  browseSort = 'new';

  return `<div class="sec-title"><span class="line"></span>${kind==='comic' ? ICONS.palette + ' جميع الأعمال' : ICONS.book + ' الروايات'}</div>
  <div class="search-wrap"><div class="search-box" onclick="go('search','')">
    <span class="search-icon">${ICONS.search}</span>
    <input placeholder="ابحث..." readonly>
  </div></div>
  <div class="filters-row">
    <div class="filter-wrap">
      <button class="filter-select" onclick="toggleDropdown('ddType')">
        <div style="text-align:right"><span class="label">النوع</span><span class="value" id="vType">الكل</span></div><span class="chev">${ICONS.arrowUp}</span>
      </button><div class="dropdown" id="ddType"></div>
    </div>
    <div class="filter-wrap">
      <button class="filter-select" onclick="toggleDropdown('ddAge')">
        <div style="text-align:right"><span class="label">العمر</span><span class="value" id="vAge">الكل</span></div><span class="chev">${ICONS.arrowUp}</span>
      </button><div class="dropdown" id="ddAge"></div>
    </div>
    <div class="filter-wrap filter-full">
      <button class="filter-select" onclick="toggleDropdown('ddStatus')">
        <div style="text-align:right"><span class="label">الحالة</span><span class="value" id="vStatus">الكل</span></div><span class="chev">${ICONS.arrowUp}</span>
      </button><div class="dropdown" id="ddStatus"></div>
    </div>
    <div class="filter-wrap filter-full">
      <button class="filter-select" onclick="toggleDropdown('ddGen')">
        <div style="text-align:right"><span class="label">التصنيفات</span><span class="value" id="vGen">الكل</span></div><span class="chev">${ICONS.arrowUp}</span>
      </button><div class="dropdown" id="ddGen"></div>
    </div>
  </div>
  <div class="active-chips" id="activeChips"></div>
  <div class="sort-bar">
    <p class="result-count" id="resultCount" style="margin:0"></p>
    <button class="sort-toggle" onclick="toggleSort()">
      ${ICONS.sliders}
      <span id="sortLabel">الأحدث أولاً</span>
    </button>
  </div>
  <div class="grid" id="browseGrid"></div>`;
}

function toggleSort() {
  browseSort = browseSort === 'new' ? 'old' : browseSort === 'old' ? 'rating' : 'new';
  const lbl = document.getElementById('sortLabel');
  if (lbl) lbl.textContent = browseSort === 'new' ? 'الأحدث أولاً' : browseSort === 'old' ? 'الأقدم أولاً' : 'الأعلى تقييماً';
  drawBrowse();
}
function toggleDropdown(id) {
  const t = document.getElementById(id); if (!t) return;
  const open = t.classList.contains('show');
  $$('.dropdown').forEach(d => d.classList.remove('show'));
  $$('.filter-select').forEach(b => b.classList.remove('active'));
  if (!open) {
    t.classList.add('show');
    const w = t.closest('.filter-wrap');
    if (w) { const b = w.querySelector('.filter-select'); if (b) b.classList.add('active'); }
    buildDropdownContent(id);
  }
}
document.addEventListener('click', e => {
  if (!e.target.closest('.filter-wrap')) {
    $$('.dropdown').forEach(d => d.classList.remove('show'));
    $$('.filter-select').forEach(b => b.classList.remove('active'));
  }
});
function buildDropdownContent(id) {
  const el = document.getElementById(id); if (!el) return;
  if (id === 'ddType') {
    const fromDB = [...new Set(browseWorks.map(w => w.type).filter(Boolean))];
    const all = [...new Set([...STATIC_TYPES, ...fromDB])];
    el.innerHTML = all.map(t => `<div class="dropdown-item ${fState.types.includes(t)?'checked':''}" onclick="toggleFilter('types','${esc(t)}')"><span class="checkbox"></span><span>${esc(t)}</span></div>`).join('')
      + `<div class="dropdown-actions"><button onclick="clearFilter('types')">مسح</button><button class="primary" onclick="closeDropdowns()">تم</button></div>`;
  } else if (id === 'ddAge') {
    el.innerHTML = STATIC_AGES.map(a => `<div class="dropdown-item ${fState.ages.includes(a)?'checked':''}" onclick="toggleFilter('ages','${a}')"><span class="checkbox"></span><span>${a}</span></div>`).join('')
      + `<div class="dropdown-actions"><button onclick="clearFilter('ages')">مسح</button><button class="primary" onclick="closeDropdowns()">تم</button></div>`;
  } else if (id === 'ddStatus') {
    el.innerHTML = STATIC_STATUS.map(s => `<div class="dropdown-item ${fState.status.includes(s)?'checked':''}" onclick="toggleFilter('status','${s}')"><span class="checkbox"></span><span>${s}</span></div>`).join('')
      + `<div class="dropdown-actions"><button onclick="clearFilter('status')">مسح</button><button class="primary" onclick="closeDropdowns()">تم</button></div>`;
  } else if (id === 'ddGen') {
    const fromDB = [...new Set(browseWorks.flatMap(w => w.genres||[]).filter(Boolean))];
    const all = [...new Set([...STATIC_GENRES, ...fromDB])];
    el.innerHTML = all.map(g => `<div class="dropdown-item ${fState.genres.includes(g)?'checked':''}" onclick="toggleFilter('genres','${esc(g)}')"><span class="checkbox"></span><span>${esc(g)}</span></div>`).join('')
      + `<div class="dropdown-actions"><button onclick="clearFilter('genres')">مسح</button><button class="primary" onclick="closeDropdowns()">تم</button></div>`;
  }
}
function closeDropdowns() {
  $$('.dropdown').forEach(d => d.classList.remove('show'));
  $$('.filter-select').forEach(b => b.classList.remove('active'));
}
function toggleFilter(k, v) {
  const a = fState[k]; const i = a.indexOf(v);
  if (i >= 0) a.splice(i, 1); else a.push(v);
  drawBrowse();
}
function clearFilter(k) { fState[k] = []; drawBrowse(); }

function drawBrowse() {
  let list = browseWorks.filter(w => {
    if (fState.types.length && !fState.types.includes(w.type)) return false;
    if (fState.ages.length && !fState.ages.includes(w.age_rating)) return false;
    if (fState.status.length && !fState.status.includes(w.status)) return false;
    if (fState.genres.length && !fState.genres.some(g => (w.genres||[]).includes(g))) return false;
    return true;
  });
  if (browseSort === 'new') list.sort((a,b) => new Date(b.updated_at||0) - new Date(a.updated_at||0));
  else if (browseSort === 'old') list.sort((a,b) => new Date(a.updated_at||0) - new Date(b.updated_at||0));
  else if (browseSort === 'rating') list.sort((a,b) => (b.rating||0) - (a.rating||0));

  const set = (id, txt) => { const e = document.getElementById(id); if (e) e.textContent = txt; };
  set('vType', fState.types.length ? fState.types.join('، ') : 'الكل');
  set('vAge', fState.ages.length ? fState.ages.join('، ') : 'الكل');
  set('vStatus', fState.status.length ? fState.status.join('، ') : 'الكل');
  set('vGen', fState.genres.length ? fState.genres.join('، ') : 'الكل');
  const chips = document.getElementById('activeChips');
  if (chips) {
    const all = [...fState.types.map(v=>({k:'types',v})),...fState.ages.map(v=>({k:'ages',v})),...fState.status.map(v=>({k:'status',v})),...fState.genres.map(v=>({k:'genres',v}))];
    chips.innerHTML = all.map(x => `<span class="chip-x"><b>${esc(x.v)}</b><button onclick="toggleFilter('${x.k}','${esc(x.v)}')">${ICONS.x}</button></span>`).join('');
  }
  set('resultCount', `تم العثور على ${list.length} عمل`);
  const grid = document.getElementById('browseGrid');
  if (grid) {
    const favs = window.__favCache || [];
    const statuses = window.__statusCache || {};
    grid.innerHTML = list.length
      ? list.map(w => cardHTML(w, favs.includes(w.id), statuses[w.id])).join('')
      : `<div class="empty" style="grid-column:1/-1"><span class="empty-icon">${ICONS.search}</span><p>لا توجد نتائج</p></div>`;
  }
  $$('.dropdown.show').forEach(d => buildDropdownContent(d.id));
}

// ============ 9. صفحة العمل ============
async function vWork(id) {
  const { data: w } = await sb.from('works').select('*').eq('id', id).maybeSingle();
  if (!w) return '<div class="panel">العمل غير موجود.</div>';
  const { data: chs } = await sb.rpc('get_work_chapters', { p_work_id: id });
  const { data: ratingData } = await sb.rpc('get_work_rating', { p_work_id: id });
  const { data: comments } = await sb.rpc('get_work_comments', { p_work_id: id });
  
  let readData = [];
  if (session) {
    try {
      const res = await sb.rpc('get_read_chapters', { p_work_id: id });
      readData = res.data || [];
    } catch (e) {}
  }
  const readChapters = readData;
  const isFav = await isFavorite(id);
  const { data: progress } = session ? await sb.rpc('get_my_progress', { p_work_id: id }) : { data: null };
  
  let currentStatus = null;
  if (session) {
    try {
      const r = await sb.rpc('get_reading_status', { p_work_id: id });
      currentStatus = r.data;
    } catch (e) {}
  }

  const avg = ratingData?.average || 0;
  const cnt = ratingData?.count || 0;
  const myScore = ratingData?.my_score || 0;
  const sc = w.status === 'متوقفة' ? 'paused' : w.status === 'منتهية' ? 'completed' : '';
  const starsHTML = [1,2,3,4,5].map(i => `<span class="star ${i<=myScore?'active':''}" onclick="rateWork('${id}',${i})">★</span>`).join('');

  const commentsHTML = (comments||[]).map(c => `
    <div class="comment-item">
      <div class="comment-head">
        <div class="comment-avatar">${esc((c.username||'?')[0])}</div>
        <span class="comment-user">${esc(c.username||'مجهول')}</span>
        <span class="comment-time">${timeAgo(c.created_at)}</span>
      </div>
      <div class="comment-content">${esc(c.content)}</div>
      <div class="comment-actions">
        <button class="${c.is_liked?'liked':''}" onclick="likeComment('${c.id}')">${c.is_liked?ICONS.heartFilled:ICONS.heart} ${c.likes||0}</button>
      </div>
    </div>`).join('') || '<p style="text-align:center;color:var(--muted);padding:20px;font-size:.8rem">لا توجد تعليقات بعد.</p>';

  const progressHTML = progress?.has_progress && session
    ? `<button class="btn ghost" onclick="go('read','${progress.chapter_id}')">${ICONS.book} متابعة القراءة</button>`
    : '';

  const statusBarHTML = session ? `
    <div class="reading-status-bar">
      <button class="status-btn blue ${currentStatus === 'reading' ? 'active' : ''}" onclick="setReadingStatus('${id}','reading')">${ICONS.book}<span>أقرأ حالياً</span></button>
      <button class="status-btn ${currentStatus === 'plan' ? 'active' : ''}" onclick="setReadingStatus('${id}','plan')">${ICONS.clock}<span>سأقرأ</span></button>
      <button class="status-btn green ${currentStatus === 'completed' ? 'active' : ''}" onclick="setReadingStatus('${id}','completed')">${ICONS.check}<span>مكتمل</span></button>
      <button class="status-btn red ${currentStatus === 'paused' ? 'active' : ''}" onclick="setReadingStatus('${id}','paused')">${ICONS.alert}<span>متوقف</span></button>
    </div>` : '';

  return `<div class="work-head">
    <div class="work-cover" style="background:linear-gradient(140deg,${esc(w.grad_a||'#1a237e')},${esc(w.grad_b||'#4a148c')})">
      ${w.cover_url ? `<img src="${esc(w.cover_url)}" alt="${esc(w.title)}">` : `<div style="font-size:3rem;opacity:.5">${ICONS.book}</div>`}
    </div>
    <div class="work-info">
      <h1>${esc(w.title)}</h1>
      <div class="badges">
        <span class="badge b-type">${esc(w.type)}</span>
        <span class="badge b-age">${esc(w.age_rating)}</span>
        <span class="badge b-status ${sc}">${esc(w.status||'مستمرة')}</span>
        ${(w.genres||[]).map(g=>`<span class="badge">${esc(g)}</span>`).join('')}
      </div>
      <div class="rating-info">★ ${avg} (${cnt} تقييم)${readChapters.length > 0 ? ` • ${readChapters.length} مقروء من ${(chs||[]).length}` : ''}</div>
      <div class="rating-stars">${starsHTML}</div>
      <p class="work-syn">${esc(w.synopsis||'')}</p>
      ${w.author ? `<p class="work-author">${ICONS.pen} الكاتب: <b>${esc(w.author)}</b></p>` : ''}
      <div class="work-actions">
        <button class="btn ${isFav?'fav-btn active':'ghost'}" onclick="toggleFavorite('${id}')">${isFav? ICONS.heartFilled + ' في المفضلة' : ICONS.heart + ' أضف للمفضلة'}</button>
        ${progressHTML}
      </div>
    </div>
  </div>
  ${statusBarHTML}
  <div class="sec-title"><span class="line"></span>${ICONS.list} الفصول (${(chs||[]).length})</div>
  <div class="notice">الفصول المقفلة تُفتح بالنقاط. علامة "مقروء" تُضاف فقط عند إكمال الفصل.</div>
  ${(chs||[]).map(ch => {
    const isRead = readChapters.includes(ch.id);
    return `<div class="ch-item ${ch.is_locked?'locked':''} ${isRead?'read':''}">
      <div class="num">
        <span>الفصل ${ch.number}</span>
        ${isRead ? `<span class="read-badge">${ICONS.checkGreen} مقروء</span>` : ''}
      </div>
      <div class="sub">${ch.is_locked? ICONS.lock + ' مقفل' : ICONS.unlock + ' مجاني'} ${esc(ch.title||'')}</div>
      <button class="btn sm ${ch.is_locked?'gold':'ghost'}" onclick="readChapter('${ch.id}')">${ch.is_locked?'فتح':'قراءة'}</button>
    </div>`;
  }).join('') || `<div class="empty"><span class="empty-icon">${ICONS.list}</span><p>لا توجد فصول بعد</p></div>`}
  <div class="sec-title"><span class="line"></span>${ICONS.message} التعليقات (${(comments||[]).length})</div>
  ${session
    ? `<div class="panel"><div class="field"><textarea id="commentInput" placeholder="اكتب تعليقاً..." style="min-height:80px"></textarea></div><button class="btn" onclick="postComment('${id}')">نشر التعليق</button></div>`
    : '<div class="notice">سجّل الدخول للتعليق.</div>'}
  <div id="commentsList">${commentsHTML}</div>`;
}

async function setReadingStatus(workId, status) {
  if (!session) return go('auth');
  try {
    const { data: existing } = await sb.from('reading_status').select('*').eq('user_id', session.user.id).eq('work_id', workId).maybeSingle();
    if (existing?.status === status) {
      await sb.from('reading_status').delete().eq('user_id', session.user.id).eq('work_id', workId);
      toast('تم إزالة الحالة');
    } else if (existing) {
      await sb.from('reading_status').update({ status, updated_at: new Date().toISOString() }).eq('user_id', session.user.id).eq('work_id', workId);
      toast('تم تحديث الحالة');
    } else {
      await sb.from('reading_status').insert({ user_id: session.user.id, work_id: workId, status });
      toast('تمت إضافة الحالة');
    }
    route();
  } catch (e) { toast('حدث خطأ'); }
}

async function toggleFavorite(workId) {
  if (!session) return go('auth');
  const isFav = await isFavorite(workId);
  if (isFav) await sb.from('favorites').delete().eq('user_id', session.user.id).eq('work_id', workId);
  else await sb.from('favorites').insert({ user_id: session.user.id, work_id: workId });
  toast(isFav ? 'تم الحذف من المفضلة' : 'تم الإضافة للمفضلة');
  route();
}
async function rateWork(workId, score) {
  if (!session) return go('auth');
  await sb.from('ratings').upsert({ user_id: session.user.id, work_id: workId, score });
  toast('تم التقييم'); route();
}
async function postComment(workId) {
  if (!session) return go('auth');
  const input = document.getElementById('commentInput');
  const content = input?.value.trim();
  if (!content) return toast('اكتب تعليقاً');
  const { error } = await sb.from('comments').insert({ user_id: session.user.id, work_id: workId, content });
  if (error) return toast(error.message);
  toast('تم النشر'); route();
}
async function likeComment(commentId) {
  if (!session) return go('auth');
  const { data } = await sb.from('comment_likes').select('*').eq('user_id', session.user.id).eq('comment_id', commentId).maybeSingle();
  if (data) await sb.from('comment_likes').delete().eq('user_id', session.user.id).eq('comment_id', commentId);
  else await sb.from('comment_likes').insert({ user_id: session.user.id, comment_id: commentId });
  route();
}
async function readChapter(id) {
  const { data, error } = await sb.rpc('can_read_chapter', { p_chapter_id: id });
  if (error) return toast(error.message);
  if (!data?.allowed) return toast('هذا الفصل مقفل');
  go('read', id);
}

// ============ 10. القارئ ============
async function vReader(id) {
  const { data: ch, error } = await sb.rpc('get_chapter_for_reader', { p_chapter_id: id });
  if (error || !ch) return `<div class="error">${esc(error?.message||'الفصل غير متاح')}</div>`;
  if (session) await sb.rpc('save_progress', { p_work_id: ch.work_id, p_chapter_id: id, p_page: 1 });

  const { data: allChs } = await sb.from('chapters').select('id, number, title')
    .eq('work_id', ch.work_id).eq('published', true).order('number', { ascending: true });

  const chapters = allChs || [];
  const curIdx = chapters.findIndex(c => c.id === id);
  const prevCh = curIdx > 0 ? chapters[curIdx - 1] : null;
  const nextCh = curIdx < chapters.length - 1 ? chapters[curIdx + 1] : null;

  const rs = readerSettings;
  let body = '';
  if (ch.kind === 'novel') {
    const fontSize = rs.font_size + 'px';
    const lineHeight = rs.line_height;
    body = `<article class="novel-page" style="font-size:${fontSize};line-height:${lineHeight}"><h2>${esc(ch.title||'الفصل '+ch.number)}</h2>${(ch.content||'').split(/\n+/).map(p=>`<p>${esc(p)}</p>`).join('')}</article>`;
  } else {
    const imgs = ch.pages || [];
    const urls = [];
    for (const p of imgs) {
      const r = await sb.storage.from('chapters').createSignedUrl(p, 3600);
      if (r.data?.signedUrl) urls.push(r.data.signedUrl);
    }
    body = urls.map((u,i)=>`<img class="reader-image" src="${esc(u)}" alt="صفحة ${i+1}" loading="lazy">`).join('') || '<div class="panel">لا توجد صفحات.</div>';
  }

  const isFav = await isFavorite(ch.work_id);
  const isLight = localStorage.noktaTheme === 'light';
  const bgClass = rs.bg_color === 'default' ? '' : 'bg-' + rs.bg_color;

  setTimeout(() => {
    if (location.hash.includes('#/read/' + id)) {
      setupReaderTracking(id, ch.work_id);
      applyReaderBrightness(rs.brightness);
    }
  }, 200);

  return `<div class="reader-bar">
    <button class="btn sm ghost" onclick="go('work','${ch.work_id}')">${ICONS.arrowRight} رجوع</button>
    <div class="reader-title">${esc(ch.work_title)} — الفصل ${ch.number}</div>
    <div class="reader-tools">
      <button class="reader-tool-btn" onclick="toggleReaderSettings()" title="الإعدادات" id="settingsBtn">${ICONS.settings}</button>
      <button class="reader-tool-btn" onclick="toggleReaderWidth()" title="ملء الشاشة" id="fsBtn">${ICONS.maximize}</button>
      <button class="reader-tool-btn" onclick="toggleFavorite('${ch.work_id}')" title="المفضلة" style="${isFav?'color:var(--red)':''}">${isFav?ICONS.heartFilled:ICONS.heart}</button>
      <button class="reader-tool-btn" onclick="toggleTheme()" title="الوضع">${isLight?ICONS.moon:ICONS.sun}</button>
    </div>
  </div>
  <div class="reader-body ${bgClass}" id="readerBody" dir="${rs.reading_direction}">${body}</div>
  <div class="reader-nav">
    <button onclick="${prevCh ? `go('read','${prevCh.id}')` : 'return false'}" ${!prevCh ? 'disabled style="opacity:.4;cursor:not-allowed"' : ''}>${ICONS.arrowRight} السابق ${prevCh ? `(${prevCh.number})` : ''}</button>
    <button onclick="go('work','${ch.work_id}')" style="flex:0.7">${ICONS.list} كل الفصول</button>
    <button onclick="${nextCh ? `go('read','${nextCh.id}')` : 'return false'}" ${!nextCh ? 'disabled style="opacity:.4;cursor:not-allowed"' : ''}>التالي ${nextCh ? `(${nextCh.number})` : ''} ${ICONS.arrowLeft}</button>
  </div>
  <div class="reader-settings-panel" id="readerSettingsPanel">
    <h4>${ICONS.settings} إعدادات القراءة</h4>
    <div class="setting-group">
      <label>وضع القراءة</label>
      <div class="setting-options">
        <div class="setting-option ${rs.reading_mode === 'webtoon' ? 'active' : ''}" onclick="updateReaderSetting('reading_mode','webtoon')">ويبتون</div>
        <div class="setting-option ${rs.reading_mode === 'page' ? 'active' : ''}" onclick="updateReaderSetting('reading_mode','page')">صفحة</div>
      </div>
    </div>
    <div class="setting-group">
      <label>اتجاه القراءة</label>
      <div class="setting-options">
        <div class="setting-option ${rs.reading_direction === 'rtl' ? 'active' : ''}" onclick="updateReaderSetting('reading_direction','rtl')">من اليمين</div>
        <div class="setting-option ${rs.reading_direction === 'ltr' ? 'active' : ''}" onclick="updateReaderSetting('reading_direction','ltr')">من اليسار</div>
      </div>
    </div>
    <div class="setting-group">
      <label>حجم الخط (${rs.font_size}px)</label>
      <input type="range" class="setting-slider" min="12" max="32" value="${rs.font_size}" oninput="updateReaderSetting('font_size',parseInt(this.value))">
    </div>
    <div class="setting-group">
      <label>تباعد الأسطر (${rs.line_height})</label>
      <input type="range" class="setting-slider" min="1.2" max="3.5" step="0.1" value="${rs.line_height}" oninput="updateReaderSetting('line_height',parseFloat(this.value))">
    </div>
    <div class="setting-group">
      <label>سطوع الشاشة (${rs.brightness}%)</label>
      <input type="range" class="setting-slider" min="30" max="150" value="${rs.brightness}" oninput="updateReaderSetting('brightness',parseInt(this.value))">
    </div>
    <div class="setting-group">
      <label>لون الخلفية</label>
      <div class="setting-options">
        <div class="setting-option ${rs.bg_color === 'default' ? 'active' : ''}" onclick="updateReaderSetting('bg_color','default')">افتراضي</div>
        <div class="setting-option ${rs.bg_color === 'dark' ? 'active' : ''}" onclick="updateReaderSetting('bg_color','dark')">أسود</div>
        <div class="setting-option ${rs.bg_color === 'gray' ? 'active' : ''}" onclick="updateReaderSetting('bg_color','gray')">رمادي</div>
        <div class="setting-option ${rs.bg_color === 'sepia' ? 'active' : ''}" onclick="updateReaderSetting('bg_color','sepia')">بيج</div>
        <div class="setting-option ${rs.bg_color === 'white' ? 'active' : ''}" onclick="updateReaderSetting('bg_color','white')">أبيض</div>
      </div>
    </div>
  </div>`;
}

function toggleReaderSettings() {
  const panel = document.getElementById('readerSettingsPanel');
  const btn = document.getElementById('settingsBtn');
  if (panel) panel.classList.toggle('show');
  if (btn) btn.classList.toggle('active');
}

async function updateReaderSetting(key, value) {
  readerSettings[key] = value;
  const body = document.getElementById('readerBody');
  const panel = document.getElementById('readerSettingsPanel');
  
  if (key === 'font_size' && body) {
    const np = body.querySelector('.novel-page');
    if (np) np.style.fontSize = value + 'px';
  }
  if (key === 'line_height' && body) {
    const np = body.querySelector('.novel-page');
    if (np) np.style.lineHeight = value;
  }
  if (key === 'brightness') applyReaderBrightness(value);
  if (key === 'bg_color' && body) {
    body.classList.remove('bg-dark', 'bg-sepia', 'bg-gray', 'bg-white');
    if (value !== 'default') body.classList.add('bg-' + value);
  }
  if (key === 'reading_direction' && body) body.dir = value;
  
  if (panel) {
    panel.querySelectorAll('.setting-option').forEach(el => {
      const oc = el.getAttribute('onclick') || '';
      if (oc.includes(`'${key}','${value}'`)) el.classList.add('active');
      else if (oc.includes(`'${key}'`)) el.classList.remove('active');
    });
    panel.querySelectorAll('.setting-group label').forEach(l => {
      if (key === 'font_size' && l.textContent.includes('حجم الخط')) l.textContent = `حجم الخط (${value}px)`;
      if (key === 'line_height' && l.textContent.includes('تباعد')) l.textContent = `تباعد الأسطر (${value})`;
      if (key === 'brightness' && l.textContent.includes('سطوع')) l.textContent = `سطوع الشاشة (${value}%)`;
    });
  }
  
  if (!session) return;
  clearTimeout(window.__rsTimeout);
  window.__rsTimeout = setTimeout(async () => {
    try {
      const { data: existing } = await sb.from('reader_settings').select('*').eq('user_id', session.user.id).maybeSingle();
      const payload = { user_id: session.user.id, [key]: value, updated_at: new Date().toISOString() };
      if (existing) await sb.from('reader_settings').update(payload).eq('user_id', session.user.id);
      else await sb.from('reader_settings').insert(payload);
    } catch (e) {}
  }, 600);
}

function applyReaderBrightness(value) {
  const body = document.getElementById('readerBody');
  if (!body) return;
  body.style.filter = `brightness(${value / 100})`;
}

function toggleReaderWidth() {
  const body = document.body;
  const isActive = body.classList.contains('reading-fullscreen');
  const btn = document.getElementById('fsBtn');
  
  if (!isActive) {
    body.classList.add('reading-fullscreen');
    const elem = document.documentElement;
    try {
      if (elem.requestFullscreen) elem.requestFullscreen().catch(()=>{});
      else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
    } catch (e) {}
    if (btn) btn.innerHTML = ICONS.minimize;
    toast('وضع القراءة بملء الشاشة — ESC للخروج');
  } else {
    body.classList.remove('reading-fullscreen');
    try {
      if (document.fullscreenElement) document.exitFullscreen().catch(()=>{});
    } catch (e) {}
    if (btn) btn.innerHTML = ICONS.maximize;
  }
}

document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && document.body.classList.contains('reading-fullscreen')) {
    document.body.classList.remove('reading-fullscreen');
    const btn = document.getElementById('fsBtn');
    if (btn) btn.innerHTML = ICONS.maximize;
  }
});

function setupReaderTracking(chapterId, workId) {
  if (readerTrackingCleanup) readerTrackingCleanup();
  if (!session) return;
  
  let marked = false;
  let initialDelayDone = false;
  
  setTimeout(() => { initialDelayDone = true; checkBottom(); }, 2000);
  
  function checkBottom() {
    if (marked || !initialDelayDone) return;
    const isFullscreen = document.body.classList.contains('reading-fullscreen');
    let scrollTop, scrollHeight, windowHeight;
    
    if (isFullscreen) {
      const mainEl = document.querySelector('main');
      if (!mainEl) return;
      scrollTop = mainEl.scrollTop;
      scrollHeight = mainEl.scrollHeight;
      windowHeight = mainEl.clientHeight;
    } else {
      scrollTop = window.scrollY || document.documentElement.scrollTop;
      scrollHeight = document.documentElement.scrollHeight;
      windowHeight = window.innerHeight;
    }
    
    const scrolled = (scrollTop + windowHeight) / scrollHeight;
    const contentHeight = scrollHeight - windowHeight;
    
    if (contentHeight < 200) {
      if (!marked) { marked = true; markChapterAsRead(chapterId, workId); }
      return;
    }
    if (scrolled >= 0.98) { marked = true; markChapterAsRead(chapterId, workId); }
  }
  
  const handler = () => checkBottom();
  window.addEventListener('scroll', handler, { passive: true });
  window.addEventListener('resize', handler, { passive: true });
  const mainEl = document.querySelector('main');
  if (mainEl) mainEl.addEventListener('scroll', handler, { passive: true });
  
  readerTrackingCleanup = () => {
    window.removeEventListener('scroll', handler);
    window.removeEventListener('resize', handler);
    if (mainEl) mainEl.removeEventListener('scroll', handler);
  };
}

async function markChapterAsRead(chapterId, workId) {
  if (!session) return;
  try {
    const { data, error } = await sb.rpc('mark_chapter_read', { p_chapter_id: chapterId });
    if (error) return;
    if (data?.ok) toast('✓ تم وضع علامة الفصل كمقروء');
  } catch (e) {}
}

// ============ 11. المكتبة ============
async function vLibrary() {
  if (!session) return `<div class="empty" style="padding:80px 20px"><span class="empty-icon">${ICONS.library}</span><p>سجّل الدخول لعرض مكتبتك</p><button class="btn" style="margin-top:20px" onclick="go('auth')">تسجيل الدخول</button></div>`;
  
  const { data: favs } = await sb.from('favorites').select('work_id, created_at, works(*)').eq('user_id', session.user.id).order('created_at', { ascending: false });
  const { data: progressList } = await sb.from('reading_progress').select('work_id, updated_at, works(*), chapters(number)').eq('user_id', session.user.id).order('updated_at', { ascending: false });
  
  let statusList = [];
  try {
    const r = await sb.from('reading_status').select('work_id, status, updated_at, works(*)').eq('user_id', session.user.id);
    statusList = r.data || [];
  } catch (e) {}

  const favHTML = (favs||[]).map(f => f.works ? cardHTML(f.works, true, null) : '').join('');
  const progHTML = (progressList||[]).map(p => {
    if (!p.works) return '';
    return `<div class="release-card">
      <div class="release-info">
        <h3>${esc(p.works.title)}</h3>
        <div class="release-status">آخر قراءة: الفصل ${p.chapters?.number||'?'}</div>
        <div class="chapters-mini"><div class="chapter-mini" onclick="go('work','${p.work_id}')"><span>${ICONS.book} متابعة</span><span class="time">${timeAgo(p.updated_at)}</span></div></div>
      </div>
      <div class="release-cover" onclick="go('work','${p.work_id}')">${p.works.cover_url ? `<img src="${esc(p.works.cover_url)}" alt="">` : ICONS.book}</div>
    </div>`;
  }).join('');

  const filteredStatus = libraryTab === 'favorites' || libraryTab === 'progress' ? [] : statusList.filter(s => s.status === libraryTab);
  const statusHTML = filteredStatus.map(s => s.works ? cardHTML(s.works, false, s.status) : '').join('');

  const contentMap = {
    favorites: favHTML ? `<div class="grid">${favHTML}</div>` : `<div class="empty"><span class="empty-icon">${ICONS.heart}</span><p>لا توجد أعمال في المفضلة</p></div>`,
    progress: progHTML || `<div class="empty"><span class="empty-icon">${ICONS.book}</span><p>لا يوجد سجل قراءة</p></div>`,
    reading: statusHTML ? `<div class="grid">${statusHTML}</div>` : `<div class="empty"><span class="empty-icon">${ICONS.book}</span><p>لا توجد أعمال تقرأها حالياً</p></div>`,
    plan: statusHTML ? `<div class="grid">${statusHTML}</div>` : `<div class="empty"><span class="empty-icon">${ICONS.clock}</span><p>لا توجد أعمال في قائمة "سأقرأ"</p></div>`,
    completed: statusHTML ? `<div class="grid">${statusHTML}</div>` : `<div class="empty"><span class="empty-icon">${ICONS.check}</span><p>لا توجد أعمال مكتملة</p></div>`,
    paused: statusHTML ? `<div class="grid">${statusHTML}</div>` : `<div class="empty"><span class="empty-icon">${ICONS.alert}</span><p>لا توجد أعمال متوقفة</p></div>`
  };

  const counts = {
    favorites: (favs||[]).length,
    progress: (progressList||[]).length,
    reading: statusList.filter(s => s.status === 'reading').length,
    plan: statusList.filter(s => s.status === 'plan').length,
    completed: statusList.filter(s => s.status === 'completed').length,
    paused: statusList.filter(s => s.status === 'paused').length
  };

  return `<div class="sec-title"><span class="line"></span>${ICONS.library} مكتبتي</div>
  <div class="tabs">
    <button class="tab ${libraryTab==='favorites'?'on':''}" onclick="libraryTab='favorites';route()">${ICONS.heart} المفضلة (${counts.favorites})</button>
    <button class="tab ${libraryTab==='progress'?'on':''}" onclick="libraryTab='progress';route()">${ICONS.book} سجل القراءة (${counts.progress})</button>
    <button class="tab ${libraryTab==='reading'?'on':''}" onclick="libraryTab='reading';route()">${ICONS.book} أقرأ حالياً (${counts.reading})</button>
    <button class="tab ${libraryTab==='plan'?'on':''}" onclick="libraryTab='plan';route()">${ICONS.clock} سأقرأ (${counts.plan})</button>
    <button class="tab ${libraryTab==='completed'?'on':''}" onclick="libraryTab='completed';route()">${ICONS.check} مكتمل (${counts.completed})</button>
    <button class="tab ${libraryTab==='paused'?'on':''}" onclick="libraryTab='paused';route()">${ICONS.alert} متوقف (${counts.paused})</button>
  </div>
  ${contentMap[libraryTab] || contentMap.favorites}`;
}

// ============ 12. الإشعارات ============
async function vNotifications() {
  if (!session) return `<div class="empty" style="padding:80px 20px"><span class="empty-icon">${ICONS.bell}</span><p>سجّل الدخول لعرض الإشعارات</p><button class="btn" style="margin-top:20px" onclick="go('auth')">تسجيل الدخول</button></div>`;
  const { data } = await sb.from('notifications').select('*, works(title), chapters(number)').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(50);
  await sb.from('notifications').update({ is_read: true }).eq('user_id', session.user.id).eq('is_read', false);
  checkNotifications();
  const html = (data||[]).map(n => `<div class="notif-item ${n.is_read?'':'unread'}" onclick="${n.work_id ? `go('work','${n.work_id}')` : ''}">
    <div class="notif-icon">${ICONS.bell}</div>
    <div class="notif-content">
      <p>${esc(n.message || `تم نشر فصل جديد${n.chapters?.number?` (${n.chapters.number})`:''} من ${n.works?.title||''}`)}</p>
      <time>${timeAgo(n.created_at)}</time>
    </div>
  </div>`).join('');
  return `<div class="sec-title"><span class="line"></span>${ICONS.bell} الإشعارات</div>
  ${html || `<div class="empty"><span class="empty-icon">${ICONS.bell}</span><p>لا توجد إشعارات</p></div>`}`;
}

// ============ 13. الفرق والانضمام ============
async function vTeams() {
  const { data } = await sb.from('teams').select('*').eq('published', true).order('name');
  return `<div class="sec-title"><span class="line"></span>${ICONS.shield} فرق الترجمة</div>
  <div class="notice">يمكن لكل فريق إدارة أعماله وفصوله.</div>
  <div class="grid2">${(data||[]).map(t=>`<div class="team-card">
    <h3>${ICONS.shield} ${esc(t.name)}</h3>
    <p style="color:var(--muted);line-height:1.8;font-size:.85rem">${esc(t.description||'')}</p>
    ${t.support_wallet ? `<div class="wallet-box">${esc(t.support_wallet)}</div><button class="btn sm" onclick="copyTxt('${esc(t.support_wallet)}')">نسخ</button>` : ''}
  </div>`).join('') || `<div class="empty" style="grid-column:1/-1"><span class="empty-icon">${ICONS.shield}</span><p>لا توجد فرق بعد</p></div>`}</div>`;
}

async function vJoin() {
  return `<div class="sec-title"><span class="line"></span>${ICONS.handshake} انضم كمساعد</div>
  <div class="notice">أرسل طلبك؛ سيظهر للمشرفين في لوحة الإدارة.</div>
  <div class="panel" style="max-width:650px">
    <div class="field"><label>الاسم</label><input id="jName"></div>
    <div class="field"><label>البريد / تيليجرام</label><input id="jContact"></div>
    <div class="field"><label>الدور</label><select id="jRole"><option>مترجم</option><option>مبيّض</option><option>مدقق لغوي</option><option>رافع فصول</option></select></div>
    <div class="field"><label>اللغات</label><input id="jLangs"></div>
    <div class="field"><label>نبذة</label><textarea id="jBio"></textarea></div>
    <button class="btn" onclick="submitJoin()">إرسال الطلب</button>
  </div>`;
}
async function submitJoin() {
  if (!session) return go('auth');
  const p = { name:$('#jName').value.trim(), contact:$('#jContact').value.trim(), role:$('#jRole').value, langs:$('#jLangs').value.trim(), bio:$('#jBio').value.trim() };
  if (!p.name || !p.contact) return toast('أكمل الحقول');
  const { error } = await sb.from('join_requests').insert({ user_id: session.user.id, ...p });
  toast(error?error.message:'تم الإرسال'); if (!error) route();
}

// ============ 14. المصادقة والنقاط والبحث ============
async function vAuth() {
  return `<div class="sec-title"><span class="line"></span>${ICONS.user} حسابك</div>
  <div class="panel" style="max-width:420px;margin:auto">
    ${session
      ? `<p style="text-align:center;margin-bottom:16px">مسجل الدخول: <b>${esc(profile?.username||session.user.email)}</b></p>
        <button class="btn danger" style="width:100%" onclick="signOut()">تسجيل الخروج</button>`
      : `<div class="field"><label>البريد الإلكتروني</label><input id="email" type="email" placeholder="username@domain.com"></div>
        <div class="field"><label>كلمة المرور</label><input id="pass" type="password" placeholder="••••••••"></div>
        <button class="btn" style="width:100%;margin-bottom:10px" onclick="signIn()">تسجيل الدخول</button>
        <div style="text-align:center;font-size:.8rem">
          <span style="color:var(--muted)">ليس لديك حساب؟ </span>
          <a onclick="signUp()" style="color:var(--red-light);font-weight:800;cursor:pointer">إنشاء حساب جديد</a>
        </div>`}
  </div>`;
}

async function vPoints() {
  if (!session) return `<div class="empty" style="padding:80px 20px"><span class="empty-icon">${ICONS.crown}</span><p>سجّل الدخول لإدارة رصيدك</p><button class="btn" style="margin-top:20px" onclick="go('auth')">تسجيل الدخول</button></div>`;
  const { data } = await sb.rpc('get_my_balance');
  const balance = data?.balance || 0;
  const { data: packs } = await sb.from('point_packs').select('*').eq('active', true).order('sort_order');
  return `<div class="sec-title"><span class="line"></span>${ICONS.crown} رصيدك: ${balance} نقطة</div>
  <div class="notice">شراء النقاط هنا ينشئ طلب دفع. لن تتم إضافة النقاط حتى يؤكد المشرف.</div>
  <div class="panel" style="max-width:600px"><h3 style="margin-bottom:14px">${ICONS.cart} الحزم</h3>
    ${(packs||[]).map(p=>`<div class="pack">
      <div><div class="pts">${p.points} نقطة</div><div style="color:var(--muted);font-size:.75rem">${p.bonus_text||''}</div></div>
      <div style="text-align:left"><b>${p.usdt_price} USDT</b><br><button class="btn sm" style="margin-top:6px" onclick="createPayment('${p.id}')">شراء</button></div>
    </div>`).join('') || '<p style="color:var(--muted)">لا توجد حزم.</p>'}
  </div>`;
}
async function createPayment(packId) {
  const { data, error } = await sb.rpc('create_payment_request', { p_pack_id: packId });
  if (error) toast(error.message);
  else toast('تم إنشاء الطلب رقم ' + data.reference);
}

async function vSearch(q) {
  const { data } = await sb.from('works').select('*').eq('published', true).ilike('title', `%${q||''}%`);
  const favs = await fetchFavorites();
  const statuses = await fetchReadingStatuses();
  return `<div class="search-wrap"><div class="search-box">
    <span class="search-icon">${ICONS.search}</span>
    <input id="searchInput" placeholder="ابحث..." value="${esc(q||'')}" onkeydown="if(event.key==='Enter')go('search',this.value)">
  </div></div>
  <p class="result-count">نتائج: ${(data||[]).length}</p>
  <div class="grid">${(data||[]).map(w=>cardHTML(w,favs.includes(w.id),statuses[w.id])).join('') || `<div class="empty" style="grid-column:1/-1"><span class="empty-icon">${ICONS.search}</span><p>لا نتائج</p></div>`}</div>`;
}

async function copyTxt(t) {
  try { await navigator.clipboard.writeText(t); toast('تم النسخ'); }
  catch { toast('انسخ يدوياً'); }
}

// ============ 15. الراوتر ============
async function route() {
  const h = location.hash.replace(/^#\/?/, '').split('/');
  const page = h[0] || 'home';
  const id = h[1];

  document.body.classList.remove('reading-fullscreen');
  try { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); } catch (e) {}

  $$('.sidebar-nav a').forEach(a => a.classList.toggle('on', a.dataset.r === page));
  const s = $('#sidebar'); if (s) s.classList.remove('show');
  const o = $('#overlay'); if (o) o.classList.remove('show');

  if (readerTrackingCleanup) { readerTrackingCleanup(); readerTrackingCleanup = null; }

  app.innerHTML = '<div class="loading">جارٍ التحميل</div>';

  try {
    if (!sb) return boot();
    let html;
    if (page === 'home') html = await vHome();
    else if (page === 'comics') html = await vBrowse('comic');
    else if (page === 'novels') html = await vBrowse('novel');
    else if (page === 'library') html = await vLibrary();
    else if (page === 'notifications') html = await vNotifications();
    else if (page === 'work') html = await vWork(id);
    else if (page === 'read') html = await vReader(id);
    else if (page === 'teams') html = await vTeams();
    else if (page === 'join') html = await vJoin();
    else if (page === 'auth') html = await vAuth();
    else if (page === 'points') html = await vPoints();
    else if (page === 'search') html = await vSearch(decodeURIComponent(id || ''));
    else html = await vHome();

    app.innerHTML = html;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (e) {
    console.error(e);
    app.innerHTML = `<div class="error">حدث خطأ: ${esc(e.message)}</div>`;
  }
}

window.addEventListener('hashchange', route);

// ============ 16. البدء ============
boot();