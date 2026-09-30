/* ============================================================
   نُقطة مانجا — التطبيق النهائي الكامل
   ============================================================ */
const C = window.NOKTA_CONFIG || {};
const hasConfig = C.supabaseUrl && C.supabasePublishableKey && !C.supabaseUrl.includes('YOUR_') && !C.supabasePublishableKey.includes('YOUR_');
const sb = hasConfig ? supabase.createClient(C.supabaseUrl, C.supabasePublishableKey) : null;
const app = document.querySelector('#app');
let session = null, profile = null, browseWorks = [], libraryTab = 'favorites', readerMode = 'webtoon';
let fState = { types: [], genres: [], ages: [], status: [] };
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const esc = s => String(s ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));

const STATIC_TYPES = ['مانهوا', 'مانجا', 'مانها', 'رواية', 'كوميكس'];
const STATIC_AGES = ['13+', '16+', '18+'];
const STATIC_STATUS = ['مستمرة', 'متوقفة', 'منتهية'];
const STATIC_GENRES = ['أكشن','فانتازيا','رومانسية','غموض','نظام','دراما','مغامرة','مدرسي','شونين','قوى خاصة','ناجٍ','مصاصين','سحر','مملكة','تاريخي','ارتقاء','رياضة','خيال','حياة يومية','جوسي','فنون قتالية','سينين','شوجو','إيسيكاي','ميكا','رعب','نفسي','عسكري','موسيقي'];

/* ===== أدوات ===== */
function toast(m) { const t = $('#toast'); if (!t) return; t.textContent = m; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2600); }
function go(r, id) { location.hash = id === undefined ? '#/' + r : '#/' + r + '/' + id; }
function toggleMenu() { const s = $('#sidebar'), o = $('#overlay'); if (s) s.classList.toggle('show'); if (o) o.classList.toggle('show'); }
function timeAgo(d) { if (!d) return '—'; const df = (Date.now() - new Date(d).getTime()) / 1000; if (df < 60) return 'الآن'; if (df < 3600) return `منذ ${Math.floor(df/60)} دقيقة`; if (df < 86400) return `منذ ${Math.floor(df/3600)} ساعة`; if (df < 2592000) return `منذ ${Math.floor(df/86400)} يوم`; return new Date(d).toLocaleDateString('ar'); }

/* ===== الوضع الليلي ===== */
function theme() { const l = localStorage.noktaTheme === 'light'; if (l) document.documentElement.setAttribute('data-theme', 'light'); else document.documentElement.removeAttribute('data-theme'); const b = $('#themeBtn'); if (b) b.textContent = l ? '🌙' : '☀️'; }
function toggleTheme() { localStorage.noktaTheme = localStorage.noktaTheme === 'light' ? 'dark' : 'light'; theme(); }
theme();

/* ===== التهيئة ===== */
async function boot() {
  if (!sb) { app.innerHTML = `<div class="panel"><h2>⚙️ إعداد Supabase مطلوب</h2><p style="color:var(--muted);line-height:2;margin-top:10px">انسخ <b>config.example.js</b> إلى <b>config.js</b> واملأ القيم.</p></div>`; return; }
  const r = await sb.auth.getSession(); session = r.data.session;
  await loadProfile();
  sb.auth.onAuthStateChange(async (_, s) => { session = s; await loadProfile(); refreshHeader(); route(); });
  refreshHeader(); route();
}
async function loadProfile() { profile = null; if (session) { const { data } = await sb.from('profiles').select('*').eq('id', session.user.id).maybeSingle(); profile = data; } }
function refreshHeader() {
  if (!sb) return;
  const a = $('#adminBtn'); if (a) a.style.display = profile?.role === 'admin' ? 'flex' : 'none';
  const n = $('#notifBtn'); if (n) n.style.display = session ? 'flex' : 'none';
  const ab = $('#authBtn'); if (ab) { ab.style.background = session ? 'var(--accent)' : ''; ab.style.color = session ? '#1a1200' : ''; }
  const um = $('#userMini'); if (um) um.innerHTML = session ? `<span>👤</span><b>${esc(profile?.username || session.user.email)}</b>` : `<span>👤</span><span>غير مسجل</span>`;
  if (session) { loadBalance(); checkNotifications(); }
}
async function loadBalance() { const { data } = await sb.rpc('get_my_balance'); if (!data || data.error) return; }
async function checkNotifications() { if (!session) return; const { count } = await sb.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id).eq('is_read', false); const d = $('#notifDot'); if (d) d.style.display = count > 0 ? 'block' : 'none'; }

/* ===== جلب الأعمال ===== */
async function fetchWorks(kind) { let q = sb.from('works').select('*').eq('published', true).order('updated_at', { ascending: false }); if (kind) q = q.eq('kind', kind); const { data, error } = await q; return error ? [] : data || []; }
async function fetchFavorites() { if (!session) return []; const { data } = await sb.from('favorites').select('work_id'); return (data || []).map(f => f.work_id); }
async function isFavorite(workId) { if (!session) return false; const { data } = await sb.from('favorites').select('*').eq('user_id', session.user.id).eq('work_id', workId).maybeSingle(); return !!data; }

/* ===== بطاقات ===== */
function cardHTML(w, isFav) {
  return `<div class="card" onclick="go('work','${w.id}')">
    <div class="cover" style="background:linear-gradient(140deg,${esc(w.grad_a||'#1a237e')},${esc(w.grad_b||'#4a148c')})">
      ${w.cover_url?`<img src="${esc(w.cover_url)}" alt="${esc(w.title)}" loading="lazy">`:esc(w.emoji||'📖')}
      <span class="age">${esc(w.age_rating||'13+')}</span>
      <span class="type">${esc(w.type)}</span>
      ${isFav?'<span class="fav-badge">❤️</span>':''}
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
      ${w.cover_url?`<img src="${esc(w.cover_url)}" alt="" loading="lazy">`:esc(w.emoji||'📖')}
    </div>
    <div class="popular-info"><h3>${esc(w.title)}</h3><div class="popular-tags">${(w.genres||[]).slice(0,3).map(g=>`<span class="tag">${esc(g)}</span>`).join('')}</div></div>
  </div>`;
}
function releaseCardHTML(w) {
  const sc = w.status==='متوقفة'?'paused':w.status==='منتهية'?'completed':'';
  const chs = []; const t = Math.min(w.chapter_count||4, 4);
  for (let i=t;i>=1;i--) chs.push(`<div class="chapter-mini" onclick="go('work','${w.id}')"><span>الفصل ${i}</span><span class="time">${timeAgo(w.updated_at)}</span></div>`);
  return `<div class="release-card"><div class="release-info"><h3>${esc(w.title)}</h3><div class="release-status ${sc}">${esc(w.status||'مستمرة')}</div><div class="chapters-mini">${chs.join('')}</div></div>
    <div class="release-cover" style="background:linear-gradient(140deg,${esc(w.grad_a||'#1a237e')},${esc(w.grad_b||'#4a148c')})" onclick="go('work','${w.id}')">
      ${w.cover_url?`<img src="${esc(w.cover_url)}" alt="" loading="lazy">`:esc(w.emoji||'📖')}
      <span class="type-badge">${esc(w.type)}</span>
    </div></div>`;
}

/* ===== الصفحة الرئيسية ===== */
async function vHome() {
  const works = await fetchWorks();
  const favs = await fetchFavorites();
  const top = [...works].sort((a,b)=>(b.rating||0)-(a.rating||0)).slice(0,5);
  const latest = works.slice(0,4);
  const today = works.slice(0,6);
  return `<div class="search-wrap"><div class="search-box" onclick="go('search','')"><span class="search-icon">🔍</span><input placeholder="ابحث عن مانهوا أو مانجا..." readonly></div></div>
  <div class="hero"><h1>الأعمال <span>المميزة</span></h1><p>استكشف مجموعة واسعة من الأعمال المميزة والحصرية على منصتنا</p><button class="btn" onclick="go('comics')">تصفح الكل ←</button></div>
  <div class="sec-title"><span class="line"></span>🔥 الأكثر شعبية</div><div class="popular-list">${top.map((w,i)=>popularItemHTML(w,i)).join('')||'<p style="text-align:center;color:var(--muted);padding:30px">لا توجد أعمال بعد.</p>'}</div>
  <div class="sec-title"><span class="line"></span>📖 أحدث الإصدارات</div><div class="releases-list">${latest.map(releaseHTML).join('')||'<p style="text-align:center;color:var(--muted);padding:30px">لا توجد إصدارات.</p>'}</div>
  <div class="sec-title"><span class="line"></span>⚡ شائع اليوم</div><div class="grid">${today.map(w=>cardHTML(w,favs.includes(w.id))).join('')}</div>`;
}
function releaseHTML(w){return releaseCardHTML(w);}